# WheelFinder AI — Alloy Wheel Shopping Assistant

Demo: https://www.loom.com/share/73c54fa02d2843ada5c05dfae950891f

An AI-powered shopping assistant for alloy wheels, built with **LangGraph**, **FastAPI**, **FAISS**, and **React** (with an alternate **Streamlit** chat UI).

## Architecture

```
┌───────────────────┐       ┌──────────────────────────────────────────────────────┐
│    React SPA      │       │                  FastAPI Backend                      │
│  (Vite + React)   │ HTTP  │                                                      │
│  Product listing  │◄─────►│  ┌──────────────────────────────────────────────────┐ │
│  Product detail   │       │  │            LangGraph Workflow                     │ │
│  Chat panel       │       │  │                                                  │ │
├───────────────────┤       │  │  START ──► classify_intent                       │ │
│  Streamlit        │       │  │              │                                   │ │
│  (alt chat UI)    │◄──────│  │  ┌───────────┼───────────────┐                   │ │
└───────────────────┘       │  │  │           │               │                   │ │
                            │  │  ▼           ▼               ▼                   │ │
                            │  │ chitchat   collect       enhance_query           │ │
                            │  │ _response  _requirements     │                   │ │
                            │  │  │           │               ▼                   │ │
                            │  │  ▼           ▼          plan_search              │ │
                            │  │  END        END*             │                   │ │
                            │  │          (or search          ▼                   │ │
                            │  │           auto-fires)  search_products           │ │
                            │  │                              │                   │ │
                            │  │                              ▼                   │ │
                            │  │                           rerank                 │ │
                            │  │                              │                   │ │
                            │  │                              ▼                   │ │
                            │  │                       generate_answer            │ │
                            │  │                              │                   │ │
                            │  │                              ▼                   │ │
                            │  │                             END                  │ │
                            │  └──────────────────────────────────────────────────┘ │
                            └──────────────────────────────────────────────────────┘
```

## Workflow Nodes

| Node | Description |
|------|-------------|
| **classify_intent** | Routes the user message into one of three intents: `chitchat`, `collect`, or `search`. |
| **chitchat_response** | Handles greetings, off-topic, and general conversation. |
| **collect_requirements** | Gathers wheel requirements (size, colour, brand, style, budget). As soon as actionable info is present it automatically proceeds to search — no confirmation step. If the message contains nothing actionable, it asks one focused follow-up question and returns to the user. |
| **enhance_query** | Enriches the collected requirements with inferred details (typical wheel specs, PCD, material preferences). |
| **plan_search** | Decomposes the enhanced query into focused sub-queries, each targeting specific product attributes. Uses a dedicated planning model. |
| **search_products** | Runs each sub-query concurrently against FAISS attribute-level indices, then deduplicates results. |
| **rerank** | Re-ranks results with an LLM relevance pass, selecting the top-K products. |
| **generate_answer** | Produces a concise recommendation with product details and recommended product IDs. |

## Setup

### 1. Install dependencies

**Backend (Python):**

```bash
pip install -r requirements.txt
```

**Frontend (Node):**

```bash
cd frontend && npm install
```

### 2. Configure environment

```bash
cp .env_example .env
# Edit .env and add your OpenAI API key
```

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | **Required.** Your OpenAI API key. | — |
| `OPENAI_MODEL` | Main LLM for intent classification, collection, and chitchat. | `gpt-4.1` |
| `OPENAI_PLANNING_MODEL` | LLM for search planning and answer generation. | `gpt-5.4` |
| `OPENAI_RERANK_MODEL` | LLM for result re-ranking. | `gpt-5.4-mini` |
| `OPENAI_EMBEDDING_MODEL` | Embedding model for FAISS indexing and queries. | `text-embedding-3-large` |
| `EMBEDDING_DIMENSION` | Embedding vector dimension. | `1536` |
| `MAX_COLLECTING_TURNS` | Max requirement-collection turns before auto-searching. | `3` |
| `TOP_K_SEARCH` | Number of candidates retrieved per sub-query. | `10` |
| `TOP_K_RERANK` | Number of products kept after re-ranking. | `5` |
| `FAL_KEY` | fal.ai API key for the "Fit it on my ride" AI image generation feature. Get one at [fal.ai](https://fal.ai). | — |
| `PASSPHRASE` | **Required for access.** Secret passphrase users must enter to unlock the demo. Set to any string. | — |
| `SESSION_DAYS` | How many days the session cookie stays valid after a successful login. | `7` |

### 3. Start the backend

```bash
make run
# or: uvicorn app.main:app --reload --port 8000
```

On first startup the FAISS index is built from the wheel catalogue JSON — this requires a valid `OPENAI_API_KEY` for embedding generation.

### 4. Start the frontend

**React (recommended):**

```bash
make run-fe
# or: cd frontend && npm run dev
```

**Streamlit (alternate chat-only UI):**

```bash
streamlit run streamlit_app.py
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | Send a message to the assistant |
| POST | `/reset/{session_id}` | Reset a chat session |
| GET | `/health` | Health check |

### Chat Request

```json
{
  "session_id": "uuid-string",
  "message": "Show me 18\" black multi-spoke wheels under $300",
  "product_context": {
    "id": "42",
    "brand": "JR Wheels",
    "name": "JR11 18x8.5 Black",
    "price": "249.00",
    "compatible_vehicles": "BMW 3 Series, VW Golf",
    "product_description": "Lightweight multi-spoke alloy...",
    "features_benefits": "Flow-formed construction., High load rating.",
    "wheel_size": "18",
    "wheel_width": "8.5",
    "colour": "Black",
    "wheel_style": "Multi-spoke",
    "wheel_model_name": "JR11",
    "wheel_stud_pattern_pcd": "5x120"
  }
}
```

`product_context` is optional — the React frontend sends it when the user is viewing a product detail page, giving the assistant full context about the product currently on screen.

### Chat Response

```json
{
  "session_id": "uuid-string",
  "response": "Here are my top recommendations...",
  "needs_clarification": false,
  "is_final_answer": true,
  "is_chitchat": false,
  "recommended_product_ids": ["12", "7", "35"]
}
```

| Field | Meaning |
|-------|---------|
| `needs_clarification` | `true` when the assistant needs one more detail before it can search. |
| `is_final_answer` | `true` when the search pipeline completed and results are returned. |
| `is_chitchat` | `true` for general conversation (no product search). |
| `recommended_product_ids` | IDs of the best-matching products. In the React UI these are highlighted in the listing and rendered as a scrollable inline carousel in the chat. |

## Docker

Build and run the entire app (API + frontend) as a single container:

```bash
cp .env_example .env   # add your OPENAI_API_KEY
docker compose up --build
```

The app is available at `http://localhost:8000` — the FastAPI backend serves the React SPA and all API routes from the same origin.

To run with plain Docker:

```bash
docker build -t tyre-finder .
docker run --env-file .env -p 8000:8000 tyre-finder
```

## Tech Stack

**Backend**
- **FastAPI** + **Uvicorn** — HTTP server
- **LangGraph** — Agent workflow orchestration
- **LangChain** + **OpenAI** — LLM calls and embeddings
- **FAISS** (`faiss-cpu`) — Vector similarity search with per-attribute indices
- **Pydantic v2** + **pydantic-settings** — Config and validation

**Frontend**
- **React 19** + **React Router 7** — SPA with product listing, detail, and floating chat panel
- **Vite** — Dev server and bundler

**Alternate UI**
- **Streamlit** — Standalone chat interface (same `/chat` API)
