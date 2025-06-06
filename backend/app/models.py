# DB 테이블 구조를 정의하는 SQLAlchemy ORM 클래스들
from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base  # Base = declarative_base()

# ------------------ Drug Table ------------------ #
class Drug(Base):
    __tablename__ = "drug" 

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    drug_name = Column(String(500), index=True)
    standard_code = Column(String(50), unique=True, index=True)
    product_code = Column(String(50))
    manufacturer = Column(String(100))
    image_url = Column(String(255))

    inventory_items = relationship("Inventory", back_populates="drug")

#------------------ Inventory Table ------------------ #
class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    drug_id = Column(Integer, ForeignKey("drug.id"), nullable=False)

    quantity = Column(Integer, default=0)
    unit = Column(String(20), default='ea')
    expiration_date = Column(Date, nullable=True)
    status = Column(String(50), default="Normal")
    cabinet = Column(String(20))
    row = Column(Integer)
    position = Column(Integer)

    drug = relationship("Drug", back_populates="inventory_items")

# update: Drug 테이블과 관계형 데이터베이스 구조로 재설계
# class Inventory(Base):
#     __tablename__ = "inventory"

#     id = Column(Integer, primary_key=True, index=True)
#     drug_name = Column(String(500))
#     standard_code = Column(String(50))
#     product_code = Column(String(50))
#     manufacturer = Column(String(100))
#     image_url = Column(String(255))
    
#     cabinet = Column(String(20))
#     row_label = Column(String(1))
#     position = Column(Integer)
#     quantity = Column(Integer)
#     status = Column(String(20))

# ------------------ List Table ------------------ #
class List(Base):
    __tablename__ = "list" 

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    drug_name = Column(String(500), index=True)
    mapped_name = Column(String(500), index=True)
    standard_code = Column(String(50), unique=True, index=True)
    product_code = Column(String(50))
    manufacturer = Column(String(100))
    image_url = Column(String(255))


# 약품 카운팅 이력 테이블
class CountingLog(Base):
    __tablename__ = "counting_log"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(String(50))  # 예: 2025-06-04-10-30-00
    drug_name = Column(String(255))
    drug_standard_code = Column(String(50), index=True)
    drug_refer_code = Column(String(50))
    count_quantity = Column(Integer)
    source_filename = Column(String(255))  # 파일 중복 처리 방지