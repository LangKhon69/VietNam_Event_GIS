import pg from "pg";
import { config } from "./config.js";

// Pool: giữ sẵn vài kết nối tới PostgreSQL để dùng lại, không phải mở kết nối mới cho mỗi yêu cầu
export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

// Kiểu numeric và bigint của PostgreSQL mặc định trả về chuỗi; đổi sang số cho tiện dùng
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await pool.query<T>(text, params);
  return result.rows;
}
