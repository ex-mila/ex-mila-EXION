import pandas as pd
from io import BytesIO  
from rapidfuzz import process, fuzz  
from sqlalchemy.orm import Session
from app.models import Drug

# 데이터 전처리
def normalize(name: str) -> str:
    if not name:
        return ""
    return name.lower().replace("정", "").replace("mg", "").replace(" ", "")

def match_uploaded_file(file_or_df, db: Session, is_dataframe: bool = False) -> pd.DataFrame:
    if is_dataframe:
        df = file_or_df
    else:
        df = pd.read_excel(file_or_df)

    # 헤더 정리
    df.columns = df.columns.str.strip()

    # DB Drug 데이터 불러오기
    drugs = db.query(Drug).all()

    results = []

    # 유사도 기반 매핑 반복
    for _, row in df.iterrows():
        input_name = row.get("약품명") or row.get("입력 약품명") or row.get("상품명")
        input_qty = row.get("수량") or row.get("입력 수량")

        if not input_name:
            continue

        # 유사도 기반 후보군 생성
        choices = [(normalize(d.drug_name), d) for d in drugs] # DB 약품명 정규화 후 이름, 객체 형태로 저장
        names_only = [c[0] for c in choices] # 유사도 비교용 이름 리스트 추출

        # 유사도 기반 매칭
        best, score, idx = process.extractOne(normalize(input_name), names_only, scorer=fuzz.ratio) # 가장 유사한 문자열 하나 추출
        matched_drug = choices[idx][1] if score >= 70 else None

        # 매핑 결과 딕셔너리 구성 (리스트 형태로 저장)
        results.append({
            "입력 약품명": input_name,
            "입력 수량": input_qty,
            "매핑 약품명": matched_drug.drug_name if matched_drug else None,
            "표준코드": matched_drug.standard_code if matched_drug else None,
            "품목일련번호": matched_drug.product_code if matched_drug else None,
            "제조사": matched_drug.manufacturer if matched_drug else None,
            "약품 이미지": matched_drug.image_url if matched_drug else None,
            "유사도 점수": int(score),
            "매핑 여부": "O" if score >= 80 else "X"
        })

    # 최종 DataFrame으로 변환
    return pd.DataFrame(results) 
