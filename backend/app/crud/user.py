from sqlalchemy.orm import Session
from ..models.user import Customer
from ..schemas.user import UserCreate
import bcrypt

def hash_password(password: str) -> str:
    """Mã hóa mật khẩu sử dụng bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kiểm tra mật khẩu"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_user_by_username(db: Session, username: str):
    """Lấy thông tin user theo username"""
    return db.query(Customer).filter(Customer.username == username).first()

def get_user_by_id(db: Session, user_id: int):
    """Lấy thông tin user theo id"""
    return db.query(Customer).filter(Customer.id == user_id).first()

def create_user(db: Session, user: UserCreate):
    """Tạo user mới"""
    # Mã hóa mật khẩu
    hashed_password = hash_password(user.password)
    
    # Tạo đối tượng user mới
    db_user = Customer(
        username=user.username,
        password=hashed_password,
        fullname=user.fullname,
        phonenum=user.phonenum
    )
    
    # Lưu vào database
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
