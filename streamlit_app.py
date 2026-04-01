import uuid

import httpx
import streamlit as st

API_BASE = "http://localhost:8000"

st.set_page_config(
    page_title="Tyre Finder AI",
    page_icon="🛞",
    layout="centered",
)

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    .stApp {
        font-family: 'Inter', sans-serif;
    }

    .main-title {
        text-align: center;
        padding: 1rem 0 0.25rem 0;
    }
    .main-title h1 {
        font-size: 2.2rem;
        font-weight: 700;
        background: linear-gradient(135deg, #1a1a2e 0%, #e94560 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0;
    }
    .main-title p {
        color: #6b7280;
        font-size: 1rem;
        margin-top: 0.25rem;
    }

    .status-badge {
        display: inline-block;
        padding: 0.2rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .badge-chat {
        background: #e0e7ff;
        color: #3730a3;
    }
    .badge-collect {
        background: #fef3c7;
        color: #92400e;
    }
    .badge-answer {
        background: #d1fae5;
        color: #065f46;
    }

    div[data-testid="stChatMessage"] {
        border-radius: 12px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="main-title">
        <h1>Tyre Finder AI</h1>
        <p>Your AI assistant for finding the perfect car tyres</p>
    </div>
    """,
    unsafe_allow_html=True,
)

if "session_id" not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())
if "messages" not in st.session_state:
    st.session_state.messages = []

with st.sidebar:
    st.markdown("### Settings")
    api_url = st.text_input("API URL", value=API_BASE, help="Backend FastAPI URL")

    st.divider()
    st.markdown("### About")
    st.markdown(
        "This assistant helps you find car tyres based on your vehicle, "
        "preferences, and budget. Powered by **LangGraph** + **FAISS** + **OpenAI**."
    )

    st.divider()
    st.markdown("### Example Queries")
    examples = [
        "I need durable tyres for my Maruti Swift under ₹5000",
        "Best all-season tyres for a Honda City around ₹8000",
        "Premium highway tyres for my Toyota Innova under ₹15000",
        "Budget-friendly tyres for Hyundai i20 with good wet grip",
        "Apollo or MRF tyres for Maruti Dzire for city driving",
    ]
    for ex in examples:
        if st.button(ex, key=f"ex_{hash(ex)}", use_container_width=True):
            st.session_state.prefill = ex

    st.divider()
    if st.button("Reset Conversation", type="secondary", use_container_width=True):
        try:
            httpx.post(f"{api_url}/reset/{st.session_state.session_id}", timeout=5)
        except httpx.RequestError:
            pass
        st.session_state.messages = []
        st.session_state.session_id = str(uuid.uuid4())
        st.rerun()


BADGE_CONFIG = {
    "chat": ("badge-chat", "Chatting"),
    "collect": ("badge-collect", "Gathering Details"),
    "answer": ("badge-answer", "Tyre Recommendations"),
}

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        badge_key = msg.get("badge")
        if msg["role"] == "assistant" and badge_key and badge_key in BADGE_CONFIG:
            css_class, label = BADGE_CONFIG[badge_key]
            st.markdown(
                f'<span class="status-badge {css_class}">{label}</span>',
                unsafe_allow_html=True,
            )
        st.markdown(msg["content"])

prefill = st.session_state.pop("prefill", None)
user_input = st.chat_input("Say hello or ask about car tyres...", key="chat_input")

prompt = prefill or user_input
if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            try:
                resp = httpx.post(
                    f"{api_url}/chat",
                    json={
                        "session_id": st.session_state.session_id,
                        "message": prompt,
                    },
                    timeout=120,
                )
                resp.raise_for_status()
                data = resp.json()

                answer = data["response"]
                is_chitchat = data.get("is_chitchat", False)
                needs_clarification = data.get("needs_clarification", False)
                is_final = data.get("is_final_answer", False)

                if is_chitchat:
                    badge = "chat"
                elif needs_clarification:
                    badge = "collect"
                elif is_final:
                    badge = "answer"
                else:
                    badge = None

                if badge and badge in BADGE_CONFIG:
                    css_class, label = BADGE_CONFIG[badge]
                    st.markdown(
                        f'<span class="status-badge {css_class}">{label}</span>',
                        unsafe_allow_html=True,
                    )

                st.markdown(answer)
                st.session_state.messages.append(
                    {
                        "role": "assistant",
                        "content": answer,
                        "badge": badge,
                    }
                )

            except httpx.ConnectError:
                err = "Cannot connect to backend. Make sure the FastAPI server is running."
                st.error(err)
                st.session_state.messages.append({"role": "assistant", "content": err})
            except httpx.HTTPStatusError as e:
                err = f"Backend error: {e.response.text}"
                st.error(err)
                st.session_state.messages.append({"role": "assistant", "content": err})
            except Exception as e:
                err = f"Unexpected error: {e}"
                st.error(err)
                st.session_state.messages.append({"role": "assistant", "content": err})
