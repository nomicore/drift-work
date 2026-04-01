# TyreFinder AI — Car Tyre Shopping Assistant

Demo: https://www.loom.com/share/73c54fa02d2843ada5c05dfae950891f

An AI-powered shopping assistant for car tyres, built with **LangGraph**, **FastAPI**, **FAISS**, and **React** (with an alternate **Streamlit** chat UI).

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
                            │  │  END        END              │                   │ │
                            │  │                              ▼                   │ │
                            │  │                        search_products           │ │
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
| **collect_requirements** | Gathers tyre requirements (size, vehicle, brand, budget) over up to 3 turns before triggering a search. |
| **enhance_query** | Enriches the query with inferred details (bolt patterns, typical sizes, material preferences). |
| **plan_search** | Decomposes the enhanced query into focused sub-queries, each targeting specific product attributes. Uses a dedicated planning model. |
| **search_products** | Runs each sub-query against FAISS attribute-level indices, then deduplicates results. |
| **rerank** | Re-ranks results with an LLM relevance pass, selecting the top-K products. |
| **generate_answer** | Produces a conversational recommendation with product details, trade-offs, and recommended product IDs. |

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
| `OPENAI_MODEL` | Main LLM for intent classification, collection, and answer generation. | `gpt-4.1` |
| `OPENAI_PLANNING_MODEL` | LLM for search planning (sub-query decomposition). | `gpt-5.2` |
| `OPENAI_RERANK_MODEL` | LLM for result re-ranking. | `gpt-4.1-mini` |
| `OPENAI_EMBEDDING_MODEL` | Embedding model for FAISS indexing and queries. | `text-embedding-3-small` |
| `EMBEDDING_DIMENSION` | Embedding vector dimension. | `1536` |
| `MAX_COLLECTING_TURNS` | Max requirement-collection turns before auto-searching. | `3` |
| `TOP_K_SEARCH` | Number of candidates retrieved per sub-query. | `10` |
| `TOP_K_RERANK` | Number of products kept after re-ranking. | `5` |

### 3. Start the backend

```bash
make run
# or: uvicorn app.main:app --reload --port 8000
```

On first startup the FAISS index is built from the tyre catalog JSON — this requires a valid `OPENAI_API_KEY` for embedding generation.

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
  "message": "I need tyres for my Maruti Swift",
  "filters": {
    "brands": ["Apollo"],
    "price_min": 2000,
    "price_max": 5000
  },
  "product_context": {
    "id": "42",
    "brand": "Apollo Amazer 4G Life",
    "price": "3200",
    "compatible_vehicles": "Maruti Swift, Hyundai i20",
    "product_description": "All-season radial tyre...",
    "features_benefits": "Low rolling resistance., Wet grip."
  }
}
```

`filters` and `product_context` are optional — the React frontend sends them when filters are active or when the user is viewing a product detail page.

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
| `needs_clarification` | `true` when the assistant is still collecting requirements. |
| `is_final_answer` | `true` when the search pipeline completed and results are returned. |
| `is_chitchat` | `true` for general conversation (no product search). |
| `recommended_product_ids` | Product IDs for the React UI to highlight in the listing. |

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
- **FAISS** (`faiss-cpu`) — Vector similarity search
- **Pydantic v2** + **pydantic-settings** — Config and validation

**Frontend**
- **React 19** + **React Router 7** — SPA with product listing, detail, and chat panel
- **Vite 8** — Dev server and bundler

**Alternate UI**
- **Streamlit** — Standalone chat interface (same `/chat` API)
