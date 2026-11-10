import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { query } from "../db.js";
import { HttpError } from "./http.js";

export type Role = "user" | "celebrity" | "venue_owner" | "admin";
export type AuthUser = { id: number; email: string; displayName: string; role: Role; isVerified: boolean };

// Express cho phép gắn thêm thông tin vào req; khai báo để TypeScript biết req.user
declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

// JWT ("vé" đăng nhập): chuỗi có chữ ký, chứa id người dùng; ai sửa nội dung thì chữ ký sai
export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: "7d" });
}

export const USER_COLUMNS = `id, email, display_name AS "displayName", role, is_verified AS "isVerified"`;

// Middleware: đọc header "Authorization: Bearer <token>", nạp người dùng vào req.user (nếu có)
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { sub: string };
    // Đọc lại từ CSDL để vai trò/xác thực luôn mới nhất (admin vừa đổi là có hiệu lực ngay)
    const [user] = await query<AuthUser>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [Number(payload.sub)]);
    if (user) req.user = user;
  } catch {
    // Token sai hoặc hết hạn: coi như chưa đăng nhập
  }
  next();
}

export function requireUser(req: Request): AuthUser {
  if (!req.user) throw new HttpError(401, "Bạn cần đăng nhập");
  return req.user;
}

export function requireAdmin(req: Request): AuthUser {
  const user = requireUser(req);
  if (user.role !== "admin") throw new HttpError(403, "Chỉ quản trị viên được làm việc này");
  return user;
}

/** Quy tắc duyệt: quản trị viên và tài khoản đã xác thực được duyệt ngay, còn lại chờ duyệt thủ công */
export function initialApprovalStatus(user: AuthUser): "approved" | "pending" {
  return user.role === "admin" || user.isVerified ? "approved" : "pending";
}
