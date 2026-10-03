"""
Настройки приложения. Читаются из .env-файла и переменных окружения.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Окружение
    app_env: str = "dev"                       # dev | stage
    debug: bool = True

    # Порты
    backend_port: int = 8000
    frontend_port: int = 5173

    # Логирование
    log_level: str = "DEBUG"                   # DEBUG для dev, INFO для stage
    log_dir: str = "logs"
    audit_log_path: str = "logs/audit_dev.jsonl"

    # Модели
    model_path: str = "models/latest/model.pkl"

    # Fallback
    fallback_enabled: bool = False

    model_config = SettingsConfigDict(
        env_file="config/.env.dev",            # по умолчанию dev
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()