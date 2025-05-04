// Customer management functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let currentPage = 1;
    const itemsPerPage = 10;
    let customers = [];
    let filteredCustomers = [];

    // DOM elements
    const customersList = document.getElementById('customersList');
    const searchInput = document.getElementById('searchCustomer');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const editCustomerModal = document.getElementById('editCustomerModal');
    const editCustomerForm = document.getElementById('editCustomerForm');
    const closeModalBtn = document.querySelector('.modal .close');

    // Event listeners
    searchInput.addEventListener('input', handleSearch);
    prevPageBtn.addEventListener('click', goToPreviousPage);
    nextPageBtn.addEventListener('click', goToNextPage);
    closeModalBtn.addEventListener('click', closeModal);

    // Load customers on page load
    loadCustomers();

    // Functions
    async function loadCustomers() {
        try {
            const response = await fetch('/api/customers');
            if (!response.ok) throw new Error('Failed to fetch customers');
            
            customers = await response.json();
            // Filter out admin user (id = 1)
            customers = customers.filter(customer => customer.id !== 1);
            filteredCustomers = [...customers];
            
            renderCustomers();
            updatePagination();
        } catch (error) {
            console.error('Error loading customers:', error);
            alert('Không thể tải danh sách khách hàng');
        }
    }

    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        filteredCustomers = customers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.email.toLowerCase().includes(searchTerm) ||
            (customer.phone && customer.phone.includes(searchTerm))
        );
        currentPage = 1;
        renderCustomers();
        updatePagination();
    }

    function renderCustomers() {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const customersToShow = filteredCustomers.slice(start, end);

        customersList.innerHTML = customersToShow.map(customer => `
            <div class="customer-card" data-id="${customer.id}">
                <div class="customer-info">
                    <h3>${customer.name}</h3>
                    <p>Email: ${customer.email}</p>
                    ${customer.phone ? `<p>SĐT: ${customer.phone}</p>` : ''}
                    ${customer.address ? `<p>Địa chỉ: ${customer.address}</p>` : ''}
                </div>
                <div class="customer-actions">
                    <button class="edit-btn" onclick="openEditModal(${customer.id})">Sửa</button>
                    <button class="delete-btn" onclick="deleteCustomer(${customer.id})">Xóa</button>
                </div>
            </div>
        `).join('');
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
        pageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    function goToPreviousPage() {
        if (currentPage > 1) {
            currentPage--;
            renderCustomers();
            updatePagination();
        }
    }

    function goToNextPage() {
        const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderCustomers();
            updatePagination();
        }
    }

    // Modal functions
    window.openEditModal = async function(customerId) {
        try {
            const response = await fetch(`/api/customers/${customerId}`);
            if (!response.ok) throw new Error('Failed to fetch customer data');
            
            const customer = await response.json();
            document.getElementById('editCustomerId').value = customer.id;
            document.getElementById('editCustomerName').value = customer.name;
            document.getElementById('editCustomerEmail').value = customer.email;
            document.getElementById('editCustomerPhone').value = customer.phone || '';
            document.getElementById('editCustomerAddress').value = customer.address || '';
            
            editCustomerModal.style.display = 'block';
        } catch (error) {
            console.error('Error opening edit modal:', error);
            alert('Không thể tải thông tin khách hàng');
        }
    }

    function closeModal() {
        editCustomerModal.style.display = 'none';
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === editCustomerModal) {
            closeModal();
        }
    }

    // Handle form submission
    editCustomerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const customerId = document.getElementById('editCustomerId').value;
        const formData = {
            name: document.getElementById('editCustomerName').value,
            email: document.getElementById('editCustomerEmail').value,
            phone: document.getElementById('editCustomerPhone').value,
            address: document.getElementById('editCustomerAddress').value
        };

        try {
            const response = await fetch(`/api/customers/${customerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to update customer');

            alert('Cập nhật thông tin khách hàng thành công');
            closeModal();
            loadCustomers();
        } catch (error) {
            console.error('Error updating customer:', error);
            alert('Không thể cập nhật thông tin khách hàng');
        }
    });

    // Delete customer
    window.deleteCustomer = async function(customerId) {
        if (!confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) return;

        try {
            const response = await fetch(`/api/customers/${customerId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete customer');

            alert('Xóa khách hàng thành công');
            loadCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Không thể xóa khách hàng');
        }
    };
}); 