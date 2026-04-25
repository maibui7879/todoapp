
---
title: Todo App
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---
# 📝 Todo List & Time Management API

Một hệ thống Backend mạnh mẽ được xây dựng bằng **NestJS** và **MongoDB**, cung cấp API cho ứng dụng quản lý công việc (Todo List) đa nền tảng. Hệ thống được thiết kế với kiến trúc chuẩn RESTful, hỗ trợ các tính năng nâng cao như xử lý công việc lặp lại (Virtual Interpolation) và thông báo thời gian thực (WebSockets).

## 🚀 Các tính năng nổi bật (Core Features)

* **🔒 Xác thực & Phân quyền (Auth):** Bảo mật hệ thống với JSON Web Token (JWT) và mã hóa mật khẩu bằng Bcrypt.
* **📅 Quản lý công việc thông minh (Tasks):**
    * Hỗ trợ tạo, đọc, sửa, xóa (CRUD) công việc.
    * Lọc công việc theo ngày (Calendar-based filtering).
    * **Lọc theo trạng thái:** Hỗ trợ filter `?isCompleted=true/false` để phân tách công việc "Đang làm" và "Đã xong".
    * **Tính năng nâng cao:** Xử lý chu kỳ lặp lại (Recurring Tasks) sử dụng kỹ thuật **Nội suy ảo (Virtual Interpolation)**, giúp hiển thị lịch trình vô hạn trên Frontend mà không làm phình to Database. Người dùng có thể:
      * Tạo task lặp lại mỗi ngày (DAILY), hàng tuần (WEEKLY), hoặc tùy chỉ (FIXED_DAYS).
      * Hệ thống tự động sinh ra các bản sao ảo (Virtual Tasks) cho các ngày tương ứng.
      * Khi người dùng hoàn thành task ảo, nó tự động "thực hóa" thành bản ghi thật trong Database.
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

## 📚 API Endpoints

### 🔐 Authentication
* `POST /auth/register` - Đăng ký tài khoản mới
* `POST /auth/login` - Đăng nhập (trả về JWT token)

### 📋 Tasks (Công việc)
* `POST /tasks` - Tạo công việc (hỗ trợ lặp lại và Find-or-Create category)
  ```bash
  POST /tasks
  {
    "title": "Chống đẩy 20 phút",
    "dueDate": "2026-04-15T10:00:00.000Z",
    "categoryName": "Sức khỏe",
    "isMaster": true,
    "repeatUnit": "DAILY",
    "repeatInterval": 1
  }
  ```

* `GET /tasks` - Lấy danh sách công việc
  * `?date=2026-04-15` - Lọc theo ngày cụ thể (bao gồm virtual tasks)
  * `?isCompleted=true/false` - Lọc theo trạng thái hoàn thành
  * `?date=2026-04-15&isCompleted=false` - Kết hợp cả hai bộ lọc

* `GET /tasks/:id` - Chi tiết 1 công việc
* `PATCH /tasks/:id` - Cập nhật công việc (hoặc đánh dấu hoàn thành)
* `DELETE /tasks/:id` - Xóa công việc
* `POST /tasks/realize/:masterId?dueDate=2026-04-15` - Thực hóa task ảo thành task thật

### 👤 Users (Người dùng)
* `GET /users/me` - Lấy thông tin profile người dùng hiện tại
* `PATCH /users/me` - Cập nhật profile (fullName, avatarUrl)

### 🏷️ Categories (Danh mục)
* `POST /categories` - Tạo danh mục mới
* `GET /categories` - Lấy danh sách danh mục của người dùng 
* `PATCH /categories/:id` - Cập nhật danh mục
* `DELETE /categories/:id` - Xóa danh mục

### 📊 Stats (Thống kê)
* `GET /stats/dashboard` - Lấy thống kê tổng quan và streak hiện tại
  ```json
  Response:
  {
    "totalToday": 5,
    "completedToday": 3,
    "completionRate": 60,
    "currentStreak": 7
  }
  ```

