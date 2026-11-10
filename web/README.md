# web: giao diện Vietnam Event GIS

Ứng dụng Next.js (TypeScript, App Router, Tailwind CSS). Xem README ở thư mục gốc để biết tổng quan dự án.

## Chạy thử trên máy

```bash
cd web
npm install     # chỉ cần lần đầu: cài thư viện vào node_modules/
npm run dev     # chạy server phát triển, mở http://localhost:3000
```

Các lệnh khác:

- `npm run build`: build bản production (đồng thời kiểm tra lỗi TypeScript).
- `npm run lint`: kiểm tra code bằng ESLint.

## Cấu trúc chính

- `src/app/layout.tsx`: khung chung bọc mọi trang (font, ngôn ngữ, tiêu đề).
- `src/app/page.tsx`: trang chủ, đường dẫn `/`.
- `src/app/globals.css`: CSS toàn cục, nạp Tailwind.
- `public/`: file tĩnh (ảnh, icon, sau này là GeoJSON) phục vụ trực tiếp theo đường dẫn.
