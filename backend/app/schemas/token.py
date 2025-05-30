from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int  # Thay đổi từ role thành user_id

class TokenData(BaseModel):
    username: Optional[str] = None
