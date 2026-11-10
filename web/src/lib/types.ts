// Các kiểu dữ liệu dùng chung giữa bản đồ và các bảng thông tin

/** [kinh độ tây, vĩ độ nam, kinh độ đông, vĩ độ bắc] */
export type BBox = [number, number, number, number];

export type ProvinceRef = {
  code: string;
  name: string;
  fullName: string;
  /** Khung để phóng tới: phần đất liền lớn nhất (không gồm đảo xa như Hoàng Sa, Trường Sa) */
  focusBbox: BBox;
};

export type WardRef = {
  code: string;
  name: string;
  fullName: string;
  type: string;
  provinceCode: string;
};
