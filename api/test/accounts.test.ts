// Kiểm thử Bước 7: đăng ký, đăng nhập, đăng sự kiện/địa điểm có kiểm tra ranh giới ST_Covers
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { pool, query } from "../src/db.js";
import { call, futureEvent, removeTestUser, startServer } from "./helpers.js";

let base: string;
let close: () => void;
const stamp = Date.now();
const email = `test-${stamp}@example.com`;
let token = "";
let userId = 0;

before(async () => {
  const { server, url } = await startServer();
  base = url;
  close = () => server.close();
});
after(async () => {
  await removeTestUser(userId);
  close();
  await pool.end();
});

test("đăng ký người nổi tiếng, mật khẩu được băm", async () => {
  const res = await call(base, "/api/auth/register", {
    method: "POST",
    body: { email, password: "matkhau123", displayName: "Ca sĩ Kiểm Thử", role: "celebrity" },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.role, "celebrity");
  assert.equal(res.body.user.isVerified, false);
  token = res.body.token;
  userId = res.body.user.id;
  const [row] = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [userId]);
  assert.notEqual(row.password_hash, "matkhau123");
  assert.match(row.password_hash, /^\$2[aby]\$/);
});

test("không tự đăng ký được vai trò admin, email trùng bị từ chối, mật khẩu ngắn bị từ chối", async () => {
  const admin = await call(base, "/api/auth/register", {
    method: "POST",
    body: { email: `x-${stamp}@example.com`, password: "matkhau123", displayName: "X", role: "admin" },
  });
  assert.equal(admin.status, 400);
  const dup = await call(base, "/api/auth/register", {
    method: "POST",
    body: { email, password: "matkhau123", displayName: "Trùng" },
  });
  assert.equal(dup.status, 409);
  const short = await call(base, "/api/auth/register", {
    method: "POST",
    body: { email: `y-${stamp}@example.com`, password: "123", displayName: "Y" },
  });
  assert.equal(short.status, 400);
});

test("đăng nhập sai mật khẩu bị từ chối, đúng thì nhận token", async () => {
  const bad = await call(base, "/api/auth/login", { method: "POST", body: { email, password: "sai" } });
  assert.equal(bad.status, 401);
  const ok = await call(base, "/api/auth/login", { method: "POST", body: { email, password: "matkhau123" } });
  assert.equal(ok.status, 200);
  const me = await call(base, "/api/auth/me", { token: ok.body.token });
  assert.equal(me.body.email, email);
  const forged = await call(base, "/api/auth/me", { token: ok.body.token.slice(0, -2) + "xx" });
  assert.equal(forged.status, 401);
});

test("chưa đăng nhập thì không đăng được sự kiện", async () => {
  const res = await call(base, "/api/events", { method: "POST", body: futureEvent(21.0288, 105.8523, stamp) });
  assert.equal(res.status, 401);
});

test("ghim ngoài ranh giới (giữa biển) bị từ chối", async () => {
  const res = await call(base, "/api/events", { method: "POST", token, body: futureEvent(14, 111, stamp) });
  assert.equal(res.status, 422);
});

test("giờ kết thúc trước giờ bắt đầu bị từ chối", async () => {
  const body = { ...futureEvent(21.0288, 105.8523, stamp), endAt: new Date().toISOString() };
  const res = await call(base, "/api/events", { method: "POST", token, body });
  assert.equal(res.status, 400);
});

test("đăng sự kiện: server tự gán tỉnh, xã/phường; chưa xác thực thì chờ duyệt, chưa hiện công khai", async () => {
  // Gửi kèm mã tỉnh sai để chắc chắn server không tin dữ liệu trình duyệt gửi lên
  const body = { ...futureEvent(21.0288, 105.8523, stamp), provinceCode: "79" };
  const res = await call(base, "/api/events", { method: "POST", token, body });
  assert.equal(res.status, 201);
  assert.equal(res.body.approvalStatus, "pending");
  assert.equal(res.body.location.provinceCode, "01");
  assert.ok(res.body.location.wardCode);
  const pub = await call<{ title: string }[]>(base, `/api/events?q=${stamp}`);
  assert.equal(pub.body.length, 0);
  const mine = await call<{ approvalStatus: string }[]>(base, "/api/me/events", { token });
  assert.equal(mine.body[0].approvalStatus, "pending");
});

test("đăng địa điểm: tự gán tỉnh, chờ duyệt", async () => {
  const res = await call(base, "/api/venues", {
    method: "POST",
    token,
    body: { name: `Quán kiểm thử ${stamp}`, lat: 16.0612, lng: 108.2272 },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.location.provinceCode, "48");
  assert.equal(res.body.approvalStatus, "pending");
});
