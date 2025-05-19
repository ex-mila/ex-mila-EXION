from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, Union


class DrugOut(BaseModel):
    id: int
    drug_name: str
    standard_code: str
    product_code: str
    manufacturer: Optional[str]
    image_url: Optional[str]

    class Config:
        from_attributes  = True

class InventoryOut(BaseModel):
    id: int
    drug_id: int
    quantity: int
    unit: str
    expiration_date: Optional[date]
    status: str
    cabinet: Optional[str]
    row: Optional[int]
    position: Optional[int]
    drug: Optional[DrugOut]  # 조인된 Drug 정보 포함

    class Config:
        orm_mode = True

class MappedDrugUpdate(BaseModel):
    입력_약품명: str = Field(..., alias="입력 약품명")
    입력_수량: Union[str, int] = Field(..., alias="입력 수량")
    매핑_약품명: str = Field(..., alias="매핑 약품명")
    표준코드: str
    제조사: Optional[str]
    약품_이미지: Optional[str] = Field(None, alias="약품 이미지")
    유사도_점수: float = Field(..., alias="유사도 점수")
    매핑_여부: str = Field(..., alias="매핑 여부")

    class Config:
        allow_population_by_field_name = True
