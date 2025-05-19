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

    #inventory_items = relationship("Inventory", back_populates="drug")

# ------------------ Inventory Table ------------------ #
class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    drug_id = Column(Integer, ForeignKey("exion_drug_info.id"), nullable=False)

    quantity = Column(Integer, default=0)
    unit = Column(String(20), default='ea')
    expiration_date = Column(Date, nullable=True)
    status = Column(String(50), default="Normal")
    cabinet = Column(String(20))
    row = Column(Integer)
    position = Column(Integer)

    #drug = relationship("Drug", back_populates="inventory_items")