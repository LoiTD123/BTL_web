// Biến toàn cục
let currentPage = 1;
const itemsPerPage = 10;
let orders = [];

// Hàm khởi tạo
document.addEventListener('DOMContentLoaded', function() {
    loadOrders();
    setupEventListeners();
});

// Hàm thiết lập các sự kiện
function setupEventListeners() {
    // Sự kiện tìm kiếm
    document.getElementById('searchOrder').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filteredOrders = orders.filter(order => 
            order.order_number.toLowerCase().includes(searchTerm) ||
            order.customer_name.toLowerCase().includes(searchTerm)
        );
        displayOrders(filteredOrders);
    });

    // Sự kiện phân trang
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayOrders(orders);
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(orders.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayOrders(orders);
        }
    });

    // Sự kiện modal
    const modal = document.getElementById('editOrderModal');
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

// Hàm tải danh sách đơn hàng
async function loadOrders() {
    try {
        const response = await fetch('http://localhost:8080/api/orders', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Không thể tải danh sách đơn hàng');
        
        const data = await response.json();
        orders = data.items;
        displayOrders(orders);
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra khi tải danh sách đơn hàng');
    }
}

// Hàm hiển thị danh sách đơn hàng
function displayOrders(ordersToDisplay) {
    const container = document.getElementById('ordersList');
    container.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedOrders = ordersToDisplay.slice(start, end);

    paginatedOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'order-card';
        card.innerHTML = `
            <div class="order-info">
                <h3>Đơn hàng #${order.order_number || 'N/A'}</h3>
                <p>Khách hàng: ${order.customer_name || 'Khách vãng lai'}</p>
                <p>Sản phẩm: ${order.products || 'Chưa có sản phẩm'}</p>
                <p>Tổng tiền: ${order.total_amount ? order.total_amount.toLocaleString('vi-VN') + 'đ' : '0đ'}</p>
                <p>Trạng thái: <span class="status-badge status-${order.status || 'pending'}">${getStatusText(order.status)}</span></p>
                <p>Ngày tạo: ${order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div class="order-actions">
                <button class="edit-btn" onclick="openEditModal(${order.id})">Sửa</button>
                <button class="delete-btn" onclick="deleteOrder(${order.id})">Xóa</button>
            </div>
        `;
        container.appendChild(card);
    });

    // Cập nhật thông tin phân trang
    const totalPages = Math.ceil(ordersToDisplay.length / itemsPerPage);
    document.getElementById('pageInfo').textContent = `Trang ${currentPage} / ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Hàm chuyển đổi trạng thái sang tiếng Việt
function getStatusText(status) {
    const statusMap = {
        'pending': 'Chờ xử lý',
        'processing': 'Đang xử lý',
        'shipped': 'Đã giao hàng',
        'delivered': 'Đã nhận hàng',
        'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
}

// Hàm mở modal sửa thông tin đơn hàng
function openEditModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('editOrderId').value = order.id;
    document.getElementById('editOrderStatus').value = order.status;
    document.getElementById('editOrderNotes').value = order.notes || '';

    document.getElementById('editOrderModal').style.display = "block";
}

// Hàm xóa đơn hàng
async function deleteOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) return;

    try {
        const response = await fetch(`http://localhost:8080/api/orders/${orderId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Không thể xóa đơn hàng');

        // Cập nhật lại danh sách
        orders = orders.filter(o => o.id !== orderId);
        displayOrders(orders);
        alert('Xóa đơn hàng thành công');
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra khi xóa đơn hàng');
    }
}

// Xử lý form sửa thông tin
document.getElementById('editOrderForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const orderId = document.getElementById('editOrderId').value;
    const formData = {
        status: document.getElementById('editOrderStatus').value,
        notes: document.getElementById('editOrderNotes').value
    };

    try {
        const response = await fetch(`http://localhost:8080/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Không thể cập nhật thông tin');

        // Cập nhật lại danh sách
        const updatedOrder = await response.json();
        const index = orders.findIndex(o => o.id === updatedOrder.id);
        if (index !== -1) {
            orders[index] = updatedOrder;
        }

        displayOrders(orders);
        document.getElementById('editOrderModal').style.display = "none";
        alert('Cập nhật thông tin thành công');
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra khi cập nhật thông tin');
    }
}); 