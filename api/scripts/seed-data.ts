// Dữ liệu mẫu để demo. Các sự kiện là HƯ CẤU (tên, nội dung), chỉ vị trí là các địa điểm có thật.
// Thời gian tính tương đối so với lúc chạy seed (giờ), để lúc nào demo cũng có sự kiện
// đang diễn ra / sắp diễn ra / đã kết thúc. Tỉnh và xã/phường KHÔNG ghi ở đây: được gán tự động
// bằng ST_Covers khi nạp.

export type SeedVenue = { key: string; name: string; address: string; category: string; lat: number; lng: number };
export type SeedEvent = {
  title: string;
  category: string;
  venue: string; // key của venue
  startInHours: number; // so với lúc seed; âm = đã bắt đầu
  durationHours: number;
  description: string;
  ticketUrl?: string;
};

export const venues: SeedVenue[] = [
  { key: "hn-nhahatlon", name: "Nhà hát Lớn Hà Nội", address: "1 Tràng Tiền, Hà Nội", category: "Nhà hát", lat: 21.02437, lng: 105.85766 },
  { key: "hn-hoguom", name: "Phố đi bộ Hồ Gươm", address: "Đinh Tiên Hoàng, Hà Nội", category: "Không gian công cộng", lat: 21.02883, lng: 105.85232 },
  { key: "hn-mydinh", name: "Sân vận động Quốc gia Mỹ Đình", address: "Lê Đức Thọ, Hà Nội", category: "Sân vận động", lat: 21.02045, lng: 105.76376 },
  { key: "hn-hoangthanh", name: "Hoàng thành Thăng Long", address: "19C Hoàng Diệu, Hà Nội", category: "Di tích", lat: 21.03532, lng: 105.84007 },
  { key: "hn-vanmieu", name: "Văn Miếu – Quốc Tử Giám", address: "58 Quốc Tử Giám, Hà Nội", category: "Di tích", lat: 21.02935, lng: 105.83554 },
  { key: "hcm-nhahat", name: "Nhà hát Thành phố Hồ Chí Minh", address: "7 Công Trường Lam Sơn, TP.HCM", category: "Nhà hát", lat: 10.77664, lng: 106.70311 },
  { key: "hcm-nguyenhue", name: "Phố đi bộ Nguyễn Huệ", address: "Nguyễn Huệ, TP.HCM", category: "Không gian công cộng", lat: 10.77375, lng: 106.70383 },
  { key: "hcm-taodan", name: "Công viên Tao Đàn", address: "Trương Định, TP.HCM", category: "Công viên", lat: 10.77437, lng: 106.69236 },
  { key: "hcm-thongnhat", name: "Sân vận động Thống Nhất", address: "138 Đào Duy Từ, TP.HCM", category: "Sân vận động", lat: 10.76061, lng: 106.66326 },
  { key: "dn-caurong", name: "Cầu Rồng", address: "Nguyễn Văn Linh, Đà Nẵng", category: "Không gian công cộng", lat: 16.06118, lng: 108.22722 },
  { key: "dn-bienDong", name: "Công viên Biển Đông", address: "Võ Nguyên Giáp, Đà Nẵng", category: "Công viên", lat: 16.06895, lng: 108.24561 },
  { key: "dn-hoian", name: "Phố cổ Hội An", address: "Trần Phú, Hội An, Đà Nẵng", category: "Di tích", lat: 15.87711, lng: 108.32662 },
  { key: "hue-dainoi", name: "Đại Nội Huế", address: "Đường 23/8, Huế", category: "Di tích", lat: 16.46985, lng: 107.57765 },
  { key: "hp-nhahat", name: "Nhà hát Lớn Hải Phòng", address: "Quảng trường Nhà hát, Hải Phòng", category: "Nhà hát", lat: 20.85844, lng: 106.68431 },
  { key: "ct-ninhkieu", name: "Bến Ninh Kiều", address: "Hai Bà Trưng, Cần Thơ", category: "Không gian công cộng", lat: 10.03428, lng: 105.78779 },
  { key: "kh-quangtruong", name: "Quảng trường 2 tháng 4", address: "Trần Phú, Nha Trang, Khánh Hòa", category: "Không gian công cộng", lat: 12.24418, lng: 109.19620 },
  { key: "ld-lamvien", name: "Quảng trường Lâm Viên", address: "Trần Quốc Toản, Đà Lạt, Lâm Đồng", category: "Không gian công cộng", lat: 11.93913, lng: 108.44478 },
  { key: "qn-baichay", name: "Công viên Sun World Hạ Long", address: "Bãi Cháy, Quảng Ninh", category: "Khu vui chơi", lat: 20.95617, lng: 107.04702 },
  { key: "nb-trangan", name: "Khu du lịch Tràng An", address: "Tràng An, Ninh Bình", category: "Danh thắng", lat: 20.25374, lng: 105.89740 },
  { key: "lc-sapa", name: "Nhà thờ đá Sa Pa", address: "Sa Pa, Lào Cai", category: "Không gian công cộng", lat: 22.33607, lng: 103.84319 },
  { key: "na-vinh", name: "Quảng trường Hồ Chí Minh (Vinh)", address: "Trường Thi, Nghệ An", category: "Không gian công cộng", lat: 18.67193, lng: 105.69256 },
  { key: "dl-bmt", name: "Bảo tàng Thế giới Cà phê", address: "Nguyễn Đình Chiểu, Buôn Ma Thuột, Đắk Lắk", category: "Bảo tàng", lat: 12.69148, lng: 108.05372 },
];

