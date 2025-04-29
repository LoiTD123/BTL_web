from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from app.database import engine

try:
    with engine.connect() as connection:
        print("✅ Kết nối database thành công!")
except OperationalError as e:
    print("❌ Không thể kết nối database:")
    print(e)
