from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
from fastapi import status
import logging

from app.database import get_db
from app.models.order import Order
from app.models.orderdetail import OrderDetail
from app.models.product import Product
from app.models.user import Customer

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"]
)

logger = logging.getLogger(__name__)

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db)
):
    
    # Tính toán thời gian
    now = datetime.now()
    last_month = now - timedelta(days=30)
    
    # Tổng doanh thu
    total_revenue = db.query(func.sum(Order.total_amount)).scalar() or 0
    
    # Tổng đơn hàng
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    
    # Khách hàng mới trong tháng
    new_customers = db.query(func.count(Customer.id)).filter(
        Customer.created_at >= last_month,
        Customer.id != 1  # Không tính admin
    ).scalar() or 0
    
    # Sản phẩm bán chạy nhất
    top_product = db.query(
        Product.name,
        func.sum(OrderDetail.quantity).label('total_quantity')
    ).join(OrderDetail).group_by(Product.id).order_by(
        func.sum(OrderDetail.quantity).desc()
    ).first()
    
    return {
        "totalRevenue": float(total_revenue),
        "totalOrders": total_orders,
        "newCustomers": new_customers,
        "topProduct": top_product[0] if top_product else "Chưa có dữ liệu"
    }

@router.get("/revenue")
def get_revenue_data(db: Session = Depends(get_db)):
    """Lấy dữ liệu doanh thu theo tháng"""
    try:
        # Lấy dữ liệu 6 tháng gần nhất
        now = datetime.now()
        months = []
        values = []
        
        for i in range(5, -1, -1):
            month = now - timedelta(days=30*i)
            month_start = datetime(month.year, month.month, 1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            month_str = month.strftime("%Y-%m")
            months.append(month_str)
            
            # Tính doanh thu tháng
            revenue = db.query(func.sum(Order.total_amount)).filter(
                Order.created_at >= month_start,
                Order.created_at <= month_end
            ).scalar() or 0
            
            values.append(float(revenue))
        
        return {
            "labels": months,
            "values": values
        }
    except Exception as e:
        logger.error(f"Error getting revenue data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Đã xảy ra lỗi khi lấy dữ liệu doanh thu: {str(e)}"
        )

@router.get("/top-products")
def get_top_products(db: Session = Depends(get_db)):
    """Lấy dữ liệu top sản phẩm bán chạy"""
    # Lấy top 5 sản phẩm bán chạy
    top_products = db.query(
        Product.name,
        func.sum(OrderDetail.quantity).label('total_quantity')
    ).join(OrderDetail).group_by(Product.id).order_by(
        func.sum(OrderDetail.quantity).desc()
    ).limit(5).all()
    
    return {
        "labels": [p[0] for p in top_products],
        "values": [p[1] for p in top_products]
    }

@router.get("/recent-orders")
def get_recent_orders(db: Session = Depends(get_db)):
    """Lấy danh sách đơn hàng gần đây"""
    try:
        # Lấy 10 đơn hàng gần nhất
        orders = db.query(Order).order_by(Order.created_at.desc()).limit(10).all()
        
        return [{
            "id": order.id,
            "customer_name": order.customer.fullname if order.customer else "Khách vãng lai",
            "products": ", ".join([f"{od.product.name} ({od.quantity})" for od in order.order_details]),
            "total": float(order.total_amount),
            "status": order.status
        } for order in orders]
    except Exception as e:
        logger.error(f"Error getting recent orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Đã xảy ra lỗi khi lấy danh sách đơn hàng gần đây: {str(e)}"
        ) 