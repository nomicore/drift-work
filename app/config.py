from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    fal_key: str = ""
    passphrase: str = ""
    session_days: int = 7
    openai_model: str = "gpt-4.1"
    openai_fast_model: str = "gpt-4.1-mini"
    openai_planning_model: str = "gpt-5.4"
    openai_rerank_model: str = "gpt-5.4-mini"
    openai_embedding_model: str = "text-embedding-3-large"
    embedding_dimension: int = 1536
    faiss_index_path: str = "app/data/faiss_index"
    max_collecting_turns: int = 3
    top_k_search: int = 10
    top_k_rerank: int = 5
    rerank_min_score: float = 0.35

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
