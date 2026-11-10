// Kiểm thử Bước 4: ranh giới, thống kê tỉnh, định vị điểm bằng ST_Covers
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { pool, query } from "../src/db.js";
import { call, startServer } from "./helpers.js";

let base: string;
let close: () => void;
before(async () => {
  const { server, url } = await startServer();
  base = url;
  close = () => server.close();
});
after(async () => {
  close();
  await pool.end();
});

test("API sống và PostGIS đã bật", async () => {
  const { status, body } = await call(base, "/api/health");
  assert.equal(status, 200);
  assert.ok(body.postgis);
});

test("có đủ 34 tỉnh và 3.321 xã/phường", async () => {
  const { body } = await call<{ wardCount: number }[]>(base, "/api/provinces");
  assert.equal(body.length, 34);
  assert.equal(body.reduce((s, p) => s + p.wardCount, 0), 3321);
});

test("thông tin tỉnh có dân số, diện tích, mật độ, năm và nguồn", async () => {
  const { body } = await call(base, "/api/provinces/79");
  assert.equal(body.population.value, 14002598);
  assert.equal(body.areaKm2.value, 6772.59);
  assert.equal(body.density, Math.round(14002598 / 6772.59));
  assert.equal(body.population.year, 2025);
  assert.match(body.source.label, /202\/2025\/QH15/);
});

test("điểm giữa Hồ Gươm thuộc Hà Nội", async () => {
  const { status, body } = await call(base, "/api/geo/locate?lat=21.0288&lng=105.8523");
  assert.equal(status, 200);
  assert.equal(body.provinceCode, "01");
  assert.ok(body.wardCode);
});

test("Hoàng Sa thuộc Đà Nẵng, Trường Sa thuộc Khánh Hòa (lấy 1 điểm trên chính đặc khu đó)", async () => {
  const zones = await query<{ province_code: string; lat: number; lng: number; full_name: string }>(
    `SELECT province_code, full_name, ST_Y(ST_PointOnSurface(geom)) AS lat, ST_X(ST_PointOnSurface(geom)) AS lng
     FROM wards WHERE type = 'Đặc khu' AND ST_XMax(geom) > 111.5`,
  );
  assert.ok(zones.length >= 2, "phải có đặc khu ở xa ngoài khơi");
  for (const z of zones) {
    const { body } = await call(base, `/api/geo/locate?lat=${z.lat}&lng=${z.lng}`);
    assert.equal(body.provinceCode, z.province_code, z.full_name);
  }
  assert.deepEqual([...new Set(zones.map((z) => z.province_code))].sort(), ["48", "56"]);
});

test("điểm giữa biển bị từ chối", async () => {
  const { status } = await call(base, "/api/geo/locate?lat=14&lng=111");
  assert.equal(status, 404);
});

test("tọa độ sai định dạng trả lỗi 400", async () => {
  const { status } = await call(base, "/api/geo/locate?lat=abc&lng=105");
  assert.equal(status, 400);
});
