from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Файл базы будет создан автоматически в корне проекта
SQLALCHEMY_DATABASE_URL = "sqlite:///./scoring.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Зависимость для эндпоинтов FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()