"""
    업로드된 엑셀의 "약품명", 수량을 기준으로 Drug 테이블과 유사도 기반 매칭 (rapidfuzz)

"""
import pandas as pd
from io import BytesIO
from rapidfuzz import process, fuzz
from sqlalchemy.orm import Session
from app.models import Drug

def normalize(name: str) -> str:
    return name.lower().replace("정", "").replace("mg", "").replace(" ", "")

def match_uploaded_file(file: BytesIO, db: Session):
    df = pd.read_excel(file)
    df.columns = df.columns.str.strip()
    drugs = db.query(Drug).all()

    results = []
    for _, row in df.iterrows():
        input_name = row["약품명"]
        input_qty = row["수량"]

        # 약품명 정규화 후 유사도 기반 매칭
        choices = [(normalize(d.drug_name), d) for d in drugs]
        names_only = [c[0] for c in choices]

        best, score, idx = process.extractOne(normalize(input_name), names_only, scorer=fuzz.ratio)
        matched_drug = choices[idx][1] if score >= 70 else None

        results.append({
            "입력 약품명": input_name,
            "입력 수량": input_qty,
            "매핑 약품명": matched_drug.drug_name if matched_drug else None,
            "표준코드": matched_drug.standard_code if matched_drug else None,
            "품목일련번호": matched_drug.product_code if matched_drug else None,
            "제조사": matched_drug.manufacturer if matched_drug else None,
            "약품 이미지": matched_drug.image_url if matched_drug else None,  # ← 제조사 대신 이미지로 수정
            "유사도 점수": score,
            "매핑 여부": "O" if score >= 80 else "X"
        })

    return pd.DataFrame(results)
