// Các biến DOM
const addProductBtn = document.getElementById('addProductBtn');
const addProductModal = document.getElementById('addProductModal');
const productsContainer = document.getElementById('productsContainer');
const addProductForm = document.getElementById('addProductForm');
const categorySelect = document.getElementById('productCategory');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfoSpan = document.getElementById('pageInfo');

let currentPage = 1;
let totalPages = 1;

// Hiển thị modal thêm sản phẩm
addProductBtn.addEventListener('click', () => {
    addProductModal.style.display = 'block';
});

// Đóng modal khi click vào nút close
document.querySelectorAll('.modal .close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        addProductModal.style.display = 'none';
    });
});

// Đóng modal khi click bên ngoài
window.addEventListener('click', (e) => {
    if (e.target === addProductModal) {
        addProductModal.style.display = 'none';
    }
});

// Tải danh sách danh mục
async function loadCategories() {
    try {
        const response = await fetch('http://localhost:8080/api/categories?page_size=100');
        const categoriesData = await response.json();
        
        // Xóa các option cũ
        categorySelect.innerHTML = '';
        
        // Thêm các option mới
        if (categoriesData.items && categoriesData.items.length > 0) {
            categoriesData.items.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Xử lý form thêm sản phẩm
addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value);
    formData.append('description', document.getElementById('productDescription').value);
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('category_id', document.getElementById('productCategory').value);
    
    const imageFile = document.getElementById('productImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    try {
        const response = await fetch('http://localhost:8080/api/products', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (response.ok) {
            alert('Thêm sản phẩm thành công!');
            addProductModal.style.display = 'none';
            addProductForm.reset();
            loadProducts(); // Tải lại danh sách
        } else {
            const error = await response.json();
            alert('Lỗi: ' + (error.detail || 'Không thể thêm sản phẩm'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi xảy ra khi thêm sản phẩm. Vui lòng thử lại sau.');
    }
});

// Thêm event listeners cho nút phân trang
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        loadProducts(currentPage - 1);
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        loadProducts(currentPage + 1);
    }
});

// Hàm tải danh sách sản phẩm
async function loadProducts(page = 1) {
    try {
        console.log('Loading page:', page);
        const response = await fetch(`http://localhost:8080/api/products/?page=${page}&page_size=9`);
        const data = await response.json();
        console.log('API Response:', data);
        
        const productsList = document.getElementById('productsList');
        productsList.innerHTML = '';
        
        if (data.items.length === 0) {
            productsList.innerHTML = '<p>Không có sản phẩm nào</p>';
            return;
        }
        
        data.items.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            // Log để kiểm tra đường dẫn ảnh
            console.log('Product image path:', product.image);
            
            productCard.innerHTML = `
                <img src="${product.image ? 'http://localhost:8080/uploads/' + product.image.replace('uploads/', '') : '../static/images/rc1.jpg'}" 
                     alt="${product.name}"
                     onerror="this.src='../static/images/rc1.jpg'">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="price">${product.price.toLocaleString('vi-VN')} VNĐ</p>
                    <p class="description">${product.description || 'Không có mô tả'}</p>
                </div>
                <div class="actions">
                    <button class="edit-btn" onclick="editProduct(${product.id})">Sửa</button>
                    <button class="delete-btn" onclick="deleteProduct(${product.id})">Xóa</button>
                </div>
            `;
            productsList.appendChild(productCard);
        });

        // Cập nhật trạng thái phân trang
        currentPage = page;
        totalPages = Math.ceil(data.total / data.page_size);
        console.log('Current page:', currentPage, 'Total pages:', totalPages);
        console.log('Total items:', data.total, 'Page size:', data.page_size);
        
        pageInfoSpan.textContent = `Trang ${currentPage} / ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage >= totalPages;
        
    } catch (error) {
        console.error('Error loading products:', error);
        productsList.innerHTML = '<p>Có lỗi xảy ra khi tải danh sách sản phẩm</p>';
    }
}

// Hàm sửa sản phẩm
async function editProduct(productId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // Lấy thông tin sản phẩm
        const response = await fetch(`http://localhost:8080/api/products/${productId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error('Không thể tải thông tin sản phẩm');
        }
        const product = await response.json();
        
        // Lấy danh sách danh mục
        const categoriesResponse = await fetch('http://localhost:8080/api/categories?page_size=100');
        if (!categoriesResponse.ok) {
            throw new Error('Không thể tải danh sách danh mục');
        }
        const categoriesData = await categoriesResponse.json();
        
        // Điền danh sách danh mục vào select box
        const categorySelect = document.getElementById('editProductCategory');
        categorySelect.innerHTML = '';
        if (categoriesData.items && categoriesData.items.length > 0) {
            categoriesData.items.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        }
        
        // Điền thông tin vào form
        document.getElementById('editProductId').value = product.id;
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductDescription').value = product.description || '';
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductCategory').value = product.category_id;
        
        // Hiển thị modal
        const editModal = document.getElementById('editProductModal');
        editModal.style.display = 'block';
        
        // Xử lý đóng modal
        const closeBtn = editModal.querySelector('.close');
        closeBtn.onclick = () => {
            editModal.style.display = 'none';
        };
        
        // Xử lý submit form
        const editForm = document.getElementById('editProductForm');
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }
            
            const formData = new FormData();
            formData.append('name', document.getElementById('editProductName').value);
            formData.append('description', document.getElementById('editProductDescription').value);
            formData.append('price', document.getElementById('editProductPrice').value);
            formData.append('category_id', document.getElementById('editProductCategory').value);
            
            const imageFile = document.getElementById('editProductImage').files[0];
            if (imageFile) {
                formData.append('image', imageFile);
            }
            
            try {
                const updateResponse = await fetch(`http://localhost:8080/api/products/${productId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                
                if (updateResponse.ok) {
                    alert('Cập nhật sản phẩm thành công!');
                    editModal.style.display = 'none';
                    editForm.reset();
                    loadProducts(currentPage);
                } else {
                    const error = await updateResponse.json();
                    alert('Lỗi: ' + (error.detail || 'Không thể cập nhật sản phẩm'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Có lỗi xảy ra khi cập nhật sản phẩm');
            }
        };
    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi xảy ra khi tải thông tin sản phẩm');
    }
}

// Hàm xóa sản phẩm
async function deleteProduct(productId) {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            console.log('Deleting product:', productId);
            const response = await fetch(`http://localhost:8080/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                console.log('Product deleted successfully');
                alert('Xóa sản phẩm thành công!');
                loadProducts(currentPage);
            } else {
                const error = await response.json();
                console.error('Error response:', error);
                alert('Lỗi: ' + (error.detail || 'Không thể xóa sản phẩm'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Có lỗi xảy ra khi xóa sản phẩm. Vui lòng thử lại sau.');
        }
    }
}

// Tải danh sách danh mục và sản phẩm khi trang được load
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadProducts();
});

