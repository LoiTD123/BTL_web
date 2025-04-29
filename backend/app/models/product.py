from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Numeric, ForeignKey, Float, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone

def utc_now():
    return datetime.now(timezone.utc)

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)
    discount_price = Column(Numeric(10, 2))
    image = Column(String(255))
    is_available = Column(Boolean, default=True)
    category_id = Column(Integer, ForeignKey("category.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationship với Category
    category = relationship("Category", back_populates="products")
    order_details = relationship("OrderDetail", back_populates="product") 