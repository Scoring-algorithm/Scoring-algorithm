# backend/main.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware  # <--- ДОБАВИТЬ
from backend.core.config import settings
from backend.core.logging import setup_logging, set_request_id, get_logger
from backend.db.database import engine, Base
from backend.api.routes import scoring, thresholds

setup_logging()
logger = get_logger(__name__)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Scoring Service", version="0.1.0")

# <--- ДОБАВИТЬ БЛОК CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # Адрес фронтенда Алисы
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or set_request_id()
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response

app.include_router(scoring.router)
app.include_router(thresholds.router)

@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.app_env, "version": app.version}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Необработанная ошибка", extra={"path": request.url.path})
    return JSONResponse(status_code=500, content={"detail": "Internal error"})