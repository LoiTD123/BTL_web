/**
 * password.js - Xử lý chức năng đổi mật khẩu
 */

/**
 * Hàm xử lý đổi mật khẩu
 * Gọi API backend để đổi mật khẩu người dùng
 */
function repass() {
    let oldPassword = document.getElementById("oldPassword").value;
    let newPassword = document.getElementById("newPassword").value;
    let confirmPassword = document.getElementById("confirmPassword").value;
    let messageDiv = document.getElementById("message02");

    if (oldPassword && newPassword && confirmPassword) {
        if (newPassword.length >= 8) { // Kiểm tra độ dài mật khẩu mới
            if (newPassword == confirmPassword) {
                // Hiển thị thông báo "Đang xử lý..."
                messageDiv.textContent = "Đang xử lý...";
                messageDiv.className = "message";
                messageDiv.style.display = "block";

                // Lấy token từ localStorage
                const token = localStorage.getItem('token');
                if (!token) {
                    messageDiv.textContent = "Phiên đăng nhập hết hạn!";
                    messageDiv.className = "message error";
                    messageDiv.style.display = "block";
                    setTimeout(function() {
                        messageDiv.style.display = "none";
                        window.location.href = "../pages/login.html";
                    }, 1500);
                    return;
                }

                // Gọi API đổi mật khẩu
                fetch('http://localhost:8080/api/auth/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        old_password: oldPassword,
                        new_password: newPassword,
                        confirm_password: confirmPassword
                    }),
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => { throw err; });
                    }
                    return response.json();
                })
                .then(data => {
                    // Hiển thị thông báo thành công
                    messageDiv.textContent = data.message || "Đổi mật khẩu thành công!";
                    messageDiv.className = "message success";
                    messageDiv.style.display = "block";

                    // Ẩn thông báo và đăng xuất sau 1.5 giây
                    setTimeout(function() {
                        messageDiv.style.display = "none";
                        // Đóng modal
                        document.getElementById("passwordModal").style.display = "none";
                        // Xóa thông tin đăng nhập
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        // Chuyển về trang đăng nhập
                        window.location.href = "../pages/login.html";
                    }, 1500);
                })
                .catch(error => {
                    console.error("Error:", error);
                    // Hiển thị thông báo lỗi
                    messageDiv.textContent = error.detail || "Đổi mật khẩu thất bại!";
                    messageDiv.className = "message error";
                    messageDiv.style.display = "block";

                    // Ẩn thông báo sau 1.5 giây
                    setTimeout(function() {
                        messageDiv.style.display = "none";
                    }, 1500);
                });
            } else {
                messageDiv.textContent = "Mật khẩu mới không khớp!";
                messageDiv.className = "message error";
                messageDiv.style.display = "block";

                setTimeout(function() {
                    messageDiv.style.display = "none";
                }, 1500);
            }
        } else {
            messageDiv.textContent = "Mật khẩu mới phải có ít nhất 8 ký tự!";
            messageDiv.className = "message error";
            messageDiv.style.display = "block";

            setTimeout(function() {
                messageDiv.style.display = "none";
            }, 1500);
        }
    } else {
        messageDiv.textContent = "Vui lòng nhập đầy đủ thông tin!";
        messageDiv.className = "message error";
        messageDiv.style.display = "block";

        setTimeout(function() {
            messageDiv.style.display = "none";
        }, 1500);
    }
}
