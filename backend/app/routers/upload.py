import pandas as pd
from app.models import Drug
from fastapi import APIRouter, File, UploadFile, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from scripts.file_mapping import match_uploaded_file
from fastapi.responses import StreamingResponse
from io import BytesIO
import pdfplumber, io
from difflib import SequenceMatcher
from ..database import get_db
from scripts.pdf_parser import parse_pdf_text_to_rows
from typing import List as TypingList
from app.schemas import MappedDrugUpdate
from app.models import List

router = APIRouter()

# 파일 다운로드용 API (백엔드 처리)
# @router.post("/upload")
# async def upload_and_match(file: UploadFile = File(...), db: Session = Depends(get_db)):
    
#     # 파일 읽고 변환
#     contents = await file.read()
#     excel_file = BytesIO(contents) # 메모리 기반 Excel 파일로 변환 (Pandas readable)

#     result_df = match_uploaded_file(excel_file, db) # 유사도 기반 매칭 (file_mapping)

#     # 엑셀로 변환해서 응답
#     output = BytesIO()
#     result_df.to_excel(output, index=False)
#     output.seek(0)
    
#     return StreamingResponse( # 결과를 Excel로 반환
#         output, 
#         media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
#         headers={
#         "Content-Disposition": f"attachment; filename=mapped_result.xlsx" 
#     }) # update: 파일이름에 admin_id 넣기(로그인 정보 추가)


# EXCEL 처리
@router.post("/match-json")
async def match_json(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    excel_file = BytesIO(contents)

    result_df = match_uploaded_file(excel_file, db)
    
    return result_df.to_dict(orient="records") # 결과를 JSON으로 반환환


@router.post("/save-matched-row")
async def save_matched_row(item: dict):
    print("받은 데이터:", item)
    return {"message": "확인 완료"}

# PDF 처리
@router.post("/match-pdf")
async def extract_drugs(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        text = "\n".join([p.extract_text() for p in pdf.pages if p.extract_text()])

    rows, errors = parse_pdf_text_to_rows(text)
    
    print("✅ PDF 파싱 성공 row 수:", len(rows))
    print("❌ 파싱 실패 로그:")
    for err in errors:
        print(err)

    if not rows:
        return []  # 프론트에서는 data.length === 0 처리됨

    df = pd.DataFrame(rows)
    matched_df = match_uploaded_file(df, db, is_dataframe=True)
    return matched_df.to_dict(orient="records")

@router.post("/save-approved")
def save_approved_drugs(drugs: TypingList[MappedDrugUpdate], db: Session = Depends(get_db)):
    updated_count = 0

    for item in drugs:
        # 표준코드를 기준으로 기존 항목이 존재하는지 확인
        existing = db.query(List).filter(List.standard_code == item.표준코드).first()
        
        if existing:
            existing.drug_name = item.입력_약품명
            existing.mapped_name = item.매핑_약품명
            existing.manufacturer = item.제조사
        else:
            new_entry = List(
                drug_name=item.입력_약품명,
                mapped_name=item.매핑_약품명,
                standard_code=item.표준코드,
                manufacturer=item.제조사,
                product_code="",
                image_url="",
            )
            db.add(new_entry)

        updated_count += 1

    db.commit()
    return {"message": "최종 승인 약품 저장 완료", "updated": updated_count}