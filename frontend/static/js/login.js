// Lấy các phần tử DOM
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const messageDiv = document.getElementById('message');

// Hàm kiểm tra user_id
function checkAuth() {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) {
        return false;
    }
    return true;
}

// Hàm xử lý đăng xuất
function logout() {
    localStorage.removeItem('user_id');
    window.location.href = 'login.html';
}

// Xử lý sự kiện submit form
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Lấy giá trị từ input
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    try {
        // Gọi API đăng nhập
        const response = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Đăng nhập thất bại');
        }

        // Lưu user_id vào localStorage
        localStorage.setItem('user_id', data.user_id);

        // Kiểm tra user_id để chuyển hướng
        const userId = parseInt(data.user_id);

        if (userId === 1) {
            // Nếu là admin
            window.location.href = 'home_admin.html';
        } else {
            // Nếu là user thường
            window.location.href = 'home_user.html';
        }
    } catch (error) {
        messageDiv.textContent = error.message;
        messageDiv.style.display = 'block';
    }
});
