from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import func
import os
import shutil
from pathlib import Path

from app.database import get_db
from app.models.category import Category
from app.models.product import Product
from app.schemas.category import CategoryCreate, CategoryResponse
from app.schemas.product import ProductResponse
from app.crud.auth import get_current_user

router = APIRouter(
    prefix="/api/categories",
    tags=["categories"]
)

# Tạo thư mục uploads nếu chưa tồn tại
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/", response_model=CategoryResponse)
async def create_category(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tạo danh mục mới"""
    # Kiểm tra tên danh mục đã tồn tại chưa
    existing_category = db.query(Category).filter(Category.name == name).first()
    if existing_category:
        raise HTTPException(
            status_code=400,
            detail="Tên danh mục đã tồn tại"
        )
    
    # Xử lý file ảnh nếu có
    image_path = None
    if image:
        # Tạo tên file duy nhất
        file_extension = os.path.splitext(image.filename)[1]
        unique_filename = f"{name}_{image.filename}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Lưu file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        
        # Lưu đường dẫn tương đối
        image_path = f"/uploads/{unique_filename}"
    
    # Tạo danh mục mới
    db_category = Category(
        name=name,
        description=description,
        image=image_path
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return CategoryResponse.model_validate(db_category)

@router.get("/", response_model=dict)
def get_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(4, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lấy danh sách tất cả danh mục với phân trang"""
    # Tính toán offset
    offset = (page - 1) * page_size
    
    # Lấy tổng số danh mục
    total = db.query(func.count(Category.id)).scalar()
    
    # Lấy danh mục cho trang hiện tại
    categories = db.query(Category).offset(offset).limit(page_size).all()
    
    # Chuyển đổi categories sang schema
    category_list = [CategoryResponse.model_validate(category) for category in categories]
    
    return {
        "items": category_list,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }

@router.get("/{category_id}/products", response_model=dict)
def get_category_products(
    category_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(4, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lấy danh sách sản phẩm theo danh mục với phân trang"""
    # Kiểm tra danh mục tồn tại
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Danh mục không tồn tại")
    
    # Tính toán offset
    offset = (page - 1) * page_size
    
    # Lấy tổng số sản phẩm trong danh mục
    total = db.query(func.count(Product.id)).filter(Product.category_id == category_id).scalar()
    
    # Lấy sản phẩm cho trang hiện tại
    products = db.query(Product).filter(Product.category_id == category_id).offset(offset).limit(page_size).all()
    
    # Chuyển đổi products sang schema
    product_list = [ProductResponse.model_validate(product) for product in products]
    
    return {
        "items": product_list,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }

@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Xóa danh mục và tất cả sản phẩm thuộc danh mục đó"""
    # Kiểm tra danh mục tồn tại
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Danh mục không tồn tại")
    
    # Xóa ảnh của danh mục nếu có
    if category.image and category.image.startswith("/uploads/"):
        old_filename = category.image.replace("/uploads/", "")
        image_path = UPLOAD_DIR / old_filename
        if image_path.exists():
            try:
                image_path.unlink()
            except Exception as e:
                print(f"Lỗi khi xóa ảnh danh mục: {str(e)}")
    
    # Xóa tất cả sản phẩm thuộc danh mục
    products = db.query(Product).filter(Product.category_id == category_id).all()
    for product in products:
        # Xóa ảnh sản phẩm nếu có
        if product.image and product.image.startswith("/uploads/"):
            old_filename = product.image.replace("/uploads/", "")
            image_path = UPLOAD_DIR / old_filename
            if image_path.exists():
                try:
                    image_path.unlink()
                except Exception as e:
                    print(f"Lỗi khi xóa ảnh sản phẩm: {str(e)}")
        # Xóa sản phẩm
        db.delete(product)
    
    # Xóa danh mục
    db.delete(category)
    db.commit()
    
    return {"message": "Xóa danh mục và tất cả sản phẩm thuộc danh mục thành công"}

@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: int,
    db: Session = Depends(get_db)
):
    """Lấy thông tin chi tiết một danh mục"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Danh mục không tồn tại")
    
    return CategoryResponse.model_validate(category)

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cập nhật thông tin danh mục"""
    # Kiểm tra danh mục tồn tại
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Danh mục không tồn tại")
    
    # Kiểm tra tên danh mục đã tồn tại chưa (trừ danh mục hiện tại)
    existing_category = db.query(Category).filter(
        Category.name == name,
        Category.id != category_id
    ).first()
    if existing_category:
        raise HTTPException(
            status_code=400,
            detail="Tên danh mục đã tồn tại"
        )
    
    # Xử lý file ảnh nếu có
    if image:
        # Xóa ảnh cũ nếu có
        if category.image and category.image.startswith("/uploads/"):
            old_filename = category.image.replace("/uploads/", "")
            old_path = UPLOAD_DIR / old_filename
            if old_path.exists():
                try:
                    old_path.unlink()
                except Exception as e:
                    print(f"Lỗi khi xóa ảnh cũ: {str(e)}")
        
        # Tạo tên file duy nhất
        file_extension = os.path.splitext(image.filename)[1]
        unique_filename = f"{name}_{image.filename}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Lưu file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        
        # Lưu đường dẫn tương đối
        category.image = f"/uploads/{unique_filename}"
    
    # Cập nhật thông tin
    category.name = name
    if description is not None:
        category.description = description
    
    db.commit()
    db.refresh(category)
    
    return CategoryResponse.model_validate(category) 