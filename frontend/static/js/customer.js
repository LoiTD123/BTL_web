// Biến toàn cục
let currentPage = 1;
const itemsPerPage = 10;
let customers = [];

// Hàm khởi tạo
document.addEventListener('DOMContentLoaded', function() {
    loadCustomers();
    setupEventListeners();
});

// Hàm thiết lập các sự kiện
function setupEventListeners() {
    // Sự kiện tìm kiếm
    document.getElementById('searchCustomer').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filteredCustomers = customers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.phone?.toLowerCase().includes(searchTerm)
        );
        displayCustomers(filteredCustomers);
    });

    // Sự kiện phân trang
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayCustomers(customers);
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(customers.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayCustomers(customers);
        }
    });

    // Sự kiện modal
    const modal = document.getElementById('editCustomerModal');
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

// Hàm tải danh sách khách hàng
async function loadCustomers() {
    try {
        const response = await fetch('http://localhost:8080/api/customers');
        if (!response.ok) throw new Error('Không thể tải danh sách khách hàng');
        
        const data = await response.json();
        customers = data.items;
        displayCustomers(customers);
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra khi tải danh sách khách hàng');
    }
}

// Hàm hiển thị danh sách khách hàng
function displayCustomers(customersToDisplay) {
    const container = document.getElementById('customersList');
    container.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedCustomers = customersToDisplay.slice(start, end);

    paginatedCustomers.forEach(customer => {
        const card = document.createElement('div');
        card.className = 'customer-card';
        card.innerHTML = `
            <div class="customer-info">
                <h3>${customer.name}</h3>
                <p>Số điện thoại: ${customer.phone || 'Chưa cập nhật'}</p>
                <p>Ngày tạo: ${new Date(customer.created_at).toLocaleDateString()}</p>
            </div>
            <div class="customer-actions">
                <button class="edit-btn" onclick="openEditModal(${customer.id})">Sửa</button>
                ${customer.id !== 1 ? `<button class="delete-btn" onclick="deleteCustomer(${customer.id})">Xóa</button>` : ''}
            </div>
        `;
        container.appendChild(card);
    });

    // Cập nhật thông tin phân trang
    const totalPages = Math.ceil(customersToDisplay.length / itemsPerPage);
    document.getElementById('pageInfo').textContent = `Trang ${currentPage} / ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Hàm mở modal sửa thông tin
function openEditModal(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    document.getElementById('editCustomerId').value = customer.id;
    document.getElementById('editCustomerName').value = customer.name;
    document.getElementById('editCustomerPhone').value = customer.phone || '';

    document.getElementById('editCustomerModal').style.display = "block";
}

// Hàm xóa khách hàng
async function deleteCustomer(customerId) {
    if (customerId === 1) {
        alert('Không thể xóa tài khoản admin');
        return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) return;

    try {
        const response = await fetch(`http://localhost:8080/api/customers/${customerId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Không thể xóa khách hàng');

        // Cập nhật lại danh sách
        customers = customers.filter(c => c.id !== customerId);
        displayCustomers(customers);
        alert('Xóa khách hàng thành công');
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra khi xóa khách hàng');
    }
}

// Xử lý form sửa thông tin
document.getElementById('editCustomerForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const customerId = document.getElementById('editCustomerId').value;
    const formData = {
        name: document.getElementById('editCustomerName').value,
        phone: document.getElementById('editCustomerPhone').value
    };

    try {
        const response = await fetch(`http://localhost:8080/api/customers/${customerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Không thể cập nhật thông tin');

        // Cập nhật lại danh sách
        const updatedCustomer = await response.json();
        const index = customers.findIndex(c => c.id === updatedCustomer.id);
        if (index !== -1) {
            customers[index] = updatedCustomer;
        }

        displayCustomers(customers);
        document.getElementById('editCustomerModal').style.display = "none";
        alert('Cập nhật thông tin thành công');
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra khi cập nhật thông tin');
    }
}); 