# Tiến độ Giai đoạn 1

Cập nhật sau mỗi bước. Đánh dấu `[x]` khi bước đã chạy thử được và đã commit.

## Lộ trình

- [x] **Bước 0. Khởi tạo:** repo Git, `.gitignore`, app Next.js trong `web/`, trang chào chạy được.
- [x] **Bước 1. Bản đồ 34 tỉnh:** tải GeoJSON tỉnh, MapLibre vẽ ranh giới (không bản đồ nền), hover sáng tỉnh và hiện tên, có Hoàng Sa, Trường Sa.
- [x] **Bước 2. Cấp xã/phường:** bấm tỉnh thì fitBounds, làm mờ tỉnh khác, nạp ranh giới xã/phường của riêng tỉnh đó; hover xã/phường; nút quay lại toàn quốc; xử lý chạm trên thiết bị cảm ứng.
- [x] **Bước 3. Bảng thông tin tỉnh:** dân số, diện tích, mật độ, số xã/phường, ghi năm và nguồn.
- [x] **Bước 4. CSDL và API:** Docker Compose PostgreSQL + PostGIS, `api/` Node.js, nạp ranh giới tỉnh và xã/phường, bảng thống kê tỉnh.
- [x] **Bước 5. Sự kiện:** bảng Venue và Event, dữ liệu mẫu ở nhiều tỉnh, hiển thị điểm trên bản đồ, danh sách theo tỉnh và theo xã/phường, trạng thái Sắp diễn ra / Live / Đã kết thúc, bộ lọc thời gian, tìm kiếm.
- [x] **Bước 6. Chỉ đường và Quanh đây:** thẻ sự kiện có nút Chỉ đường (Google Maps URL, chọn phương tiện); Quanh đây bán kính 1–5 km bằng `ST_DWithin`.
- [x] **Bước 7. Tài khoản và đăng sự kiện:** đăng ký, đăng nhập, vai trò; form đăng sự kiện, ghim trên bản đồ hoặc GPS, kiểm tra `ST_Covers`, tự gán tỉnh và xã/phường.
- [x] **Bước 8. Quản trị:** trang admin duyệt sự kiện, đánh dấu xác thực người nổi tiếng và chủ địa điểm.
- [x] **Bước 9. Hoàn thiện:** chạy lại toàn bộ kịch bản demo, README tiếng Việt kèm ảnh chụp màn hình, dọn code, sẵn sàng đưa lên GitHub.

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
- **Bước 4 xong.** `docker-compose.yml`: PostGIS 16-3.4 (dùng image có sẵn trên máy vì Docker Hub lỗi DNS lúc kéo image mới), cổng máy 5434 vì 5433 đang bị dự án khác dùng. Mật khẩu trong `.env`, `api/.env` (không commit), có file mẫu `.env.example`.
- `api/`: Express 5 + pg + zod, TypeScript 7. Migration `001_boundaries.sql` (provinces, wards, province_stats, chỉ mục GiST, extension unaccent). `npm run db:load-boundaries` nạp 34 tỉnh + 3.321 xã/phường + thống kê trong ~5 giây, từ chính các file GeoJSON web hiển thị (ranh giới kiểm tra = ranh giới nhìn thấy).
- API: `/api/health`, `/api/provinces`, `/api/provinces/:code` (thống kê + đếm xã/phường), `/api/geo/locate` (ST_Covers, nếu rơi vào khe hở <= 100 m thì lấy xã gần nhất).
- Web: bảng thông tin tỉnh đọc từ API; bỏ bản sao tĩnh `web/public/data/`.
- Kiểm thử `api/test/boundaries.test.ts` (7 bài): 34 tỉnh, 3.321 xã, số liệu TP.HCM, Hồ Gươm thuộc Hà Nội, Hoàng Sa -> Đà Nẵng, Trường Sa -> Khánh Hòa, điểm giữa biển bị từ chối. ĐẠT. Smoke test web ĐẠT.
- **Bước 5 xong.** Migration `002_events.sql`: bảng venues, events (geography(Point) + GiST, province_code, ward_code, boundary_version, approval_status). `npm run db:seed`: 22 địa điểm thật ở 13 tỉnh, 25 sự kiện hư cấu; tỉnh và xã/phường gán tự động bằng ST_Covers (ví dụ Phố cổ Hội An -> Phường Hội An, Đà Nẵng). Thời gian tính tương đối lúc seed nên luôn có đủ 3 trạng thái.
- API `GET /api/events` (lọc province, ward, when = all/live/today/tonight/weekend/week/upcoming/ended theo giờ VN, q tìm không dấu bằng unaccent), `GET /api/events/:id`. Trạng thái tính trong SQL từ now(), không lưu.
- Web: bảng bên luôn hiện (toàn quốc / tỉnh / xã), bộ lọc + tìm kiếm (debounce 300 ms), danh sách, thẻ sự kiện; chấm sự kiện trên bản đồ màu theo trạng thái, bấm chấm hoặc dòng đều mở thẻ.
- Kiểm thử: `api/test/events.test.ts` 6 bài + `time.test.ts` 4 bài ĐẠT; smoke test thêm 10 kiểm tra sự kiện ĐẠT.
- Lỗi đã gặp: biểu thức `["zoom"]` của MapLibre phải nằm ngoài cùng; điểm thử trên bản đồ phải tránh chấm sự kiện (chấm được ưu tiên khi bấm).
- **Bước 6 xong.** Thẻ sự kiện có nút "Chỉ đường": `https://www.google.com/maps/dir/?api=1&destination=lat%2Clng&travelmode=...`, không có origin (Google Maps tự dùng vị trí thiết bị), chọn xe máy (two-wheeler, mặc định) / ô tô / đi bộ, mở tab mới. Đã đối chiếu tài liệu Google Maps URLs: two-wheeler hợp lệ nhưng chỉ có tác dụng ở nước được hỗ trợ.
- API `GET /api/events/nearby`: `ST_DWithin(location, điểm, bán_kính_m)` trên geography, sắp theo `ST_Distance`, bán kính 1–5 km, mặc định `when=upcoming` (đang + sắp diễn ra), kết hợp được bộ lọc thời gian; không có kết quả thì trả `nearest` (toán tử KNN `<->`). Tọa độ không lưu, không log.
- Web: nút "📍 Quanh đây": GPS hoặc "Chọn điểm trên bản đồ", thanh trượt 1–5 km, vòng tròn quét + căn khung, khoảng cách từng dòng, sự kiện gần nhất viền vàng, gợi ý tăng bán kính / sự kiện gần nhất.
- Kiểm thử: `api/test/nearby.test.ts` 4 bài ĐẠT; smoke test giả lập GPS ở Hồ Gươm (4 sự kiện: 4 m, 4 m, 742 m, 1,5 km) và kiểm tra liên kết Chỉ đường ĐẠT.
- **Bước 7 xong.** Migration `003_users.sql`: bảng users (role user/celebrity/venue_owner/admin, is_verified), cột created_by, owner_id. API `/api/auth/register|login|me` (bcrypt cost 10, JWT 7 ngày, không tự đăng ký được admin, thông báo đăng nhập sai không lộ email nào tồn tại). `POST /api/events`, `POST /api/venues`, `GET /api/me/events|venues`: server tự xác định tỉnh, xã/phường bằng ST_Covers (không tin mã tỉnh trình duyệt gửi), ghim ngoài ranh giới -> 422. Quy tắc duyệt: admin và tài khoản đã xác thực -> duyệt ngay; còn lại chờ duyệt.
- Seed: tạo admin từ ADMIN_EMAIL/ADMIN_PASSWORD trong `api/.env`, 2 tài khoản demo chưa xác thực có 2 sự kiện + 1 địa điểm chờ duyệt; chỉ xóa dữ liệu mẫu, giữ dữ liệu người dùng thật.
- Web: `AuthProvider` (context React) + thanh tiêu đề chung; trang `/dang-ky`, `/dang-nhap`, `/dang-su-kien` (đăng sự kiện hoặc địa điểm, bản đồ nhỏ để ghim/kéo ghim/GPS, hiện ngay "Thuộc Phường X, Tỉnh Y" hoặc lỗi ngoài ranh giới; danh sách "Sự kiện của tôi" kèm trạng thái duyệt).
- Kiểm thử: `api/test/accounts.test.ts` 8 bài ĐẠT; smoke test đăng ký trên giao diện, ghim giữa biển bị từ chối, ghim Hồ Gươm -> Phường Hoàn Kiếm, Hà Nội, đăng xong ở trạng thái Chờ duyệt. ĐẠT.
- Vấn đề: ghim chính xác khó vì chưa có bản đồ nền (chỉ thấy đường ranh giới phường) -> ghi vào "Để sau".

