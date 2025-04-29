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

// Function to load cart items
async function loadCartItems() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('http://localhost:8080/api/cart', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Không thể tải giỏ hàng');
        }

        const cartData = await response.json();
        displayCartItems(cartData.items);
        updateCartSummary(cartData.items);
    } catch (error) {
        console.error('Lỗi khi tải giỏ hàng:', error);
        showEmptyCart();
    }
}

// Function to display cart items
function displayCartItems(items) {
    if (!items || items.length === 0) {
        showEmptyCart();
        return;
    }

    cartItemsContainer.innerHTML = items.map(item => {
        // Xử lý đường dẫn ảnh
        let imageUrl;
        if (item.product.image) {
            // Nếu đường dẫn bắt đầu bằng /uploads/ thì giữ nguyên
            if (item.product.image.startsWith('/uploads/')) {
                imageUrl = `http://localhost:8080${item.product.image}`;
            } 
            // Nếu đã chứa 'uploads/' thì thêm đường dẫn server
            else if (item.product.image.includes('uploads/')) {
                imageUrl = `http://localhost:8080/${item.product.image}`;
            }
            // Nếu chỉ là tên file
            else {
                imageUrl = `http://localhost:8080/uploads/${item.product.image}`;
            }
        } else {
            // Ảnh mặc định nếu không có ảnh
            imageUrl = '../static/images/rc1.jpg';
        }

        return `
            <div class="cart-item" data-id="${item.id}">
                <img src="${imageUrl}" 
                     alt="${item.product.name}"
                     onerror="this.src='../static/images/rc1.jpg'">
                <div class="item-info">
                    <h3>${item.product.name}</h3>
                    <p class="item-price">${item.product.price.toLocaleString('vi-VN')} VNĐ</p>
                </div>
                <div class="quantity-controls">
                    <button class="quantity-btn minus" onclick="updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" 
                           min="1" onchange="updateQuantity(${item.id}, this.value)">
                    <button class="quantity-btn plus" onclick="updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                </div>
                <div class="item-total">
                    ${(item.product.price * item.quantity).toLocaleString('vi-VN')} VNĐ
                </div>
                <button class="remove-btn" onclick="removeItem(${item.id})">×</button>
            </div>
        `;
    }).join('');
}

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

// Function to update item quantity
async function updateQuantity(itemId, newQuantity) {
    if (newQuantity < 1) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8080/api/cart/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quantity: parseInt(newQuantity) })
        });

        if (!response.ok) {
            throw new Error('Không thể cập nhật số lượng');
        }

        // Reload cart items to reflect changes
        loadCartItems();
    } catch (error) {
        console.error('Lỗi khi cập nhật số lượng:', error);
        alert('Có lỗi xảy ra khi cập nhật số lượng. Vui lòng thử lại.');
    }
}

// Function to remove item from cart
async function removeItem(itemId) {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8080/api/cart/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Không thể xóa sản phẩm');
        }

        // Reload cart items to reflect changes
        loadCartItems();
    } catch (error) {
        console.error('Lỗi khi xóa sản phẩm:', error);
        alert('Có lỗi xảy ra khi xóa sản phẩm. Vui lòng thử lại.');
    }
}

// Function to handle checkout
checkoutBtn.addEventListener('click', async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8080/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Không thể tạo đơn hàng');
        }

        const orderData = await response.json();
        alert('Đặt hàng thành công!');
        window.location.href = `order_detail.html?id=${orderData.id}`;
    } catch (error) {
        console.error('Lỗi khi đặt hàng:', error);
        alert('Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.');
    }
}); 