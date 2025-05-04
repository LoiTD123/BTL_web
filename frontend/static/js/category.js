// Các biến DOM
const addCategoryBtn = document.getElementById('addCategoryBtn');
const addCategoryModal = document.getElementById('addCategoryModal');
const categoriesContainer = document.getElementById('categoriesContainer');
const addCategoryForm = document.getElementById('addCategoryForm');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfoSpan = document.getElementById('pageInfo');

let currentPage = 1;
let totalPages = 1;
const PAGE_SIZE = 3; // 3 danh mục mỗi trang

// Event listeners cho nút phân trang
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        loadCategories(currentPage - 1);
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        loadCategories(currentPage + 1);
    }
});

// Hiển thị modal thêm loại sản phẩm
addCategoryBtn.addEventListener('click', () => {
    addCategoryModal.style.display = 'block';
});

// Đóng modal khi click vào nút close
document.querySelectorAll('.modal .close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        addCategoryModal.style.display = 'none';
    });
});

// Đóng modal khi click bên ngoài
window.addEventListener('click', (e) => {
    if (e.target === addCategoryModal) {
        addCategoryModal.style.display = 'none';
    }
});

// Hàm cập nhật danh sách danh mục trong form thêm sản phẩm
async function updateProductCategorySelect() {
    try {
        const response = await fetch('http://localhost:8080/api/categories/');
        const data = await response.json();
        
        // Tìm select box trong form thêm sản phẩm
        const categorySelect = document.getElementById('productCategory');
        if (categorySelect) {
            // Xóa các option cũ
            categorySelect.innerHTML = '';
            
            // Thêm các option mới
            data.items.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error updating category select:', error);
    }
}

// Xử lý form thêm loại sản phẩm
addCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('categoryName').value);
    formData.append('description', document.getElementById('categoryDescription').value);
    
    const imageFile = document.getElementById('categoryImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    try {
        const response = await fetch('http://localhost:8080/api/categories/', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            alert('Thêm loại sản phẩm thành công!');
            addCategoryModal.style.display = 'none';
            addCategoryForm.reset();
            // Tải lại trang đầu tiên để hiển thị danh mục mới
            currentPage = 1;
            loadCategories(1);
            // Cập nhật danh sách danh mục trong form thêm sản phẩm
            updateProductCategorySelect();
        } else {
            const error = await response.json();
            alert('Lỗi: ' + (error.detail || 'Không thể thêm loại sản phẩm'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi xảy ra khi thêm loại sản phẩm. Vui lòng thử lại sau.');
    }
});

// Hàm tải danh sách loại sản phẩm và sản phẩm
async function loadCategories(page = 1) {
    try {
        // Lấy tất cả sản phẩm
        const productsResponse = await fetch('http://localhost:8080/api/products/');
        if (!productsResponse.ok) {
            throw new Error('Không thể tải danh sách sản phẩm');
        }
        const productsData = await productsResponse.json();
        const products = productsData.items || [];
        console.log('All products:', productsData);

        // Lấy tất cả categories với page_size lớn
        const categoriesResponse = await fetch('http://localhost:8080/api/categories/?page_size=100');
        if (!categoriesResponse.ok) {
            throw new Error('Không thể tải danh sách danh mục');
        }
        const categoriesData = await categoriesResponse.json();
        const categories = categoriesData.items || [];
        console.log('All categories:', categoriesData);

        const categoriesList = document.getElementById('categoriesList');
        categoriesList.innerHTML = '';

        if (categories.length === 0) {
            categoriesList.innerHTML = '<p>Không có loại sản phẩm nào</p>';
            return;
        }

        // Tính toán phân trang cho categories
        const startIndex = (page - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const paginatedCategories = categories.slice(startIndex, endIndex);

        // Tạo HTML cho từng category
        let html = '';
        paginatedCategories.forEach(category => {
            // Lọc sản phẩm theo category_id
            const categoryProducts = products.filter(product => product.category_id === category.id);
            console.log(`Products for category ${category.id}:`, categoryProducts);

            html += `
                <div class="category-card">
                    <div class="category-header">
                        <h3>${category.name}</h3>
                        <div class="actions">
                            <button class="edit-btn" onclick="editCategory(${category.id})">Sửa</button>
                            <button class="delete-btn" onclick="deleteCategory(${category.id})">Xóa</button>
                        </div>
                    </div>
                    <div class="category-products">
                        ${categoryProducts.map(product => {
                            console.log('Product image path:', product.image);
                            const imageUrl = product.image ? 
                                `http://localhost:8080/uploads/${product.image.split('/').pop()}` : 
                                '../static/images/rc1.jpg';
                            console.log('Constructed image URL:', imageUrl);
                            return `
                                <div class="product-mini-card">
                                    <img src="${imageUrl}" 
                                         alt="${product.name}"
                                         onerror="this.src='../static/images/rc1.jpg'">
                                    <div class="product-mini-info">
                                        <h4>${product.name}</h4>
                                        <p class="price">${product.price.toLocaleString('vi-VN')} VNĐ</p>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        categoriesList.innerHTML = html;

        // Cập nhật phân trang
        currentPage = page;
        totalPages = Math.ceil(categories.length / PAGE_SIZE);
        pageInfoSpan.textContent = `Trang ${currentPage} / ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage >= totalPages;

    } catch (error) {
        console.error('Error:', error);
        const categoriesList = document.getElementById('categoriesList');
        categoriesList.innerHTML = `<p>Có lỗi xảy ra: ${error.message}</p>`;
    }
}

// Hàm sửa loại sản phẩm
async function editCategory(categoryId) {
    try {
        // Lấy thông tin danh mục
        const response = await fetch(`http://localhost:8080/api/categories/${categoryId}`);
        if (!response.ok) {
            throw new Error('Không thể tải thông tin danh mục');
        }
        const category = await response.json();
        
        // Điền thông tin vào form
        document.getElementById('editCategoryId').value = category.id;
        document.getElementById('editCategoryName').value = category.name;
        document.getElementById('editCategoryDescription').value = category.description || '';
        
        // Hiển thị modal
        const editModal = document.getElementById('editCategoryModal');
        editModal.style.display = 'block';
        
        // Xử lý đóng modal
        const closeBtn = editModal.querySelector('.close');
        closeBtn.onclick = () => {
            editModal.style.display = 'none';
        };
        
        // Xử lý submit form
        const editForm = document.getElementById('editCategoryForm');
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('name', document.getElementById('editCategoryName').value);
            formData.append('description', document.getElementById('editCategoryDescription').value);
            
            const imageFile = document.getElementById('editCategoryImage').files[0];
            if (imageFile) {
                formData.append('image', imageFile);
            }
            
            try {
                const updateResponse = await fetch(`http://localhost:8080/api/categories/${categoryId}`, {
                    method: 'PUT',
                    body: formData
                });
                
                if (updateResponse.ok) {
                    alert('Cập nhật loại sản phẩm thành công!');
                    editModal.style.display = 'none';
                    editForm.reset();
                    loadCategories(currentPage);
                } else {
                    const error = await updateResponse.json();
                    alert('Lỗi: ' + (error.detail || 'Không thể cập nhật loại sản phẩm'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Có lỗi xảy ra khi cập nhật loại sản phẩm');
            }
        };
    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi xảy ra khi tải thông tin danh mục');
    }
}

// Hàm xóa loại sản phẩm
async function deleteCategory(categoryId) {
    if (confirm('Bạn có chắc chắn muốn xóa loại sản phẩm này?')) {
        try {
            const response = await fetch(`http://localhost:8080/api/categories/${categoryId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Xóa loại sản phẩm thành công!');
                loadCategories(currentPage);
            } else {
                const error = await response.json();
                alert('Lỗi: ' + error.detail);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Có lỗi xảy ra khi xóa loại sản phẩm');
        }
    }
}

// Tải danh sách loại sản phẩm khi trang được load
document.addEventListener('DOMContentLoaded', () => loadCategories(1));

// Hàm tìm kiếm danh mục
function searchCategories() {
    const searchBox = document.querySelector('.search-boxup');
    const searchTerm = searchBox.value.toLowerCase();
    const categories = document.querySelectorAll('.category-card');
    
    categories.forEach(category => {
        const categoryName = category.querySelector('.category-header h3').textContent.toLowerCase();
        const categoryProducts = category.querySelectorAll('.product-mini-info h4');
        let hasMatch = categoryName.includes(searchTerm);
        
        // Kiểm tra tên sản phẩm trong danh mục
        if (!hasMatch) {
            categoryProducts.forEach(product => {
                if (product.textContent.toLowerCase().includes(searchTerm)) {
                    hasMatch = true;
                }
            });
        }
        
        category.style.display = hasMatch ? 'block' : 'none';
    });
}

// Xử lý tìm kiếm khi nhập
document.addEventListener('DOMContentLoaded', function() {
    const searchBox = document.querySelector('.search-boxup');
    
    if (searchBox) {
        searchBox.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const categories = document.querySelectorAll('.category-card');
            
            categories.forEach(category => {
                const categoryName = category.querySelector('.category-header h3').textContent.toLowerCase();
                const categoryProducts = category.querySelectorAll('.product-mini-info h4');
                let hasMatch = categoryName.includes(searchTerm);
                
                // Kiểm tra tên sản phẩm trong danh mục
                if (!hasMatch) {
                    categoryProducts.forEach(product => {
                        if (product.textContent.toLowerCase().includes(searchTerm)) {
                            hasMatch = true;
                        }
                    });
                }
                
                category.style.display = hasMatch ? 'block' : 'none';
            });
        });
    }
}); 