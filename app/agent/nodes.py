import asyncio
import json
import logging
import re
import time

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from app.agent.prompts import (
    CLASSIFY_INTENT_PROMPT,
    CHITCHAT_PROMPT,
    COLLECT_REQUIREMENTS_PROMPT,
    ENHANCE_QUERY_PROMPT,
    PLAN_SEARCH_PROMPT,
    ANSWER_GENERATION_PROMPT,
)
from app.agent.state import AgentState
from app.config import settings
from app.search.faiss_store import tyre_store
from app.search.reranker import rerank_results

logger = logging.getLogger(__name__)


def _get_llm(temperature: float = 0.0) -> ChatOpenAI:
    """Default execution agent (GPT-4.1)."""
    return ChatOpenAI(
        model=settings.openai_model,
        openai_api_key=settings.openai_api_key,
        temperature=temperature,
    )


def _get_planning_llm(temperature: float = 0.0) -> ChatOpenAI:
    """Planning agent (GPT-5.2) for search strategy decisions."""
    return ChatOpenAI(
        model=settings.openai_planning_model,
        openai_api_key=settings.openai_api_key,
        temperature=temperature,
    )


def _format_chat_history(history: list[dict[str, str]]) -> str:
    if not history:
        return "(No previous conversation)"
    lines = []
    for msg in history:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Node: classify_intent
# ---------------------------------------------------------------------------
async def classify_intent(state: AgentState) -> dict:
    """Classify the user's intent: chitchat, collect requirements, or search."""
    t0 = time.perf_counter()
    collecting_turns = state.get("collecting_turns", 0)
    max_turns = settings.max_collecting_turns
    logger.info(
        "[classify_intent] START | query=%r | phase=%s | collecting_turns=%d/%d | requirements=%r",
        state["user_query"],
        state.get("conversation_phase", "idle"),
        collecting_turns,
        max_turns,
        (state.get("collected_requirements") or "(none)")[:120],
    )

    llm = _get_llm()
    chat_history = _format_chat_history(state.get("chat_history", []))

    if (
        collecting_turns >= max_turns
        and state.get("collected_requirements", "").strip()
    ):
        logger.info(
            "[classify_intent] Max collecting turns reached (%d), forcing search",
            collecting_turns,
        )
        return {"intent": "search"}

    prompt = CLASSIFY_INTENT_PROMPT.format(
        conversation_phase=state.get("conversation_phase", "idle"),
        collected_requirements=state.get("collected_requirements", "(none)"),
        collecting_turns=collecting_turns,
        max_collecting_turns=max_turns,
        chat_history=chat_history,
        user_query=state["user_query"],
    )

    response = await llm.ainvoke([HumanMessage(content=prompt)])

    try:
        parsed = json.loads(response.content)
    except json.JSONDecodeError:
        logger.warning(
            "[classify_intent] Failed to parse LLM response: %s", response.content
        )
        parsed = {"intent": "chitchat", "reason": "parse failure fallback"}

    intent = parsed.get("intent", "chitchat")
    if intent not in ("chitchat", "collect", "search"):
        intent = "chitchat"

    elapsed = time.perf_counter() - t0
    logger.info(
        "[classify_intent] DONE  | intent=%s | reason=%s | elapsed=%.2fs",
        intent,
        parsed.get("reason", ""),
        elapsed,
    )
    return {"intent": intent}


# ---------------------------------------------------------------------------
# Node: chitchat_response
# ---------------------------------------------------------------------------
async def chitchat_response(state: AgentState) -> dict:
    """Generate a friendly conversational response, gently offer wheel search."""
    t0 = time.perf_counter()
    logger.info("[chitchat_response] START | query=%r", state["user_query"])

    llm = _get_llm(temperature=0.5)
    chat_history = _format_chat_history(state.get("chat_history", []))

    prompt = CHITCHAT_PROMPT.format(
        chat_history=chat_history,
        user_query=state["user_query"],
    )

    response = await llm.ainvoke([HumanMessage(content=prompt)])

    elapsed = time.perf_counter() - t0
    logger.info(
        "[chitchat_response] DONE  | response_len=%d | elapsed=%.2fs",
        len(response.content),
        elapsed,
    )
    return {
        "chitchat_response_text": response.content,
        "conversation_phase": "idle",
        "is_complete": True,
    }


