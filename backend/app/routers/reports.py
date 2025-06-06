from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import CountingLog

router = APIRouter()

@router.get("/api/reports")
def get_all_logs(db: Session = Depends(get_db)):
    return db.query(CountingLog).order_by(CountingLog.timestamp.desc()).all()
