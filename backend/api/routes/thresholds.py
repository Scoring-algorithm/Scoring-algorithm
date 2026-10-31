from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.db.database import get_db
from backend.db import models
from backend.core.logging import log_audit_event

router = APIRouter(tags=["Thresholds"])

class ThresholdSchema(BaseModel):
    low_max: float
    medium_max: float

@router.get("/thresholds")
def get_thresholds(db: Session = Depends(get_db)):
    th = db.query(models.Threshold).first()
    if not th:
        th = models.Threshold(low_max=0.3, medium_max=0.7)
        db.add(th)
        db.commit()
        db.refresh(th)
    return th

@router.post("/thresholds")
def update_thresholds(data: ThresholdSchema, db: Session = Depends(get_db)):
    th = db.query(models.Threshold).first()
    if not th:
        th = models.Threshold()
        db.add(th)
    
    th.low_max = data.low_max
    th.medium_max = data.medium_max
    db.commit()
    
    log_audit_event("thresholds_updated", "admin", {"low": th.low_max, "medium": th.medium_max})
    return th