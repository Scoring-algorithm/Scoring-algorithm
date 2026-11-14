# backend/services/scoring_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.ml.inference import model
from backend.db import models
from backend.core.logging import get_logger, log_audit_event

logger = get_logger(__name__)

def build_features(db: Session, tx_data: dict) -> dict:
    # ... (оставляем код из предыдущего сообщения) ...
    user_id = tx_data["user_id"]
    device_id = tx_data.get("device_id")
    
    stats = db.query(
        func.avg(models.Transaction.amount).label('avg_amount'),
        func.count(models.Transaction.id).label('tx_count')
    ).filter(models.Transaction.user_id == user_id).first()
    
    avg_amount = stats.avg_amount if stats.avg_amount is not None else tx_data["amount"]
    tx_count = stats.tx_count

    is_new_device = True
    if device_id:
        device_exists = db.query(models.Transaction.id).filter(
            models.Transaction.user_id == user_id,
            models.Transaction.device_id == device_id
        ).first()
        is_new_device = device_exists is None

    return {
        "amount": tx_data["amount"],
        "amount_ratio": round(tx_data["amount"] / avg_amount, 2) if avg_amount > 0 else 1.0,
        "is_new_device": 1 if is_new_device else 0,
        "tx_count_history": tx_count
    }

def process_transaction(db: Session, transaction_data: dict) -> dict:
    # 1. Собираем признаки
    features = build_features(db, transaction_data)
    
    # 2. Отдаем признаки модели
    score = model.predict(features)
    
    # 2.1. Получаем объяснения
    reasons = model.get_explanations(features, score) 

    # 3. Получаем пороги
    thresholds = db.query(models.Threshold).first()
    if not thresholds:
        thresholds = models.Threshold(low_max=0.3, medium_max=0.7)
        db.add(thresholds)
        db.commit()
        db.refresh(thresholds)
        
    # 4. Принимаем решение
    if score < thresholds.low_max:
        decision = "approve"
    elif score < thresholds.medium_max:
        decision = "review"
    else:
        decision = "reject"

    # 5. Сохраняем в БД
    db_tx = models.Transaction(
        transaction_id=str(transaction_data.get("id", "unknown")),
        user_id=transaction_data["user_id"],
        device_id=transaction_data.get("device_id"),
        amount=float(transaction_data.get("amount", 0)),
        currency=transaction_data.get("currency", "RUB"),
        score=score,
        decision=decision,
        threshold_low=thresholds.low_max,      
        threshold_medium=thresholds.medium_max,
        reasons=reasons
    )
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)

    log_audit_event(
        event_type="score_decision",
        actor="scoring_service",
        payload={
            "transaction_id": db_tx.transaction_id,
            "user_id": db_tx.user_id,
            "features_used": features,
            "score": score,
            "decision": decision,
        }
    )

    return {
        "id": db_tx.transaction_id,
        "score": score,
        "decision": decision,
        "risk_level": "low" if decision == "approve" else ("medium" if decision == "review" else "high"),
        "features_used": features,
        "reasons": reasons
    }

# ОБНОВЛЕННАЯ ФУНКЦИЯ
def get_filtered_transactions(db: Session, user_id: str | None = None, decision: str | None = None, skip: int = 0, limit: int = 50):
    """Выборка последних транзакций с фильтрацией, пагинацией и общим количеством."""
    query = db.query(models.Transaction)
    
    if user_id:
        query = query.filter(models.Transaction.user_id == user_id)
    if decision:
        query = query.filter(models.Transaction.decision == decision)
        
    total = query.count()
    items = query.order_by(models.Transaction.id.desc()).offset(skip).limit(limit).all()
    
    return {"items": items, "total": total}