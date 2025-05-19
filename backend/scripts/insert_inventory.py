"""
    drug 테이블에서 랜덤 데이터 최대 100개 가져옴
    약품당 row, position, cabinet 지정하여 재고 생성
    상태값 in_stock, 유통기한은 랜덤
"""

import sys
import os
from datetime import date
from random import randint

# 경로 설정
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models import Drug, Inventory

# DB 세션 시작
db = SessionLocal()

try:
    # 1. Drug 테이블에서 최대 100개 추출
    drugs = db.query(Drug).limit(100).all()
    print(f"📦 불러온 Drug 개수: {len(drugs)}")

    if not drugs:
        print("❗ Drug 테이블에 데이터가 없습니다. 먼저 약품 데이터를 추가하세요.")
    else:
        for i, drug in enumerate(drugs):
            # 행과 위치 계산 (한 행당 14칸 기준)
            row = (i // 14) + 1         # 1, 2, 3, ...
            position = (i % 14) + 1     # 1 ~ 14

            inventory = Inventory(
                drug_id=drug.id,
                quantity=randint(10, 80),
                expiration_date=date(2026, randint(1, 12), randint(1, 28)),
                status="in_stock",
                cabinet="1",
                row=row,
                position=position
            )
            db.add(inventory)
            print(f"✅ Inventory 추가: {drug.product_name or drug.drug_name} → row {row}, pos {position}")

        db.commit()
        print("🎉 Inventory 100건 삽입 완료")

except Exception as e:
    db.rollback()
    print("❌ 오류 발생:", e)

finally:
    db.close()
