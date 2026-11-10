// Kiểm thử hàm thời gian (không cần CSDL)
import assert from "node:assert/strict";
import { test } from "node:test";
import { eventStatus, timeRange } from "../src/lib/time.js";

test("trạng thái tự tính từ thời gian", () => {
  const start = new Date("2026-11-10T12:00:00Z");
  const end = new Date("2026-11-10T15:00:00Z");
  assert.equal(eventStatus(start, end, new Date("2026-11-10T11:59:00Z")), "upcoming");
  assert.equal(eventStatus(start, end, new Date("2026-11-10T13:00:00Z")), "live");
  assert.equal(eventStatus(start, end, new Date("2026-11-10T15:01:00Z")), "ended");
});

test("'hôm nay' kết thúc lúc nửa đêm giờ Việt Nam", () => {
  // 22:00 ngày 10/11 giờ VN = 15:00 UTC
  const now = new Date("2026-11-10T15:00:00Z");
  const r = timeRange("today", now)!;
  assert.equal(r.to.toISOString(), "2026-11-10T17:00:00.000Z"); // 00:00 ngày 11/11 giờ VN
});

test("'cuối tuần' từ thứ Ba là Thứ Bảy + Chủ Nhật tới", () => {
  // Thứ Ba 10/11/2026, 10:00 giờ VN
  const r = timeRange("weekend", new Date("2026-11-10T03:00:00Z"))!;
  assert.equal(r.from.toISOString(), "2026-11-13T17:00:00.000Z"); // 00:00 Thứ Bảy 14/11 giờ VN
  assert.equal(r.to.toISOString(), "2026-11-15T17:00:00.000Z"); // 00:00 Thứ Hai 16/11 giờ VN
});

test("'cuối tuần' khi đang Chủ Nhật thì là cuối tuần hiện tại", () => {
  const now = new Date("2026-11-15T05:00:00Z"); // 12:00 Chủ Nhật 15/11 giờ VN
  const r = timeRange("weekend", now)!;
  assert.equal(r.from.toISOString(), now.toISOString());
  assert.equal(r.to.toISOString(), "2026-11-15T17:00:00.000Z");
});
