# Kế hoạch dự án Vietnam Event GIS

*Bản đồ số hóa sự kiện và địa điểm tương tác · Phiên bản 2 (viết lại)*

## 1. Tổng quan

**Vietnam Event GIS** là nền tảng bản đồ tương tác cho phép người dùng
khám phá sự kiện và địa điểm trên toàn Việt Nam, đồng thời cung cấp công
cụ số cho ba nhóm: người nổi tiếng, chủ địa điểm (KOL) và cơ quan nhà
nước.

**Hai mục tiêu chính**

1.  **Chuyển đổi số cho chính phủ:** bản đồ hành chính, bấm vào tỉnh để
    xem thông tin (dân số, diện tích\...), kênh thông báo chính thức.

2.  **Chuyển đổi số cho sự kiện:** đăng và quản lý sự kiện, bán vé,
    check-in, thống kê cho ban tổ chức.

**Giá trị cốt lõi:** mọi sự kiện đều có vị trí chính xác, đúng địa giới
hành chính, và thông tin đáng tin cậy.

## 2. Giả định cần xác nhận

Một số điểm chưa được chốt, nên kế hoạch này tạm dùng các giả định sau.
Bạn hãy sửa nếu chưa đúng.

  ------------------------------------------------------------------------
  \#      Giả định                                         Trạng thái
  ------- ------------------------------------------------ ---------------
  A1      \"KOL\" là chủ địa điểm có sức ảnh hưởng, có thể Đã xác nhận
          là chủ quán, nhà hát, khu vui chơi. Vai trò này  
          được gộp thành **Chủ địa điểm / KOL**.           

  A4      **Dự án demo**, tự phát triển bằng Claude Code   Đã xác nhận
          nên tiến độ nhanh, không cần đội ngũ lớn hay     
          ngân sách cố định. Các giai đoạn ở mục 9 chỉ là  
          thứ tự ưu tiên.                                  

  A5      Dùng địa giới hành chính **34 tỉnh/thành**,      Đã chốt
          chính quyền 2 cấp (tỉnh, xã/phường), không còn   
          cấp quận/huyện. Cần xác minh nguồn dữ liệu ranh  
          giới chính thức.                                 
  ------------------------------------------------------------------------

## 3. Đối tượng và vai trò

  -----------------------------------------------------------------------
  Vai trò              Nhu cầu chính     Tính năng chính
  -------------------- ----------------- --------------------------------
  **Người nổi tiếng**  Công bố sự kiện   Hồ sơ có **huy hiệu xác thực**,
                       của mình, tiếp    đăng sự kiện (show, fan meeting,
                       cận người hâm mộ  ký tặng), lịch trình tour, thông
                                         báo cho người theo dõi

  **Chủ địa điểm /     Thu hút khách     Trang địa điểm, đăng sự kiện và
  KOL**                hàng cho địa điểm khuyến mãi, bán vé, check-in,
                       của mình          thống kê khách, trả lời đánh giá

  **Người dùng         Tìm sự kiện, đánh Tìm theo bản đồ và thời gian,
  thường**             giá, cập nhật     \"quanh đây\", đánh giá, báo cáo
                       thông tin         thông tin sai, check-in

  **Cơ quan nhà nước** Công bố thông tin Tài khoản xác thực, thông báo
                       chính thức        văn hóa lễ hội

  **Quản trị viên**    Giữ chất lượng    Duyệt nội dung, xác thực tài
                       nền tảng          khoản, xử lý báo cáo, nhật ký
                                         kiểm toán
  -----------------------------------------------------------------------

**Quy tắc xác thực:** tài khoản người nổi tiếng và cơ quan nhà nước phải
được xác minh thủ công (giấy tờ, kênh liên hệ chính thức), bắt buộc đăng
nhập hai lớp (2FA) để chống mạo danh.

## 4. Mục tiêu 1: Chuyển đổi số cho chính phủ

### 4.1 Bản đồ hành chính tương tác

Bản đồ chia theo **34 tỉnh/thành mới nhất**; mỗi tỉnh là một vùng riêng.

-   **Cấp tỉnh, rê chuột (hover):** khi xem toàn quốc, rê chuột vào một
    tỉnh thì tỉnh đó được làm nổi bật (viền sáng, tăng độ đậm lớp phủ)
    và hiện nhãn tên tỉnh tại con trỏ.

