from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserUpdate, UserResponse

router = APIRouter(
    prefix="/api/customers",
    tags=["customers"]
)

@router.get("/", response_model=List[UserResponse])
def get_customers(db: Session = Depends(get_db)):
    """Get all customers (excluding admin)"""
    customers = db.query(User).filter(User.id != 1).all()
    return customers

@router.get("/{customer_id}", response_model=UserResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Get a specific customer by ID"""
    customer = db.query(User).filter(User.id == customer_id, User.id != 1).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/{customer_id}", response_model=UserResponse)
def update_customer(customer_id: int, customer_data: UserUpdate, db: Session = Depends(get_db)):
    """Update a customer's information"""
    customer = db.query(User).filter(User.id == customer_id, User.id != 1).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Update customer data
    for field, value in customer_data.dict(exclude_unset=True).items():
        setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """Delete a customer"""
    customer = db.query(User).filter(User.id == customer_id, User.id != 1).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted successfully"} 