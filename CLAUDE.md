# Vietnam Event GIS: hướng dẫn cho Claude Code

Kế hoạch đầy đủ: @docs/ke-hoach-du-an.md
Tiến độ hiện tại: @docs/TIEN-DO.md

## Bối cảnh

- Bản demo web bản đồ tương tác Việt Nam **34 tỉnh/thành, chính quyền 2 cấp** (tỉnh, xã/phường; không còn quận/huyện).
- Giá trị cốt lõi: mọi sự kiện được ghim đúng vị trí, đúng địa giới hành chính, thông tin có nguồn.
- Người dùng là sinh viên năm 4, kiến thức web chưa toàn diện, muốn đưa dự án lên GitHub làm hồ sơ xin việc. Họ cần **hiểu** được dự án, không chỉ có code chạy được.

## Phạm vi hiện tại: chỉ Giai đoạn 1 (MVP)

Đích đến là chạy trọn kịch bản demo sau:

1. Mở web, thấy bản đồ 34 tỉnh, có đầy đủ quần đảo Hoàng Sa (thuộc Đà Nẵng) và Trường Sa (thuộc Khánh Hòa).
2. Rê chuột vào tỉnh: tỉnh sáng lên, hiện tên. Trên thiết bị cảm ứng: chạm lần 1 xem tên, chạm lần 2 chọn.
3. Bấm tỉnh: phóng vào tỉnh (fitBounds), làm mờ tỉnh khác, mở bảng thông tin (dân số, diện tích, mật độ, có ghi năm và nguồn) và danh sách sự kiện của cả tỉnh. Có nút quay lại toàn quốc.
4. Rê và bấm xã/phường: hiện sự kiện của xã/phường đó.
5. Bấm sự kiện: mở thẻ sự kiện, nút "Chỉ đường" mở Google Maps (Maps URLs, không cần API key, để trống điểm xuất phát).
6. Nút "Quanh đây": sự kiện trong bán kính 1–5 km, xếp gần đến xa, mặc định chỉ sự kiện đang hoặc sắp diễn ra.
7. Bộ lọc thời gian, trạng thái Sắp diễn ra / Đang diễn ra (Live) / Đã kết thúc tự tính từ thời gian; tìm kiếm.
8. Đăng ký, đăng nhập; đăng sự kiện và địa điểm, ghim vị trí có kiểm tra ranh giới bằng PostGIS `ST_Covers`, tự gán mã tỉnh và xã/phường.
9. Quản trị viên duyệt nội dung cơ bản. Có dữ liệu sự kiện mẫu để demo.

**Không làm trong Giai đoạn 1:** thanh toán, bot đánh giá, check-in QR, tài khoản Gov, 2FA, thông báo đẩy, Redis, vector tile, CDN, sự kiện di chuyển, geocoding. Ý tưởng ngoài phạm vi thì ghi vào mục "Để sau" trong `docs/TIEN-DO.md`, không làm.

## Quyết định kỹ thuật đã chốt

- Cấu trúc: thư mục gốc là repo Git; `web/` là frontend Next.js (TypeScript, App Router, Tailwind) + MapLibre GL JS; `api/` là backend Node.js (TypeScript), REST.
- CSDL: PostgreSQL + PostGIS chạy bằng Docker Compose; tọa độ WGS84 (EPSG:4326); "Quanh đây" dùng `ST_DWithin` trên cột geography có chỉ mục GiST; lưu `boundary_version`.
- **Chưa dùng bản đồ nền**: chỉ vẽ ranh giới từ GeoJSON của dự án.
- Dữ liệu: [vietnamese-provinces-database](https://github.com/thanglequoc/vietnamese-provinces-database) (MIT), thư mục `json/geojson/`. Dân số, diện tích theo Nghị quyết 202/2025/QH15. **Không viết cứng tên tỉnh trong mã**, luôn lấy từ dữ liệu.
- Ranh giới xã/phường rất nặng: chỉ nạp khi người dùng chọn tỉnh, không nạp toàn quốc một lần.
- Tọa độ của người dùng (Quanh đây) chỉ gửi lên để truy vấn, không lưu.

## Cách làm việc

- Trả lời và giải thích **bằng tiếng Việt**; mọi thuật ngữ kỹ thuật kèm giải thích đơn giản một câu.
- Làm **từng bước** theo lộ trình trong `docs/TIEN-DO.md`. Hết mỗi bước: chạy thử thật, sửa đến khi chạy được, rồi dừng lại báo người dùng: đã làm gì, cách tự mở ra xem, và 2–3 ý chính để họ hiểu phần code vừa viết. Chờ người dùng nói "tiếp" mới sang bước sau.
- Mỗi bước xong: cập nhật `docs/TIEN-DO.md` và commit Git với lời nhắn tiếng Việt rõ ràng.
- Code dễ đọc: tên biến tiếng Anh, chú thích ngắn bằng tiếng Việt ở chỗ khó.
- Không đưa bí mật (mật khẩu, khóa) vào Git: dùng `.env`, có `.env.example`.
- **Hỏi người dùng trước khi:** tạo repo GitHub, push code, xóa file/thư mục, cài phần mềm cần `sudo`.
- README.md ở thư mục gốc viết tiếng Việt: giới thiệu, ảnh chụp màn hình, cách chạy, nguồn dữ liệu, công nghệ.
- Khi người dùng gõ **"Chốt ngày"**: tổng kết việc đã xong trong ngày, bước tiếp theo, vấn đề còn treo, và ghi vào `docs/TIEN-DO.md`.
