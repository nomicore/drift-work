import asyncio
import json
import logging

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.config import settings
from app.search.faiss_store import ATTRIBUTE_FIELDS

logger = logging.getLogger(__name__)

RERANK_SYSTEM_PROMPT = """\
You are a car tyre product relevance scorer. Given a user query, a product description,
and per-attribute similarity scores, rate the overall relevance on a scale of 0.0 to 1.0.

Consider:
- Tyre size match (width, aspect ratio, rim diameter)
- Vehicle compatibility
- Brand / model preference
- Budget range if mentioned (prices are in ₹ INR)
- Use case (city driving, highway, off-road, performance, all-season)
- Key features (durability, wet grip, fuel efficiency, noise level)
- Wheel specs (size, width, colour, style, PCD)
- How many attribute dimensions matched strongly (breadth of match)

Return ONLY a JSON object: {"score": <float>, "reason": "<one-line reason>"}
"""

_TOTAL_ATTRIBUTES = len(ATTRIBUTE_FIELDS)
_ATTR_COVERAGE_WEIGHT = 0.15
_FAISS_WEIGHT = 0.30
_LLM_WEIGHT = 0.55


def _format_attribute_scores(matched_attributes: dict[str, float]) -> str:
    if not matched_attributes:
        return "No per-attribute scores available."
    lines = [f"  {attr}: {score:.3f}" for attr, score in matched_attributes.items()]
    return "Per-attribute similarity scores:\n" + "\n".join(lines)


def _attribute_coverage_score(matched_attributes: dict[str, float]) -> float:
    """Ratio of strongly-matched attributes (score > 0.5) to total attribute count."""
    if not matched_attributes:
        return 0.0
    strong = sum(1 for s in matched_attributes.values() if s > 0.5)
    return strong / _TOTAL_ATTRIBUTES


async def _score_single(
    llm: ChatOpenAI,
    query: str,
    result: dict,
) -> dict:
    attr_info = _format_attribute_scores(result.get("matched_attributes", {}))
    user_msg = (
        f"User query: {query}\n\n"
        f"Product: {result['text']}\n\n"
        f"{attr_info}"
    )
    try:
        response = await llm.ainvoke(
            [
                SystemMessage(content=RERANK_SYSTEM_PROMPT),
                HumanMessage(content=user_msg),
            ]
        )
        parsed = json.loads(response.content)
        llm_score = float(parsed.get("score", 0.0))
        reason = parsed.get("reason", "")
    except (json.JSONDecodeError, ValueError):
        llm_score = 0.0
        reason = "Could not parse relevance score"
    except Exception:
        logger.exception("Rerank LLM call failed for product %s", result.get("product", {}).get("id"))
        llm_score = 0.0
        reason = "LLM scoring failed"

    faiss_score = result.get("score", 0.0)
    coverage = _attribute_coverage_score(result.get("matched_attributes", {}))
    combined_score = (
        _FAISS_WEIGHT * faiss_score
        + _LLM_WEIGHT * llm_score
        + _ATTR_COVERAGE_WEIGHT * coverage
    )
    return {
        **result,
        "rerank_score": round(combined_score, 4),
        "llm_relevance": llm_score,
        "attribute_coverage": round(coverage, 4),
        "relevance_reason": reason,
    }


async def rerank_results(
    query: str,
    results: list[dict],
    top_k: int | None = None,
    min_score: float | None = None,
) -> list[dict]:
    """Re-rank search results using concurrent LLM-based relevance scoring.

    Results below `min_score` are discarded before the top-k cut.
    """
    k = top_k or settings.top_k_rerank
    threshold = min_score if min_score is not None else settings.rerank_min_score
    if not results:
        return []

    llm = ChatOpenAI(
        model=settings.openai_rerank_model,
        openai_api_key=settings.openai_api_key,
        temperature=0.0,
    )

    scored = await asyncio.gather(
        *(_score_single(llm, query, r) for r in results)
    )

    qualified = [r for r in scored if r["rerank_score"] >= threshold]

    if not qualified:
        logger.info(
            "All %d results fell below rerank threshold %.2f for query %r",
            len(scored),
            threshold,
            query[:120],
        )

    qualified.sort(key=lambda x: x["rerank_score"], reverse=True)
    return qualified[:k]