# ---------------------------------------------------------------------------
# Node: collect_requirements
# ---------------------------------------------------------------------------
async def collect_requirements(state: AgentState) -> dict:
    """Gather wheel details from the user or present a confirmation summary."""
    t0 = time.perf_counter()
    collecting_turns = state.get("collecting_turns", 0)
    logger.info(
        "[collect_requirements] START | query=%r | turn=%d/%d | existing_requirements=%r",
        state["user_query"],
        collecting_turns + 1,
        settings.max_collecting_turns,
        (state.get("collected_requirements") or "(none yet)")[:120],
    )

    llm = _get_llm(temperature=0.2)
    chat_history = _format_chat_history(state.get("chat_history", []))

    prompt = COLLECT_REQUIREMENTS_PROMPT.format(
        collected_requirements=state.get("collected_requirements", "(none yet)"),
        collecting_turns=collecting_turns + 1,
        max_collecting_turns=settings.max_collecting_turns,
        chat_history=chat_history,
        user_query=state["user_query"],
    )

    response = await llm.ainvoke([HumanMessage(content=prompt)])

    try:
        parsed = json.loads(response.content)
    except json.JSONDecodeError:
        logger.warning(
            "[collect_requirements] Failed to parse LLM response: %s", response.content
        )
        parsed = {
            "updated_requirements": state.get("collected_requirements", ""),
            "has_enough_info": False,
            "response": "Could you tell me more about what tyres you're looking for?",
        }

    has_enough = parsed.get("has_enough_info", False)
    new_phase = "confirming" if has_enough else "collecting"

    elapsed = time.perf_counter() - t0
    logger.info(
        "[collect_requirements] DONE  | has_enough=%s | next_phase=%s | turn=%d | elapsed=%.2fs | updated_requirements=%r",
        has_enough,
        new_phase,
        collecting_turns + 1,
        elapsed,
        str(parsed.get("updated_requirements") or "")[:120],
    )
    return {
        "collected_requirements": parsed.get(
            "updated_requirements",
            state.get("collected_requirements", ""),
        ),
        "collect_response_text": parsed.get("response", ""),
        "conversation_phase": new_phase,
        "collecting_turns": collecting_turns + 1,
        "is_complete": False,
    }


# ---------------------------------------------------------------------------
# Node: enhance_query (updated to use collected_requirements)
# ---------------------------------------------------------------------------
async def enhance_query(state: AgentState) -> dict:
    """Enhance the collected requirements into a detailed search query."""
    t0 = time.perf_counter()
    logger.info(
        "[enhance_query] START | query=%r | collected_requirements=%r",
        state["user_query"],
        (state.get("collected_requirements") or "")[:120],
    )

    llm = _get_llm(temperature=0.1)
    chat_history = _format_chat_history(state.get("chat_history", []))

    prompt = ENHANCE_QUERY_PROMPT.format(
        chat_history=chat_history,
        collected_requirements=state.get("collected_requirements", ""),
        user_query=state["user_query"],
    )

    response = await llm.ainvoke([HumanMessage(content=prompt)])

    try:
        parsed = json.loads(response.content)
        enhanced = parsed.get(
            "enhanced_query", state.get("collected_requirements", state["user_query"])
        )
    except json.JSONDecodeError:
        logger.warning(
            "[enhance_query] Failed to parse LLM response, using collected requirements"
        )
        enhanced = state.get("collected_requirements", state["user_query"])

    elapsed = time.perf_counter() - t0
    logger.info(
        "[enhance_query] DONE  | enhanced_query=%r | elapsed=%.2fs",
        enhanced[:150],
        elapsed,
    )
    return {"enhanced_query": enhanced}


