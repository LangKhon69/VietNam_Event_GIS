# Tiến độ Giai đoạn 1

Cập nhật sau mỗi bước. Đánh dấu `[x]` khi bước đã chạy thử được và đã commit.

## Lộ trình

- [x] **Bước 0. Khởi tạo:** repo Git, `.gitignore`, app Next.js trong `web/`, trang chào chạy được.
- [ ] **Bước 1. Bản đồ 34 tỉnh:** tải GeoJSON tỉnh, MapLibre vẽ ranh giới (không bản đồ nền), hover sáng tỉnh và hiện tên, có Hoàng Sa, Trường Sa.
- [ ] **Bước 2. Cấp xã/phường:** bấm tỉnh thì fitBounds, làm mờ tỉnh khác, nạp ranh giới xã/phường của riêng tỉnh đó; hover xã/phường; nút quay lại toàn quốc; xử lý chạm trên thiết bị cảm ứng.
- [ ] **Bước 3. Bảng thông tin tỉnh:** dân số, diện tích, mật độ, số xã/phường, ghi năm và nguồn.
- [ ] **Bước 4. CSDL và API:** Docker Compose PostgreSQL + PostGIS, `api/` Node.js, nạp ranh giới tỉnh và xã/phường, bảng thống kê tỉnh.
- [ ] **Bước 5. Sự kiện:** bảng Venue và Event, dữ liệu mẫu ở nhiều tỉnh, hiển thị điểm trên bản đồ, danh sách theo tỉnh và theo xã/phường, trạng thái Sắp diễn ra / Live / Đã kết thúc, bộ lọc thời gian, tìm kiếm.
- [ ] **Bước 6. Chỉ đường và Quanh đây:** thẻ sự kiện có nút Chỉ đường (Google Maps URL, chọn phương tiện); Quanh đây bán kính 1–5 km bằng `ST_DWithin`.
- [ ] **Bước 7. Tài khoản và đăng sự kiện:** đăng ký, đăng nhập, vai trò; form đăng sự kiện, ghim trên bản đồ hoặc GPS, kiểm tra `ST_Covers`, tự gán tỉnh và xã/phường.
- [ ] **Bước 8. Quản trị:** trang admin duyệt sự kiện, đánh dấu xác thực người nổi tiếng và chủ địa điểm.
- [ ] **Bước 9. Hoàn thiện:** chạy lại toàn bộ kịch bản demo, README tiếng Việt kèm ảnh chụp màn hình, dọn code, sẵn sàng đưa lên GitHub.

## Nhật ký

(Ghi theo ngày: đã làm gì, vấn đề gặp phải.)

### 2026-11-10

- **Bước 0 xong.** Dời `CLAUDE.md` và `docs/` từ thư mục lồng `vietnam-event-gis/vietnam-event-gis/` lên `vietnam-event-gis/` làm gốc repo; `git init` nhánh `main`.
- Thêm `.gitignore` ở gốc (bỏ qua `node_modules/`, `.next/`, `.env*` trừ `.env.example`, `data/raw/`).
- Tạo `web/` bằng `create-next-app`: Next.js 16.4.6 (Turbopack), React 19.3, Tailwind 4, TypeScript, ESLint, App Router, thư mục `src/`. Môi trường: Node 24.21, npm 11.19.
- Trang chào tiếng Việt (`lang="vi"`, font Inter có bộ ký tự tiếng Việt thay cho Geist vốn thiếu dấu tiếng Việt).
- Đã chạy thử: `npm run lint` sạch, `npm run build` thành công, `npm run dev` trả về trang `/` mã 200 với đúng nội dung.
- Ghi chú: `npm install` lần đầu mất khoảng 10 phút (mạng chậm). Next.js 16 tự sinh `web/AGENTS.md` (hướng dẫn cho AI đọc tài liệu Next đi kèm), giữ lại trong repo.

## Để sau

(Ý tưởng ngoài phạm vi Giai đoạn 1.)
