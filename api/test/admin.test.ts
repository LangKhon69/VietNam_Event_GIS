// Kiểm thử Bước 8: quản trị viên duyệt sự kiện, xác thực người nổi tiếng, nhật ký kiểm duyệt
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { pool } from "../src/db.js";
import { call, futureEvent, removeTestUser, startServer } from "./helpers.js";

let base: string;
let close: () => void;
const stamp = Date.now();
let token = "";
let userId = 0;
let adminToken = "";

before(async () => {
  const { server, url } = await startServer();
  base = url;
  close = () => server.close();
  // Đăng nhập admin bằng tài khoản tạo từ db:seed (ADMIN_EMAIL / ADMIN_PASSWORD trong api/.env)
  const admin = await call(base, "/api/auth/login", {
    method: "POST",
    body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  assert.equal(admin.status, 200, "cần chạy npm run db:seed trước để có tài khoản admin");
  adminToken = admin.body.token;
  const user = await call(base, "/api/auth/register", {
    method: "POST",
    body: { email: `admin-test-${stamp}@example.com`, password: "matkhau123", displayName: "Chủ quán kiểm thử", role: "venue_owner" },
  });
  token = user.body.token;
  userId = user.body.user.id;
});
after(async () => {
  await removeTestUser(userId);
  close();
  await pool.end();
});

test("người thường và khách không vào được trang quản trị", async () => {
  assert.equal((await call(base, "/api/admin/events", { token })).status, 403);
  assert.equal((await call(base, "/api/admin/events")).status, 401);
});

test("admin duyệt sự kiện thì sự kiện hiện công khai, có ghi nhật ký", async () => {
  const posted = await call(base, "/api/events", { method: "POST", token, body: futureEvent(21.0288, 105.8523, stamp) });
  assert.equal(posted.body.approvalStatus, "pending");
  const pending = await call<{ id: number }[]>(base, "/api/admin/events?status=pending", { token: adminToken });
  assert.ok(pending.body.some((e) => e.id === posted.body.id));

  const review = await call(base, `/api/admin/events/${posted.body.id}/review`, {
    method: "POST",
    token: adminToken,
    body: { decision: "approved" },
  });
  assert.equal(review.status, 200);
  const pub = await call<{ id: number }[]>(base, `/api/events?q=${stamp}`);
  assert.deepEqual(pub.body.map((e) => e.id), [posted.body.id]);
  const logs = await call<{ targetId: number; action: string; targetType: string }[]>(base, "/api/admin/logs", { token: adminToken });
  assert.ok(logs.body.some((l) => l.targetType === "event" && l.targetId === posted.body.id && l.action === "approved"));
});

test("admin từ chối sự kiện thì sự kiện không hiện", async () => {
  const posted = await call(base, "/api/events", { method: "POST", token, body: futureEvent(21.0288, 105.8523, stamp, `Bị từ chối ${stamp}`) });
  await call(base, `/api/admin/events/${posted.body.id}/review`, { method: "POST", token: adminToken, body: { decision: "rejected" } });
  const pub = await call<{ title: string }[]>(base, `/api/events?q=${encodeURIComponent(`Bị từ chối ${stamp}`)}`);
  assert.equal(pub.body.length, 0);
});

test("admin duyệt địa điểm", async () => {
  const v = await call(base, "/api/venues", { method: "POST", token, body: { name: `Quán ${stamp}`, lat: 16.0612, lng: 108.2272 } });
  const r = await call(base, `/api/admin/venues/${v.body.id}/review`, { method: "POST", token: adminToken, body: { decision: "approved" } });
  assert.equal(r.body.approvalStatus, "approved");
});

test("admin xác thực chủ địa điểm thì sự kiện sau đó được duyệt ngay", async () => {
  const list = await call<{ id: number }[]>(base, "/api/admin/users", { token: adminToken });
  assert.ok(list.body.some((u) => u.id === userId));
  const v = await call(base, `/api/admin/users/${userId}/verify`, { method: "POST", token: adminToken, body: { verified: true } });
  assert.equal(v.body.isVerified, true);
  const res = await call(base, "/api/events", {
    method: "POST",
    token,
    body: futureEvent(10.7766, 106.7031, stamp, `Show đã xác thực ${stamp}`),
  });
  assert.equal(res.body.approvalStatus, "approved");
  assert.equal(res.body.location.provinceCode, "79");
});

test("không xác thực được tài khoản admin hoặc người dùng thường qua API này", async () => {
  const me = await call(base, "/api/auth/me", { token: adminToken });
  const r = await call(base, `/api/admin/users/${me.body.id}/verify`, { method: "POST", token: adminToken, body: { verified: false } });
  assert.equal(r.status, 404);
});
