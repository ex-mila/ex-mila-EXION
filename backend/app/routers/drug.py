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

# @router.get("/api/drugs", response_model=list[DrugOut])
# def get_drugs(db: Session = Depends(get_db)):
#     return db.query(Drug).all() 


# app/routers/drug.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Drug
from app.schemas import DrugOut

router = APIRouter()

@router.get("/api/drugs", response_model=DrugOut)
def get_drug_by_code(code: str, db: Session = Depends(get_db)):
    drug = db.query(Drug).filter(Drug.standard_code == code).first()

    if not drug:
        raise HTTPException(status_code=404, detail="Drug not found")

    return drug



