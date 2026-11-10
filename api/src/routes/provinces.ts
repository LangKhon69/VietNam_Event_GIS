import { Router } from "express";
import { query } from "../db.js";
import { HttpError } from "../lib/http.js";

export const provincesRouter = Router();

type StatRow = { metric: string; value: number; year: number; source: string; source_url: string | null };

// GET /api/provinces: danh sách tỉnh kèm số xã/phường (không kèm hình học cho nhẹ)
provincesRouter.get("/", async (_req, res) => {
  const rows = await query(
    `SELECT p.code, p.name, p.full_name AS "fullName", count(w.code) AS "wardCount"
     FROM provinces p LEFT JOIN wards w ON w.province_code = p.code
     GROUP BY p.code ORDER BY p.code`,
  );
  res.json(rows);
});

// GET /api/provinces/:code: thông tin chi tiết 1 tỉnh cho bảng thông tin
provincesRouter.get("/:code", async (req, res) => {
  const [province] = await query(
    `SELECT code, name, full_name AS "fullName", admin_center AS "adminCenter", boundary_version AS "boundaryVersion"
     FROM provinces WHERE code = $1`,
    [req.params.code],
  );
  if (!province) throw new HttpError(404, "Không tìm thấy tỉnh/thành");

  const [wards] = await query(
    `SELECT count(*) AS total,
            count(*) FILTER (WHERE type = 'Phường') AS phuong,
            count(*) FILTER (WHERE type = 'Xã') AS xa,
            count(*) FILTER (WHERE type = 'Đặc khu') AS "dacKhu"
     FROM wards WHERE province_code = $1`,
    [req.params.code],
  );
  // Lấy số liệu mới nhất của từng chỉ số
  const stats = await query<StatRow>(
    `SELECT DISTINCT ON (metric) metric, value, year, source, source_url
     FROM province_stats WHERE province_code = $1 ORDER BY metric, year DESC`,
    [req.params.code],
  );
  const stat = (m: string) => stats.find((s) => s.metric === m);
  const population = stat("population");
  const area = stat("area_km2");

  res.json({
    ...province,
    population: population ? { value: population.value, year: population.year } : null,
    areaKm2: area ? { value: area.value, year: area.year } : null,
    // Mật độ tính từ 2 số trên, không lưu riêng
    density: population && area ? Math.round(population.value / area.value) : null,
    source: population ? { label: population.source, url: population.source_url } : null,
    wards,
  });
});
