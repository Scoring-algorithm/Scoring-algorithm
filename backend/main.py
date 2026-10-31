from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from backend.core.config import settings
from backend.core.logging import setup_logging, set_request_id, get_logger
from backend.db.database import engine, Base
from backend.api.routes import scoring, thresholds

# 1. Настраиваем логирование
setup_logging()
logger = get_logger(__name__)

# 2. Создаем таблицы в БД при старте
Base.metadata.create_all(bind=engine)

# 3. Создаём приложение
app = FastAPI(
    title="Scoring Service",
    version="0.1.0",
    description="Скоринг транзакционных рисков",
)

# 4. Middleware для request_id
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or set_request_id()
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response

# 5. Подключаем роутеры
app.include_router(scoring.router)
app.include_router(thresholds.router)

# 6. Health-check
@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.app_env, "version": app.version}

# 7. Обработчик ошибок
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Необработанная ошибка", extra={"path": request.url.path})
    return JSONResponse(status_code=500, content={"detail": "Internal error"})