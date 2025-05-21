from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import Customer
from datetime import datetime, timedelta
from typing import Optional

# Cấu hình JWT
SECRET_KEY = "Loi27122004."  # Sử dụng cùng một key với database
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Debug: Kiểm tra token
        print("Token received:", token)
        
        # Xóa prefix Bearer nếu có
        if token.startswith("Bearer "):
            token = token[7:]
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError as e:
        print("JWT Error:", str(e))
        raise credentials_exception
    
    user = db.query(Customer).filter(Customer.username == username).first()
    if user is None:
        raise credentials_exception
    return user 