# ---------------------------------------------------------------------------
# Node: plan_search
# ---------------------------------------------------------------------------
async def plan_search(state: AgentState) -> dict:
    """Plan the search strategy and answer guidance using the planning model."""
    t0 = time.perf_counter()
    logger.info(
        "[plan_search] START | enhanced_query=%r | model=%s",
        state["enhanced_query"][:150],
        settings.openai_planning_model,
    )

    llm = _get_planning_llm()
    chat_history = _format_chat_history(state.get("chat_history", []))

    prompt = PLAN_SEARCH_PROMPT.format(
        chat_history=chat_history,
        collected_requirements=state.get("collected_requirements", "(none)"),
        user_query=state["user_query"],
        enhanced_query=state["enhanced_query"],
    )

    response = await llm.ainvoke([HumanMessage(content=prompt)])

    try:
        plan = json.loads(response.content)
    except json.JSONDecodeError:
        logger.warning(
            "[plan_search] Failed to parse LLM response, falling back to broad search"
        )
        plan = {
            "sub_queries": [{"query": state["enhanced_query"], "attributes": None}],
            "filters": {},
            "strategy_reasoning": "Fallback: broad search across all attributes",
            "answer_guidance": "Provide a helpful, general recommendation based on the search results.",
        }

    sub_queries = [
        sq["query"] for sq in plan.get("sub_queries", []) if isinstance(sq, dict)
    ]
    if not sub_queries:
        sub_queries = [state["enhanced_query"]]

    answer_guidance = plan.get(
        "answer_guidance",
        "Provide a helpful recommendation based on the search results.",
    )

    elapsed = time.perf_counter() - t0
    logger.info(
        "[plan_search] DONE  | sub_queries=%d | filters=%s | strategy=%s | elapsed=%.2fs",
        len(sub_queries),
        list(plan.get("filters", {}).keys()) or "none",
        plan.get("strategy_reasoning", "N/A")[:120],
        elapsed,
    )
    logger.info("[plan_search] sub_queries=%s", sub_queries)
    logger.info("[plan_search] answer_guidance=%s", answer_guidance[:150])
    return {
        "search_plan": plan,
        "sub_queries": sub_queries,
        "answer_guidance": answer_guidance,
    }


# ---------------------------------------------------------------------------
# Node: search_products (unchanged)
# ---------------------------------------------------------------------------
async def search_products(state: AgentState) -> dict:
    """Execute the search plan: attribute-targeted queries + exact filters.

    Sub-queries run concurrently via asyncio.to_thread (FAISS search is sync).
    """
    t0 = time.perf_counter()
    plan = state.get("search_plan", {})
    logger.info(
        "[search_products] START | sub_queries_in_plan=%d | filters=%s | top_k=%d",
        len(plan.get("sub_queries", [])),
        list(plan.get("filters", {}).keys()) or "none",
        settings.top_k_search,
    )

    sub_queries = []
    for sq in plan.get("sub_queries", []):
        if isinstance(sq, dict):
            sub_queries.append((sq.get("query", ""), sq.get("attributes") or None))
        else:
            sub_queries.append((str(sq), None))

    async def _run_search(query: str, attributes: list[str] | None) -> list[dict]:
        logger.debug(
            "[search_products] running sub-query: %r (attributes=%s)", query, attributes
        )
        results = await asyncio.to_thread(
            tyre_store.search, query, settings.top_k_search, attributes
        )
        for r in results:
            r["matched_sub_query"] = query
        logger.debug(
            "[search_products] sub-query %r returned %d results", query, len(results)
        )
        return results

    batch_results = await asyncio.gather(
        *(_run_search(q, attrs) for q, attrs in sub_queries)
    )

    all_results: list[dict] = []
    seen_ids: set[str] = set()
    for results in batch_results:
        for r in results:
            pid = r["product"]["id"]
            if pid not in seen_ids:
                seen_ids.add(pid)
                all_results.append(r)

    logger.info(
        "[search_products] semantic search yielded %d unique results", len(all_results)
    )

    filters = plan.get("filters", {})
    filter_kwargs = {k: v for k, v in filters.items() if v is not None}
    if filter_kwargs:
        logger.info("[search_products] applying exact filters: %s", filter_kwargs)
        filter_results = await asyncio.to_thread(
            lambda: tyre_store.filter_products(**filter_kwargs)
        )
        added_from_filter = 0
        for r in filter_results:
            pid = r["product"]["id"]
            if pid not in seen_ids:
                seen_ids.add(pid)
                r["matched_sub_query"] = "exact_filter"
                all_results.append(r)
                added_from_filter += 1
        logger.info(
            "[search_products] exact filters added %d new results", added_from_filter
        )

    if not all_results:
        logger.warning(
            "[search_products] no results found, running fallback broad search"
        )
        fallback_results = await asyncio.gather(
            *(_run_search(sq, None) for sq in state.get("sub_queries", []))
        )
        for results in fallback_results:
            for r in results:
                pid = r["product"]["id"]
                if pid not in seen_ids:
                    seen_ids.add(pid)
                    all_results.append(r)
        logger.info(
            "[search_products] fallback search yielded %d results", len(all_results)
        )

    elapsed = time.perf_counter() - t0
    logger.info(
        "[search_products] DONE  | total_results=%d | elapsed=%.2fs",
        len(all_results),
        elapsed,
    )
    return {"search_results": all_results}


