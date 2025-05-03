document.addEventListener("DOMContentLoaded", function() {
    // Xử lý sự kiện cho nút đăng xuất
    const logOutBtn = document.getElementById("logOut");
    if (logOutBtn) {
        logOutBtn.addEventListener("click", function(e) {
            e.preventDefault(); // Ngăn chặn hành vi mặc định của thẻ a
            logout();
        });
    }
    
    // Code hiện tại cho modal đổi mật khẩu
    const passwordModal = document.getElementById("passwordModal");
    const openModalBtn = document.getElementById("openModal");
    const closeModalBtn = document.querySelector(".close");

    // Khi bấm "Đổi mật khẩu", hiển thị popup
    if (openModalBtn) {
        openModalBtn.addEventListener("click", function(e) {
            e.preventDefault(); // Ngăn chặn hành vi mặc định của thẻ a
            passwordModal.style.display = "flex";
        });
    }

    // Khi bấm dấu "×", ẩn popup
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", function() {
            passwordModal.style.display = "none";
        });
    }

    // Khi bấm ra ngoài popup, cũng ẩn popup
    window.addEventListener("click", function(event) {
        if (event.target === passwordModal) {
            passwordModal.style.display = "none";
        }
    });
    
    // Kiểm tra đăng nhập khi trang tải
    checkAuth();
});

// Kiểm tra trạng thái đăng nhập
function checkAuth() {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Xử lý đăng xuất
function logout() {
    localStorage.removeItem('user_id');
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}