export const events: SeedEvent[] = [
  // Hà Nội
  { title: "Hòa nhạc Giao hưởng Mùa Thu", category: "Âm nhạc", venue: "hn-nhahatlon", startInHours: -1, durationHours: 3, description: "Dàn nhạc giao hưởng biểu diễn các tác phẩm cổ điển và nhạc Việt phối khí mới." },
  { title: "Đêm nhạc acoustic bên Hồ Gươm", category: "Âm nhạc", venue: "hn-hoguom", startInHours: 6, durationHours: 3, description: "Các nhóm nhạc trẻ biểu diễn acoustic miễn phí trên phố đi bộ." },
  { title: "Giải chạy đêm Hà Nội", category: "Thể thao", venue: "hn-mydinh", startInHours: 72, durationHours: 5, description: "Giải chạy 5 km, 10 km và 21 km quanh khu vực Mỹ Đình.", ticketUrl: "https://example.com/ve-giai-chay" },
  { title: "Triển lãm Cổ vật Hoàng thành", category: "Triển lãm", venue: "hn-hoangthanh", startInHours: -48, durationHours: 24 * 14, description: "Trưng bày hiện vật khai quật tại khu di tích Hoàng thành Thăng Long." },
  { title: "Hội chữ Xuân sớm", category: "Văn hóa", venue: "hn-vanmieu", startInHours: -24 * 8, durationHours: 48, description: "Các ông đồ cho chữ, trình diễn thư pháp truyền thống." },
  { title: "Chợ phiên đồ thủ công", category: "Ẩm thực", venue: "hn-hoguom", startInHours: 30, durationHours: 8, description: "Gian hàng đồ thủ công, ẩm thực đường phố và trò chơi dân gian." },
  // TP. Hồ Chí Minh
  { title: "Vở kịch Hồn Trương Ba, da hàng thịt", category: "Sân khấu", venue: "hcm-nhahat", startInHours: 4, durationHours: 2.5, description: "Phiên bản dàn dựng mới của vở kịch kinh điển.", ticketUrl: "https://example.com/ve-kich" },
  { title: "Lễ hội Ẩm thực Đường phố Sài Gòn", category: "Ẩm thực", venue: "hcm-nguyenhue", startInHours: -3, durationHours: 10, description: "Hơn 100 gian hàng món ăn đặc trưng của ba miền." },
  { title: "Hội sách mùa thu", category: "Văn hóa", venue: "hcm-taodan", startInHours: 50, durationHours: 24 * 4, description: "Hội sách với giao lưu tác giả, giảm giá và khu đọc cho thiếu nhi." },
  { title: "Trận giao hữu bóng đá cộng đồng", category: "Thể thao", venue: "hcm-thongnhat", startInHours: -24 * 3, durationHours: 3, description: "Trận đấu giao hữu gây quỹ học bổng." },
  { title: "Đêm nhạc EDM trên phố đi bộ", category: "Âm nhạc", venue: "hcm-nguyenhue", startInHours: 96, durationHours: 4, description: "DJ biểu diễn trên sân khấu ngoài trời." },
  // Đà Nẵng
  { title: "Xem cầu Rồng phun lửa", category: "Văn hóa", venue: "dn-caurong", startInHours: 7, durationHours: 1, description: "Cầu Rồng phun lửa và phun nước vào tối cuối tuần." },
  { title: "Lễ hội Âm nhạc Biển", category: "Âm nhạc", venue: "dn-bienDong", startInHours: 75, durationHours: 6, description: "Sân khấu âm nhạc ngoài trời bên bờ biển Mỹ Khê." },
  { title: "Đêm phố cổ thả đèn hoa đăng", category: "Văn hóa", venue: "dn-hoian", startInHours: -2, durationHours: 5, description: "Thả đèn hoa đăng trên sông Hoài, phố cổ tắt đèn điện." },
  // Huế
  { title: "Nhã nhạc Cung đình Huế", category: "Âm nhạc", venue: "hue-dainoi", startInHours: 26, durationHours: 2, description: "Biểu diễn Nhã nhạc, di sản văn hóa phi vật thể." },
  { title: "Triển lãm Áo dài xưa", category: "Triển lãm", venue: "hue-dainoi", startInHours: -24 * 20, durationHours: 24 * 10, description: "Trưng bày áo dài qua các thời kỳ." },
  // Các tỉnh khác
  { title: "Liên hoan Ca múa nhạc Hoa Phượng Đỏ", category: "Âm nhạc", venue: "hp-nhahat", startInHours: 54, durationHours: 3, description: "Liên hoan nghệ thuật của các đoàn ca múa nhạc." },
  { title: "Chợ đêm Ninh Kiều", category: "Ẩm thực", venue: "ct-ninhkieu", startInHours: -1.5, durationHours: 5, description: "Đặc sản miền Tây, đờn ca tài tử bên bến sông." },
  { title: "Festival Biển Nha Trang", category: "Lễ hội", venue: "kh-quangtruong", startInHours: 100, durationHours: 24 * 3, description: "Diễu hành, thể thao bãi biển và đêm nhạc." },
  { title: "Lễ hội Hoa Đà Lạt", category: "Lễ hội", venue: "ld-lamvien", startInHours: 24 * 9, durationHours: 24 * 5, description: "Trưng bày hoa, sắp đặt nghệ thuật và chợ phiên nông sản." },
  { title: "Carnaval Hạ Long", category: "Lễ hội", venue: "qn-baichay", startInHours: 24 * 12, durationHours: 6, description: "Diễu hành đường phố và bắn pháo hoa trên vịnh." },
  { title: "Tuần lễ Du lịch Tràng An", category: "Lễ hội", venue: "nb-trangan", startInHours: -24 * 2, durationHours: 24 * 6, description: "Đi thuyền, trải nghiệm văn hóa cố đô Hoa Lư." },
  { title: "Phiên chợ vùng cao Sa Pa", category: "Văn hóa", venue: "lc-sapa", startInHours: 40, durationHours: 6, description: "Giao lưu văn hóa các dân tộc, khèn và múa xòe." },
  { title: "Hội thảo Khởi nghiệp miền Trung", category: "Hội thảo", venue: "na-vinh", startInHours: -24 * 6, durationHours: 8, description: "Chia sẻ kinh nghiệm khởi nghiệp và kết nối nhà đầu tư." },
  { title: "Lễ hội Cà phê Buôn Ma Thuột", category: "Lễ hội", venue: "dl-bmt", startInHours: 24 * 5, durationHours: 24 * 3, description: "Thưởng lãm cà phê, cồng chiêng Tây Nguyên." },
];
