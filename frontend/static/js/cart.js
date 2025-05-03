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

// Hàm đăng xuất
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Kiểm tra đăng nhập
function checkAuth() {
    const user_id = localStorage.getItem('user_id');
    const token = localStorage.getItem('token');
    
    if (!user_id || !token) {
        logout();
        return false;
    }
    return true;
}

// Lấy giỏ hàng của user hiện tại
function getCart() {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) return [];
    const cartKey = `cart_${user_id}`;
    return JSON.parse(localStorage.getItem(cartKey)) || [];
}

// Lưu giỏ hàng của user hiện tại
function saveCart(cart) {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) return;
    const cartKey = `cart_${user_id}`;
    localStorage.setItem(cartKey, JSON.stringify(cart));
}

// Tải danh sách sản phẩm trong giỏ hàng
async function loadCartItems() {
    if (!checkAuth()) return;

    const cartItems = document.getElementById('cartItems');
    const totalAmount = document.getElementById('totalAmount');
    const cart = getCart();
    
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

    const cart = getCart();
    const itemIndex = cart.findIndex(item => item.productId === productId);

    if (itemIndex !== -1) {
        cart[itemIndex].quantity = newQuantity;
        saveCart(cart);
        loadCartItems();
    }
}

// Xóa sản phẩm khỏi giỏ hàng
function removeFromCart(productId) {
    const cart = getCart();
    const newCart = cart.filter(item => item.productId !== productId);
    saveCart(newCart);
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
    const cart = getCart();
    if (cart.length === 0) {
        alert('Giỏ hàng của bạn đang trống!');
        return;
    }
    showCheckoutForm();
});

// Xử lý form đặt hàng
document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        alert('Giỏ hàng trống!');
        return;
    }

    const token = localStorage.getItem('token');
    const user_id = localStorage.getItem('user_id');
    
    if (!token || !user_id) {
        alert('Vui lòng đăng nhập lại!');
        window.location.href = 'login.html';
        return;
    }

    // Kiểm tra các trường bắt buộc
    const shippingAddress = document.getElementById('shippingAddress').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();

    if (!shippingAddress) {
        alert('Vui lòng nhập địa chỉ giao hàng!');
        return;
    }

    if (!phoneNumber) {
        alert('Vui lòng nhập số điện thoại!');
        return;
    }

    try {
        let totalAmount = 0;
        const orderDetails = cart.map(item => {
            const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
            totalAmount += itemTotal;
            return {
                product_id: parseInt(item.productId),
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price)
            };
        });

        if (totalAmount <= 0) {
            alert('Tổng tiền đơn hàng phải lớn hơn 0!');
            return;
        }

        totalAmount = parseFloat(totalAmount.toFixed(2));

        const orderData = {
            order_number: `ORD-${Date.now()}`,
            customer_id: parseInt(user_id),
            total_amount: totalAmount,
            status: 'pending',
            shipping_address: shippingAddress,
            phone_number: phoneNumber,
            notes: document.getElementById('notes').value.trim(),
            order_details: orderDetails
        };

        try {
            const response = await fetch('http://localhost:8080/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user_id');
                    alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
                    window.location.href = 'login.html';
                    return;
                }
                
                throw new Error('Lỗi: ' + JSON.stringify(errorData));
            }

            const data = await response.json();
            alert('Đặt hàng thành công!');
            clearCart();
            closeCheckoutForm();
            window.location.href = 'home_user.html';
        } catch (error) {
            console.error('Lỗi khi đặt hàng:', error);
            alert('Có lỗi xảy ra khi đặt hàng: ' + error.message);
        }
    } catch (error) {
        console.error('Lỗi khi xử lý đơn hàng:', error);
        alert('Có lỗi xảy ra: ' + error.message);
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

    checkoutBtn.disabled = items.length === 0;
}

// Hàm đặt hàng
async function placeOrder() {
    if (!checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        alert('Giỏ hàng trống!');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const user_id = localStorage.getItem('user_id');
        
        if (!token || !user_id) {
            alert('Vui lòng đăng nhập lại!');
            window.location.href = 'login.html';
            return;
        }

        let totalAmount = 0;
        const orderDetails = cart.map(item => {
            const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
            totalAmount += itemTotal;
            return {
                product_id: parseInt(item.productId),
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price)
            };
        });

        totalAmount = parseFloat(totalAmount.toFixed(2));

        const orderData = {
            order_number: `ORD-${Date.now()}`,
            customer_id: parseInt(user_id),
            total_amount: totalAmount,
            status: 'pending',
            shipping_address: document.getElementById('shippingAddress').value,
            phone_number: document.getElementById('phoneNumber').value,
            notes: document.getElementById('notes').value,
            order_details: orderDetails
        };

        try {
            const response = await fetch('http://localhost:8080/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user_id');
                    alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
                    window.location.href = 'login.html';
                    return;
                }
                
                throw new Error('Lỗi: ' + JSON.stringify(errorData));
            }

            const data = await response.json();
            alert('Đặt hàng thành công!');
            clearCart();
            window.location.href = 'orders.html';
        } catch (error) {
            console.error('Lỗi khi đặt hàng:', error);
            alert(error.message || 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại!');
        }
    } catch (error) {
        console.error('Lỗi khi đặt hàng:', error);
        alert(error.message || 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại!');
    }
}

// Xóa giỏ hàng
function clearCart() {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) return;
    const cartKey = `cart_${user_id}`;
    localStorage.removeItem(cartKey);
    loadCartItems();
} 