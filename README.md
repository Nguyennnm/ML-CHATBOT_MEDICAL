# ML-CHATBOT_MEDICAL

Đây là repository cho đồ án cuối kỳ môn **Nhập môn học máy**: xây dựng hệ thống chatbot hỏi--đáp y tế tiếng Việt. Dự án gồm phần giao diện web, máy chủ API, cơ sở dữ liệu và các notebook/mã nguồn phục vụ thử nghiệm mô hình.

## Thành phần chính

- **Giao diện:** React + Vite, hiển thị màn hình đăng nhập, khung chat, lịch sử hội thoại và gợi ý bản đồ.
- **Máy chủ API:** Node.js + Express theo kiến trúc MVC, xử lý xác thực, hội thoại, lưu dữ liệu và kết nối RAG API.
- **Cơ sở dữ liệu:** SQLite, dùng để lưu tài khoản, hội thoại, tin nhắn và metadata nguồn tham khảo.
- **Mô hình:** các thử nghiệm BM25, RAG và fine-tuning Qwen2.

## Cây thư mục chính

```text
ML-CHATBOT_MEDICAL/
|-- client/                      # Giao diện React + Vite
|   |-- src/
|   |   |-- components/           # Component giao diện
|   |   |-- lib/                  # Hàm gọi API
|   |   |-- App.jsx               # Component chính
|   |   |-- main.jsx              # Điểm khởi động React
|   |   `-- styles.css            # CSS toàn cục
|   |-- index.html
|   |-- package.json
|   `-- vite.config.js
|-- server/                      # Máy chủ API Node.js + Express MVC
|   |-- src/
|   |   |-- config/               # Cấu hình môi trường và database
|   |   |-- controllers/          # Xử lý request/response
|   |   |-- database/             # Migration SQLite
|   |   |-- middlewares/          # Middleware Express
|   |   |-- models/               # Truy vấn dữ liệu
|   |   |-- routes/               # Định nghĩa API routes
|   |   |-- services/             # Logic nghiệp vụ
|   |   |-- utils/                # Tiện ích dùng chung
|   |   |-- app.js                # Cấu hình Express app
|   |   `-- server.js             # Khởi động API server
|   |-- .env.example              # Mẫu cấu hình môi trường
|   `-- package.json
|-- Model/                       # Notebook, mã nguồn và tệp mô hình
|   |-- BM25/                    # Thử nghiệm BM25
|   |-- Rag/                     # Quy trình RAG
|   `-- Qwen2_fine_tuned/        # Fine-tuning Qwen2
|-- docs/                        # Tài liệu báo cáo và hình minh họa
|   |-- architecture/             # Ghi chú kiến trúc
|   `-- figures/                 # Ảnh chụp giao diện
|-- EDA.ipynb                    # Notebook phân tích dữ liệu tổng quan
|-- package.json                 # Script chạy toàn bộ dự án
|-- package-lock.json            # Khóa phiên bản dependency
|-- .gitignore
`-- README.md
```

## Các file quan trọng

```text
client/src/App.jsx                         # Điều phối trạng thái chính của giao diện
client/src/lib/api.js                      # Gọi API máy chủ và xử lý luồng trả lời
client/src/components/AuthPanel.jsx        # Giao diện đăng nhập/đăng ký
client/src/components/Sidebar.jsx          # Sidebar, lịch sử hội thoại, liên kết bản đồ
client/src/components/ChatWindow.jsx       # Khung chat chính
client/src/components/MessageBubble.jsx    # Hiển thị tin nhắn và nguồn tham khảo

server/src/app.js                          # Cấu hình Express app
server/src/server.js                       # Khởi động máy chủ API
server/src/config/env.js                   # Đọc biến môi trường
server/src/config/database.js              # Kết nối SQLite
server/src/database/migrate.js             # Tạo/cập nhật cấu trúc cơ sở dữ liệu
server/src/controllers/                    # Bộ điều khiển xử lý request/response
server/src/services/                       # Logic nghiệp vụ, xác thực, chat, RAG API
server/src/models/                         # Truy vấn cơ sở dữ liệu
server/src/routes/                         # Định nghĩa các tuyến API
server/src/middlewares/authenticate.js     # Middleware xác thực token
server/.env.example                        # Mẫu cấu hình môi trường máy chủ API

