# Tiến độ Giai đoạn 1

Cập nhật sau mỗi bước. Đánh dấu `[x]` khi bước đã chạy thử được và đã commit.

## Lộ trình

- [x] **Bước 0. Khởi tạo:** repo Git, `.gitignore`, app Next.js trong `web/`, trang chào chạy được.
- [x] **Bước 1. Bản đồ 34 tỉnh:** tải GeoJSON tỉnh, MapLibre vẽ ranh giới (không bản đồ nền), hover sáng tỉnh và hiện tên, có Hoàng Sa, Trường Sa.
- [x] **Bước 2. Cấp xã/phường:** bấm tỉnh thì fitBounds, làm mờ tỉnh khác, nạp ranh giới xã/phường của riêng tỉnh đó; hover xã/phường; nút quay lại toàn quốc; xử lý chạm trên thiết bị cảm ứng.
- [x] **Bước 3. Bảng thông tin tỉnh:** dân số, diện tích, mật độ, số xã/phường, ghi năm và nguồn.
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
- **Bước 1 xong.** Tải 34 file GeoJSON tỉnh (bộ dữ liệu v5.2.0) vào `data/raw/` (không commit). Script `scripts/prepare-provinces.mjs` đơn giản hóa (Douglas–Peucker, sai số ~100 m) từ 92.875 xuống 23.256 điểm, ghi `web/public/geo/provinces.json` (479 KB), giữ nguyên các đảo nhỏ.
- Bản đồ MapLibre GL JS v6 không có bản đồ nền; hover sáng tỉnh, hiện nhãn tên lấy từ dữ liệu.
- Số liệu dân số/diện tích: 2 trang nguồn trong kế hoạch không truy cập được (Thư viện Pháp luật chặn bot 403, amilawfirm lỗi DNS). Thay bằng bảng trên Wikipedia tiếng Việt (trích Tuổi Trẻ 13/5/2025, cùng số với NQ 202/2025/QH15, ví dụ TP.HCM 14.002.598 người / 6.772,59 km²). Script `scripts/extract-province-stats.mjs` -> `data/province-stats.json`. **Nên đối chiếu lại với văn bản gốc của nghị quyết.**
- Kiểm thử: `npm run smoke` (puppeteer-core + Edge có sẵn) kiểm tra 34 tỉnh, Hoàng Sa thuộc Đà Nẵng, Trường Sa thuộc Khánh Hòa, hover Hà Nội hiện nhãn; ảnh lưu `docs/screenshots/`.
- Lỗi gặp và cách sửa: (1) MapLibre v6 không tìm được worker khi Next.js đóng gói -> chép worker vào `public/maplibre/` bằng postinstall và gọi `setWorkerUrl`; (2) khung bản đồ cao 0 px vì CSS MapLibre đặt `position: relative` -> dùng `h-full`; (3) Next.js nhầm thư mục gốc do có 2 package-lock -> đặt `turbopack.root`.
- **Bước 2 xong.** Tải `vn_provinces_wards_geojson.zip` (50 MB, mạng chậm ~25 phút). Script `scripts/prepare-wards.mjs`: 3.321/3.321 xã/phường, 7.129.486 -> 618.461 điểm (sai số ~30 m), mỗi tỉnh 1 file `web/public/geo/wards/{mã}.json` (tổng 13 MB, file lớn nhất 788 KB, nén gzip ~190 KB). Thêm `special-zones.json`: nhãn 13 đặc khu.
- Bấm tỉnh: fitBounds vào phần đất liền (khung `focusBbox` của đa giác lớn nhất, để Đà Nẵng/Khánh Hòa không bị kéo ra Hoàng Sa/Trường Sa), tỉnh khác chuyển xám mờ, chỉ nạp xã/phường của tỉnh đó; hover/bấm xã/phường; nút "← Toàn quốc".
- Cảm ứng: `(hover: none)` -> chạm 1 lần hiện tên, chạm lần 2 chọn. Phải tắt "chạm đúp phóng to" của MapLibre vì nó nuốt lần chạm thứ 2.
- Nhãn đặc khu: ở mức toàn quốc chỉ hiện đặc khu xa đất liền (> 1,5°: Hoàng Sa, Trường Sa, Côn Đảo), zoom >= 7 hiện tất cả.
- Smoke test thêm: bấm Hà Nội (126 xã/phường, zoom 9), hover + bấm Phường Hoàn Kiếm, nút Toàn quốc, giả lập điện thoại chạm 2 lần. Tất cả ĐẠT.
- **Bước 3 xong.** Bảng thông tin tỉnh (`ProvinceInfo`): dân số, diện tích, mật độ (tính = dân số / diện tích), số xã/phường chia phường/xã/đặc khu (đếm từ bộ dữ liệu hành chính), trung tâm hành chính, ghi năm 2025 và nguồn kèm liên kết, có câu lưu ý "chưa phải số mới nhất". Tạm đọc `web/public/data/province-stats.json`; Bước 4 chuyển sang API.
- Smoke test: Hà Nội 8.807.523 người, 3.359,82 km², 2.621 người/km², 126 xã/phường, có năm và nguồn. ĐẠT.

## Để sau

(Ý tưởng ngoài phạm vi Giai đoạn 1.)
