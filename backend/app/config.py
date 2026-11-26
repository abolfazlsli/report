from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://report:report@localhost:5433/report"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 12
    cors_origins: list[str] = ["http://localhost:3000" , "http://127.0.0.1:3000" , "https://report.besat.net"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
