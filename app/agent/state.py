from typing import Annotated
from operator import add

from typing_extensions import TypedDict


class AgentState(TypedDict):
    user_query: str
    chat_history: list[dict[str, str]]

    # Intent classification
    intent: str  # "chitchat" | "collect" | "search"

    # Conversation phase tracking
    conversation_phase: str  # "idle" | "collecting"
    collected_requirements: str
    collecting_turns: int

    # Chitchat
    chitchat_response_text: str

    # Requirement collection
    collect_response_text: str

    # Search pipeline
    enhanced_query: str
    search_plan: dict
    answer_guidance: str
    sub_queries: list[str]
    search_results: Annotated[list[dict], add]
    ranked_results: list[dict]
    final_answer: str
    recommended_ids: list[str]
    is_complete: bool
    auto_search: bool
