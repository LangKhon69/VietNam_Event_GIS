import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { initialApprovalStatus, requireUser } from "../lib/auth.js";
import { HttpError, parse } from "../lib/http.js";
import { locatePoint } from "../lib/locate.js";
import { EVENT_COLUMNS, EVENT_JOINS } from "./events.js";

// Người dùng đã đăng nhập đăng sự kiện, địa điểm và xem nội dung mình đã đăng
export const submitRouter = Router();

const point = {
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
};

// Kiểm tra vị trí bằng PostGIS ST_Covers và tự gán tỉnh, xã/phường.
// Không tin mã tỉnh/xã do trình duyệt gửi lên: luôn tính lại ở server.
async function locateOrReject(lng: number, lat: number) {
  const loc = await locatePoint(lng, lat);
  if (!loc) throw new HttpError(422, "Vị trí ghim nằm ngoài ranh giới hành chính Việt Nam. Hãy ghim lại.");
  return loc;
}

const venueSchema = z.object({
  name: z.string().trim().min(2).max(150),
  address: z.string().trim().max(250).optional(),
  category: z.string().trim().max(60).optional(),
  ...point,
});

// POST /api/venues
submitRouter.post("/venues", async (req, res) => {
  const user = requireUser(req);
  const body = parse(venueSchema, req.body);
  const loc = await locateOrReject(body.lng, body.lat);
  const [venue] = await query(
    `INSERT INTO venues (name, address, category, location, province_code, ward_code, boundary_version, approval_status, owner_id)
     VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7, $8, $9, $10)
     RETURNING id, name, approval_status AS "approvalStatus"`,
    [body.name, body.address ?? null, body.category ?? null, body.lng, body.lat, loc.provinceCode, loc.wardCode,
      loc.boundaryVersion, initialApprovalStatus(user), user.id],
  );
  res.status(201).json({ ...venue, location: loc });
});

// GET /api/me/venues: địa điểm của tôi (để chọn khi đăng sự kiện)
submitRouter.get("/me/venues", async (req, res) => {
  const user = requireUser(req);
  res.json(
    await query(
      `SELECT v.id, v.name, v.address, v.approval_status AS "approvalStatus",
              ST_Y(v.location::geometry) AS lat, ST_X(v.location::geometry) AS lng
       FROM venues v WHERE v.owner_id = $1 ORDER BY v.created_at DESC`,
      [user.id],
    ),
  );
});

const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Tên sự kiện tối thiểu 3 ký tự").max(150),
    description: z.string().trim().max(3000).default(""),
    category: z.string().trim().min(2).max(60),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    address: z.string().trim().max(250).optional(),
    ticketUrl: z.url("Liên kết vé không hợp lệ").optional().or(z.literal("").transform(() => undefined)),
    venueId: z.number().int().positive().optional(),
    ...point,
  })
  .refine((e) => e.endAt > e.startAt, { message: "Giờ kết thúc phải sau giờ bắt đầu", path: ["endAt"] });

// POST /api/events
submitRouter.post("/events", async (req, res) => {
  const user = requireUser(req);
  const body = parse(eventSchema, req.body);
  if (body.venueId) {
    const [venue] = await query("SELECT 1 FROM venues WHERE id = $1 AND owner_id = $2", [body.venueId, user.id]);
    if (!venue) throw new HttpError(400, "Địa điểm không thuộc về bạn");
  }
  const loc = await locateOrReject(body.lng, body.lat);
  const [event] = await query(
    `INSERT INTO events (title, description, category, start_at, end_at, venue_id, address, location,
                         province_code, ward_code, boundary_version, ticket_url, approval_status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography, $10, $11, $12, $13, $14, $15)
     RETURNING id, approval_status AS "approvalStatus"`,
    [body.title, body.description, body.category, body.startAt, body.endAt, body.venueId ?? null, body.address ?? null,
      body.lng, body.lat, loc.provinceCode, loc.wardCode, loc.boundaryVersion, body.ticketUrl ?? null,
      initialApprovalStatus(user), user.id],
  );
  res.status(201).json({ ...event, location: loc });
});

// GET /api/me/events: sự kiện tôi đã đăng, gồm cả đang chờ duyệt
submitRouter.get("/me/events", async (req, res) => {
  const user = requireUser(req);
  res.json(
    await query(
      `SELECT ${EVENT_COLUMNS}, e.approval_status AS "approvalStatus" ${EVENT_JOINS}
       WHERE e.created_by = $1 ORDER BY e.created_at DESC`,
      [user.id],
    ),
  );
});