// Hàm tìm kiếm sản phẩm
function searchProducts() {
    const searchBox = document.querySelector('.search-boxup');
    const searchTerm = searchBox.value.toLowerCase();
    const products = document.querySelectorAll('.product-card');
    
    products.forEach(product => {
        const productInfo = product.querySelector('.product-info');
        if (productInfo) {
            const productName = productInfo.querySelector('h3').textContent.toLowerCase();
            const productDescription = productInfo.querySelector('.description').textContent.toLowerCase();
            
            if (productName.includes(searchTerm) || productDescription.includes(searchTerm)) {
                product.style.display = 'block';
            } else {
                product.style.display = 'none';
            }
        }
    });
}

// Xử lý tìm kiếm khi nhập
document.addEventListener('DOMContentLoaded', function() {
    const searchBox = document.querySelector('.search-boxup');
    
    if (searchBox) {
        searchBox.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const products = document.querySelectorAll('.product-card');
            
            products.forEach(product => {
                const productInfo = product.querySelector('.product-info');
                if (productInfo) {
                    const productName = productInfo.querySelector('h3').textContent.toLowerCase();
                    const productDescription = productInfo.querySelector('.description').textContent.toLowerCase();
                    
                    if (productName.includes(searchTerm) || productDescription.includes(searchTerm)) {
                        product.style.display = 'block';
                    } else {
                        product.style.display = 'none';
                    }
                }
            });
        });
    }
}); 