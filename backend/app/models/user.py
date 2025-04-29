from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from ..database import Base
from datetime import datetime, timezone

def utc_now():
    return datetime.now(timezone.utc)

class Customer(Base):
    __tablename__ = "customer"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    fullname = Column(String(100), nullable=False)
    phonenum = Column(String(15), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    orders = relationship("Order", back_populates="customer", foreign_keys="[Order.customer_id]")