Model/BM25/                                # Thử nghiệm BM25
Model/Rag/                                 # Quy trình RAG
Model/Qwen2_fine_tuned/                    # Fine-tuning Qwen2
```

## Yêu cầu môi trường

- Node.js 20 trở lên
- npm 10 trở lên
- Dịch vụ RAG API chạy trên Google Colab nếu muốn chatbot trả lời bằng mô hình thật

Nếu chưa cấu hình RAG API, máy chủ API vẫn chạy được và trả về thông báo dự phòng khi người dùng gửi câu hỏi.

## Cài đặt và chạy trên máy cá nhân

Sao chép mã nguồn:

```bash
git clone https://github.com/Nguyennnm/ML-CHATBOT_MEDICAL.git
cd ML-CHATBOT_MEDICAL
```

Cài các gói phụ thuộc:

```bash
npm install
```

Tạo file môi trường cho máy chủ API:

```bash
# Windows PowerShell
Copy-Item server/.env.example server/.env

# macOS/Linux/Git Bash
cp server/.env.example server/.env
```

Cấu hình file `server/.env`:

```bash
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DB_PATH=./data/medical_chatbot.sqlite
RAG_API_BASE_URL=https://your-rag-api.example.com
RAG_API_TIMEOUT_MS=180000
RAG_API_TLS_REJECT_UNAUTHORIZED=false
AUTH_TOKEN_SECRET=change-this-to-a-long-random-string
AUTH_TOKEN_TTL_SECONDS=604800
```

Chạy migration tạo cơ sở dữ liệu:

```bash
npm run db:migrate
```

Chạy giao diện và máy chủ API cùng lúc:

```bash
npm run dev
```

Địa chỉ mặc định:

```text
Giao diện:       http://localhost:5173
Máy chủ API:     http://localhost:4000
Kiểm tra API:    http://localhost:4000/api/health
```

## Các lệnh thường dùng

```bash
# Cài các gói phụ thuộc
npm install

# Tạo/cập nhật cơ sở dữ liệu SQLite
npm run db:migrate

# Chạy giao diện và máy chủ API
npm run dev

# Chạy giao diện
npm run client:dev

# Chạy máy chủ API
npm run server:dev

# Đóng gói giao diện
npm run build

# Chạy máy chủ API ở chế độ triển khai
npm run start
```

## API chính

API không yêu cầu đăng nhập:

```text
GET  /api/health
POST /api/auth/register
POST /api/auth/login
```

API yêu cầu token:

```text
GET    /api/auth/me
GET    /api/conversations
POST   /api/conversations
PATCH  /api/conversations/:id
DELETE /api/conversations/:id
GET    /api/conversations/:id/messages
POST   /api/chat
POST   /api/chat/stream
```

Giao diện gửi token theo header:

```text
Authorization: Bearer <token>
```

## Cơ sở dữ liệu

SQLite được dùng cho bản demo. Migration hiện tạo các bảng chính:

```text
users
conversations
messages
medical_sources
```

Các file cơ sở dữ liệu local không được đưa lên Git:

```text
server/data/*.sqlite
server/data/*.sqlite-shm
server/data/*.sqlite-wal
```

## Ghi chú về mô hình

Máy chủ API không nhúng trực tiếp mô hình vào Node.js. Mô hình RAG được chạy như một dịch vụ API riêng, sau đó máy chủ gọi qua biến môi trường:

```text
RAG_API_BASE_URL
```

RAG API cần được chạy riêng trên Google Colab. README này chỉ mô tả cách kết nối từ ứng dụng web; phần chuẩn bị và chạy RAG API được trình bày trong `Model/Rag/README.md`.

Khi URL dịch vụ RAG thay đổi, chỉ cần cập nhật `server/.env` rồi khởi động lại máy chủ API.

## Ghi chú bảo mật

- Không commit file `server/.env`.
- Cần đổi `AUTH_TOKEN_SECRET` trước khi triển khai.
- Câu trả lời y tế chỉ mang tính tham khảo, không thay thế chẩn đoán hoặc chỉ định điều trị của bác sĩ.
