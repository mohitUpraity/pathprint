from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Server
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Supabase Auth & Storage
    SUPABASE_URL: str = Field(default="", description="Supabase project URL")
    SUPABASE_ANON_KEY: str = Field(default="", description="Supabase anonymous client key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", description="Supabase service role key")
    DATABASE_URL: Optional[str] = None
    SUPABASE_STORAGE_BUCKET: str = "resumes"

    # AI Providers
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # Gemini Live (real-time voice/video interview)
    # Comma-separated, tried in order. Verify availability at https://ai.google.dev/gemini-api/docs/live
    GEMINI_LIVE_MODEL: str = "gemini-2.5-flash-native-audio-latest"
    GEMINI_LIVE_CONNECT_TIMEOUT: float = 10.0
    # End-of-speech silence before the interviewer replies. Lower = snappier, higher = fewer cut-ins.
    GEMINI_LIVE_SILENCE_MS: int = 500
    GEMINI_LIVE_PREFIX_PADDING_MS: int = 40

    # Neo4j Graph Database
    NEO4J_URI: str = "neo4j+ssc://a68e0c1f.databases.neo4j.io"
    NEO4J_USERNAME: str = "a68e0c1f"
    NEO4J_PASSWORD: str = ""
    NEO4J_DATABASE: str = "a68e0c1f"

    # GitHub Access
    GITHUB_PERSONAL_ACCESS_TOKEN: Optional[str] = None


    # Keep-Alive & Self-Pinger (Prevents Render Free Tier Cold Sleep)
    KEEP_ALIVE_URL: Optional[str] = None
    RENDER_EXTERNAL_URL: Optional[str] = None
    KEEP_ALIVE_INTERVAL_SECONDS: int = 600  # 10 minutes (Render spins down after 15 mins)


    model_config = SettingsConfigDict(
        env_file=[
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
            ".env"
        ],
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
