"""
Точка входа backend-приложения.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend.core.config import settings
from backend.core.logging import setup_logging, set_request_id, get_logger

# 1. Настраиваем логирование ДО создания приложения
setup_logging()

logger = get_logger(__name__)

# 2. Создаём приложение
app = FastAPI(
    title="Scoring Service",
    version="0.1.0",
    description="Скоринг транзакционных рисков",
)


# 3. Middleware: присваиваем request_id каждому входящему запросу
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or set_request_id()
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response


# 4. Health-check
@app.get("/health")
async def health():
    logger.info("Health-check")
    return {
        "status": "ok",
        "env": settings.app_env,
        "version": app.version,
    }


# 5. Пример endpoint, который пишет в аудит
@app.post("/score")
async def score(transaction: dict):
    logger.info("Скоринг транзакции", extra={"transaction_id": transaction.get("id")})
    # ... здесь будет вызов scoring_service ...
    return {"score": 0.12, "decision": "approve"}


# 6. Обработчик ошибок — пишет в лог
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Необработанная ошибка", extra={"path": request.url.path})
    return JSONResponse(status_code=500, content={"detail": "Internal error"})

from backend.core.logging import log_audit_event

# 7. Проверка аудита
@app.post("/score")
async def score(transaction: dict):
    logger.info("Скоринг транзакции", extra={"transaction_id": transaction.get("id")})

    score_value = 0.12
    decision = "approve"

    log_audit_event(
        event_type="score_decision",
        actor="scoring_service",
        payload={
            "transaction_id": transaction.get("id"),
            "input": transaction,
            "score": score_value,
            "decision": decision,
            "model_version": "v0.0.1",
        },
    )

    return {"score": score_value, "decision": decision}


# Команды:
# uvicorn backend.main:app --reload --port 8000

# 1) curl http://localhost:8000/health
# Ожадаемый ответ: {"status":"ok","env":"dev","version":"0.1.0"}

# 2) curl -X POST http://localhost:8000/score -H "Content-Type: application/json" -d '{"id":"tx-001","amount":1500,"currency":"RUB"}'


