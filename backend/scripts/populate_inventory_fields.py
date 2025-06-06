import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Inventory

# 랜덤 후보 값
cabinet_options = [f"CAB-{i}" for i in range(1, 6)]
row_label_options = [chr(c) for c in range(ord("A"), ord("J") + 1)]

# 세션 시작
db: Session = SessionLocal()
db.autoflush = False

# 데이터 조회
inventories = db.query(Inventory).all()
print(f"총 {len(inventories)}건의 재고 데이터를 업데이트합니다.")

BATCH_SIZE = 1000  # 한 번에 커밋할 수
count = 0

for i, inv in enumerate(inventories, 1):
    inv.cabinet = random.choice(cabinet_options)
    inv.row_label = random.choice(row_label_options)
    inv.position = random.randint(1, 14)
    inv.quantity = random.randint(0, 100)

    if inv.quantity == 0:
        inv.status = 'out_of_stock'
    elif inv.quantity < 10:
        inv.status = 'low_stock'
    else:
        inv.status = 'in_stock'

    count += 1
    if count % BATCH_SIZE == 0:
        db.commit()
        print(f"✅ {count}건 반영 완료")

# 마지막 커밋
db.commit()
print("🎉 전체 완료")

# 세션 종료
db.close()