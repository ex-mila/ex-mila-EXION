# app/routers/drug.py
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Drug
from app.schemas import DrugOut  # response model 필요
from sqlalchemy import create_engine
import pandas as pd

router = APIRouter()

# 환경변수에서 실제 DB URL 가져오기
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

@router.get("/api/drugs", response_model=list[DrugOut])
def get_drugs(db: Session = Depends(get_db)):
    return db.query(Drug).all()