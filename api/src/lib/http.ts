import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

// Lỗi có mã HTTP rõ ràng (400 dữ liệu sai, 401 chưa đăng nhập, 403 không có quyền, 404 không thấy...)
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Kiểm tra dữ liệu đầu vào bằng zod; sai thì trả lỗi 400 kèm mô tả trường nào sai
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const detail = result.error.issues.map((i) => `${i.path.join(".") || "dữ liệu"}: ${i.message}`).join("; ");
    throw new HttpError(400, `Dữ liệu không hợp lệ (${detail})`);
  }
  return result.data;
}

// Middleware xử lý lỗi cuối cùng: trả JSON { error } thay vì trang lỗi HTML
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Lỗi máy chủ" });
}
