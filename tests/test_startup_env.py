from app.core.config import Settings


def test_missing_required_env_names_hosted_keys() -> None:
    settings = Settings(
        _env_file=None,
        embedding_provider="huggingface",
        hf_token="",
        generation_provider="groq",
        groq_api_key="",
        vector_store="pgvector",
        database_url="sqlite:///./rag.db",
        environment="production",
        api_token="",
    )
    names = " ".join(settings.missing_required_env())
    assert "HF_TOKEN" in names
    assert "GROQ_API_KEY" in names
    assert "DATABASE_URL" in names
    assert "API_TOKEN" in names
