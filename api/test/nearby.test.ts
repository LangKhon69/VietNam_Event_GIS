// Kiểm thử Bước 6: "Quanh đây" bằng ST_DWithin
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { pool } from "../src/db.js";
import { call, startServer } from "./helpers.js";

type Near = { title: string; status: string; distanceM: number };

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

// Đứng ở Hồ Gươm (tọa độ chỉ dùng trong kiểm thử)
const HOGUOM = "lat=21.0288&lng=105.8523";

test("quanh Hồ Gươm 2 km: xếp gần đến xa, trong bán kính, mặc định không có sự kiện đã kết thúc", async () => {
  const { status, body } = await call<{ events: Near[] }>(base, `/api/events/nearby?${HOGUOM}&radiusKm=2`);
  assert.equal(status, 200);
  assert.ok(body.events.length >= 2);
  const d = body.events.map((e) => e.distanceM);
  assert.deepEqual(d, [...d].sort((a, b) => a - b));
  assert.ok(d.every((m) => m <= 2000));
  assert.ok(body.events.every((e) => e.status !== "ended"));
});

test("bán kính lớn hơn thì có nhiều kết quả hơn hoặc bằng", async () => {
  const small = await call<{ events: Near[] }>(base, `/api/events/nearby?${HOGUOM}&radiusKm=1`);
  const big = await call<{ events: Near[] }>(base, `/api/events/nearby?${HOGUOM}&radiusKm=5`);
  assert.ok(big.body.events.length >= small.body.events.length);
  // Mỹ Đình cách Hồ Gươm khoảng 9 km nên không nằm trong 5 km
  assert.ok(!big.body.events.some((e) => e.title.includes("chạy đêm")));
});

test("không có gì trong bán kính thì gợi ý sự kiện gần nhất", async () => {
  // Một điểm ở Lai Châu, không có sự kiện mẫu nào gần
  const { body } = await call<{ events: Near[]; nearest: Near | null }>(base, "/api/events/nearby?lat=22.39&lng=103.47&radiusKm=5");
  assert.equal(body.events.length, 0);
  assert.ok(body.nearest && body.nearest.distanceM > 5000);
});

test("bán kính ngoài khoảng 1–5 km bị từ chối", async () => {
  const { status } = await call(base, `/api/events/nearby?${HOGUOM}&radiusKm=50`);
  assert.equal(status, 400);
});
