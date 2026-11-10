import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { type AuthUser, requireUser, signToken, USER_COLUMNS } from "../lib/auth.js";
import { HttpError, parse } from "../lib/http.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.email("Email không hợp lệ").transform((s) => s.toLowerCase()),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(100),
  displayName: z.string().trim().min(2, "Tên hiển thị tối thiểu 2 ký tự").max(80),
  // Tự đăng ký chỉ được chọn các vai trò này; "admin" chỉ tạo bằng seed
  role: z.enum(["user", "celebrity", "venue_owner"]).default("user"),
});

// POST /api/auth/register
authRouter.post("/register", async (req, res) => {
  const body = parse(registerSchema, req.body);
  const [exists] = await query("SELECT 1 FROM users WHERE email = $1", [body.email]);
  if (exists) throw new HttpError(409, "Email này đã được đăng ký");
  // bcrypt: băm mật khẩu một chiều, có "muối" ngẫu nhiên; CSDL lộ cũng không đọc ra mật khẩu gốc
  const hash = await bcrypt.hash(body.password, 10);
  const [user] = await query<AuthUser>(
    `INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, $3, $4) RETURNING ${USER_COLUMNS}`,
    [body.email, hash, body.displayName, body.role],
  );
  res.status(201).json({ token: signToken(user.id), user });
});

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  const body = parse(z.object({ email: z.string().trim().toLowerCase(), password: z.string() }), req.body);
  const [row] = await query<AuthUser & { password_hash: string }>(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [body.email],
  );
  // Cùng một thông báo cho "sai email" và "sai mật khẩu" để không lộ email nào đã đăng ký
  if (!row || !(await bcrypt.compare(body.password, row.password_hash))) {
    throw new HttpError(401, "Email hoặc mật khẩu không đúng");
  }
  const { password_hash: _, ...user } = row;
  res.json({ token: signToken(user.id), user });
});

// GET /api/auth/me: người dùng hiện tại (theo token)
authRouter.get("/me", (req, res) => {
  res.json(requireUser(req));
});
