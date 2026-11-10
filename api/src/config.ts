// Đọc cấu hình từ biến môi trường (file api/.env). Thiếu biến bắt buộc thì dừng ngay để dễ phát hiện lỗi.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name}. Hãy tạo api/.env từ api/.env.example`);
  return value;
}

export const config = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
};
