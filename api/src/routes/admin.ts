import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { requireAdmin, USER_COLUMNS } from "../lib/auth.js";
import { HttpError, parse } from "../lib/http.js";
import { EVENT_COLUMNS, EVENT_JOINS } from "./events.js";

// Trang quản trị: duyệt sự kiện/địa điểm, xác thực tài khoản. Mọi thao tác đều ghi nhật ký.
export const adminRouter = Router();

// Mọi đường dẫn /api/admin/* đều yêu cầu quyền quản trị
adminRouter.use((req, _res, next) => {
  requireAdmin(req);
  next();
});

const statusSchema = z.object({ status: z.enum(["pending", "approved", "rejected", "all"]).default("pending") });
const idSchema = z.object({ id: z.coerce.number().int().positive() });
const decisionSchema = z.object({ decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(300).optional() });

async function log(adminId: number, targetType: string, targetId: number, action: string, note?: string) {
  await query(
    `INSERT INTO moderation_logs (admin_id, target_type, target_id, action, note) VALUES ($1, $2, $3, $4, $5)`,
    [adminId, targetType, targetId, action, note ?? null],
  );
}

// GET /api/admin/events?status=pending
adminRouter.get("/events", async (req, res) => {
  const { status } = parse(statusSchema, req.query);
  res.json(
    await query(
      `SELECT ${EVENT_COLUMNS}, e.approval_status AS "approvalStatus", e.created_at AS "createdAt",
              u.display_name AS "createdByName", u.role AS "createdByRole", u.is_verified AS "createdByVerified"
       ${EVENT_JOINS} LEFT JOIN users u ON u.id = e.created_by
       WHERE ($1 = 'all' OR e.approval_status = $1) ORDER BY e.created_at DESC LIMIT 200`,
      [status],
    ),
  );
});

// POST /api/admin/events/:id/review  { decision: "approved" | "rejected" }
adminRouter.post("/events/:id/review", async (req, res) => {
  const admin = requireAdmin(req);
  const { id } = parse(idSchema, req.params);
  const { decision, note } = parse(decisionSchema, req.body);
  const rows = await query(`UPDATE events SET approval_status = $1 WHERE id = $2 RETURNING id`, [decision, id]);
  if (!rows.length) throw new HttpError(404, "Không tìm thấy sự kiện");
  await log(admin.id, "event", id, decision, note);
  res.json({ id, approvalStatus: decision });
});

// GET /api/admin/venues?status=pending
adminRouter.get("/venues", async (req, res) => {
  const { status } = parse(statusSchema, req.query);
  res.json(
    await query(
      `SELECT v.id, v.name, v.address, v.category, v.approval_status AS "approvalStatus",
              p.name AS "provinceName", w.full_name AS "wardName", u.display_name AS "ownerName"
       FROM venues v JOIN provinces p ON p.code = v.province_code
       LEFT JOIN wards w ON w.code = v.ward_code LEFT JOIN users u ON u.id = v.owner_id
       WHERE ($1 = 'all' OR v.approval_status = $1) ORDER BY v.created_at DESC LIMIT 200`,
      [status],
    ),
  );
});

adminRouter.post("/venues/:id/review", async (req, res) => {
  const admin = requireAdmin(req);
  const { id } = parse(idSchema, req.params);
  const { decision, note } = parse(decisionSchema, req.body);
  const rows = await query(`UPDATE venues SET approval_status = $1 WHERE id = $2 RETURNING id`, [decision, id]);
  if (!rows.length) throw new HttpError(404, "Không tìm thấy địa điểm");
  await log(admin.id, "venue", id, decision, note);
  res.json({ id, approvalStatus: decision });
});

// GET /api/admin/users: người nổi tiếng và chủ địa điểm (để xác thực)
adminRouter.get("/users", async (_req, res) => {
  res.json(
    await query(
      `SELECT ${USER_COLUMNS}, created_at AS "createdAt" FROM users
       WHERE role IN ('celebrity', 'venue_owner') ORDER BY is_verified, created_at DESC`,
    ),
  );
});

// POST /api/admin/users/:id/verify  { verified: true | false }
adminRouter.post("/users/:id/verify", async (req, res) => {
  const admin = requireAdmin(req);
  const { id } = parse(idSchema, req.params);
  const { verified } = parse(z.object({ verified: z.boolean() }), req.body);
  const rows = await query(
    `UPDATE users SET is_verified = $1 WHERE id = $2 AND role IN ('celebrity', 'venue_owner') RETURNING ${USER_COLUMNS}`,
    [verified, id],
  );
  if (!rows.length) throw new HttpError(404, "Không tìm thấy tài khoản người nổi tiếng/chủ địa điểm");
  await log(admin.id, "user", id, verified ? "verify" : "unverify");
  res.json(rows[0]);
});

// GET /api/admin/logs: nhật ký kiểm duyệt gần đây
adminRouter.get("/logs", async (_req, res) => {
  res.json(
    await query(
      `SELECT l.id, l.target_type AS "targetType", l.target_id AS "targetId", l.action, l.note,
              l.created_at AS "createdAt", u.display_name AS "adminName"
       FROM moderation_logs l JOIN users u ON u.id = l.admin_id ORDER BY l.created_at DESC LIMIT 50`,
    ),
  );
});
