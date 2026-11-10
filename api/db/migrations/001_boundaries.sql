-- Bước 4: ranh giới hành chính và thống kê tỉnh
CREATE EXTENSION IF NOT EXISTS postgis;
-- unaccent: bỏ dấu tiếng Việt khi tìm kiếm ("ca nhac" khớp "ca nhạc")
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Tọa độ WGS84 (EPSG:4326): hệ kinh độ/vĩ độ mà GPS và Google Maps dùng
CREATE TABLE provinces (
  code             text PRIMARY KEY,           -- mã hành chính, ví dụ '01' (Hà Nội)
  name             text NOT NULL,
  full_name        text NOT NULL,
  admin_center     text,                       -- trung tâm chính trị - hành chính
  geom             geometry(MultiPolygon, 4326) NOT NULL,
  boundary_version text NOT NULL              -- phiên bản bộ dữ liệu ranh giới
);
-- Chỉ mục GiST: giúp tìm "điểm nằm trong đa giác nào" nhanh mà không phải duyệt mọi đa giác
CREATE INDEX provinces_geom_idx ON provinces USING gist (geom);

CREATE TABLE wards (
  code             text PRIMARY KEY,
  province_code    text NOT NULL REFERENCES provinces (code),
  name             text NOT NULL,
  full_name        text NOT NULL,
  type             text NOT NULL,              -- Phường / Xã / Đặc khu
  geom             geometry(MultiPolygon, 4326) NOT NULL,
  boundary_version text NOT NULL
);
CREATE INDEX wards_geom_idx ON wards USING gist (geom);
CREATE INDEX wards_province_idx ON wards (province_code);

-- Mỗi chỉ số (dân số, diện tích...) là 1 dòng, luôn kèm năm và nguồn
CREATE TABLE province_stats (
  province_code text NOT NULL REFERENCES provinces (code),
  metric        text NOT NULL,                 -- 'population' | 'area_km2'
  value         numeric NOT NULL,
  year          int NOT NULL,
  source        text NOT NULL,
  source_url    text,
  PRIMARY KEY (province_code, metric, year)
);
