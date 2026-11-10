// Nạp ranh giới tỉnh, xã/phường và thống kê tỉnh vào PostGIS.
// Nguồn: chính các file GeoJSON mà web hiển thị (web/public/geo/), để ranh giới dùng kiểm tra
// ST_Covers trùng khớp với ranh giới người dùng nhìn thấy trên bản đồ.
// Chạy lại được nhiều lần: xóa rồi nạp lại trong 1 giao dịch.
import fs from "node:fs";
import path from "node:path";
import { pool } from "../src/db.js";

const root = path.resolve(import.meta.dirname, "../..");
const readJson = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

type Feature = { properties: Record<string, string>; geometry: unknown };

const provinces = readJson("web/public/geo/provinces.json") as { boundaryVersion: string; features: Feature[] };
const stats = readJson("data/province-stats.json");
const version = provinces.boundaryVersion;
const wardDir = path.join(root, "web/public/geo/wards");

// ST_MakeValid sửa đa giác lỗi (tự cắt nhau sau khi đơn giản hóa); ST_Multi ép về MultiPolygon
const GEOM_SQL = "ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($GEOM), 4326)), 3))";

const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("DELETE FROM province_stats");
  await client.query("DELETE FROM wards");
  await client.query("DELETE FROM provinces");

  const centers = new Map<string, string | null>(stats.provinces.map((p: { code: string; adminCenter: string | null }) => [p.code, p.adminCenter]));
  for (const f of provinces.features) {
    const p = f.properties;
    await client.query(
      `INSERT INTO provinces (code, name, full_name, admin_center, geom, boundary_version)
       VALUES ($1, $2, $3, $4, ${GEOM_SQL.replace("$GEOM", "$5")}, $6)`,
      [p.code, p.name, p.fullName, centers.get(p.code) ?? null, JSON.stringify(f.geometry), version],
    );
  }

  let wardCount = 0;
  if (fs.existsSync(wardDir)) {
    for (const file of fs.readdirSync(wardDir)) {
      const fc = JSON.parse(fs.readFileSync(path.join(wardDir, file), "utf8")) as { features: Feature[] };
      for (const f of fc.features) {
        const w = f.properties;
        await client.query(
          `INSERT INTO wards (code, province_code, name, full_name, type, geom, boundary_version)
           VALUES ($1, $2, $3, $4, $5, ${GEOM_SQL.replace("$GEOM", "$6")}, $7)`,
          [w.code, w.provinceCode, w.name, w.fullName, w.type, JSON.stringify(f.geometry), version],
        );
        wardCount++;
      }
    }
  }

  const { label, year, urls } = stats.source;
  for (const p of stats.provinces) {
    for (const [metric, value] of [["population", p.population], ["area_km2", p.areaKm2]] as const) {
      await client.query(
        `INSERT INTO province_stats (province_code, metric, value, year, source, source_url) VALUES ($1, $2, $3, $4, $5, $6)`,
        [p.code, metric, value, year, label, urls[0]],
      );
    }
  }
  await client.query("COMMIT");
  console.log(`Đã nạp ${provinces.features.length} tỉnh, ${wardCount} xã/phường, thống kê ${stats.provinces.length} tỉnh (ranh giới ${version})`);
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
  await pool.end();
}
