# 📝 Todo List & Time Management API

Một hệ thống Backend mạnh mẽ được xây dựng bằng **NestJS** và **MongoDB**, cung cấp API cho ứng dụng quản lý công việc (Todo List) đa nền tảng. Hệ thống được thiết kế với kiến trúc chuẩn RESTful, hỗ trợ các tính năng nâng cao như xử lý công việc lặp lại (Virtual Interpolation) và thông báo thời gian thực (WebSockets).

## 🚀 Các tính năng nổi bật (Core Features)

* **🔒 Xác thực & Phân quyền (Auth):** Bảo mật hệ thống với JSON Web Token (JWT) và mã hóa mật khẩu bằng Bcrypt.
* **📅 Quản lý công việc thông minh (Tasks):** * Hỗ trợ tạo, đọc, sửa, xóa (CRUD) công việc.
    * Lọc công việc theo ngày (Calendar-based filtering).
    * **Tính năng nâng cao:** Xử lý chu kỳ lặp lại (Recurring Tasks) sử dụng kỹ thuật **Nội suy ảo (Virtual Interpolation)**, giúp hiển thị lịch trình vô hạn trên Frontend mà không làm phình to Database.
* **🏷️ Phân loại tự động (Smart Categories):** Áp dụng logic "Find or Create", cho phép người dùng linh hoạt tạo nhãn mới trực tiếp trong lúc tạo công việc.
* **📈 Thống kê & Chuỗi liên tục (Stats & Streaks):** Tính toán tỷ lệ hoàn thành công việc theo ngày và theo dõi chuỗi ngày hoạt động liên tục (Streaks Tracker) mà không cần cấu trúc dữ liệu game hóa phức tạp.
* **🔔 Thông báo Thời gian thực (Real-time Notifications):** Tích hợp WebSockets (Socket.io) để đẩy thông báo "Công việc sắp đến hạn" trực tiếp đến trình duyệt/thiết bị của người dùng ngay lập tức, kết hợp với Cron Jobs chạy ngầm.
* **📖 Tài liệu API tự động:** Tích hợp sẵn Swagger UI cho phép test API trực quan.

## 🛠️ Công nghệ sử dụng (Tech Stack)

* **Framework:** NestJS (Node.js)
* **Cơ sở dữ liệu:** MongoDB (MongoDB Atlas)
* **ORM / ODM:** Mongoose
* **Real-time:** Socket.io (`@nestjs/websockets`)
* **Bảo mật:** Passport, JWT, Bcrypt, Class-validator
* **Tài liệu API:** Swagger (`@nestjs/swagger`)

## ⚙️ Hướng dẫn cài đặt (Installation)

### 1. Yêu cầu hệ thống
* Node.js (Phiên bản 18.x trở lên)
* NPM hoặc Yarn
* Tài khoản MongoDB Atlas (Hoặc MongoDB chạy local)

### 2. Cài đặt thư viện
Clone repository này về máy và chạy lệnh:
```bash
npm install

### 3. Swagger
Truy cập: http://localhost:3000/api#/
