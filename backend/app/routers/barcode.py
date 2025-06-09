from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Inventory
from app.utils.barcode_generator import generate_barcode_image
from io import BytesIO
from sqlalchemy import or_

router = APIRouter()

@router.get("/info")
def get_inventory_info(code: str, db: Session = Depends(get_db)):
    item = (
        db.query(Inventory)
        .filter(or_(Inventory.standard_code == code, Inventory.product_code == code))
        .first()
    )

    print("입력 코드:", code)
    if not item:
        print("DB 조회 결과 없음")
        raise HTTPException(status_code=404, detail="해당 약품을 찾을 수 없습니다.")

    return {
        "drug_name": item.drug_name,
        "standard_code": item.standard_code,
        "product_code": item.product_code,
        "manufacturer": item.manufacturer,
        "image_url": item.image_url,
        "cabinet": item.cabinet,
        "row_label": item.row_label,
        "position": item.position,
        "quantity": item.quantity,
        "status": item.status,
    }