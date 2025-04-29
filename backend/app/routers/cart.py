from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import cart as cart_model
from ..models import cart_item as cart_item_model
from ..models import product as product_model
from ..schemas import cart as cart_schema
from ..crud import auth as auth_crud

router = APIRouter(
    prefix="/api/cart",
    tags=["cart"]
)

@router.get("")
async def get_cart(current_user = Depends(auth_crud.get_current_user), db: Session = Depends(get_db)):
    # Lấy giỏ hàng của user hiện tại
    cart = db.query(cart_model.Cart).filter(cart_model.Cart.customer_id == current_user.id).first()
    
    if not cart:
        # Nếu chưa có giỏ hàng, tạo mới
        cart = cart_model.Cart(customer_id=current_user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    
    # Lấy các sản phẩm trong giỏ hàng
    cart_items = db.query(cart_item_model.CartItem).filter(
        cart_item_model.CartItem.cart_id == cart.id
    ).all()
    
    # Lấy thông tin chi tiết sản phẩm
    items = []
    for item in cart_items:
        product = db.query(product_model.Product).filter(
            product_model.Product.id == item.product_id
        ).first()
        
        if product:
            items.append({
                "id": item.id,
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "price": product.price,
                    "image": product.image
                },
                "quantity": item.quantity
            })
    
    return {"items": items}

@router.post("")
async def add_to_cart(
    item: cart_schema.CartItemCreate,
    current_user = Depends(auth_crud.get_current_user),
    db: Session = Depends(get_db)
):
    # Lấy giỏ hàng của user
    cart = db.query(cart_model.Cart).filter(cart_model.Cart.customer_id == current_user.id).first()
    
    if not cart:
        # Tạo giỏ hàng mới nếu chưa có
        cart = cart_model.Cart(customer_id=current_user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    
    # Kiểm tra sản phẩm tồn tại
    product = db.query(product_model.Product).filter(product_model.Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    
    # Kiểm tra sản phẩm đã có trong giỏ hàng chưa
    cart_item = db.query(cart_item_model.CartItem).filter(
        cart_item_model.CartItem.cart_id == cart.id,
        cart_item_model.CartItem.product_id == item.product_id
    ).first()
    
    if cart_item:
        # Cập nhật số lượng nếu đã có
        cart_item.quantity += item.quantity
    else:
        # Thêm mới nếu chưa có
        cart_item = cart_item_model.CartItem(
            cart_id=cart.id,
            product_id=item.product_id,
            quantity=item.quantity
        )
        db.add(cart_item)
    
    db.commit()
    return {"message": "Đã thêm vào giỏ hàng thành công"}

@router.put("/{item_id}")
async def update_cart_item(
    item_id: int,
    item: cart_schema.CartItemUpdate,
    current_user = Depends(auth_crud.get_current_user),
    db: Session = Depends(get_db)
):
    # Lấy giỏ hàng của user
    cart = db.query(cart_model.Cart).filter(cart_model.Cart.customer_id == current_user.id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Không tìm thấy giỏ hàng")
    
    # Lấy item trong giỏ hàng
    cart_item = db.query(cart_item_model.CartItem).filter(
        cart_item_model.CartItem.id == item_id,
        cart_item_model.CartItem.cart_id == cart.id
    ).first()
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm trong giỏ hàng")
    
    # Cập nhật số lượng
    cart_item.quantity = item.quantity
    db.commit()
    
    return {"message": "Đã cập nhật số lượng thành công"}

@router.delete("/{item_id}")
async def remove_cart_item(
    item_id: int,
    current_user = Depends(auth_crud.get_current_user),
    db: Session = Depends(get_db)
):
    # Lấy giỏ hàng của user
    cart = db.query(cart_model.Cart).filter(cart_model.Cart.customer_id == current_user.id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Không tìm thấy giỏ hàng")
    
    # Lấy item trong giỏ hàng
    cart_item = db.query(cart_item_model.CartItem).filter(
        cart_item_model.CartItem.id == item_id,
        cart_item_model.CartItem.cart_id == cart.id
    ).first()
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm trong giỏ hàng")
    
    # Xóa item
    db.delete(cart_item)
    db.commit()
    
    return {"message": "Đã xóa sản phẩm khỏi giỏ hàng"} 