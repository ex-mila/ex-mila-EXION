import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from sqlalchemy import create_engine
import pandas as pd
from app.models import List
from app.schemas import ListOut

router = APIRouter()

@router.get("/api/lists", response_model=List[ListOut])
def get_approved_list(db: Session = Depends(get_db)):
    return db.query(List).all()