from fastapi import APIRouter, File, UploadFile, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from scripts.file_mapping import match_uploaded_file
from fastapi.responses import StreamingResponse
from io import BytesIO
from app.schemas import MappedDrugUpdate
router = APIRouter()

@router.post("/upload")
async def upload_and_match(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    excel_file = BytesIO(contents)

    result_df = match_uploaded_file(excel_file, db)

    # 엑셀로 변환해서 응답
    output = BytesIO()
    result_df.to_excel(output, index=False)
    output.seek(0)
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={
        "Content-Disposition": f"attachment; filename=mapped_result.xlsx"
    })

@router.post("/match-json")
async def match_json(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    excel_file = BytesIO(contents)

    result_df = match_uploaded_file(excel_file, db)
    return result_df.to_dict(orient="records")


@router.post("/save-matched-row")
async def save_matched_row(item: dict):
    print("받은 데이터:", item)
    return {"message": "확인 완료"}

