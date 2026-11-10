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
