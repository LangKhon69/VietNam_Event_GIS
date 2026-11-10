// Gọi REST API của backend (thư mục api/). Địa chỉ đặt trong web/.env.local (NEXT_PUBLIC_API_URL).
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "vegis_token";

// Vé đăng nhập (JWT) lưu trong localStorage của trình duyệt
export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (token: string) => window.localStorage.setItem(TOKEN_KEY, token),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | null | undefined>;

export async function api<T>(
  path: string,
  options: { method?: string; params?: Params; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const url = new URL(path, API_URL);
  for (const [k, v] of Object.entries(options.params ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "Không kết nối được máy chủ API. Hãy kiểm tra API đã chạy chưa (cd api && npm run dev).");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Lỗi ${res.status}`);
  return data as T;
}
