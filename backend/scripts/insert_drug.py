"""
    drug_standard_codes와 drug_identification_codes를 병합해
    중복되지 않은 약품 데이터를 drug 테이블에 필터링 + 삽입하는 자동 스크립트
"""
import os
import pandas as pd
from sqlalchemy import create_engine

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

# 원본 테이블 로딩 
df_standards = pd.read_sql("SELECT * FROM drug_standard_codes", engine)
df_identify  = pd.read_sql("SELECT * FROM drug_identification_codes", engine)

# 문자열 정제
df_standards["product_standard_code"] = df_standards["product_standard_code"].astype(str).str.strip()
df_identify["product_serial_number"] = df_identify["product_serial_number"].astype(str).str.strip()

# left 조인
merged = pd.merge(
    df_standards,
    df_identify,
    left_on="product_standard_code",
    right_on="product_serial_number",
    how="left"
)

# debugging(병합된 컬럼 확인용)
#print(merged.columns.tolist())

# 병합된 테이블에서 필요 필드만 추출
final = merged[[
    "drug_name",            
    "standard_code_x",      # 표준코드 (이름 충돌 시)
    "product_standard_code",
    "business_name",        
    "image_url"            
]]
final.columns = ["drug_name", "standard_code", "product_code", "manufacturer", "image_url"]

# 이미 들어간 데이터 제외
existing = pd.read_sql("SELECT standard_code, product_code FROM drug", engine)

# 병합된 데이터 중 기존과 겹치는 건 제외
final = final.merge(existing, on=["standard_code", "product_code"], how="left", indicator=True)
final = final[final["_merge"] == "left_only"].drop(columns=["_merge"])


# 최종 삽입
if not final.empty:
    final.to_sql("drug", engine, if_exists="append", index=False)
    print(f"{len(final)} new records inserted into 'drug' table.")
else:
    print("No new records to insert. All data already exists.")
