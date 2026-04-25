# Stage 1: Build ứng dụng
FROM node:20-alpine AS builder

WORKDIR /app

# Sao chép các file cấu hình dependency
COPY package*.json ./

# Cài đặt toàn bộ dependencies bao gồm cả devDependencies để build
RUN npm install --legacy-peer-deps

# Sao chép toàn bộ mã nguồn
COPY . .

# Build ứng dụng sang thư mục dist
RUN npm run build

# Stage 2: Chạy ứng dụng
FROM node:20-alpine

WORKDIR /app

# Chỉ sao chép file package.json và thư mục đã build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Cài đặt chỉ các production dependencies để giảm dung lượng
RUN npm install --only=production

# Hugging Face Spaces yêu cầu cổng mặc định thường là 7860 hoặc thông qua biến PORT
# Ứng dụng của bạn đã hỗ trợ lấy PORT từ môi trường
ENV PORT=7860
EXPOSE 7860

# Lệnh chạy ứng dụng ở chế độ production
CMD ["npm", "run", "start:prod"]