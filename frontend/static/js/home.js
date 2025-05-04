// Biến lưu trữ trạng thái phân trang và danh mục
let currentPage = 1;
let pageSize = 9; // 3x3 sản phẩm mỗi trang
let currentCategory = null; // Lưu danh mục đang được chọn

// Hàm kiểm tra user_id
function checkAuth() {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Hàm tải danh sách danh mục
async function loadCategories() {
    if (!checkAuth()) return;

    try {
        const response = await fetch('http://localhost:8080/api/categories');
        const data = await response.json();
        
        // Tạo dropdown menu cho danh mục
        const categoryLink = document.querySelector('.nav-links a:nth-child(2)');
        const dropdown = document.createElement('div');
        dropdown.className = 'category-dropdown';
        
        // Thêm tất cả sản phẩm vào đầu danh sách
        const allProducts = document.createElement('a');
        allProducts.href = '#';
        allProducts.textContent = 'Tất cả sản phẩm';
        allProducts.onclick = (e) => {
            e.preventDefault();
            currentCategory = null;
            loadProducts(1);
            dropdown.style.display = 'none';
        };
        dropdown.appendChild(allProducts);
        
        // Thêm các danh mục
        data.items.forEach(category => {
            const categoryLink = document.createElement('a');
            categoryLink.href = '#';
            categoryLink.textContent = category.name;
            categoryLink.onclick = (e) => {
                e.preventDefault();
                currentCategory = category.id;
                loadProducts(1);
                dropdown.style.display = 'none';
            };
            dropdown.appendChild(categoryLink);
        });
        
        // Thêm dropdown vào navbar
        categoryLink.parentNode.insertBefore(dropdown, categoryLink.nextSibling);
        
        // Xử lý sự kiện hover
        categoryLink.addEventListener('mouseenter', () => {
            dropdown.style.display = 'block';
        });
        
        dropdown.addEventListener('mouseleave', () => {
            dropdown.style.display = 'none';
        });
        
    } catch (error) {
        if (error.status === 401) {
            window.location.href = 'login.html';
        }
    }
}

// Hàm tải danh sách sản phẩm
async function loadProducts(page = 1) {
    if (!checkAuth()) return;

    try {
        // Hiển thị loading indicator
        const productsList = document.getElementById('productsList');
        if (!productsList) {
            return;
        }
        productsList.innerHTML = '<div class="loading">Đang tải sản phẩm...</div>';
        
        // Gọi API để lấy danh sách sản phẩm
        let url = `http://localhost:8080/api/products/?page=${page}&page_size=${pageSize}`;
        if (currentCategory) {
            url += `&category_id=${currentCategory}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Xóa nội dung hiện tại
        productsList.innerHTML = '';
        
        // Kiểm tra nếu không có sản phẩm
        if (!data.items || data.items.length === 0) {
            productsList.innerHTML = '<p class="no-products">Không có sản phẩm nào</p>';
            return;
        }

        // Hiển thị từng sản phẩm
        data.items.forEach(product => {
            // Xử lý đường dẫn ảnh
            let imageUrl;
            if (product.image) {
                // Nếu đường dẫn bắt đầu bằng /uploads/ thì giữ nguyên
                if (product.image.startsWith('/uploads/')) {
                    imageUrl = `http://localhost:8080${product.image}`;
                } 
                // Nếu đã chứa 'uploads/' thì thêm đường dẫn server
                else if (product.image.includes('uploads/')) {
                    imageUrl = `http://localhost:8080/${product.image}`;
                }
                // Nếu chỉ là tên file
                else {
                    imageUrl = `http://localhost:8080/uploads/${product.image}`;
                }
            } else {
                // Ảnh mặc định nếu không có ảnh
                imageUrl = '../static/images/rc1.jpg';
            }
            
            // Tạo card sản phẩm
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            // Đổ dữ liệu vào card
            productCard.innerHTML = `
                <img src="${imageUrl}" 
                     alt="${product.name}"
                     onerror="this.src='../static/images/rc1.jpg'">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="price">${product.price.toLocaleString('vi-VN')} VNĐ</p>
                    <p class="description">${product.description || 'Không có mô tả'}</p>
                    <button class="add-to-cart-btn" data-product-id="${product.id}">Thêm vào giỏ hàng</button>
                </div>
            `;
            
            // Thêm card vào productsList
            productsList.appendChild(productCard);
        });

        // Cập nhật thông tin phân trang
        const totalPages = Math.ceil(data.total / pageSize);
        currentPage = page;
        
        // Cập nhật UI phân trang
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Trang ${page} / ${totalPages}`;
        }
        
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        
        if (prevPageBtn) {
            prevPageBtn.disabled = page <= 1;
        }
        
        if (nextPageBtn) {
            nextPageBtn.disabled = page >= totalPages;
        }
    } catch (error) {
        if (error.status === 401) {
            window.location.href = 'login.html';
        }
        const productsList = document.getElementById('productsList');
        if (productsList) {
            productsList.innerHTML = `<p class="error">Có lỗi xảy ra khi tải danh sách sản phẩm: ${error.message}</p>`;
        }
    }
}

// Tải sản phẩm và danh mục khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        loadCategories(); // Tải danh mục trước
        loadProducts(currentPage); // Sau đó tải sản phẩm
    }
});

// Event listeners cho nút phân trang
document.addEventListener('DOMContentLoaded', () => {
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                loadProducts(currentPage - 1);
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            loadProducts(currentPage + 1);
        });
    }
});

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

// Xử lý sự kiện click nút "Thêm vào giỏ hàng"
function handleAddToCartClick(e) {
    const button = e.target.closest('.add-to-cart-btn');
    if (!button) return;

    e.preventDefault();
    e.stopPropagation();
    
    const productId = button.getAttribute('data-product-id');
    if (!productId) {
        console.error('Không tìm thấy ID sản phẩm');
        return;
    }
    
    addToCart(parseInt(productId));
}

// Thêm sản phẩm vào giỏ hàng
async function addToCart(productId) {
    if (!checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Lấy thông tin sản phẩm
        const response = await fetch(`http://localhost:8080/api/products/${productId}`);
        const product = await response.json();

        if (!response.ok) {
            throw new Error('Không thể lấy thông tin sản phẩm');
        }

        let cart = getCart();
        const existingItem = cart.find(item => item.productId === productId);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                productId: productId,
                quantity: 1,
                price: product.price  // Thêm giá sản phẩm
            });
        }

        saveCart(cart);
        alert('Đã thêm sản phẩm vào giỏ hàng!');
        updateCartCount();
    } catch (error) {
        console.error('Lỗi khi thêm vào giỏ hàng:', error);
        alert('Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng');
    }
}

// Hàm cập nhật số lượng sản phẩm trong giỏ hàng
function updateCartCount() {
    const cart = getCart();
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    const cartLink = document.querySelector('a[href="../pages/cart.html"]');
    
    if (cartLink) {
        if (totalItems > 0) {
            cartLink.innerHTML = `Giỏ hàng (${totalItems})`;
        } else {
            cartLink.innerHTML = 'Giỏ hàng';
        }
    }
}

// Xóa event listener cũ nếu có
document.removeEventListener('click', handleAddToCartClick);

// Thêm event listener mới
document.addEventListener('click', handleAddToCartClick);

// Cập nhật số lượng giỏ hàng khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        loadCategories();
        loadProducts(currentPage);
        updateCartCount(); // Cập nhật số lượng giỏ hàng
    }
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