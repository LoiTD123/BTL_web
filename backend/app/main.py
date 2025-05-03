from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import sys
import os
from pathlib import Path

# Thêm thư mục gốc vào PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.routers import auth, category, admin, product, order
from app.database import engine
import app.models.user, app.models.category, app.models.product, app.models.order, app.models.orderdetail

# Tạo bảng nếu chưa tồn tại
app.models.category.Base.metadata.create_all(bind=engine)
app.models.user.Base.metadata.create_all(bind=engine)
app.models.product.Base.metadata.create_all(bind=engine)
app.models.order.Base.metadata.create_all(bind=engine)
app.models.orderdetail.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Vegetable Store API",
    description="API cho trang web bán rau củ",
    version="1.0.0"
)

# Cấu hình CORS
origins = [
    "http://localhost:8000",  # Frontend port
    "http://localhost:8080",  # Backend port
    "http://127.0.0.1:8000",  # Frontend IP
    "http://127.0.0.1:8080",  # Backend IP
    "http://localhost",       # Localhost
    "http://127.0.0.1"       # Localhost IP
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Chỉ cho phép các origin được định nghĩa
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Chỉ cho phép các phương thức cần thiết
    allow_headers=["*"],  # Cho phép tất cả các headers
    expose_headers=["*"], # Cho phép truy cập tất cả các headers
    max_age=3600
)

# Tạo thư mục uploads nếu chưa tồn tại
UPLOAD_DIR = Path(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads")))
print(f"Upload directory: {UPLOAD_DIR}")
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount thư mục uploads để phục vụ file tĩnh
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Đăng ký router
app.include_router(auth.router)
app.include_router(category.router)
app.include_router(admin.router)
app.include_router(product.router)
app.include_router(order.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Vegetable Store API"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True)
