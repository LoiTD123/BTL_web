from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None

    @field_validator('image')
    def add_uploads_path(cls, v):
        if v:
            return f"/uploads/{v}"
        return v

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 