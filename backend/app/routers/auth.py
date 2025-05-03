from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from app.database import get_db
from app.models.user import Customer
from app.schemas.user import UserCreate, UserLogin, ChangePasswordRequest
from app.schemas.token import Token, TokenData
from app.crud.user import get_user_by_username, create_user

router = APIRouter(
    prefix="/api/auth",
    tags=["authentication"]
)

# Tải biến môi trường
load_dotenv()

# Cấu hình bảo mật
SECRET_KEY = "Loi27122004."  # Sử dụng cùng một key với database
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Cấu hình mã hóa mật khẩu
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Các hàm tiện ích xác thực
def verify_password(plain_password, hashed_password):
    """Kiểm tra mật khẩu"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Mã hóa mật khẩu"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Tạo token JWT"""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)  # thời gian hiện tại có timezone
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Lấy thông tin user hiện tại từ token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

# API Endpoints
@router.post("/register", response_model=Dict[str, str], status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Đăng ký người dùng mới"""
    
    # Kiểm tra username đã tồn tại chưa
    existing_user = get_user_by_username(db, user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập đã tồn tại"
        )
    
    # Tạo user mới
    try:
        # Mã hóa mật khẩu
        hashed_password = get_password_hash(user_data.password)
        
        # Tạo user
        user = Customer(
            username=user_data.username,
            password=hashed_password,
            fullname=user_data.fullname,
            phonenum=user_data.phonenum
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return {"message": "Đăng ký thành công"}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống: {str(e)}"
        )

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Đăng nhập và lấy token"""
    # Lấy thông tin user
    user = get_user_by_username(db, login_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Kiểm tra mật khẩu
    if not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Tạo token truy cập
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id)  # Chuyển đổi user.id sang string
    }

#Repass
@router.post("/change-password", response_model=Dict[str, str])
async def change_password(
    request: ChangePasswordRequest, 
    current_user: Customer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Đổi mật khẩu người dùng"""
    
    # Kiểm tra mật khẩu cũ
    if not verify_password(request.old_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu cũ không chính xác"
        )
    
    # Kiểm tra mật khẩu mới khác mật khẩu cũ
    if request.old_password == request.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới không được trùng với mật khẩu cũ"
        )
    
    # Mã hóa mật khẩu mới
    hashed_password = get_password_hash(request.new_password)
    
    # Cập nhật mật khẩu trong database
    current_user.password = hashed_password
    db.commit()
    
    return {"message": "Đổi mật khẩu thành công"}