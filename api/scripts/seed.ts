// Nạp dữ liệu mẫu: tài khoản quản trị, tài khoản demo, địa điểm và sự kiện.
// Chạy lại được: chỉ xóa DỮ LIỆU MẪU cũ (không có người đăng, hoặc do tài khoản demo đăng) rồi tạo mới;
// sự kiện người dùng thật tự đăng được giữ nguyên. Thời gian luôn tính lại theo lúc chạy,
// để demo lúc nào cũng có sự kiện đang diễn ra.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type pg from "pg";
import { pool } from "../src/db.js";
import { locatePoint } from "../src/lib/locate.js";
import { demoUsers, events, pendingVenues, venues } from "./seed-data.js";

const HOUR = 3600 * 1000;
const DEMO_DOMAIN = "@demo.vegis.local";

async function insertVenue(client: pg.PoolClient, v: (typeof venues)[number], status: string, ownerId: number | null) {
  // Gán tỉnh và xã/phường tự động bằng ST_Covers, giống hệt khi người dùng đăng
  const loc = await locatePoint(v.lng, v.lat);
  if (!loc) throw new Error(`Địa điểm mẫu "${v.name}" nằm ngoài ranh giới`);
  const { rows } = await client.query(
    `INSERT INTO venues (name, address, category, location, province_code, ward_code, boundary_version, approval_status, owner_id)
     VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7, $8, $9, $10) RETURNING id`,
    [v.name, v.address, v.category, v.lng, v.lat, loc.provinceCode, loc.wardCode, loc.boundaryVersion, status, ownerId],
  );
  console.log(`  ${v.name} -> ${loc.wardName}, ${loc.provinceName}`);
  return rows[0].id as number;
}

const client = await pool.connect();
try {
  await client.query("BEGIN");

  // 1) Tài khoản quản trị lấy từ api/.env (không viết mật khẩu trong mã)
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error("Thiếu ADMIN_EMAIL / ADMIN_PASSWORD trong api/.env");
  await client.query(
    `INSERT INTO users (email, password_hash, display_name, role, is_verified) VALUES ($1, $2, 'Quản trị viên', 'admin', true)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
    [adminEmail, await bcrypt.hash(adminPassword, 10)],
  );

  // 2) Xóa dữ liệu mẫu cũ
  const demo = `SELECT id FROM users WHERE email LIKE '%${DEMO_DOMAIN}'`;
  await client.query(`DELETE FROM events WHERE created_by IS NULL OR created_by IN (${demo})`);
  await client.query(`DELETE FROM venues WHERE (owner_id IS NULL OR owner_id IN (${demo}))
                      AND id NOT IN (SELECT venue_id FROM events WHERE venue_id IS NOT NULL)`);
  await client.query(`DELETE FROM users WHERE email LIKE '%${DEMO_DOMAIN}'`);

  // 3) Tài khoản demo (người nổi tiếng, chủ địa điểm) CHƯA xác thực, để demo trang quản trị.
  // Mật khẩu ngẫu nhiên không ai biết: các tài khoản này chỉ để hiện trong hàng chờ duyệt.
  const userIds = new Map<string, number>();
  for (const u of demoUsers) {
    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      [`${u.key}${DEMO_DOMAIN}`, await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10), u.displayName, u.role],
    );
    userIds.set(u.key, rows[0].id);
  }

  // 4) Địa điểm đã duyệt + địa điểm chờ duyệt của chủ địa điểm demo
  const venueIds = new Map<string, number>();
  for (const v of venues) venueIds.set(v.key, await insertVenue(client, v, "approved", null));
  for (const v of pendingVenues) venueIds.set(v.key, await insertVenue(client, v, "pending", userIds.get(v.owner)!));

  // 5) Sự kiện
  const now = Date.now();
  for (const e of events) {
    const venue = [...venues, ...pendingVenues].find((v) => v.key === e.venue)!;
    const loc = (await locatePoint(venue.lng, venue.lat))!;
    // Làm tròn giờ bắt đầu về nửa giờ cho dễ đọc
    const start = new Date(Math.round((now + e.startInHours * HOUR) / (30 * 60 * 1000)) * 30 * 60 * 1000);
    const end = new Date(start.getTime() + e.durationHours * HOUR);
    await client.query(
      `INSERT INTO events (title, description, category, start_at, end_at, venue_id, address, location,
                           province_code, ward_code, boundary_version, ticket_url, approval_status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography, $10, $11, $12, $13, $14, $15)`,
      [
        e.title,
        `${e.description} (Sự kiện mẫu để demo)`,
        e.category,
        start,
        end,
        venueIds.get(e.venue),
        venue.address,
        venue.lng,
        venue.lat,
        loc.provinceCode,
        loc.wardCode,
        loc.boundaryVersion,
        e.ticketUrl ?? null,
        e.pendingBy ? "pending" : "approved",
        e.pendingBy ? userIds.get(e.pendingBy) : null,
      ],
    );
  }
  await client.query("COMMIT");
  const pending = events.filter((e) => e.pendingBy).length;
  console.log(
    `Đã tạo tài khoản admin ${adminEmail}, ${demoUsers.length} tài khoản demo, ` +
      `${venues.length + pendingVenues.length} địa điểm, ${events.length} sự kiện mẫu (${pending} chờ duyệt)`,
  );
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
  await pool.end();
}
