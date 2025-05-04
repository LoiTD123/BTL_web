from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from ..database import get_db
from ..models.user import Customer
from ..schemas.user import UserResponse

router = APIRouter(
    prefix="/api/customers",
    tags=["customers"]
)

class CustomerUpdate(BaseModel):
    name: str
    phone: Optional[str] = None

@router.get("/", response_model=dict)
def get_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lấy danh sách khách hàng với phân trang và tìm kiếm"""
    # Tính toán offset
    offset = (page - 1) * page_size
    
    # Xây dựng query
    query = db.query(Customer)
    
    # Tìm kiếm theo tên hoặc email
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            func.lower(Customer.fullname).like(func.lower(search_pattern)) | 
            func.lower(Customer.username).like(func.lower(search_pattern))
        )
    
    # Lấy tổng số khách hàng
    total = query.count()
    
    # Lấy khách hàng cho trang hiện tại
    customers = query.offset(offset).limit(page_size).all()
    
    # Chuyển đổi customers sang schema
    customer_list = []
    for customer in customers:
        customer_data = {
            "id": customer.id,
            "name": customer.fullname,
            "email": customer.username,
            "phone": customer.phonenum,
            "created_at": customer.created_at
        }
        customer_list.append(customer_data)
    
    return {
        "items": customer_list,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }

@router.get("/{customer_id}", response_model=dict)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết khách hàng"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Khách hàng không tồn tại")
    
    return {
        "id": customer.id,
        "name": customer.fullname,
        "email": customer.username,
        "phone": customer.phonenum,
        "created_at": customer.created_at
    }

@router.put("/{customer_id}", response_model=dict)
def update_customer(
    customer_id: int,
    customer_update: CustomerUpdate,
    db: Session = Depends(get_db)
):
    """Cập nhật thông tin khách hàng"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Khách hàng không tồn tại")
    
    # Cập nhật thông tin
    customer.fullname = customer_update.name
    customer.phonenum = customer_update.phone
    
    db.commit()
    db.refresh(customer)
    
    return {
        "id": customer.id,
        "name": customer.fullname,
        "email": customer.username,
        "phone": customer.phonenum,
        "created_at": customer.created_at
    } 