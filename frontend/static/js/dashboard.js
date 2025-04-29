// Hàm tải dữ liệu thống kê
async function loadDashboardStats() {
    try {
        const response = await fetch('http://localhost:8080/api/admin/stats');
        const stats = await response.json();
        
        // Cập nhật các thẻ thống kê
        document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = 
            stats.totalRevenue.toLocaleString('vi-VN') + 'đ';
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = 
            stats.totalOrders;
        document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = 
            stats.newCustomers;
        document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = 
            stats.topProduct;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Hàm tạo biểu đồ doanh thu
function createRevenueChart(data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Doanh thu',
                data: data.values,
                borderColor: '#6366f1',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// Hàm tạo biểu đồ sản phẩm bán chạy
function createProductsChart(data) {
    const ctx = document.getElementById('productsChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Số lượng bán',
                data: data.values,
                backgroundColor: '#6366f1'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// Hàm tải dữ liệu biểu đồ
async function loadCharts() {
    try {
        // Tải dữ liệu doanh thu
        const revenueResponse = await fetch('http://localhost:8080/api/admin/revenue');
        const revenueData = await revenueResponse.json();
        createRevenueChart(revenueData);

        // Tải dữ liệu sản phẩm bán chạy
        const productsResponse = await fetch('http://localhost:8080/api/admin/top-products');
        const productsData = await productsResponse.json();
        createProductsChart(productsData);
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

// Hàm tải đơn hàng gần đây
async function loadRecentOrders() {
    try {
        const response = await fetch('http://localhost:8080/api/admin/recent-orders');
        const orders = await response.json();
        
        const tableBody = document.getElementById('recentOrdersTable');
        tableBody.innerHTML = '';
        
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.customer_name}</td>
                <td>${order.products}</td>
                <td>${order.total.toLocaleString('vi-VN')}đ</td>
                <td>${order.status}</td>
                <td>
                    <button class="action-btn view-btn" onclick="viewOrder(${order.id})">Xem</button>
                    <button class="action-btn edit-btn" onclick="editOrder(${order.id})">Sửa</button>
                    <button class="action-btn delete-btn" onclick="deleteOrder(${order.id})">Xóa</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading recent orders:', error);
    }
}

// Hàm xử lý các thao tác với đơn hàng
function viewOrder(orderId) {
    // TODO: Implement view order details
    console.log('View order:', orderId);
}

function editOrder(orderId) {
    // TODO: Implement edit order
    console.log('Edit order:', orderId);
}

function deleteOrder(orderId) {
    if (confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
        // TODO: Implement delete order
        console.log('Delete order:', orderId);
    }
}

// Tải dữ liệu khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadCharts();
    loadRecentOrders();
}); 