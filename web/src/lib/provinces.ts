// Lấy thông tin chi tiết của 1 tỉnh cho bảng thông tin.
// Bước 3: đọc từ file tĩnh public/data/province-stats.json (sẽ chuyển sang API ở Bước 4).

export type ProvinceDetail = {
  code: string;
  name: string;
  fullName: string;
  adminCenter: string | null;
  boundaryVersion: string;
  population: { value: number; year: number } | null;
  areaKm2: { value: number; year: number } | null;
  density: number | null;
  source: { label: string; url: string | null } | null;
  wards: { total: number; phuong: number; xa: number; dacKhu: number };
};

type StatsFile = {
  source: { label: string; year: number; urls: string[] };
  adminSource: { version: string };
  provinces: {
    code: string;
    name: string;
    fullName: string;
    areaKm2: number;
    population: number;
    adminCenter: string | null;
    wardCount: number;
    wardTypes: { phuong: number; xa: number; dacKhu: number };
  }[];
};

let cache: Promise<StatsFile> | null = null;

export async function fetchProvinceDetail(code: string): Promise<ProvinceDetail> {
  cache ??= fetch("/data/province-stats.json").then((r) => r.json());
  const file = await cache;
  const p = file.provinces.find((x) => x.code === code);
  if (!p) throw new Error("Không tìm thấy tỉnh");
  return {
    code: p.code,
    name: p.name,
    fullName: p.fullName,
    adminCenter: p.adminCenter,
    boundaryVersion: file.adminSource.version,
    population: { value: p.population, year: file.source.year },
    areaKm2: { value: p.areaKm2, year: file.source.year },
    density: Math.round(p.population / p.areaKm2),
    source: { label: file.source.label, url: file.source.urls[0] },
    wards: { total: p.wardCount, ...p.wardTypes },
  };
}