-   **Bấm vào tỉnh:** mở bảng thông tin tỉnh có **dân số** và **diện
    tích** (mục 4.2) cùng **danh sách sự kiện của tỉnh đó, gồm cả sự
    kiện của mọi xã/phường trong tỉnh**, đồng thời chuyển sang cấp
    xã/phường của tỉnh.

-   **Cấp xã/phường, rê chuột (hover):** sau khi đã chọn tỉnh, rê chuột
    vào từng xã/phường thì xã/phường đó được làm nổi bật và hiện tên. Có
    nút quay lại xem toàn quốc.

-   **Bấm vào xã/phường:** hiện **danh sách sự kiện của xã/phường đó**.

-   **Thiết bị cảm ứng** không có hover: chạm một lần để xem tên, chạm
    lần hai để chọn.

```{=html}
<!-- -->
```
-   Hiển thị ranh giới quốc gia, tỉnh/thành và xã/phường, **đầy đủ quần
    đảo Hoàng Sa và Trường Sa** theo đúng chuẩn bản đồ quốc gia.

-   Khi bấm vào một tỉnh: tô sáng tỉnh đó, làm mờ các tỉnh khác, tự động
    căn khung hình (fitBounds) và mở **bảng thông tin tỉnh**.

-   Cấp zoom: quốc gia và tỉnh (zoom 5--7), xã/phường (zoom 8--11),
    đường phố và địa chỉ (zoom 12+). Cần chỉnh lại theo mô hình 2 cấp.

### 4.2 Bảng thông tin tỉnh

  -----------------------------------------------------------------------
  Nhóm       Nội dung                             Nguồn đề xuất
  ---------- ------------------------------------ -----------------------
  Cơ bản     Tên, mã hành chính, dân số, diện     Nghị quyết
             tích, mật độ dân số, trung tâm hành  202/2025/QH15 (xem mục
             chính                                4.3)

  Hành chính Số xã/phường, đơn vị trực thuộc      Bộ dữ liệu hành chính
                                                  34 tỉnh/thành (xem mục
                                                  4.3)

  Sự kiện    Số sự kiện đang diễn ra và sắp diễn  Hệ thống nội bộ
             ra trong tỉnh, sự kiện nổi bật       

  Thông báo  Thông báo chính thức từ cơ quan nhà  Tài khoản Gov đã xác
             nước của tỉnh                        thực
  -----------------------------------------------------------------------

Mỗi chỉ số cần ghi rõ **năm và nguồn dữ liệu**. Dữ liệu có thể thay đổi
sau sáp nhập nên cần cơ chế cập nhật định kỳ.

### 4.3 Nguồn dữ liệu