# ---------------------------------------------------------------------------
# Node: rerank (unchanged)
# ---------------------------------------------------------------------------
async def rerank(state: AgentState) -> dict:
    """Re-rank the combined search results."""
    t0 = time.perf_counter()
    input_count = len(state.get("search_results", []))
    logger.info(
        "[rerank] START | input_results=%d | top_k=%d | query=%r",
        input_count,
        settings.top_k_rerank,
        (state.get("enhanced_query") or state["user_query"])[:120],
    )

    ranked = await rerank_results(
        query=state.get("enhanced_query", state["user_query"]),
        results=state.get("search_results", []),
        top_k=settings.top_k_rerank,
    )

    elapsed = time.perf_counter() - t0
    top_scores = [f"{r.get('rerank_score', 0):.3f}" for r in ranked[:5]]
    top_ids = [r["product"]["id"] for r in ranked[:5] if "product" in r]
    logger.info(
        "[rerank] DONE  | output_results=%d | top_scores=%s | top_ids=%s | elapsed=%.2fs",
        len(ranked),
        top_scores,
        top_ids,
        elapsed,
    )
    return {"ranked_results": ranked}


# ---------------------------------------------------------------------------
# Node: generate_answer
# ---------------------------------------------------------------------------
async def generate_answer(state: AgentState) -> dict:
    """Generate a final answer using the ranked results and answer guidance."""
    t0 = time.perf_counter()
    ranked = state.get("ranked_results", [])
    logger.info(
        "[generate_answer] START | ranked_results=%d | query=%r | answer_guidance=%r",
        len(ranked),
        state["user_query"],
        (state.get("answer_guidance") or "")[:120],
    )

    llm = _get_planning_llm(temperature=0.3)
    chat_history = _format_chat_history(state.get("chat_history", []))

    id_set = {
        r["product"]["id"] for r in ranked if isinstance(r, dict) and "product" in r
    }

    results_text = ""
    for i, r in enumerate(ranked, 1):
        p = r["product"]
        score_pct = r.get("rerank_score", 0.0) * 100
        vehicles = ", ".join(p.get("compatible_vehicles", []))
        features = ". ".join(p.get("features_benefits", [])[:3])
        results_text += (
            f"\n{i}. [{p['id']}] {p['brand']}  [relevance: {score_pct:.0f}%]\n"
            f"   Price: ₹{p['price']:,.0f}\n"
            f"   Compatible vehicles: {vehicles}\n"
            f"   Description: {p.get('product_description', '')[:300]}\n"
            f"   Key features: {features}\n"
            f"   Why relevant: {r.get('relevance_reason', 'N/A')}\n"
        )

    if not results_text:
        results_text = "No matching products found in the database."
        logger.warning("[generate_answer] No ranked results to present")

    answer_guidance = state.get(
        "answer_guidance",
        "Provide a helpful recommendation based on the search results.",
    )

    prompt = ANSWER_GENERATION_PROMPT.format(
        answer_guidance=answer_guidance,
        collected_requirements=state.get("collected_requirements", "(none)"),
        chat_history=chat_history,
        user_query=state["user_query"],
        enhanced_query=state.get("enhanced_query", state["user_query"]),
        search_results=results_text,
    )

    response = await llm.ainvoke([HumanMessage(content=prompt)])

    raw_answer = response.content
    recommended_ids: list[str] = []

    rec_match = re.search(r"RECOMMENDED:\s*(\[.*?\])", raw_answer, re.DOTALL)
    if rec_match:
        try:
            parsed_ids = json.loads(rec_match.group(1))
            recommended_ids = [pid for pid in parsed_ids if pid in id_set]
        except (json.JSONDecodeError, TypeError):
            logger.warning(
                "[generate_answer] Failed to parse RECOMMENDED ids from answer"
            )
        clean_answer = raw_answer[: rec_match.start()].rstrip()
    else:
        clean_answer = raw_answer
        logger.warning(
            "[generate_answer] No RECOMMENDED line found, falling back to all ranked IDs"
        )
        recommended_ids = list(id_set)

    elapsed = time.perf_counter() - t0
    logger.info(
        "[generate_answer] DONE  | recommended_ids=%s | answer_len=%d | elapsed=%.2fs",
        recommended_ids,
        len(clean_answer),
        elapsed,
    )
    return {
        "final_answer": clean_answer,
        "recommended_ids": recommended_ids,
        "conversation_phase": "idle",
        "is_complete": True,
    }
