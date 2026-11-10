// Chuẩn bị ranh giới xã/phường cho web: mỗi tỉnh 1 file web/public/geo/wards/{mã tỉnh}.json,
// để trình duyệt chỉ tải ranh giới của tỉnh đang chọn (không tải 3.321 xã/phường một lần).
// Đồng thời tạo web/public/geo/special-zones.json: điểm đặt nhãn cho các đặc khu (Hoàng Sa, Trường Sa...).
//
// Đầu vào: thư mục giải nén từ vn_provinces_wards_geojson.zip ở data/raw/wards/
// Chạy: node scripts/prepare-wards.mjs
import fs from "node:fs";
import path from "node:path";
import { simplifyGeometry, countPoints } from "./lib/geo-simplify.mjs";

const root = path.resolve(import.meta.dirname, "..");
const inputDir = path.join(root, "data/raw/wards");
const outputDir = path.join(root, "web/public/geo/wards");
const TOLERANCE = 0.0003; // độ, khoảng 30 m: đủ mịn khi phóng vào cấp xã/phường

// Tìm mọi file .geojson nằm trong thư mục con tên "wards"
function findWardFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...findWardFiles(full));
    else if (entry.name.endsWith(".geojson") && path.basename(dir) === "wards") result.push(full);
  }
  return result;
}

// Tên đơn vị lấy từ bộ dữ liệu hành chính (đầy đủ tên, loại xã/phường/đặc khu)
const units = JSON.parse(fs.readFileSync(path.join(root, "data/raw/full_units.json"), "utf8"));
const wardInfo = new Map(units.flatMap((p) => p.Wards.map((w) => [w.Code, w])));

// Điểm đặt nhãn đơn giản: tâm khung bao (bbox) của vòng ngoài lớn nhất
function labelPoint(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let best = null;
  let bestArea = -1;
  for (const poly of polygons) {
    const xs = poly[0].map((c) => c[0]);
    const ys = poly[0].map((c) => c[1]);
    const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    if (area > bestArea) {
      bestArea = area;
      best = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
    }
  }
  return best.map((n) => Math.round(n * 1e5) / 1e5);
}

const byProvince = new Map();
const specialZones = [];
let before = 0;
let after = 0;
const files = findWardFiles(inputDir);
for (const file of files) {
  const feature = JSON.parse(fs.readFileSync(file, "utf8")).features[0];
  const code = String(feature.id ?? feature.properties.code);
  const info = wardInfo.get(code);
  if (!info) throw new Error(`Không tìm thấy thông tin xã/phường mã ${code} (${file})`);
  const geometry = simplifyGeometry(feature.geometry, TOLERANCE);
  before += countPoints(feature.geometry);
  after += countPoints(geometry);
  const out = {
    type: "Feature",
    id: Number(code),
    properties: {
      code,
      name: info.Name,
      fullName: info.FullName,
      type: info.AdministrativeUnitShortName,
      provinceCode: info.ProvinceCode,
    },
    geometry,
  };
  if (!byProvince.has(info.ProvinceCode)) byProvince.set(info.ProvinceCode, []);
  byProvince.get(info.ProvinceCode).push(out);
  if (info.AdministrativeUnitShortName === "Đặc khu") {
    specialZones.push({
      type: "Feature",
      properties: { code, fullName: info.FullName, provinceCode: info.ProvinceCode },
      geometry: { type: "Point", coordinates: labelPoint(feature.geometry) },
    });
  }
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
let totalBytes = 0;
for (const [provinceCode, features] of byProvince) {
  features.sort((a, b) => a.properties.code.localeCompare(b.properties.code));
  const file = path.join(outputDir, `${provinceCode}.json`);
  fs.writeFileSync(file, JSON.stringify({ type: "FeatureCollection", features }));
  totalBytes += fs.statSync(file).size;
}
fs.writeFileSync(
  path.join(root, "web/public/geo/special-zones.json"),
  JSON.stringify({ type: "FeatureCollection", features: specialZones }),
);

const expected = units.reduce((s, p) => s + p.Wards.length, 0);
console.log(`${files.length}/${expected} xã/phường, ${byProvince.size} tỉnh, ${before} -> ${after} điểm`);
console.log(`Tổng ${Math.round(totalBytes / 1024)} KB trong web/public/geo/wards/, ${specialZones.length} đặc khu`);
if (files.length !== expected) process.exitCode = 1;
