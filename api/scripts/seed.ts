// Nạp dữ liệu mẫu: địa điểm và sự kiện. Chạy lại thì xóa dữ liệu mẫu cũ và tạo mới
// (thời gian luôn tính lại theo lúc chạy, để demo có sự kiện đang diễn ra).
import { pool } from "../src/db.js";
import { locatePoint } from "../src/lib/locate.js";
import { events, venues } from "./seed-data.js";

const HOUR = 3600 * 1000;
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("DELETE FROM events");
  await client.query("DELETE FROM venues");

  const venueIds = new Map<string, number>();
  for (const v of venues) {
    // Gán tỉnh và xã/phường tự động bằng ST_Covers, giống hệt khi người dùng đăng
    const loc = await locatePoint(v.lng, v.lat);
    if (!loc) throw new Error(`Địa điểm mẫu "${v.name}" nằm ngoài ranh giới`);
    const { rows } = await client.query(
      `INSERT INTO venues (name, address, category, location, province_code, ward_code, boundary_version, approval_status)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7, $8, 'approved') RETURNING id`,
      [v.name, v.address, v.category, v.lng, v.lat, loc.provinceCode, loc.wardCode, loc.boundaryVersion],
    );
    venueIds.set(v.key, rows[0].id);
    console.log(`  ${v.name} -> ${loc.wardName}, ${loc.provinceName}`);
  }

  const now = Date.now();
  for (const e of events) {
    const venue = venues.find((v) => v.key === e.venue)!;
    const loc = (await locatePoint(venue.lng, venue.lat))!;
    // Làm tròn giờ bắt đầu về phút 0 cho dễ đọc
    const start = new Date(Math.round((now + e.startInHours * HOUR) / (30 * 60 * 1000)) * 30 * 60 * 1000);
    const end = new Date(start.getTime() + e.durationHours * HOUR);
    await client.query(
      `INSERT INTO events (title, description, category, start_at, end_at, venue_id, address, location,
                           province_code, ward_code, boundary_version, ticket_url, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography, $10, $11, $12, $13, 'approved')`,
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
      ],
    );
  }
  await client.query("COMMIT");
  console.log(`Đã tạo ${venues.length} địa điểm, ${events.length} sự kiện mẫu`);
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
  await pool.end();
}
