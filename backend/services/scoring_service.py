from sqlalchemy.orm import Session
from backend.ml.inference import model
from backend.db import models
from backend.core.logging import get_logger, log_audit_event

logger = get_logger(__name__)

def build_features(db: Session, tx_data: dict) -> dict:
    """
    Собирает исторические признаки пользователя для модели.
    """
    user_id = tx_data["user_id"]
    
    # 1. Идем в базу и берем все прошлые транзакции этого юзера
    history = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).all()
    
    if not history:
        # Если это первая транзакция юзера
        avg_amount = tx_data["amount"]
        is_new_device = True
        tx_count = 0
    else:
        # Считаем средний чек
        amounts = [t.amount for t in history]
        avg_amount = sum(amounts) / len(amounts)
        
        # Проверяем, видели ли мы раньше это устройство
        known_devices = [t.device_id for t in history if t.device_id]
        is_new_device = tx_data.get("device_id") not in known_devices
        
        tx_count = len(history)

    # 2. Формируем вектор фичей
    return {
        "amount": tx_data["amount"],
        "amount_ratio": round(tx_data["amount"] / avg_amount, 2) if avg_amount > 0 else 1.0,
        "is_new_device": 1 if is_new_device else 0,
        "tx_count_history": tx_count
    }

def process_transaction(db: Session, transaction_data: dict) -> dict:
    # 1. Собираем признаки (Feature Engineering)
    features = build_features(db, transaction_data)
    
    # 2. Отдаем признаки модели
    score = model.predict(features)
    
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
        user_id=transaction_data["user_id"],     # <--- Сохраняем ID юзера
        device_id=transaction_data.get("device_id"), # <--- Сохраняем ID устройства
        amount=float(transaction_data.get("amount", 0)),
        currency=transaction_data.get("currency", "RUB"),
        score=score,
        decision=decision
    )
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)

    # 6. Пишем в аудит
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
        "features_used": features # Возвращаем фичи для отладки/объяснений
    }