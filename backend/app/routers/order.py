from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional
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
                detail="Bạn không có quyền tạo đơn hàng cho người khác"
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
            detail=f"Đã xảy ra lỗi khi tạo đơn hàng: {str(e)}"
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
        raise HTTPException(status_code=403, detail="Bạn không có quyền thêm chi tiết đơn hàng này")
    
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

@router.get("")
def get_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách đơn hàng với phân trang"""
    try:
        # Tính toán offset
        offset = (page - 1) * page_size
        
        # Lấy tổng số đơn hàng
        total = db.query(Order).count()
        
        # Lấy đơn hàng cho trang hiện tại
        orders = db.query(Order).offset(offset).limit(page_size).all()
        
        # Chuyển đổi orders sang dictionary
        order_list = []
        for order in orders:
            order_data = {
                "id": order.id,
                "order_number": order.order_number,
                "customer_name": order.customer.fullname if order.customer else "Khách vãng lai",
                "total_amount": float(order.total_amount),
                "status": order.status,
                "created_at": order.created_at,
                "products": ", ".join([f"{od.product.name} ({od.quantity})" for od in order.order_details])
            }
            order_list.append(order_data)
        
        return {
            "items": order_list,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    except Exception as e:
        logger.error(f"Error getting orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Đã xảy ra lỗi khi lấy danh sách đơn hàng: {str(e)}"
        )

@router.put("/{order_id}")
def update_order(
    order_id: int,
    order_update: dict,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cập nhật thông tin đơn hàng"""
    try:
        # Tìm đơn hàng
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        
        # Kiểm tra quyền sửa đơn hàng
        if order.customer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền sửa đơn hàng này"
            )
        
        # Cập nhật các trường được phép
        if "status" in order_update:
            order.status = order_update["status"]
        if "notes" in order_update:
            order.notes = order_update["notes"]
        
        db.commit()
        db.refresh(order)
        
        return {
            "id": order.id,
            "order_number": order.order_number,
            "total_amount": float(order.total_amount),
            "status": order.status,
            "notes": order.notes,
            "created_at": order.created_at
        }
    except Exception as e:
        logger.error(f"Error updating order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Đã xảy ra lỗi khi cập nhật đơn hàng: {str(e)}"
        )

@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Xóa đơn hàng"""
    try:
        # Tìm đơn hàng
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        
        # Kiểm tra quyền xóa đơn hàng
        # Cho phép admin (ID=1) xóa bất kỳ đơn hàng nào
        if current_user.id != 1 and order.customer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xóa đơn hàng này"
            )
        
        try:
            # Xóa các order details trước
            db.query(OrderDetail).filter(OrderDetail.order_id == order_id).delete()
            
            # Sau đó xóa đơn hàng
            db.delete(order)
            db.commit()
            
            return {"message": "Xóa đơn hàng thành công"}
            
        except Exception as e:
            logger.error(f"Lỗi khi xóa đơn hàng: {str(e)}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Đã xảy ra lỗi khi xóa đơn hàng: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi không xác định khi xóa đơn hàng: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Đã xảy ra lỗi không xác định khi xóa đơn hàng: {str(e)}"
        ) 