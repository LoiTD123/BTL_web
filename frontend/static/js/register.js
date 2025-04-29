function register() {
    let fullname = document.getElementById("name").value;
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;
    let reupPassword = document.getElementById("reupPassword").value;
    let messageDiv = document.getElementById("message");

    if (fullname && username && password && reupPassword) {
        if (password === reupPassword) {
            // Hiển thị thông báo "Đang xử lý..."
            messageDiv.textContent = "Đang xử lý...";
            messageDiv.className = "message";
            messageDiv.style.display = "block";
            
            // Gọi API đăng ký
            fetch('http://localhost:8080/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullname: fullname,
                    username: username,
                    password: password,
                    reupPassword: reupPassword
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
                messageDiv.textContent = data.message || "Đăng ký thành công!";
                messageDiv.className = "message success";
                messageDiv.style.display = "block";

                // Lưu thông tin đăng nhập vào localStorage (tuỳ chọn)
                localStorage.setItem('username', username);
                
                // Ẩn thông báo và chuyển hướng sau 1 giây
                setTimeout(function() {
                    messageDiv.style.display = "none";
                    window.location.href = "home_user.html";
                }, 1000);
            })
            .catch(error => {
                // Hiển thị thông báo lỗi từ server
                messageDiv.textContent = error.detail || "Đăng ký thất bại, vui lòng thử lại.";
                messageDiv.className = "message error";
                messageDiv.style.display = "block";

                // Ẩn thông báo sau 2 giây
                setTimeout(function() {
                    messageDiv.style.display = "none";
                }, 2000);
            });
        } else {
            // Hiển thị thông báo lỗi mật khẩu không khớp
            messageDiv.textContent = "Mật khẩu không khớp.";
            messageDiv.className = "message error";
            messageDiv.style.display = "block";

            // Ẩn thông báo sau 1.5 giây
            setTimeout(function() {
                messageDiv.style.display = "none";
            }, 1500);
        }
    } else {
        // Hiển thị thông báo lỗi thiếu thông tin
        messageDiv.textContent = "Vui lòng nhập đầy đủ thông tin.";
        messageDiv.className = "message error";
        messageDiv.style.display = "block";

        // Ẩn thông báo sau 1.5 giây
        setTimeout(function() {
            messageDiv.style.display = "none";
        }, 1500);
    }
}
