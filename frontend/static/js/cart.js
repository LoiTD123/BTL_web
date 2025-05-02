// DOM Elements
const cartItemsContainer = document.querySelector('.cart-items');
const subtotalElement = document.getElementById('subtotal');
const shippingElement = document.getElementById('shipping');
const totalElement = document.getElementById('total');
const checkoutBtn = document.getElementById('checkoutBtn');

// Constants
const SHIPPING_FEE = 30000; // 30,000 VNĐ

// Load cart items when page loads
document.addEventListener('DOMContentLoaded', loadCartItems);

// Kiểm tra đăng nhập
function checkAuth() {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Tải danh sách sản phẩm trong giỏ hàng
async function loadCartItems() {
    if (!checkAuth()) return;

    const cartItems = document.getElementById('cartItems');
    const totalAmount = document.getElementById('totalAmount');
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <p>Giỏ hàng của bạn đang trống</p>
                <a href="home_user.html" class="continue-shopping">Tiếp tục mua sắm</a>
            </div>
        `;
        totalAmount.textContent = '0 VNĐ';
        return;
    }

    let total = 0;
    let itemsHTML = '';

    for (const item of cart) {
        try {
            const response = await fetch(`http://localhost:8080/api/products/${item.productId}`);
            const product = await response.json();

            // Xử lý đường dẫn ảnh
            let imageUrl;
            if (product.image) {
                if (product.image.startsWith('/uploads/')) {
                    imageUrl = `http://localhost:8080${product.image}`;
                } else if (product.image.includes('uploads/')) {
                    imageUrl = `http://localhost:8080/${product.image}`;
                } else {
                    imageUrl = `http://localhost:8080/uploads/${product.image}`;
                }
            } else {
                imageUrl = '../static/images/rc1.jpg';
            }

            const itemTotal = product.price * item.quantity;
            total += itemTotal;

            itemsHTML += `
                <div class="cart-item" data-product-id="${product.id}">
                    <img src="${imageUrl}" alt="${product.name}" onerror="this.src='../static/images/rc1.jpg'">
                    <div class="cart-item-info">
                        <h3>${product.name}</h3>
                        <p>${product.price.toLocaleString('vi-VN')} VNĐ</p>
                        <div class="quantity-controls">
                            <button onclick="updateQuantity(${product.id}, ${item.quantity - 1})">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateQuantity(${product.id}, ${item.quantity + 1})">+</button>
                        </div>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${product.id})">Xóa</button>
                </div>
            `;
        } catch (error) {
            console.error('Lỗi khi tải thông tin sản phẩm:', error);
        }
    }

    cartItems.innerHTML = itemsHTML;
    totalAmount.textContent = `${total.toLocaleString('vi-VN')} VNĐ`;
}

// Cập nhật số lượng sản phẩm
function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const itemIndex = cart.findIndex(item => item.productId === productId);

    if (itemIndex !== -1) {
        cart[itemIndex].quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        loadCartItems();
    }
}

// Xóa sản phẩm khỏi giỏ hàng
function removeFromCart(productId) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const newCart = cart.filter(item => item.productId !== productId);
    localStorage.setItem('cart', JSON.stringify(newCart));
    loadCartItems();
}

// Hiển thị form thanh toán
function showCheckoutForm() {
    const checkoutForm = document.getElementById('checkoutForm');
    checkoutForm.style.display = 'flex';
}

// Đóng form thanh toán
function closeCheckoutForm() {
    const checkoutForm = document.getElementById('checkoutForm');
    checkoutForm.style.display = 'none';
}

// Xử lý nút thanh toán
document.getElementById('checkoutBtn').addEventListener('click', () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        alert('Giỏ hàng của bạn đang trống!');
        return;
    }
    showCheckoutForm();
});

// Xử lý form đặt hàng
document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const shippingAddress = document.getElementById('shippingAddress').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const notes = document.getElementById('notes').value;
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    try {
        const response = await fetch('http://localhost:8080/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shipping_address: shippingAddress,
                phone_number: phoneNumber,
                notes: notes,
                items: cart
            })
        });

        if (!response.ok) {
            throw new Error('Không thể tạo đơn hàng');
        }

        const orderData = await response.json();
        alert('Đặt hàng thành công!');
        localStorage.removeItem('cart'); // Xóa giỏ hàng sau khi đặt hàng thành công
        closeCheckoutForm();
        loadCartItems(); // Cập nhật lại giao diện giỏ hàng
    } catch (error) {
        console.error('Lỗi khi đặt hàng:', error);
        alert('Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.');
    }
});

// Tải giỏ hàng khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        loadCartItems();
    }
});

// Function to show empty cart message
function showEmptyCart() {
    cartItemsContainer.innerHTML = `
        <div class="empty-cart">
            <p>Giỏ hàng của bạn đang trống</p>
            <a href="home_user.html" class="continue-shopping">Tiếp tục mua sắm</a>
        </div>
    `;
    updateCartSummary([]);
}

// Function to update cart summary
function updateCartSummary(items) {
    const subtotal = items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    const shipping = items.length > 0 ? SHIPPING_FEE : 0;
    const total = subtotal + shipping;

    subtotalElement.textContent = `${subtotal.toLocaleString('vi-VN')} VNĐ`;
    shippingElement.textContent = `${shipping.toLocaleString('vi-VN')} VNĐ`;
    totalElement.textContent = `${total.toLocaleString('vi-VN')} VNĐ`;

    // Enable/disable checkout button
    checkoutBtn.disabled = items.length === 0;
} 