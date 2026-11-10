// Gộp 34 file GeoJSON tỉnh (data/raw/provinces/*.geojson) thành 1 file nhẹ cho web:
// web/public/geo/provinces.json. Chỉ giữ các thuộc tính cần dùng.
//
// Chạy: node scripts/prepare-provinces.mjs
import fs from "node:fs";
import path from "node:path";
import { simplifyGeometry, countPoints } from "./lib/geo-simplify.mjs";

const root = path.resolve(import.meta.dirname, "..");
const inputDir = path.join(root, "data/raw/provinces");
const outputFile = path.join(root, "web/public/geo/provinces.json");
const TOLERANCE = 0.001; // độ, khoảng 100 m: đủ mịn ở mức xem toàn quốc và cấp tỉnh

const metadata = JSON.parse(fs.readFileSync(path.join(root, "data/raw/vn_provinces_metadata.json"), "utf8"));

// Khung bao của đa giác lớn nhất (phần đất liền). Dùng để phóng vào tỉnh mà không bị
// kéo ra tận Hoàng Sa/Trường Sa (đảo vẫn nằm trong tỉnh, chỉ không nằm trong khung phóng).
function largestPolygonBbox(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let best = null;
  for (const poly of polygons) {
    const xs = poly[0].map((c) => c[0]);
    const ys = poly[0].map((c) => c[1]);
    const bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    const area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]);
    if (!best || area > best.area) best = { bbox, area };
  }
  return best.bbox;
}

let before = 0;
let after = 0;
const features = fs
  .readdirSync(inputDir)
  .filter((f) => f.endsWith(".geojson"))
  .sort()
  .map((file) => {
    const feature = JSON.parse(fs.readFileSync(path.join(inputDir, file), "utf8")).features[0];
    const p = feature.properties;
    const geometry = simplifyGeometry(feature.geometry, TOLERANCE);
    before += countPoints(feature.geometry);
    after += countPoints(geometry);
    return {
      type: "Feature",
      // id dạng số để MapLibre dùng được feature-state (trạng thái hover/chọn)
      id: Number(p.code),
      properties: { code: p.code, name: p.name, fullName: p.fullName, areaKm2: p.areaKm2 },
      bbox: feature.bbox,
      focusBbox: largestPolygonBbox(geometry),
      geometry,
    };
  });

const collection = {
  type: "FeatureCollection",
  // Phiên bản ranh giới, sau này lưu vào CSDL dưới tên boundary_version
  boundaryVersion: metadata.DatasetVersion,
  features,
};
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(collection));
const kb = Math.round(fs.statSync(outputFile).size / 1024);
console.log(`${features.length} tỉnh, ${before} -> ${after} điểm, ${kb} KB -> ${path.relative(root, outputFile)}`);