### 2026-11-11

- **Bước 8 xong.** Migration `004_moderation.sql` (bảng moderation_logs). API `/api/admin/*` (chỉ admin; khách 401, người thường 403): danh sách và duyệt/từ chối sự kiện, địa điểm; danh sách người nổi tiếng/chủ địa điểm và xác thực/bỏ xác thực; nhật ký kiểm duyệt. Trang `/quan-tri`.
- Kiểm thử: `api/test/admin.test.ts` 6 bài; toàn bộ `npm test` 35/35 ĐẠT. Smoke test: admin đăng nhập, duyệt sự kiện vừa đăng, xác thực tài khoản (hiện ✔), có nhật ký, sự kiện xuất hiện trên bản đồ công khai. ĐẠT. Smoke test tự dọn dữ liệu của nó (tài khoản smoke-*@example.com) qua psql trong container.
- **Đổi cổng web sang 3100**: hôm nay Docker Desktop tự bật container `defense_gis_frontend` (dự án khác) chiếm cổng 3000, khiến web nhảy sang 3001 và bị API chặn CORS. `next dev -p 3100`, `WEB_ORIGIN=http://localhost:3100`.
- Lỗi đã gặp: lần chạy kiểm thử API hôm qua bị treo (bảng moderation_logs chưa có ở Bước 7) nên để sót dữ liệu kiểm thử, đã xóa; smoke test chờ bản đồ chưa đủ lâu khi server vừa khởi động -> chờ tới khi lớp `event-circle` đã được thêm.

