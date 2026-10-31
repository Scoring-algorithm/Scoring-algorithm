import json
import os
from fastapi import APIRouter, HTTPException
from backend.core.config import settings

router = APIRouter(tags=["Audit"])

@router.get("/audit")
def get_audit_logs(limit: int = 50):
    """
    Читает файл аудита (JSONL) и возвращает последние limit записей.
    """
    file_path = settings.audit_log_path
    
    if not os.path.exists(file_path):
        return []

    logs = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            # Читаем все строки
            for line in f:
                if line.strip():
                    logs.append(json.loads(line))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка чтения логов: {e}")

    # Возвращаем последние N записей в обратном порядке (сначала новые)
    return logs[-limit:][::-1]