from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
from sqlalchemy import text

# Cấu hình MySQL - Thay thế các giá trị này bằng thông tin của bạn
DB_USER = "root"  # Thay bằng username MySQL của bạn
DB_PASSWORD = "Loi27122004."  # Thay bằng mật khẩu MySQL của bạn
DB_HOST = "localhost"
DB_NAME = "vegetable_store"

# Tạo URL kết nối
SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

# Khởi tạo engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Tạo session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Tạo base model
Base = declarative_base()

# Dependency để lấy database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
