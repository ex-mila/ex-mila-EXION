# app/routers/drug.py
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Drug
from app.schemas import DrugOut
from sqlalchemy import create_engine
import pandas as pd

router = APIRouter()

DATABASE_URL = os.getenv("DATABASE_URL")

#engine = create_engine(DATABASE_URL)

@router.get("/api/drugs", response_model=list[DrugOut])
def get_drugs(db: Session = Depends(get_db)):
    return db.query(Drug).all() 