Dữ liệu lấy từ nguồn công khai, ưu tiên bộ dữ liệu có sẵn để nhập thẳng
vào PostGIS.

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Dữ liệu          Nguồn                                                                                                                           Ghi chú
  ---------------- ------------------------------------------------------------------------------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------
  Danh sách 34     [vietnamese-provinces-database](https://github.com/thanglequoc/vietnamese-provinces-database/releases) (giấy phép MIT)          Theo Quyết định 19/2025/QĐ-TTg, có cập nhật đến tháng 9/2026 (v5.2.0)
  tỉnh/thành, mã                                                                                                                                   
  hành chính,                                                                                                                                      
  3.321 xã/phường                                                                                                                                  

  Ranh giới        Cùng bộ dữ liệu trên (thư mục json/geojson/), gốc từ sapnhap.bando.com.vn của Nhà xuất bản Tài nguyên -- Môi trường và Bản đồ   Đã vá Hoàng Sa (thuộc Đà Nẵng) và Trường Sa (thuộc Khánh Hòa); có thuộc tính areaKm2
  GeoJSON tỉnh và  Việt Nam                                                                                                                        
  xã/phường, gồm                                                                                                                                   
  Hoàng Sa và                                                                                                                                      
  Trường Sa                                                                                                                                        

  Dân số và diện   Nghị quyết 202/2025/QH15, tổng hợp tại [Thư viện Pháp                                                                           Ví dụ
  tích             luật](https://thuvienphapluat.vn/banan/tin-tuc/danh-sach-34-tinh-thanh-moi-nhat-tu-1262025-theo-nghi-quyet-2022025qh15-16464)   ([nguồn](https://amilawfirm.com/danh-sach-chinh-thuc-34-tinh-thanh-kem-theo-ban-do-moi-nhat-tu-ngay-01-7-2025-sau-sap-nhap/)):
                                                                                                                                                   TP. Hồ Chí Minh 14.002.598 người, 6.772,6 km²; Hà Nội 8.807.523 người, 3.359,84 km²

  Nguồn dự phòng   [Free-GIS-Data](https://github.com/nguyenduy1133/Free-GIS-Data)                                                                 Ranh giới 34 tỉnh/thành và cấp xã
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**Lưu ý:**

-   Dân số và diện tích là số liệu tại thời điểm sắp xếp (theo nghị
    quyết), không phải số mới nhất. Ghi rõ năm trên giao diện và thay
    bằng số liệu của Cục Thống kê khi có.

-   Một số tỉnh đã đổi tên gọi trong năm 2026: Quảng Ninh và Bắc Ninh
    được chuyển thành thành phố trực thuộc trung ương (hiệu lực từ 1/9
    và 20/9/2026). Luôn lấy tên từ bộ dữ liệu, không viết cứng trong mã.

-   Kiểm tra điều khoản sử dụng của dữ liệu bản đồ gốc trước khi công
    khai ứng dụng.

## 5. Mục tiêu 2: Chuyển đổi số cho sự kiện

### 5.1 Đăng và quản lý sự kiện

-   Tạo sự kiện: tên, mô tả, ảnh, thời gian, địa điểm, giá vé, danh mục.

-   Ghim vị trí chính xác: tìm kiếm địa chỉ gợi ý, kéo thả ghim trên bản
    đồ nhỏ, nút lấy vị trí GPS.

-   **Kiểm tra điểm nằm trong ranh giới** (PostGIS ST_Covers) để ngăn
    ghim nhầm địa phận, tự gán mã tỉnh và xã/phường.

-   Hỗ trợ sự kiện lặp lại (hằng tuần, hằng tháng) và chuỗi sự kiện
    (tour nhiều điểm).

-   Hỗ trợ sự kiện di chuyển: vẽ tuyến đường hoặc chuỗi điểm dừng kèm
    mốc giờ (diễu hành, marathon).

-   Trạng thái tự tính từ thời gian: Sắp diễn ra, Đang diễn ra (Live),
    Đã kết thúc.

-   Quy trình duyệt: Gov tự động duyệt; người nổi tiếng và chủ địa điểm
    đã xác thực duyệt nhanh; tài khoản mới duyệt thủ công.

### 5.2 Bán vé

-   **Giai đoạn đầu:** gắn liên kết bán vé ngoài (đối tác bán vé), chưa
    tự xử lý thanh toán để giảm rủi ro.

-   **Giai đoạn sau:** tự bán vé qua cổng thanh toán (ví dụ VNPay, MoMo,
    ZaloPay), mã vé QR, hoàn tiền, đối soát doanh thu cho ban tổ chức.

-   Cần kiểm tra các yêu cầu pháp lý về thương mại điện tử, hóa đơn điện
    tử và thuế khi nền tảng trực tiếp thu tiền.

### 5.3 Check-in

-   Check-in bằng **quét mã QR vé** tại cổng (ứng dụng cho nhân viên ban
    tổ chức) hoặc bằng **vị trí GPS** (bán kính theo địa điểm) với người
    dùng thường.

-   Check-in hợp lệ là điều kiện để viết đánh giá, giúp chống đánh giá
    ảo.

-   Chống gian lận: giới hạn tần suất, kiểm tra tính hợp lý của vị trí,
    mỗi vé chỉ quét một lần.

### 5.4 Thống kê cho ban tổ chức

  -----------------------------------------------------------------------
  Chỉ số                                      Mô tả
  ------------------------------------------- ---------------------------
  Lượt xem, lượt lưu sự kiện                  Mức độ quan tâm

  Vé bán, doanh thu                           Hiệu quả bán hàng

  Lượt check-in, tỷ lệ tham dự                Số người thực sự đến

  Đánh giá, điểm trung bình, từ khóa nổi bật  Chất lượng cảm nhận

  Nguồn truy cập, khu vực người xem           Thu hút khách từ đâu
  -----------------------------------------------------------------------

### 5.5 Chỉ đường đến sự kiện

Bấm vào bất kỳ sự kiện nào (điểm trên bản đồ hoặc dòng trong danh sách)
sẽ mở thẻ sự kiện có nút **Chỉ đường**. Bấm nút này sẽ mở **Google
Maps** với điểm đến là vị trí sự kiện, xuất phát từ vị trí hiện tại của
người dùng.

-   Dùng liên kết chỉ đường của Google Maps (Maps URLs) với tọa độ của
    sự kiện làm điểm đến. Không cần khóa API.

-   Để trống điểm xuất phát để Google Maps tự dùng vị trí hiện tại của
    người dùng.

-   Cho chọn phương tiện (xe máy, ô tô, đi bộ) qua tham số travelmode
    của liên kết; mặc định là xe máy nếu khu vực hỗ trợ.

-   Trên điện thoại liên kết mở thẳng ứng dụng Google Maps, trên máy
    tính mở trong tab mới.

-   Sự kiện di chuyển (diễu hành, marathon): điểm đến là điểm xuất phát
    của tuyến.

-   Ứng dụng của mình không cần lấy hay lưu vị trí của người dùng.

**Để sau:** vẽ tuyến ngay trong ứng dụng bằng dịch vụ định tuyến (ví dụ
OSRM, Valhalla, OpenRouteService hoặc Goong) và thêm Apple Maps.

### 5.6 Quét sự kiện gần nhất (Quanh đây)

Nút **Quanh đây** quét các sự kiện gần vị trí hiện tại của người dùng và
cho thấy sự kiện gần nhất trước.

-   Lấy vị trí hiện tại qua trình duyệt (cần HTTPS và người dùng cho
    phép). Nếu không có vị trí, người dùng nhập địa chỉ hoặc chọn một
    điểm trên bản đồ.

-   Quét trong bán kính chọn được, từ 1 km đến 5 km.

-   Kết quả xếp từ gần đến xa, mỗi dòng ghi khoảng cách. Sự kiện gần
    nhất nằm đầu danh sách và được tô nổi trên bản đồ; bản đồ tự căn
    khung theo bán kính quét.

-   Mặc định chỉ hiện sự kiện đang diễn ra hoặc sắp diễn ra. Kết hợp
    được với bộ lọc thời gian (đang diễn ra, tối nay, cuối tuần).

-   Bấm vào một kết quả để mở thẻ sự kiện, từ đó bấm **Chỉ đường** (mục
    5.5).

-   Nếu không có sự kiện nào trong bán kính: gợi ý tăng bán kính, hoặc
    hiện sự kiện gần nhất bất kể khoảng cách.

-   Kỹ thuật: truy vấn bằng ST_DWithin trên cột geography có chỉ mục
    GiST, sắp xếp theo khoảng cách. Tọa độ người dùng chỉ gửi lên để
    truy vấn, không lưu.

## 6. Đánh giá và bot hỗ trợ xoa dịu

**Nguyên tắc:** đánh giá của người dùng là công khai và trung thực. Bot
**không xóa, không ẩn, không sửa** đánh giá. Chỉ xử lý nội dung vi phạm
quy định (spam, ngôn từ thù ghét, đánh giá không liên quan) thông qua
quản trị viên, có ghi nhật ký minh bạch.

**Luồng xử lý đánh giá tiêu cực** (ví dụ từ 2 sao trở xuống):

1.  Hệ thống phát hiện đánh giá tiêu cực (điểm sao và phân tích cảm
    xúc).

2.  **Bot phản hồi đồng cảm**, ghi rõ là \"Trợ lý tự động\": ghi nhận
    trải nghiệm không tốt, cảm ơn góp ý, cho biết chủ địa điểm sẽ được
    thông báo. Bot **không hứa hẹn** bồi thường, giảm giá hay xin lỗi
    thay cho chủ địa điểm khi chưa được ủy quyền.

3.  **Chuyển tiếp ngay cho chủ địa điểm** kèm tóm tắt vấn đề, mức độ ưu
    tiên và gợi ý câu trả lời.

4.  Chủ địa điểm trả lời công khai. Nếu quá hạn (ví dụ 48 giờ), hệ thống
    nhắc lại.

5.  Nếu người dùng cập nhật đánh giá sau khi được xử lý, giữ nguyên cả
    lịch sử.

6.  Đánh giá chứa nội dung an toàn nghiêm trọng (ví dụ mất an toàn, quấy
    rối) được chuyển lên quản trị viên.

**Chỉ số đo:** tỷ lệ chủ địa điểm phản hồi, thời gian phản hồi trung
bình, tỷ lệ đánh giá được người dùng chủ động nâng điểm.

## 7. Kiến trúc kỹ thuật

  ------------------------------------------------------------------------
  Lớp           Đề xuất                      Ghi chú
  ------------- ---------------------------- -----------------------------
  Giao diện     Next.js + React, PWA,        SSR cho trang sự kiện để tối
                MapLibre GL JS               ưu SEO

  Backend       Chọn **một** trong Go hoặc   REST, WebSocket chỉ khi cần
                Node.js (theo năng lực đội)  cập nhật trực tiếp

  CSDL          PostgreSQL + PostGIS         Tọa độ WGS84 (EPSG:4326), lưu
                                             boundary_version

  Bản đồ nền    OpenStreetMap qua            **Cần chốt**
                OpenMapTiles/Protomaps hoặc  
                nhà cung cấp tile            

  Geocoding     Goong, Google hoặc           **Cần chốt**, chất lượng địa
                Nominatim/Pelias tự dựng     chỉ VN là rủi ro

  Gom cụm       Supercluster (client hoặc    Đủ dùng cho quy mô ban đầu
                server)                      

  Tile vector   Martin hoặc Tegola (giai     Chỉ cần khi số điểm lớn
                đoạn 2)                      

  Bộ nhớ đệm    Redis                        Cho tìm kiếm lân cận và phiên

  Lưu ảnh       Object storage + CDN         Kiểm duyệt ảnh, xóa EXIF vị
                                             trí khi công khai

  Đăng nhập     OTP số điện thoại, Zalo,     Theo quy định định danh tài
                Google                       khoản

  Thanh toán    Cổng thanh toán nội địa      Giai đoạn 2

  Bot           Mô hình ngôn ngữ lớn (LLM)   Có kiểm soát nội dung và
                qua API                      chuyển tiếp

  Vận hành      CI/CD, giám sát, sao lưu,    Máy chủ đặt trong nước nếu
                ghi nhật ký                  pháp luật yêu cầu
  ------------------------------------------------------------------------

## 8. Mô hình dữ liệu chính

-   **User:** vai trò, trạng thái xác thực, điểm uy tín.

-   **Organization/Venue:** chủ sở hữu, vị trí (point), giờ mở cửa, danh
    mục.

-   **Event:** người đăng, địa điểm, start_at, end_at, múi giờ, quy tắc
    lặp, trạng thái duyệt, province_id, ward_id, boundary_version.

-   **EventRoute:** LineString hoặc chuỗi điểm dừng cho sự kiện di
    chuyển.

-   **Ticket / Order / CheckIn:** loại vé, đơn hàng, mã QR, thời điểm và
    cách check-in.

-   **Review:** điểm sao, nội dung, người viết, điều kiện check-in,
    trạng thái, lịch sử chỉnh sửa.

-   **BotAction:** lần phản hồi của bot, nội dung, người nhận chuyển
    tiếp, trạng thái xử lý.

-   **Boundary:** đa giác tỉnh và xã/phường, phiên bản, nguồn.

-   **ProvinceStat:** chỉ số (dân số, diện tích\...), năm, nguồn.

-   **Notice:** thông báo chính thức (Gov), loại, phạm vi địa lý, thời
    hạn.

-   **Report / ModerationLog / AuditLog:** báo cáo vi phạm và nhật ký xử
    lý.

## 9. Lộ trình triển khai (bản demo)

### Giai đoạn 1: MVP

-   Nạp dữ liệu ranh giới mới nhất, bản đồ nền, hiển thị và hiệu ứng
    focus tỉnh.

-   **Bảng thông tin tỉnh** (dân số, diện tích, kèm nguồn).

-   Đăng ký, đăng nhập, xác thực người nổi tiếng và chủ địa điểm (thủ
    công).

-   Đăng sự kiện và địa điểm, ghim vị trí có kiểm tra ranh giới.

-   Bộ lọc thời gian, trạng thái Live, tìm kiếm, chỉ đường đến sự kiện
    và \"quanh đây\".

-   Quản trị viên: duyệt nội dung cơ bản.

-   **Demo** với dữ liệu sự kiện mẫu.

### Giai đoạn 2: Giao dịch và tương tác

-   Đánh giá có điều kiện check-in, **bot xoa dịu và chuyển tiếp** cho
    chủ địa điểm.

-   Check-in QR và GPS, ứng dụng quét vé cho ban tổ chức.

-   Bán vé (liên kết ngoài, sau đó thanh toán nội bộ).

-   Bảng thống kê cho người nổi tiếng và chủ địa điểm.

-   Tài khoản Gov, kênh thông báo.

-   Thông báo đẩy và theo dõi người nổi tiếng.

### Giai đoạn 3: Mở rộng

-   Mở rộng thêm tỉnh/thành, tối ưu hiệu năng (vector tile, CDN).

-   Sự kiện di chuyển (tuyến đường), sự kiện lặp phức tạp.

-   Cộng đồng: bình chọn, báo cáo, điểm uy tín.

-   Gamification (Dấu chân cá nhân, danh hiệu) nếu số liệu cho thấy cần
    thiết.

-   Kiểm thử tải, kiểm tra bảo mật, hoàn thiện pháp lý.

## 10. Rủi ro và pháp lý

  -----------------------------------------------------------------------
  Rủi ro                            Giảm thiểu
  --------------------------------- -------------------------------------
  **Thiếu dữ liệu ban đầu** (không  Gieo dữ liệu mẫu thủ công, hợp tác
  có sự kiện nên không có người     ban tổ chức và người nổi tiếng, thu
  dùng)                             thập từ nguồn công khai có phép

  Dữ liệu hành chính lỗi thời hoặc  Dùng nguồn chính thức, lưu phiên bản,
  sai                               kiểm tra định kỳ

  Hiển thị bản đồ chủ quyền sai     Dùng bộ dữ liệu biên giới chuẩn, tự
                                    quản bản đồ nền thay vì phụ thuộc nhà
                                    cung cấp nước ngoài

  Mạo danh người nổi tiếng hoặc cơ  Xác minh thủ công, 2FA, huy hiệu, quy
  quan                              trình khiếu nại

  Đánh giá ảo, tin rác              Chỉ cho đánh giá sau check-in, giới
                                    hạn tần suất, báo cáo vi phạm

  Giả mạo GPS                       Kết hợp nhiều tín hiệu, điểm uy tín,
                                    rà soát thủ công khi bất thường

  Dữ liệu cá nhân và vị trí         Xin đồng ý rõ ràng, tối thiểu hóa dữ
                                    liệu, mã hóa, thời hạn lưu trữ

  Nội dung vi phạm pháp luật        Quy trình kiểm duyệt và gỡ nội dung,
                                    nhật ký

  Thanh toán và thuế                Dùng cổng thanh toán được cấp phép,
                                    tham vấn kế toán và pháp lý
  -----------------------------------------------------------------------

**Lưu ý pháp lý:** cần tham vấn chuyên gia về quy định bản đồ và đo đạc,
an ninh mạng, định danh tài khoản, bảo vệ dữ liệu cá nhân, thương mại
điện tử và quảng cáo trước khi ra mắt. Kế hoạch này không thay thế tư
vấn pháp lý.

## 11. Chỉ số thành công (KPI)

  -----------------------------------------------------------------------
  Nhóm              KPI mẫu (cần đặt mục tiêu số)
  ----------------- -----------------------------------------------------
  Nội dung          Số sự kiện và địa điểm đang hoạt động ở khu vực chạy
                    thử

  Người dùng        Người dùng hoạt động hằng tháng, tỷ lệ quay lại

  Đối tác           Số người nổi tiếng và chủ địa điểm đã xác thực, tỷ lệ
                    đăng sự kiện đều đặn

  Giao dịch         Số vé bán, tỷ lệ check-in

  Chất lượng        Điểm đánh giá trung bình, tỷ lệ phản hồi của chủ địa
                    điểm, thời gian xử lý báo cáo

  Kỹ thuật          Thời gian tải bản đồ, tỷ lệ lỗi, độ sẵn sàng hệ thống
  -----------------------------------------------------------------------
