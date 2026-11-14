from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import csv                                
from io import StringIO 
from backend.db.database import get_db
from backend.services.scoring_service import process_transaction, get_filtered_transactions
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
    return process_transaction(db, tx.model_dump())

@router.get("/transactions") 
def get_transactions(
    user_id: Optional[str] = Query(None, description="Фильтр по ID пользователя"),
    decision: Optional[str] = Query(None, description="Фильтр по решению скоринга"),
    skip: int = 0,
    limit: int = 50, 
    db: Session = Depends(get_db)
):
    return get_filtered_transactions(db, user_id=user_id, decision=decision, skip=skip, limit=limit)

@router.get("/transactions/export-csv")
def export_transactions_csv(
    user_id: Optional[str] = Query(None, description="Фильтр по ID пользователя"),
    decision: Optional[str] = Query(None, description="Фильтр по решению скоринга"),
    db: Session = Depends(get_db)
):
    """
    Выгружает транзакции в CSV с учетом фильтров (без пагинации).
    """
    query = db.query(models.Transaction)
    
    if user_id:
        query = query.filter(models.Transaction.user_id == user_id)
    if decision:
        query = query.filter(models.Transaction.decision == decision)
        
    # Достаем все транзакции по фильтру
    transactions = query.order_by(models.Transaction.id.desc()).all()

    output = StringIO()
    # Добавляем BOM (Byte Order Mark) для корректного отображения кириллицы в Excel
    output.write('\ufeff')
    
    writer = csv.writer(output, delimiter=';')

    writer.writerow([
        "ID транзакции", "User ID", "Device ID", "Сумма", "Валюта", 
        "Скоринг", "Решение", "Порог Low", "Порог Med", "Причины", "Дата и время (UTC)"
    ])

    for tx in transactions:
        # Склеиваем тексты причин в одну строку
        reasons_text = " | ".join([r['text'] for r in tx.reasons]) if tx.reasons else "—"
        
        writer.writerow([
            tx.transaction_id,
            tx.user_id,
            tx.device_id or "",
            tx.amount,
            tx.currency,
            tx.score,
            tx.decision,
            tx.threshold_low if tx.threshold_low is not None else "—",
            tx.threshold_medium if tx.threshold_medium is not None else "—",
            reasons_text,
            tx.created_at.strftime("%Y-%m-%d %H:%M:%S") if tx.created_at else ""
        ])

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions_export.csv"}
    )