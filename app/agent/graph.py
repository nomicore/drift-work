"""LangGraph workflow for the car wheel shopping assistant.

Flow:
  START -> classify_intent
    intent == "chitchat"  -> chitchat_response -> END
    intent == "collect"   -> collect_requirements -> END  (returns to user)
    intent == "search"    -> enhance_query -> plan_search -> search_products
                          -> rerank -> generate_answer -> END
"""

from langgraph.graph import StateGraph, END

from app.agent.state import AgentState
from app.agent.nodes import (
    classify_intent,
    chitchat_response,
    collect_requirements,
    enhance_query,
    plan_search,
    search_products,
    rerank,
    generate_answer,
)


def _route_after_classify(state: AgentState) -> str:
    intent = state.get("intent", "chitchat")
    if intent == "search":
        return "enhance_query"
    if intent == "collect":
        return "collect_requirements"
    return "chitchat_response"


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("classify_intent", classify_intent)
    graph.add_node("chitchat_response", chitchat_response)
    graph.add_node("collect_requirements", collect_requirements)
    graph.add_node("enhance_query", enhance_query)
    graph.add_node("plan_search", plan_search)
    graph.add_node("search_products", search_products)
    graph.add_node("rerank", rerank)
    graph.add_node("generate_answer", generate_answer)

    graph.set_entry_point("classify_intent")

    graph.add_conditional_edges(
        "classify_intent",
        _route_after_classify,
        {
            "chitchat_response": "chitchat_response",
            "collect_requirements": "collect_requirements",
            "enhance_query": "enhance_query",
        },
    )

    graph.add_edge("chitchat_response", END)
    graph.add_edge("collect_requirements", END)
    graph.add_edge("enhance_query", "plan_search")
    graph.add_edge("plan_search", "search_products")
    graph.add_edge("search_products", "rerank")
    graph.add_edge("rerank", "generate_answer")
    graph.add_edge("generate_answer", END)

    return graph.compile()


workflow = build_graph()
