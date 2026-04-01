import logging
from pathlib import Path
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.models import ChatRequest, ChatResponse
from app.agent.graph import workflow
from app.search.faiss_store import tyre_store

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sessions: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    logger.info("Initializing FAISS index...")
    tyre_store.load_or_build()
    logger.info("FAISS index ready with %d products", len(tyre_store._products))
    yield


app = FastAPI(
    title="Car Tyre Shopping Assistant",
    description="AI-powered assistant for finding the perfect car tyres",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_session(session_id: str) -> dict:
    if session_id not in sessions:
        sessions[session_id] = {
            "chat_history": [],
            "conversation_phase": "idle",
            "collected_requirements": "",
            "collecting_turns": 0,
        }
    return sessions[session_id]


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Process a chat message through the agent workflow."""
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    session = _get_session(request.session_id)

    filter_context = ""
    if request.filters:
        parts = []
        if request.filters.brands:
            parts.append(f"brands: {', '.join(request.filters.brands)}")
        if request.filters.price_min is not None:
            parts.append(f"min price: ${request.filters.price_min:,.2f}")
        if request.filters.price_max is not None:
            parts.append(f"max price: ${request.filters.price_max:,.2f}")
        if request.filters.sizes:
            parts.append(f"wheel sizes: {', '.join(request.filters.sizes)}")
        if request.filters.widths:
            parts.append(f"wheel widths: {', '.join(request.filters.widths)}")
        if request.filters.colours:
            parts.append(f"colours: {', '.join(request.filters.colours)}")
        if parts:
            filter_context = f" [Active filters — {'; '.join(parts)}]"

    product_context = ""
    if request.product_context:
        pc = request.product_context
        specs = "; ".join(
            filter(
                None,
                [
                    f"wheel size: {pc.wheel_size}" if pc.wheel_size else "",
                    f"wheel width: {pc.wheel_width}" if pc.wheel_width else "",
                    f"colour: {pc.colour}" if pc.colour else "",
                    f"style: {pc.wheel_style}" if pc.wheel_style else "",
                    f"PCD: {pc.wheel_stud_pattern_pcd}" if pc.wheel_stud_pattern_pcd else "",
                    f"model: {pc.wheel_model_name}" if pc.wheel_model_name else "",
                ],
            )
        )
        product_context = (
            f" [Currently viewing product — "
            f"name: {pc.name}; brand: {pc.brand}; price: ${pc.price}; "
            f"{specs}; "
            f"vehicles: {pc.compatible_vehicles}; "
            f"description: {pc.product_description[:200]}; "
            f"features: {pc.features_benefits[:200]}]"
        )

    user_message = request.message + filter_context + product_context
    session["chat_history"].append({"role": "user", "content": user_message})

    graph_input = {
        "user_query": user_message,
        "chat_history": session["chat_history"],
        "intent": "",
        "conversation_phase": session["conversation_phase"],
        "collected_requirements": session["collected_requirements"],
        "collecting_turns": session["collecting_turns"],
        "chitchat_response_text": "",
        "collect_response_text": "",
        "enhanced_query": "",
        "search_plan": {},
        "sub_queries": [],
        "search_results": [],
        "ranked_results": [],
        "final_answer": "",
        "recommended_ids": [],
        "is_complete": False,
    }

    try:
        result = await workflow.ainvoke(graph_input)
    except Exception as e:
        logger.exception("Workflow execution failed")
        raise HTTPException(status_code=500, detail=f"Agent error: {e}") from e

    intent = result.get("intent", "chitchat")
    session["conversation_phase"] = result.get(
        "conversation_phase",
        session["conversation_phase"],
    )
    session["collected_requirements"] = result.get(
        "collected_requirements",
        session["collected_requirements"],
    )
    session["collecting_turns"] = result.get(
        "collecting_turns",
        session["collecting_turns"],
    )

    if intent == "chitchat":
        response_text = result.get("chitchat_response_text", "Hey! How can I help you?")
        session["chat_history"].append({"role": "assistant", "content": response_text})
        # Reset collecting state when user goes back to chitchat
        session["conversation_phase"] = "idle"
        session["collected_requirements"] = ""
        session["collecting_turns"] = 0
        return ChatResponse(
            session_id=request.session_id,
            response=response_text,
            is_chitchat=True,
        )

    if intent == "collect":
        response_text = result.get(
            "collect_response_text",
            "Could you tell me more about what tyres you're looking for?",
        )
        session["chat_history"].append({"role": "assistant", "content": response_text})
        return ChatResponse(
            session_id=request.session_id,
            response=response_text,
            needs_clarification=True,
        )

    # intent == "search" → full pipeline completed
    response_text = result.get(
        "final_answer",
        "I couldn't find a good answer. Please try again.",
    )
    session["chat_history"].append({"role": "assistant", "content": response_text})

    recommended_ids = result.get("recommended_ids", [])

    session["conversation_phase"] = "idle"
    session["collected_requirements"] = ""
    session["collecting_turns"] = 0
    return ChatResponse(
        session_id=request.session_id,
        response=response_text,
        is_final_answer=True,
        recommended_product_ids=recommended_ids,
    )


@app.post("/reset/{session_id}")
async def reset_session(session_id: str) -> dict[str, str]:
    """Clear a chat session."""
    sessions.pop(session_id, None)
    return {"status": "session reset", "session_id": session_id}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


STATIC_DIR = Path(__file__).resolve().parent / "static"

if STATIC_DIR.is_dir():
    app.mount(
        "/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="static-assets"
    )

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str) -> FileResponse:
        file = STATIC_DIR / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(STATIC_DIR / "index.html")
