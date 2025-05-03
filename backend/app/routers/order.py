from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from ..database import get_db
from ..models.order import Order, OrderStatus
from ..models.orderdetail import OrderDetail
from ..schemas.order import OrderCreate, OrderResponse, OrderDetailCreate, OrderDetailResponse
from ..models.user import Customer
from ..crud.auth import get_current_user
import logging

# Cấu hình logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/orders",
    tags=["orders"]
)

@router.post("", response_model=OrderResponse)
async def create_order(
    order: OrderCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Debug: Log dữ liệu nhận được
        logger.debug(f"Received order data: {order.model_dump()}")
        
        # Kiểm tra customer_id có khớp với user đang đăng nhập không
        if order.customer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền tạo đơn hàng cho người khác"
            )
        
        # Tạo đơn hàng mới với status là chữ hoa
        db_order = Order(
            order_number=order.order_number,
            customer_id=order.customer_id,
            total_amount=order.total_amount,
            status=OrderStatus.pending,  # Sử dụng giá trị enum trực tiếp
            shipping_address=order.shipping_address,
            phone_number=order.phone_number,
            notes=order.notes
        )
        
        db.add(db_order)
        db.flush()  # This will generate the order ID without committing
        
        # Tạo chi tiết đơn hàng
        for detail in order.order_details:
            logger.debug(f"Processing order detail: {detail.model_dump()}")
            db_detail = OrderDetail(
                order_id=db_order.id,
                product_id=detail.product_id,
                quantity=detail.quantity,
                price=detail.price
            )
            db.add(db_detail)
        
        db.commit()
        db.refresh(db_order)
        
        # Lấy lại đơn hàng với đầy đủ thông tin
        db_order = db.query(Order).filter(Order.id == db_order.id).first()
        
        # Tạo response data
        response_data = {
            "id": db_order.id,
            "order_number": db_order.order_number,
            "customer_id": db_order.customer_id,
            "total_amount": float(db_order.total_amount),
            "status": db_order.status,
            "shipping_address": db_order.shipping_address,
            "phone_number": db_order.phone_number,
            "notes": db_order.notes,
            "created_at": db_order.created_at,
            "updated_at": db_order.updated_at,
            "order_details": [
                {
                    "id": detail.id,
                    "order_id": detail.order_id,
                    "product_id": detail.product_id,
                    "quantity": detail.quantity,
                    "price": float(detail.price),
                    "created_at": detail.created_at
                }
                for detail in db_order.order_details
            ]
        }
        
        # Debug: Log response data
        logger.debug(f"Response data: {response_data}")
        
        # Chuyển đổi sang schema OrderResponse
        order_response = OrderResponse.model_validate(response_data)
        logger.debug(f"Validated order response: {order_response.model_dump()}")
        
        return order_response
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo đơn hàng: {str(e)}"
        )

@router.post("/{order_id}/details", response_model=OrderDetailResponse)
async def create_order_detail(
    order_id: int,
    order_detail: OrderDetailCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Kiểm tra đơn hàng có tồn tại và thuộc về user đang đăng nhập không
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    if order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền thêm chi tiết đơn hàng")
    
    # Tạo chi tiết đơn hàng
    db_order_detail = OrderDetail(
        order_id=order_id,
        product_id=order_detail.product_id,
        quantity=order_detail.quantity,
        price=order_detail.price
    )
    
    db.add(db_order_detail)
    db.commit()
    db.refresh(db_order_detail)
    
    return db_order_detail 