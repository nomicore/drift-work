import hmac
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import Cookie, FastAPI, HTTPException, Response
from openai import AsyncOpenAI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
import httpx
from app.models import (
    ChatRequest, ChatResponse,
    LoginRequest,
    VehicleImageRequest, VehicleAnalysisResponse,
    VisualizeWheelRequest, VisualizeWheelResponse,
)
from app.agent.graph import workflow
from app.search.faiss_store import tyre_store

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sessions: dict[str, dict] = {}
auth_tokens: dict[str, datetime] = {}  # token → expiry

AUTH_COOKIE = "dw_session"


def _issue_token() -> str:
    return secrets.token_hex(32)


def _token_valid(token: str | None) -> bool:
    if not token:
        return False
    expiry = auth_tokens.get(token)
    if not expiry:
        return False
    if datetime.now(timezone.utc) > expiry:
        auth_tokens.pop(token, None)
        return False
    return True


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
        "auto_search": False,
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


_OFF_ROAD = {"Wrangler", "Gladiator", "F-150", "Land Cruiser", "Grand Cherokee",
             "Cherokee", "Compass", "Renegade", "Explorer"}
_SPORTS   = {"Mustang", "M3", "AMG GT", "RS6", "Supra", "NSX", "Stinger", "GR86", "M3"}
_ELECTRIC = {"IONIQ 5", "EV6", "ID.4"}
_LUXURY   = {"A6", "E-Class", "GLE", "GLC", "Q7", "X5", "5 Series", "S-Class", "GLE"}


def _scene_for(model: str) -> str:
    if model in _OFF_ROAD:
        return "parked on a flat dirt trail with light desert scrub in the background, overcast natural light"
    if model in _SPORTS:
        return "parked on a smooth tarmac road with a coastal cliff backdrop, soft overcast daylight"
    if model in _ELECTRIC:
        return "parked on a clean concrete surface in a modern urban setting, soft overcast daylight"
    if model in _LUXURY:
        return "parked on a smooth asphalt road with a tree-lined boulevard in the background, soft daylight"
    return "parked on a clean asphalt surface, neutral grey background, soft diffused daylight"