- **Bước 9 xong.** Build production sạch (`api`: `tsc`; `web`: `next build`, 6 trang tĩnh), lint sạch. `npm test` 35/35 ĐẠT. Smoke test chạy lại toàn bộ kịch bản demo (46 kiểm tra, 8 ảnh chụp): 4/4 lần liên tiếp ĐẠT, thêm 3 lần sau đó cũng ĐẠT sau khi sửa các chỗ chờ cố định (`sleep`) thành chờ theo điều kiện. Còn 1 hiện tượng chập chờn chưa tái hiện được: lần chạy đầu tiên ngay sau `next build`/khởi động server đôi khi kẹt 60 giây ở bước chờ bản đồ sau khi bấm Hà Nội; đã thêm in trạng thái bản đồ để lần sau gặp thì biết nguyên nhân (thử chờ 3 phút rồi chạy lại vẫn không tái hiện được). Thêm xử lý lỗi khi tải ranh giới xã/phường.
- README tiếng Việt: giới thiệu, ảnh chụp, công nghệ, kỹ thuật GIS, cấu trúc thư mục, cách chạy, kiểm thử, nguồn dữ liệu.
- Kịch bản demo trong CLAUDE.md: mục 1–9 đều chạy được (xem phần "Còn thiếu" bên dưới cho các điểm chưa tốt).

### Còn thiếu / chưa tốt của Giai đoạn 1

- Chưa có bản đồ nền: ghim vị trí khi đăng sự kiện và xem "Quanh đây" ở mức phóng gần chỉ thấy ranh giới xã/phường, không thấy đường phố.
- Số liệu dân số/diện tích lấy qua Wikipedia (trích Tuổi Trẻ), chưa đối chiếu trực tiếp với văn bản Nghị quyết 202/2025/QH15.
- Ranh giới đã đơn giản hóa (tỉnh ~100 m, xã ~30 m): có khe hở nhỏ giữa các xã, API bù bằng cách lấy xã gần nhất trong 100 m.
- Ở trang danh sách theo xã/phường, chấm sự kiện chồng lên xã nên khó bấm chọn xã có sự kiện ở mức zoom tỉnh (phải phóng gần hơn).
- Đăng nhập: JWT lưu trong localStorage (dễ bị lộ nếu trang có lỗi XSS), chưa giới hạn số lần đăng nhập sai, chưa có quên mật khẩu.
- Chưa sửa/xóa sự kiện đã đăng; chưa upload ảnh sự kiện.
- File mẫu của create-next-app trong `web/public/` (file.svg, globe.svg, next.svg, vercel.svg, window.svg): giữ lại theo quyết định của người dùng (11/11/2026). Hiện không trang nào dùng tới, có thể xóa khi dọn code sau này.

## Để sau

- Bản đồ nền (OpenStreetMap qua Protomaps/OpenMapTiles tự quản) để ghim chính xác theo đường phố.
- Geocoding (tìm địa chỉ gợi ý) khi đăng sự kiện.
- Đối chiếu số liệu với văn bản gốc NQ 202/2025/QH15, thay bằng số liệu Cục Thống kê khi có; cơ chế cập nhật định kỳ.
- Cookie httpOnly thay cho localStorage, giới hạn tần suất đăng nhập (rate limit), quên mật khẩu, 2FA cho người nổi tiếng/Gov.
- Sửa/xóa sự kiện, ảnh sự kiện (object storage, xóa EXIF vị trí), sự kiện lặp lại.
- Gom cụm điểm (Supercluster) khi số sự kiện lớn; vector tile cho ranh giới xã/phường.
- Vẽ tuyến chỉ đường ngay trong ứng dụng (OSRM/Valhalla), thêm Apple Maps.
- CI chạy `npm test` và smoke test tự động khi push lên GitHub.
