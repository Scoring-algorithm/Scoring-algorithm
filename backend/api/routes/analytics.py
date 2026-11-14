# backend/api/routes/analytics.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from collections import Counter
from typing import List, Dict, Any
from backend.db.database import get_db
from backend.db import models

router = APIRouter(tags=["Analytics"])

@router.get("/analytics")
def get_dashboard_analytics(db: Session = Depends(get_db)):
    """
    Возвращает агрегированную статистику для дашборда.
    """
    total_tx = db.query(models.Transaction).count()
    if total_tx == 0:
        return {"summary": {}, "top_rejections": [], "monthly_trends": [], "daily_trends": []}

    # 1. Общая сводка
    summary_query = db.query(
        models.Transaction.decision, 
        func.count(models.Transaction.id)
    ).group_by(models.Transaction.decision).all()
    
    summary = {"approve": 0, "review": 0, "reject": 0}
    for decision, count in summary_query:
        summary[decision] = count

    # 2. Топ причин по отказу
    # Достаем только причины отклоненных транзакций и считаем их в Python (т.к. это JSON)
    rejected_txs = db.query(models.Transaction.reasons).filter(models.Transaction.decision == 'reject').all()
    all_reasons = []
    for tx in rejected_txs:
        if tx.reasons:
            for r in tx.reasons:
                if r.get('type') == 'risk':
                    all_reasons.append(r.get('text'))
    
    top_rejections = [{"reason": k, "count": v} for k, v in Counter(all_reasons).most_common(5)]

    # 3. Статистика по месяцам (Группируем по году и месяцу)
    # Для SQLite используем strftime. Для Postgres это был бы to_char.
    month_expr = func.strftime('%Y-%m', models.Transaction.created_at)
    
    monthly_query = db.query(
        month_expr.label('month'),
        models.Transaction.decision,
        func.count(models.Transaction.id).label('count'),
        func.avg(models.Transaction.score).label('avg_score')
    ).group_by(month_expr, models.Transaction.decision).order_by(month_expr).all()

    # Преобразуем плоский список в структурированный по месяцам
    monthly_data = {}
    for month, decision, count, avg_score in monthly_query:
        if not month: continue
        if month not in monthly_data:
            monthly_data[month] = {"month": month, "approve": 0, "review": 0, "reject": 0, "avg_score": round(avg_score or 0, 2)}
        
        monthly_data[month][decision] = count
        if decision == 'approve': # Берем средний скор по всем транзакциям месяца
            monthly_data[month]["avg_score"] = round(avg_score or 0, 2)

    # 4. Статистика по дням недели (0=Воскресенье, 1=Понедельник...)
    dow_expr = func.strftime('%w', models.Transaction.created_at)
    daily_query = db.query(
        dow_expr.label('dow'),
        models.Transaction.decision,
        func.count(models.Transaction.id).label('count')
    ).group_by(dow_expr, models.Transaction.decision).all()

    days_map = {"0": "Вс", "1": "Пн", "2": "Вт", "3": "Ср", "4": "Чт", "5": "Пт", "6": "Сб"}
    daily_data = {str(i): {"day": days_map[str(i)], "approve": 0, "review": 0, "reject": 0} for i in range(7)}
    
    for dow, decision, count in daily_query:
        if dow is not None:
            daily_data[dow][decision] = count

    return {
        "summary": summary,
        "top_rejections": top_rejections,
        "monthly_trends": list(monthly_data.values()),
        "daily_trends": list(daily_data.values())
    }