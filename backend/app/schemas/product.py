from pydantic import BaseModel, field_validator
from typing import Optional

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    image: Optional[str] = None
    category_id: int

    @field_validator('image')
    def add_uploads_path(cls, v):
        if v:
            return f"/{v}"
        return v

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int

    class Config:
        from_attributes = True