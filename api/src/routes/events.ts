import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { HttpError, parse } from "../lib/http.js";
import { TIME_FILTERS, type TimeFilter, timeRange } from "../lib/time.js";

export const eventsRouter = Router();

// Trạng thái tính ngay trong SQL từ thời gian, không lưu vào bảng (luôn đúng theo giờ hiện tại)
export const STATUS_SQL = `CASE WHEN now() < e.start_at THEN 'upcoming'
                                WHEN now() <= e.end_at THEN 'live'
                                ELSE 'ended' END`;

// Các cột trả về cho 1 sự kiện (dùng chung cho danh sách, chi tiết, quanh đây)
export const EVENT_COLUMNS = `
  e.id, e.title, e.description, e.category,
  e.start_at AS "startAt", e.end_at AS "endAt", ${STATUS_SQL} AS status,
  ST_Y(e.location::geometry) AS lat, ST_X(e.location::geometry) AS lng,
  e.address, v.name AS "venueName", e.ticket_url AS "ticketUrl",
  e.province_code AS "provinceCode", p.name AS "provinceName",
  e.ward_code AS "wardCode", w.full_name AS "wardName"`;

export const EVENT_JOINS = `
  FROM events e
  JOIN provinces p ON p.code = e.province_code
  LEFT JOIN wards w ON w.code = e.ward_code
  LEFT JOIN venues v ON v.id = e.venue_id`;

// Sắp xếp: đang diễn ra trước, rồi sắp diễn ra (gần nhất trước), cuối cùng là đã kết thúc (mới nhất trước)
const ORDER_SQL = `ORDER BY CASE ${STATUS_SQL} WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,
                   CASE WHEN now() <= e.end_at THEN e.start_at END ASC,
                   e.end_at DESC`;

// Ghép điều kiện WHERE dùng chung cho danh sách và "Quanh đây".
// Giá trị luôn truyền qua tham số $1, $2... (không nối chuỗi) để tránh lỗi SQL injection.
type Filters = { province?: string; ward?: string; q?: string; when: TimeFilter };
function buildWhere(f: Filters, params: unknown[]): string {
  // Chỉ hiện sự kiện đã được duyệt
  const where = ["e.approval_status = 'approved'"];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (f.province) add("e.province_code = ?", f.province);
  if (f.ward) add("e.ward_code = ?", f.ward);
  if (f.q) {
    // Tìm không phân biệt dấu và hoa/thường trong tên, mô tả, địa chỉ, tên địa điểm
    add(
      `unaccent(lower(concat_ws(' ', e.title, e.description, e.address, v.name))) LIKE '%' || unaccent(lower(?)) || '%'`,
      f.q,
    );
  }
  if (f.when === "live") where.push("now() BETWEEN e.start_at AND e.end_at");
  if (f.when === "upcoming") where.push("e.end_at >= now()");
  if (f.when === "ended") where.push("e.end_at < now()");
  const range = timeRange(f.when);
  if (range) {
    // Sự kiện "chạm" khoảng thời gian: bắt đầu trước khi khoảng kết thúc và kết thúc sau khi khoảng bắt đầu
    add("e.start_at < ?", range.to);
    add("e.end_at > ?", range.from);
  }
  return where.join(" AND ");
}

const listSchema = z.object({
  province: z.string().regex(/^\d{2}$/).optional(),
  ward: z.string().regex(/^\d{5}$/).optional(),
  q: z.string().trim().max(100).optional(),
  when: z.enum(TIME_FILTERS).default("all"),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

// GET /api/events?province=01&ward=00004&q=nhạc&when=weekend
eventsRouter.get("/", async (req, res) => {
  const f = parse(listSchema, req.query);
  const params: unknown[] = [];
  const where = buildWhere(f, params);
  params.push(f.limit);
  const rows = await query(
    `SELECT ${EVENT_COLUMNS} ${EVENT_JOINS} WHERE ${where} ${ORDER_SQL} LIMIT $${params.length}`,
    params,
  );
  res.json(rows);
});

const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1, "Bán kính từ 1 km").max(5, "Bán kính tối đa 5 km").default(2),
  // Mặc định chỉ sự kiện đang hoặc sắp diễn ra
  when: z.enum(TIME_FILTERS).default("upcoming"),
  q: z.string().trim().max(100).optional(),
});

// GET /api/events/nearby?lat=..&lng=..&radiusKm=2
// Tọa độ người dùng chỉ dùng để truy vấn, không lưu và không ghi log.
eventsRouter.get("/nearby", async (req, res) => {
  const f = parse(nearbySchema, req.query);
  const params: unknown[] = [f.lng, f.lat];
  const where = buildWhere(f, params);
  const point = "ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography";
  const distance = `ST_Distance(e.location, ${point}) AS "distanceM"`;

  params.push(f.radiusKm * 1000);
  // ST_DWithin trên cột geography (đơn vị mét) dùng được chỉ mục GiST nên rất nhanh
  const events = await query(
    `SELECT ${EVENT_COLUMNS}, ${distance} ${EVENT_JOINS}
     WHERE ${where} AND ST_DWithin(e.location, ${point}, $${params.length})
     ORDER BY "distanceM" LIMIT 100`,
    params,
  );

  // Không có gì trong bán kính: gợi ý sự kiện gần nhất bất kể khoảng cách
  // (toán tử <-> sắp xếp theo khoảng cách, cũng dùng chỉ mục GiST)
  let nearest = null;
  if (events.length === 0) {
    const rows = await query(
      `SELECT ${EVENT_COLUMNS}, ${distance} ${EVENT_JOINS}
       WHERE ${where} ORDER BY e.location <-> ${point} LIMIT 1`,
      params.slice(0, -1),
    );
    nearest = rows[0] ?? null;
  }
  res.json({ radiusKm: f.radiusKm, events, nearest });
});

// GET /api/events/:id
eventsRouter.get("/:id", async (req, res) => {
  const { id } = parse(z.object({ id: z.coerce.number().int().positive() }), req.params);
  const [event] = await query(
    `SELECT ${EVENT_COLUMNS} ${EVENT_JOINS} WHERE e.id = $1 AND e.approval_status = 'approved'`,
    [id],
  );
  if (!event) throw new HttpError(404, "Không tìm thấy sự kiện");
  res.json(event);
});
