# /api/inventory API 정의
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Inventory, Drug
from app.schemas import InventoryOut

router = APIRouter()

@router.get("/inventory", response_model=list[InventoryOut])
def get_inventory(db: Session = Depends(get_db)):
    return db.query(Inventory).all()