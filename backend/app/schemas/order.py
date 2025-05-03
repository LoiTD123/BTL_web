from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from ..models.order import OrderStatus

class OrderDetailBase(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)

class OrderDetailCreate(OrderDetailBase):
    pass

class OrderDetailResponse(OrderDetailBase):
    id: int
    order_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    order_number: str = Field(..., min_length=1)
    customer_id: int = Field(..., gt=0)
    total_amount: float = Field(..., gt=0)
    status: OrderStatus = Field(default=OrderStatus.pending)
    shipping_address: str = Field(..., min_length=1)
    phone_number: str = Field(..., min_length=1)
    notes: Optional[str] = None
    order_details: List[OrderDetailCreate] = Field(..., min_items=1)

    class Config:
        from_attributes = True

class OrderCreate(OrderBase):
    pass

class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_id: int
    total_amount: float
    status: OrderStatus
    shipping_address: str
    phone_number: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    order_details: List[OrderDetailResponse]

    class Config:
        from_attributes = True
        populate_by_name = True
        arbitrary_types_allowed = True 