from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import sys
import os
from pathlib import Path

# Thêm thư mục gốc vào PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.routers import auth, category, admin, product
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
    "http://localhost",
    "http://localhost:8080",
    "http://localhost:8000",
    "http://localhost:3000",
    "http://127.0.0.1:5500",  # VS Code Live Server thường dùng port này
    "*"  # Trong môi trường phát triển, cho phép tất cả
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.get("/")
def read_root():
    return {"message": "Welcome to Vegetable Store API"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True)
