// Kiểm thử Bước 5: danh sách sự kiện, lọc, tìm kiếm, trạng thái (dùng dữ liệu mẫu từ db:seed)
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { pool } from "../src/db.js";
import { call, startServer } from "./helpers.js";

type Ev = { id: number; title: string; status: string; provinceCode: string; wardCode: string; startAt: string; endAt: string };

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

test("có sự kiện mẫu ở nhiều tỉnh, đủ 3 trạng thái", async () => {
  const { body } = await call<Ev[]>(base, "/api/events");
  assert.ok(body.length >= 20);
  assert.ok(new Set(body.map((e) => e.provinceCode)).size >= 10);
  assert.deepEqual([...new Set(body.map((e) => e.status))].sort(), ["ended", "live", "upcoming"]);
  // Thứ tự: đang diễn ra trước, đã kết thúc cuối
  const order = body.map((e) => ({ live: 0, upcoming: 1, ended: 2 })[e.status]!);
  assert.deepEqual(order, [...order].sort());
});

test("lọc theo tỉnh và theo xã/phường", async () => {
  const { body: hn } = await call<Ev[]>(base, "/api/events?province=01");
  assert.ok(hn.length >= 3 && hn.every((e) => e.provinceCode === "01"));
  const ward = hn[0].wardCode;
  const { body: inWard } = await call<Ev[]>(base, `/api/events?ward=${ward}`);
  assert.ok(inWard.length >= 1 && inWard.every((e) => e.wardCode === ward));
});

test("bộ lọc 'đang diễn ra' chỉ trả sự kiện live", async () => {
  const { body } = await call<Ev[]>(base, "/api/events?when=live");
  assert.ok(body.length >= 1 && body.every((e) => e.status === "live"));
});

test("bộ lọc 'đã kết thúc' và '7 ngày tới'", async () => {
  const { body: ended } = await call<Ev[]>(base, "/api/events?when=ended");
  assert.ok(ended.length >= 1 && ended.every((e) => e.status === "ended"));
  const { body: week } = await call<Ev[]>(base, "/api/events?when=week");
  const limit = Date.now() + 7 * 24 * 3600 * 1000;
  assert.ok(week.every((e) => new Date(e.startAt).getTime() < limit && new Date(e.endAt).getTime() > Date.now()));
});

test("tìm kiếm không phân biệt dấu", async () => {
  const { body } = await call<Ev[]>(base, "/api/events?q=" + encodeURIComponent("hoa nhac giao huong"));
  assert.ok(body.some((e) => e.title.includes("Hòa nhạc Giao hưởng")));
});

test("tham số sai trả lỗi 400", async () => {
  const { status } = await call(base, "/api/events?when=abc");
  assert.equal(status, 400);
});
