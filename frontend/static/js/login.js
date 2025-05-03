// Lấy các phần tử DOM
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const messageDiv = document.getElementById('message');

// Hàm kiểm tra user_id
function checkAuth() {
    const user_id = localStorage.getItem('user_id');
    const token = localStorage.getItem('token');
    if (!user_id || !token) {
        return false;
    }
    return true;
}

// Hàm xử lý đăng xuất
function logout() {
    localStorage.removeItem('user_id');
    localStorage.removeItem('token');
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

        // Debug: Kiểm tra response
        console.log('Response Status:', response.status);
        console.log('Response Headers:', response.headers);
        
        let data;
        try {
            data = await response.json();
            console.log('Response Data:', data);
        } catch (error) {
            console.error('Error parsing response:', error);
            throw new Error('Không thể đọc dữ liệu từ server');
        }

        if (!response.ok) {
            throw new Error(data.detail || 'Đăng nhập thất bại');
        }

        // Kiểm tra dữ liệu trả về
        if (!data.access_token || !data.user_id) {
            console.error('Invalid response data:', data);
            throw new Error('Dữ liệu trả về không hợp lệ');
        }

        // Lưu user_id và token vào localStorage
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('token', data.access_token);
        
        // Debug: Kiểm tra localStorage sau khi lưu
        console.log('LocalStorage after login:');
        console.log('user_id:', localStorage.getItem('user_id'));
        console.log('token:', localStorage.getItem('token'));

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
