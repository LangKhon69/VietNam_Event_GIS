// Chạy các file SQL trong api/db/migrations theo thứ tự tên (001_, 002_...).
// Bảng schema_migrations ghi lại file nào đã chạy, nên chạy lại lệnh này nhiều lần vẫn an toàn.
import fs from "node:fs";
import path from "node:path";
import { pool } from "../src/db.js";

const dir = path.resolve(import.meta.dirname, "../db/migrations");

await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`);
const done = new Set((await pool.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(file)) continue;
  const client = await pool.connect();
  try {
    // Mỗi file chạy trong 1 giao dịch (transaction): lỗi giữa chừng thì hoàn tác toàn bộ file
    await client.query("BEGIN");
    await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log(`Đã chạy ${file}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
console.log("CSDL đã ở phiên bản mới nhất");
await pool.end();
