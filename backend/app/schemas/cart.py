from pydantic import BaseModel
from typing import Optional

class CartItemBase(BaseModel):
    product_id: int
    quantity: int

class CartItemCreate(CartItemBase):
    pass

class CartItemUpdate(BaseModel):
    quantity: int

class CartItem(CartItemBase):
    id: int
    cart_id: int

    class Config:
        from_attributes = True

class CartItemResponse(BaseModel):
    id: int
    product: dict
    quantity: int

    class Config:
        from_attributes = True 