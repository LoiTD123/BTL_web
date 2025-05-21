from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from fastapi import status

from ..database import get_db
from ..models.user import Customer
from ..schemas.user import UserResponse
from ..crud.auth import get_current_user

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
    current_user = Depends(get_current_user),
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
            func.lower(Customer.name).like(func.lower(search_pattern)) |
            func.lower(Customer.email).like(func.lower(search_pattern))
        )
    
    # Lấy tổng số khách hàng
    total = query.count()
    
    # Lấy khách hàng cho trang hiện tại
    customers = query.offset(offset).limit(page_size).all()
    
    # Chuyển đổi customers sang schema
    customer_list = [UserResponse.model_validate(customer) for customer in customers]
    
    return {
        "items": customer_list,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }

@router.get("/{customer_id}", response_model=UserResponse)
def get_customer(
    customer_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy thông tin chi tiết khách hàng"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Khách hàng không tồn tại")
    return UserResponse.model_validate(customer)

@router.put("/{customer_id}", response_model=UserResponse)
def update_customer(
    customer_id: int,
    customer: CustomerUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cập nhật thông tin khách hàng"""
    # Kiểm tra quyền truy cập
    if current_user.id != customer_id:
        raise HTTPException(
            status_code=403,
            detail="Không có quyền cập nhật thông tin khách hàng khác"
        )
    
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Khách hàng không tồn tại")
    
    # Cập nhật thông tin
    for key, value in customer.model_dump(exclude_unset=True).items():
        setattr(db_customer, key, value)
    
    db.commit()
    db.refresh(db_customer)
    return UserResponse.model_validate(db_customer)

@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Xóa khách hàng"""
    # Kiểm tra quyền truy cập
    if current_user.id != customer_id and current_user.id != 1:
        raise HTTPException(
            status_code=403,
            detail="Không có quyền xóa khách hàng khác"
        )
    
    # Không cho phép xóa tài khoản admin
    if customer_id == 1:
        raise HTTPException(
            status_code=403,
            detail="Không thể xóa tài khoản admin"
        )
    
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Khách hàng không tồn tại")
    
    db.delete(db_customer)
    db.commit()
    return {"message": "Xóa khách hàng thành công"} 