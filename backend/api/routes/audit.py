import json
import os
import csv
from io import StringIO
from collections import deque
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from backend.core.config import settings

router = APIRouter(tags=["Audit"])

# Роут для скачивания CSV должен находиться НАД основным роутом /audit
@router.get("/audit/export-csv")
def export_audit_csv(
    event_type: Optional[str] = Query(None, description="Фильтр по типу события"),
    user_id: Optional[str] = Query(None, description="Фильтр по ID пользователя")
):
    """
    Генерирует и отдаёт CSV файл с логами на основе переданных Query параметров.
    """
    file_path = settings.audit_log_path
    
    if not os.path.exists(file_path):
        output = StringIO()
        writer = csv.writer(output, delimiter=';')
        writer.writerow(["Логи отсутствуют"])
        output.seek(0)
        return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=audit_log.csv"})

    output = StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Timestamp", "Event Type", "Actor", "Details / Payload"])

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                log_data = json.loads(line)
                
                if event_type and log_data.get("event_type") != event_type:
                    continue
                if user_id:
                    payload = log_data.get("payload") or {}
                    if str(payload.get("user_id")) != str(user_id):
                        continue
                
                payload_data = log_data.get("payload") or {}
                if log_data.get("event_type") == 'score_decision':
                    details = f"TX: {payload_data.get('transaction_id')} | User: {payload_data.get('user_id')} | Score: {payload_data.get('score')} | Decision: {payload_data.get('decision')}"
                elif log_data.get("event_type") == 'thresholds_updated':
                    details = f"Low: {payload_data.get('low')} | Med: {payload_data.get('medium')}"
                else:
                    details = json.dumps(payload_data, ensure_ascii=False)

                writer.writerow([
                    log_data.get("timestamp", ""),
                    log_data.get("event_type", ""),
                    log_data.get("actor", ""),
                    details
                ])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации CSV: {e}")

    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=audit_log.csv"})


@router.get("/audit")
def get_audit_logs(
    event_type: Optional[str] = Query(None, description="Фильтр по типу события"),
    user_id: Optional[str] = Query(None, description="Фильтр по ID пользователя внутри payload"),
    skip: int = 0,
    limit: int = 50
):
    """
    Читает файл аудита (JSONL) с серверной фильтрацией и пагинацией.
    Использует deque для хранения только последних N*2 записей (экономия памяти).
    """
    file_path = settings.audit_log_path
    
    if not os.path.exists(file_path):
        return {"items": [], "total": 0}

    # Чтобы не читать файл целиком в память, читаем его и оставляем последние (skip + limit + запас) записей
    # Это работает для append-only логов, где новые записи в конце.
    buffer_size = skip + limit
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            # Читаем только последние buffer_size * 3 записей (с запасом на фильтрацию)
            # deque с maxlen автоматически выкидывает старые элементы
            last_lines = deque(f, maxlen=buffer_size * 3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка чтения логов: {e}")

    # Теперь применяем фильтры к этим последним записям (в обратном порядке - новые сверху)
    filtered = []
    for line in reversed(last_lines):
        if not line.strip():
            continue
        try:
            log_data = json.loads(line)
        except json.JSONDecodeError:
            continue
        
        if event_type and log_data.get("event_type") != event_type:
            continue
        if user_id:
            payload = log_data.get("payload") or {}
            if str(payload.get("user_id")) != str(user_id):
                continue
        filtered.append(log_data)

    # Применяем skip и limit уже к отфильтрованным
    paginated = filtered[skip:skip + limit]
    
    return {
        "items": paginated,
        "total": len(filtered)  # Общее кол-во подходящих под фильтр (в пределах прочитанного буфера)
    }