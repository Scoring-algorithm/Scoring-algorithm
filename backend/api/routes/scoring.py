from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.db.database import get_db
from backend.services.scoring_service import process_transaction
from backend.db import models

router = APIRouter(tags=["Scoring"])

class TransactionRequest(BaseModel):
    id: str
    user_id: str               
    amount: float
    currency: str = "RUB"
    device_id: str | None = None

@router.post("/score")
def score_transaction(tx: TransactionRequest, db: Session = Depends(get_db)):
    """Принять транзакцию, собрать историю и вернуть скоринг"""
    return process_transaction(db, tx.model_dump())

@router.get("/transactions")
def get_transactions(limit: int = 50, db: Session = Depends(get_db)):
    """Получить последние транзакции (для UI Алисы)"""
    return db.query(models.Transaction).order_by(models.Transaction.id.desc()).limit(limit).all()