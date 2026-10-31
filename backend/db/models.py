from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone
from backend.db.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, index=True)
    user_id = Column(String, index=True)    
    device_id = Column(String, nullable=True)
    amount = Column(Float)
    currency = Column(String)
    score = Column(Float)
    decision = Column(String) 
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Threshold(Base):
    __tablename__ = "thresholds"
    id = Column(Integer, primary_key=True, index=True)
    low_max = Column(Float, default=0.3)
    medium_max = Column(Float, default=0.7)