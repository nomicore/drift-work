import asyncio
import json
import logging

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.config import settings

logger = logging.getLogger(__name__)

RERANK_SYSTEM_PROMPT = """\
You are a car tyre product relevance scorer. Given a user query and a product description,
rate the relevance on a scale of 0.0 to 1.0.

Consider:
- Tyre size match (width, aspect ratio, rim diameter)
- Vehicle compatibility
- Brand / model preference
- Budget range if mentioned (prices are in ₹ INR)
- Use case (city driving, highway, off-road, performance, all-season)
- Key features (durability, wet grip, fuel efficiency, noise level)

Return ONLY a JSON object: {"score": <float>, "reason": "<one-line reason>"}
"""


async def _score_single(
    llm: ChatOpenAI,
    query: str,
    result: dict,
) -> dict:
    """Score a single result against the query. Runs as one concurrent task."""
    user_msg = f"User query: {query}\n\nProduct: {result['text']}"
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

    combined_score = 0.4 * result.get("score", 0.0) + 0.6 * llm_score
    return {
        **result,
        "rerank_score": combined_score,
        "llm_relevance": llm_score,
        "relevance_reason": reason,
    }


async def rerank_results(
    query: str,
    results: list[dict],
    top_k: int | None = None,
) -> list[dict]:
    """Re-rank search results using concurrent LLM-based relevance scoring."""
    k = top_k or settings.top_k_rerank
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

    scored_list = sorted(scored, key=lambda x: x["rerank_score"], reverse=True)
    return scored_list[:k]
