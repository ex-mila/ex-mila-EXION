# models.py의 모델을 바탕으로 API 응답용 Pydantic 모델 정의
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, Union

# 약품 정보를 외부로 출력할 때 사용하는 모델
class DrugOut(BaseModel):
    id: int
    drug_name: str
    standard_code: str
    product_code: str
    manufacturer: Optional[str]
    image_url: Optional[str]

    class Config:
        orm_mode  = True

class InventoryOut(BaseModel):
    id: int
    drug_name: int
    standard_code: str
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

# class InventoryOut(BaseModel):
#     id: int
#     drug_name: str
#     standard_code: str
#     product_code: Optional[str]
#     manufacturer: Optional[str]
#     image_url: Optional[str]

#     cabinet: Optional[str]
#     row_label: Optional[str]
#     position: Optional[int]
#     quantity: int
#     status: str

#     class Config:
#         from_attributes = True

class MappedDrugUpdate(BaseModel):
    입력_약품명: str = Field(..., alias="입력 약품명")
    매핑_약품명: str = Field(..., alias="매핑 약품명")
    표준코드: str
    제조사: Optional[str]
    입력_수량: Union[str, int] = Field(..., alias="입력 수량")
    유사도_점수: Optional[Union[int, float]] = Field(None, alias="유사도 점수")
    매핑_여부: Optional[str] = Field(None, alias="매핑 여부")

    class Config:
        from_attributes = True  # pydantic v2에서는 orm_mode 대신 이걸 사용
        populate_by_name = True  # alias로 필드 이름 매칭 가능하게
