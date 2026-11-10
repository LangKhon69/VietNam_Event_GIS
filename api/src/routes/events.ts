import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { HttpError, parse } from "../lib/http.js";
import { TIME_FILTERS, timeRange } from "../lib/time.js";

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
  // Chỉ hiện sự kiện đã được duyệt
  const where = ["e.approval_status = 'approved'"];
  const params: unknown[] = [];
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

  params.push(f.limit);
  const rows = await query(
    `SELECT ${EVENT_COLUMNS} ${EVENT_JOINS} WHERE ${where.join(" AND ")} ${ORDER_SQL} LIMIT $${params.length}`,
    params,
  );
  res.json(rows);
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
