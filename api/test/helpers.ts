import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";
import { query } from "../src/db.js";

// Chạy API thật trên 1 cổng ngẫu nhiên để kiểm thử (dùng CSDL thật trong api/.env)
export async function startServer(): Promise<{ server: Server; url: string }> {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, url: `http://localhost:${(server.address() as AddressInfo).port}` };
}

// Dữ liệu 1 sự kiện hợp lệ bắt đầu sau 1 giờ nữa
export const futureEvent = (lat: number, lng: number, stamp: number, title = `Sự kiện kiểm thử ${stamp}`) => ({
  title,
  category: "Âm nhạc",
  startAt: new Date(Date.now() + 3600e3).toISOString(),
  endAt: new Date(Date.now() + 3 * 3600e3).toISOString(),
  lat,
  lng,
});

// Dọn dữ liệu do 1 tài khoản kiểm thử tạo ra
export async function removeTestUser(userId: number) {
  if (!userId) return;
  const [{ exists }] = await query<{ exists: boolean }>("SELECT to_regclass('moderation_logs') IS NOT NULL AS exists");
  if (exists) {
    await query(
      `DELETE FROM moderation_logs WHERE (target_type = 'user' AND target_id = $1)
         OR (target_type = 'event' AND target_id IN (SELECT id FROM events WHERE created_by = $1))
         OR (target_type = 'venue' AND target_id IN (SELECT id FROM venues WHERE owner_id = $1))`,
      [userId],
    );
  }
  await query("DELETE FROM events WHERE created_by = $1", [userId]);
  await query("DELETE FROM venues WHERE owner_id = $1", [userId]);
  await query("DELETE FROM users WHERE id = $1", [userId]);
}

export async function call<T = any>(
  base: string,
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const res = await fetch(base + path, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: res.status, body: (await res.json()) as T };
}