@app.post("/visualize-wheel", response_model=VisualizeWheelResponse)
async def visualize_wheel(request: VisualizeWheelRequest) -> VisualizeWheelResponse:
    """Generate an AI image of the user's car wearing the selected wheel using fal.ai."""
    if not settings.fal_key:
        raise HTTPException(status_code=500, detail="FAL_KEY is not configured")

    scene = _scene_for(request.vehicle_model)

    colour_clause = f" in {request.vehicle_colour}" if request.vehicle_colour else ""
    wheel_spec = " ".join(filter(None, [
        request.wheel_brand,
        request.wheel_name,
        request.wheel_size and f"{request.wheel_size} diameter",
        request.wheel_width and f"{request.wheel_width} width",
        request.wheel_colour and f"in {request.wheel_colour}",
    ]))

    # Kontext prompt: an editing instruction starting from the wheel reference image.
    # Explicitly decouple wheel colour from car body colour.
    car_colour_instruction = (
        f"The car body paint must be exactly {request.vehicle_colour}, not the colour of the wheel."
        if request.vehicle_colour
        else "Use the factory default body colour for this vehicle."
    )
    kontext_prompt = (
        f"Using the alloy wheel shown in this image as the reference, generate a photorealistic "
        f"image of a completely stock {request.vehicle_year} {request.vehicle_make} {request.vehicle_model} "
        f"fitted with these exact wheels — reproducing every spoke shape, groove, cutout pattern, "
        f"and surface finish of the reference wheel precisely. "
        f"IMPORTANT: {car_colour_instruction} "
        "Do NOT apply the wheel's colour or finish to the car body. "
        f"The car body colour comes from the text instructions only. "
        f"Show the full car from a front three-quarter angle, driver's side, slightly low angle "
        f"so all four wheels are clearly visible. Setting: {scene}. "
        "Completely factory-standard vehicle, no modifications. "
        "Photorealistic, natural daylight, sharp focus, 4K quality."
    )

    # Fallback prompt used when no wheel image is available (text-only generation)
    fallback_prompt = (
        f"Clean professional automotive photograph of a completely stock, unmodified "
        f"{request.vehicle_year} {request.vehicle_make} {request.vehicle_model}{colour_clause}, "
        f"fitted with {wheel_spec} alloy wheels. "
        "Camera angle: front three-quarter view from the driver's side, slightly low angle. "
        f"Setting: {scene}. Factory-standard, no modifications. "
        "Natural soft daylight, sharp focus, 4K quality."
    )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Download the wheel image and encode it as a base64 data URI so it can
            # be passed directly to Kontext without needing a public upload host.
            # Retry up to 3 times; fall back to text-only if all attempts fail.
            fal_image_url = None
            if request.wheel_image_url:
                for attempt in range(1, 4):
                    try:
                        img_resp = await client.get(
                            request.wheel_image_url,
                            headers={"Referer": "https://driftworks.com/"},
                            follow_redirects=True,
                            timeout=20.0,
                        )
                        if img_resp.status_code != 200:
                            raise ValueError(f"Image fetch returned HTTP {img_resp.status_code}")
                        content_type = img_resp.headers.get("content-type", "image/jpeg").split(";")[0]
                        import base64 as _b64
                        b64 = _b64.b64encode(img_resp.content).decode()
                        fal_image_url = f"data:{content_type};base64,{b64}"
                        break  # success
                    except Exception as exc:
                        logger.warning("Wheel image fetch attempt %d/3 failed: %s", attempt, exc)

                if not fal_image_url:
                    logger.warning(
                        "All 3 wheel image fetch attempts failed for URL %s — "
                        "falling back to text-only generation.",
                        request.wheel_image_url,
                    )

            # Route to Kontext (image-guided) when we have the wheel photo,
            # or fall back to flux-pro/v1.1-ultra text-only when we don't.
            if fal_image_url:
                endpoint = "https://fal.run/fal-ai/flux-pro/kontext"
                payload: dict = {
                    "prompt": kontext_prompt,
                    "image_url": fal_image_url,
                    "num_images": 1,
                    "output_format": "jpeg",
                    "guidance_scale": 3.5,
                    "num_inference_steps": 28,
                    "image_size": "landscape_16_9",
                    "sync_mode": True,
                }
            else:
                endpoint = "https://fal.run/fal-ai/flux-pro/v1.1-ultra"
                payload = {
                    "prompt": fallback_prompt,
                    "num_images": 1,
                    "image_size": "landscape_16_9",
                    "sync_mode": True,
                    "enable_safety_checker": False,
                }

            resp = await client.post(
                endpoint,
                headers={"Authorization": f"Key {settings.fal_key}"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        logger.exception("fal.ai request failed")
        raise HTTPException(status_code=502, detail=f"Image generation failed: {e.response.text}") from e
    except Exception as e:
        logger.exception("fal.ai request failed")
        raise HTTPException(status_code=502, detail=f"Image generation error: {e}") from e

    images = data.get("images", [])
    if not images:
        raise HTTPException(status_code=502, detail="fal.ai returned no images")

    prompt_used = payload.get("prompt", "")
    return VisualizeWheelResponse(
        image_url=images[0]["url"],
        prompt_used=prompt_used,
    )


@app.post("/analyze-vehicle", response_model=VehicleAnalysisResponse)
async def analyze_vehicle(request: VehicleImageRequest) -> VehicleAnalysisResponse:
    """Use GPT-4o vision to identify make, model, year, and colour from a vehicle photo."""
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    colour_list = (
        "Black, White, Silver, Grey, Graphite, Pearl White, "
        "Navy Blue, Blue, Sky Blue, Teal, "
        "Red, Burgundy, "
        "Green, Sage Green, Olive Green, "
        "Orange, Yellow, "
        "Beige, Champagne, Brown, Bronze, "
        "Purple, Pink"
    )
    prompt = (
        "You are an expert automotive identifier. Analyse this vehicle image carefully.\n"
        "Return a JSON object with exactly these fields:\n"
        "- make: the manufacturer brand (e.g. 'Ford', 'BMW', 'Kia'). Always provide your best guess.\n"
        "- model: the specific model name (e.g. 'Picanto', 'Mustang', '3 Series'). "
        "Look at the body shape, badge, grille, lights, and any visible text. Always provide your best guess — do NOT leave blank.\n"
        "- year: estimated model year as a 4-digit string (e.g. '2023'). Best guess based on generation styling.\n"
        f"- colour: choose the single closest match from this list: {colour_list}. "
        "Pay close attention to the actual body paint — muted sage/mint greens should be 'Sage Green', grey-greens should be 'Olive Green', etc.\n"
        "- summary: one short sentence summarising what you detected, e.g. 'Detected a 2023 Kia Picanto in Sage Green'.\n"
        "Only use an empty string if a field is truly impossible to determine (e.g. make is completely hidden)."
    )

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{request.media_type};base64,{request.image_base64}",
                                "detail": "low",
                            },
                        },
                    ],
                }
            ],
            max_tokens=200,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
    except Exception as e:
        logger.exception("Vehicle image analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis error: {e}") from e

    return VehicleAnalysisResponse(
        make=data.get("make", ""),
        model=data.get("model", ""),
        year=str(data.get("year", "")),
        colour=data.get("colour", ""),
        summary=data.get("summary", ""),
    )


@app.post("/reset/{session_id}")
async def reset_session(session_id: str) -> dict[str, str]:
    """Clear a chat session."""
    sessions.pop(session_id, None)
    return {"status": "session reset", "session_id": session_id}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/login")
async def auth_login(request: LoginRequest, response: Response) -> dict[str, str]:
    """Validate passphrase and issue a session cookie."""
    if not settings.passphrase:
        raise HTTPException(status_code=500, detail="Passphrase not configured")
    if not hmac.compare_digest(request.passphrase, settings.passphrase):
        raise HTTPException(status_code=401, detail="Incorrect passphrase")
    token = _issue_token()
    expiry = datetime.now(timezone.utc) + timedelta(days=settings.session_days)
    auth_tokens[token] = expiry
    response.set_cookie(
        key=AUTH_COOKIE,
        value=token,
        max_age=settings.session_days * 86400,
        httponly=True,
        samesite="lax",
        secure=False,  # set to True when serving over HTTPS
    )
    return {"status": "ok"}


@app.get("/auth/check")
async def auth_check(dw_session: str | None = Cookie(default=None)) -> dict[str, bool]:
    """Return whether the current session cookie is valid."""
    return {"authenticated": _token_valid(dw_session)}


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
