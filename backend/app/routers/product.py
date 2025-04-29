from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import func
import os
import shutil
import uuid
from pathlib import Path

from app.database import get_db
from app.models.product import Product
from app.models.category import Category
from app.schemas.product import ProductCreate, ProductResponse

router = APIRouter(
    prefix="/api/products",
    tags=["products"]
)

# Tạo thư mục uploads nếu chưa tồn tại với đường dẫn tuyệt đối
UPLOAD_DIR = Path(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads")))
print(f"Upload directory: {UPLOAD_DIR}")
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)

def validate_image(file: UploadFile):
    """Kiểm tra định dạng và kích thước file ảnh"""
    if not file:
        return True
        
    # Kiểm tra định dạng file
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng file không được hỗ trợ. Chỉ chấp nhận: {', '.join(allowed_extensions)}"
        )
    
    # Kiểm tra kích thước file (giới hạn 5MB)
    MAX_SIZE = 5 * 1024 * 1024  # 5MB
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)  # Reset file pointer
    
    if file_size > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Kích thước file quá lớn. Giới hạn: 5MB"
        )
    
    return True

@router.post("/", response_model=ProductResponse)
async def create_product(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(...),
    category_id: int = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Tạo sản phẩm mới"""
    # Kiểm tra category tồn tại
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=404,
            detail="Danh mục không tồn tại"
        )
    
    # Xử lý file ảnh nếu có
    image_path = None
    if image:
        try:
            # Kiểm tra file ảnh
            validate_image(image)
            
            # Tạo tên file duy nhất
            file_extension = os.path.splitext(image.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            # Lưu file
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            # Lưu đường dẫn tương đối với forward slash
            image_path = f"uploads/{unique_filename}"
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=f"Lỗi khi upload ảnh: {str(e)}"
            )
    
    # Tạo sản phẩm mới
    db_product = Product(
        name=name,
        description=description,
        price=price,
        category_id=category_id,
        image=image_path
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    return ProductResponse.model_validate(db_product)

@router.get("/", response_model=dict)
def get_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(9, ge=1, le=100),
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(None, pattern="^(name|price|created_at)$"),
    sort_order: Optional[str] = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """Lấy danh sách sản phẩm với phân trang, lọc và sắp xếp"""
    # Tính toán offset
    offset = (page - 1) * page_size
    
    # Xây dựng query
    query = db.query(Product)
    
    # Lọc theo danh mục
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    # Tìm kiếm theo tên hoặc mô tả
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            func.lower(Product.name).like(func.lower(search_pattern)) | 
            (Product.description != None and func.lower(Product.description).like(func.lower(search_pattern)))
        )
    
    # Sắp xếp
    if sort_by:
        column = getattr(Product, sort_by)
        if sort_order == "desc":
            query = query.order_by(column.desc())
        else:
            query = query.order_by(column.asc())
    else:
        # Mặc định sắp xếp theo ID tăng dần
        query = query.order_by(Product.id.asc())
    
    # Lấy tổng số sản phẩm
    total = query.count()
    
    # Lấy sản phẩm cho trang hiện tại
    products = query.offset(offset).limit(page_size).all()
    
    # Chuyển đổi products sang schema và đảm bảo đường dẫn ảnh đầy đủ
    product_list = []
    for product in products:
        product_data = ProductResponse.model_validate(product)
        product_list.append(product_data)
    
    return {
        "items": product_list,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết sản phẩm"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    return ProductResponse.model_validate(product)

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(...),
    category_id: int = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Cập nhật thông tin sản phẩm"""
    # Kiểm tra sản phẩm tồn tại
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    
    # Kiểm tra category tồn tại
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Danh mục không tồn tại")
    
    # Xử lý file ảnh nếu có
    if image and image.filename:
        try:
            # Kiểm tra file ảnh
            validate_image(image)
            
            # Tạo tên file duy nhất
            file_extension = os.path.splitext(image.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            # Lưu file
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            # Xóa ảnh cũ nếu có
            if product.image and product.image.startswith("/uploads/"):
                old_filename = product.image.replace("/uploads/", "")
                old_image_path = UPLOAD_DIR / old_filename
                if old_image_path.exists():
                    old_image_path.unlink()
            
            # Lưu đường dẫn tương đối với forward slash
            product.image = f"uploads/{unique_filename}"
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=f"Lỗi khi upload ảnh: {str(e)}"
            )
    
    # Cập nhật thông tin
    product.name = name
    product.description = description
    product.price = price
    product.category_id = category_id
    
    db.commit()
    db.refresh(product)
    
    return ProductResponse.model_validate(product)

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Xóa sản phẩm"""
    # Kiểm tra sản phẩm tồn tại
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    
    # Xóa ảnh nếu có
    if product.image and product.image.startswith("/uploads/"):
        old_filename = product.image.replace("/uploads/", "")
        image_path = UPLOAD_DIR / old_filename
        if image_path.exists():
            try:
                image_path.unlink()
            except Exception as e:
                print(f"Lỗi khi xóa ảnh: {str(e)}")
    
    # Xóa sản phẩm
    db.delete(product)
    db.commit()
    
    return {"message": "Xóa sản phẩm thành công"}
