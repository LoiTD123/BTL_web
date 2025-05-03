from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey, Enum, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from ..database import Base
import enum
from datetime import datetime, timezone
from typing import Optional
from .orderdetail import OrderDetail

class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            lower_value = value.lower()
            for member in cls:
                if member.value == lower_value:
                    return member
        return super()._missing_(value)

    @classmethod
    def get_all_values(cls) -> list[str]:
        """Trả về danh sách tất cả các giá trị của enum"""
        return [member.value for member in cls]

    @classmethod
    def is_valid(cls, value: str) -> bool:
        """Kiểm tra xem một giá trị có hợp lệ không"""
        try:
            cls(value)
            return True
        except ValueError:
            return False

    @classmethod
    def get_next_status(cls, current_status: 'OrderStatus') -> Optional['OrderStatus']:
        """Trả về trạng thái tiếp theo có thể chuyển đến"""
        status_flow = {
            cls.pending: [cls.confirmed, cls.cancelled],
            cls.confirmed: [cls.shipped, cls.cancelled],
            cls.shipped: [cls.delivered],
            cls.delivered: [],
            cls.cancelled: []
        }
        return status_flow.get(current_status)

    def can_transition_to(self, target_status: 'OrderStatus') -> bool:
        """Kiểm tra xem có thể chuyển từ trạng thái hiện tại sang trạng thái đích không"""
        next_statuses = self.get_next_status(self)
        return next_statuses and target_status in next_statuses

def utc_now():
    return datetime.now(timezone.utc)

class Order(Base):
    __tablename__ = "order"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customer.id", ondelete="CASCADE"), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.pending)
    shipping_address = Column(Text, nullable=False)
    phone_number = Column(String(15), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="orders", foreign_keys=[customer_id])
    order_details = relationship("OrderDetail", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Order(id={self.id}, order_number={self.order_number}, status={self.status})>" 