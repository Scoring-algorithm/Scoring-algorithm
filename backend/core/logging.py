import json
import logging
import logging.handlers
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.core.config import settings


# ---------------------------------------------------------------------------
# Request ID: контекстная переменная, доступная во всех логах текущего запроса
# ---------------------------------------------------------------------------

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


def set_request_id(request_id: str | None = None) -> str:
    """Установить request_id для текущего контекста. Если не передан — сгенерировать."""
    rid = request_id or str(uuid.uuid4())
    request_id_var.set(rid)
    return rid


def get_request_id() -> str:
    """Получить текущий request_id."""
    return request_id_var.get()


# ---------------------------------------------------------------------------
# Фильтр: добавляет request_id в каждую запись лога
# ---------------------------------------------------------------------------

class RequestIdFilter(logging.Filter):
    """Добавляет поле request_id во все записи лога."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        return True


# ---------------------------------------------------------------------------
# Форматтеры
# ---------------------------------------------------------------------------

class HumanReadableFormatter(logging.Formatter):
    """Формат для консоли: удобно читать глазами."""

    def format(self, record: logging.LogRecord) -> str:
        record.request_id = getattr(record, "request_id", "-")
        return (
            f"{self.formatTime(record, '%Y-%m-%d %H:%M:%S')} | "
            f"{record.levelname:<8} | "
            f"req={record.request_id} | "
            f"{record.name} | "
            f"{record.getMessage()}"
        )


class JsonFormatter(logging.Formatter):
    """Формат для файлов: структурированный JSON, удобно парсить."""

    # Поля, которые не нужно дублировать в JSON
    RESERVED = {
        "name", "msg", "args", "levelname", "levelno", "pathname",
        "filename", "module", "exc_info", "exc_text", "stack_info",
        "lineno", "funcName", "created", "msecs", "relativeCreated",
        "thread", "threadName", "processName", "process", "message",
        "request_id", "asctime",
    }

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Дополнительные поля, переданные через extra={...}
        for key, value in record.__dict__.items():
            if key not in self.RESERVED and not key.startswith("_"):
                log_entry[key] = value

        # Исключения
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, ensure_ascii=False, default=str)


# ---------------------------------------------------------------------------
# Основная настройка
# ---------------------------------------------------------------------------

def setup_logging(
    log_dir: str | Path | None = None,
    log_level: str | None = None,
    app_env: str | None = None,
) -> None:
    """
    Настроить логирование для всего приложения.

    Вызывается один раз при старте (в main.py).

    Args:
        log_dir: директория для логов. По умолчанию из settings.
        log_level: уровень логирования. По умолчанию из settings.
        app_env: окружение (dev/stage). По умолчанию из settings.
    """
    log_dir = Path(log_dir or settings.log_dir)
    log_level = (log_level or settings.log_level).upper()
    app_env = app_env or settings.app_env

    log_dir.mkdir(parents=True, exist_ok=True)

    numeric_level = getattr(logging, log_level, logging.INFO)

    # Корневой логгер
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Убираем существующие handlers (при повторном вызове)
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    request_filter = RequestIdFilter()

    # --- Handler 1: консоль (человекочитаемый формат) ---
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(HumanReadableFormatter())
    console_handler.addFilter(request_filter)
    root_logger.addHandler(console_handler)

    # --- Handler 2: файл приложения (JSON, с ротацией) ---
    app_log_file = log_dir / f"app_{app_env}.log"
    file_handler = logging.handlers.RotatingFileHandler(
        filename=app_log_file,
        maxBytes=10 * 1024 * 1024,   # 10 MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(numeric_level)
    file_handler.setFormatter(JsonFormatter())
    file_handler.addFilter(request_filter)
    root_logger.addHandler(file_handler)

    # --- Handler 3: файл ошибок (только ERROR и выше) ---
    error_log_file = log_dir / f"errors_{app_env}.log"
    error_handler = logging.handlers.RotatingFileHandler(
        filename=error_log_file,
        maxBytes=5 * 1024 * 1024,    # 5 MB
        backupCount=5,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(JsonFormatter())
    error_handler.addFilter(request_filter)
    root_logger.addHandler(error_handler)

    # --- Приглушаем слишком болтливые сторонние логгеры ---
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    root_logger.info(
        "Логирование настроено",
        extra={
            "app_env": app_env,
            "log_level": log_level,
            "log_dir": str(log_dir),
        },
    )


# ---------------------------------------------------------------------------
# Аудит-лог (отдельный, append-only JSONL)
# ---------------------------------------------------------------------------

_audit_logger: logging.Logger | None = None


def get_audit_logger() -> logging.Logger:
    """
    Получить отдельный логгер для аудита.

    Пишет только в файл audit_<env>.jsonl в формате JSONL (одна строка = одно событие).
    Не смешивается с техническими логами.
    """
    global _audit_logger
    if _audit_logger is not None:
        return _audit_logger

    logger = logging.getLogger("audit")
    logger.setLevel(logging.INFO)
    logger.propagate = False  # не дублировать в корневой логгер

    audit_file = Path(settings.audit_log_path)
    audit_file.parent.mkdir(parents=True, exist_ok=True)

    handler = logging.FileHandler(audit_file, encoding="utf-8")
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)

    _audit_logger = logger
    return logger


def log_audit_event(
    event_type: str,
    actor: str,
    payload: dict[str, Any],
) -> None:
    """
    Записать событие в аудит-лог.

    Args:
        event_type: тип события (например, "threshold_changed", "score_decision").
        actor: кто совершил действие (user_id, system, service_name).
        payload: данные события (что изменилось, входные данные, score, решение).
    """
    audit = get_audit_logger()
    audit.info(
        event_type,
        extra={
            "event_type": event_type,
            "actor": actor,
            "payload": payload,
            "request_id": get_request_id(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# ---------------------------------------------------------------------------
# Утилита: получить логгер для модуля
# ---------------------------------------------------------------------------

def get_logger(name: str) -> logging.Logger:
    """
    Получить логгер для модуля.

    Использование:
        from backend.core.logging import get_logger
        logger = get_logger(__name__)
        logger.info("Сообщение", extra={"transaction_id": "tx-123"})
    """
    return logging.getLogger(name)