### 🔔 Notifications (Thông báo)
* `GET /notifications` - Lấy lịch sử thông báo (30 gần nhất)
* `PATCH /notifications/:id/read` - Đánh dấu thông báo đã đọc

## 🔗 WebSocket Events (Real-time)
Kết nối WebSocket: `ws://localhost:3000?userId=<userId>`
* **Event:** `new-notification` - Nhận thông báo thời gian thực khi task sắp đến hạn

## 💡 Sử dụng thực tế (Usage Examples)

### Repeat Unit Options (Loại lặp lại)
* `DAILY` - Mỗi ngày (repeatInterval: số ngày)
* `WEEKLY` - Mỗi tuần (repeatInterval: số tuần)
* `MONTHLY` - Mỗi tháng (repeatInterval: số tháng)
* `YEARLY` - Mỗi năm (repeatInterval: số năm)
* `FIXED_DAYS` - Tùy chỉ theo số ngày (repeatInterval: số ngày)
* `NONE` - Không lặp lại

### Tạo task lặp lại hàng ngày:
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tập thể dục",
    "dueDate": "2026-04-12T06:00:00.000Z",
    "categoryName": "Sức khỏe",
    "isMaster": true,
    "repeatUnit": "DAILY",
    "repeatInterval": 1
  }'
```

### Tạo task lặp lại mỗi tháng:
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Thanh toán hóa đơn",
    "dueDate": "2026-04-12T09:00:00.000Z",
    "categoryName": "Tài chính",
    "isMaster": true,
    "repeatUnit": "MONTHLY",
    "repeatInterval": 1
  }'
```
Lưu ý: Task sẽ lặp lại vào ngày 12 của mỗi tháng.

### Lấy tất cả task chưa hoàn thành của ngày 15/4:
```bash
curl -X GET "http://localhost:3000/tasks?date=2026-04-15&isCompleted=false" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```
Kết quả trả về bao gồm:
- Real tasks: Tasks được tạo hoặc thực hóa trên ngày 15/4
- Virtual tasks: Tasks lặp lại (Master tasks) có quy tắc lặp khớp với ngày 15/4

### Hoàn thành task ảo:
```bash
curl -X POST http://localhost:3000/tasks/realize/64a1b2c3d4e5f6g7h8i9j0k \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "isCompleted": true,
    "dueDate": "2026-04-15"
  }'
```

## ⚠️ Virtual Tasks - Những điều cần biết (Important Notes)

### Nhận diện Virtual Tasks
Virtual tasks có ID dạng: `virtual_<masterId>_<timestamp>`
- Ví dụ: `virtual_64a1b2c3d4e5f6g7h8i9j0k_1600000000`

### Hạn chế trên Virtual Tasks
**Virtual tasks KHÔNG thể sửa/xóa trực tiếp:**
- Gọi `PATCH /tasks/virtual_...` → Error 400
- Gọi `DELETE /tasks/virtual_...` → Error 400

**Giải pháp:**
1. Nếu muốn **hoàn thành** virtual task → Gọi `POST /tasks/realize/:masterId`
2. Nếu muốn **xóa một ngày lẻ** → Gọi `POST /tasks/realize/:masterId` với `isSkipped: true` (nếu backend hỗ trợ)
3. Nếu muốn **xóa toàn bộ chu kỳ** → Gọi `DELETE /tasks/<masterId>`

### Quy trình xử lý Virtual Tasks
```
1. Frontend gọi GET /tasks?date=2026-04-15
   ↓
2. Backend trả về hỗn hợp real tasks + virtual tasks
   ↓
3. User nhấn "Hoàn thành" trên task ảo
   ↓
4. Frontend gọi POST /tasks/realize/<masterId>?dueDate=2026-04-15
   ↓
5. Backend tạo real task trong DB, trả về ID thật
   ↓
6. Virtual task biến mất từ ngày hôm nay (vì đã có real task)
```


