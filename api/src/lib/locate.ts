import { query } from "../db.js";

export type Location = {
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  boundaryVersion: string;
};

// Xác định 1 điểm (kinh độ, vĩ độ) thuộc xã/phường và tỉnh nào.
// 1) ST_Covers: đa giác xã/phường "phủ" điểm (tính cả điểm nằm đúng trên đường biên).
// 2) Nếu không trúng (điểm rơi vào khe hở nhỏ do ranh giới đã được đơn giản hóa), lấy
//    xã/phường gần nhất trong vòng 100 m.
// Trả về null nếu điểm nằm ngoài lãnh thổ (ví dụ giữa biển, nước ngoài).
export async function locatePoint(lng: number, lat: number): Promise<Location | null> {
  const rows = await query<Location>(
    `WITH pt AS (SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326) AS g),
     candidates AS (
       -- Lọc thô bằng chỉ mục GiST: các xã/phường trong vòng ~0,002 độ (~200 m)
       SELECT w.*, ST_Covers(w.geom, pt.g) AS covers,
              ST_Distance(w.geom::geography, pt.g::geography) AS meters
       FROM wards w, pt
       WHERE ST_DWithin(w.geom, pt.g, 0.002)
     )
     SELECT c.province_code AS "provinceCode", p.name AS "provinceName",
            c.code AS "wardCode", c.full_name AS "wardName", c.boundary_version AS "boundaryVersion"
     FROM candidates c JOIN provinces p ON p.code = c.province_code
     WHERE c.covers OR c.meters <= 100
     ORDER BY c.covers DESC, c.meters
     LIMIT 1`,
    [lng, lat],
  );
  return rows[0] ?? null;
}
