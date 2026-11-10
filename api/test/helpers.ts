import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";

// Chạy API thật trên 1 cổng ngẫu nhiên để kiểm thử (dùng CSDL thật trong api/.env)
export async function startServer(): Promise<{ server: Server; url: string }> {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, url: `http://localhost:${(server.address() as AddressInfo).port}` };
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
