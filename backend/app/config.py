from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    LD_SDK_KEY: str
    OTEL_EXPORTER_ENDPOINT: str = "http://otel-collector:4317"

    model_config = {"env_file": ".env"}


settings = Settings()
