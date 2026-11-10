// Lấy thông tin chi tiết của 1 tỉnh cho bảng thông tin, từ API (bảng provinces, wards, province_stats)
import { api } from "./api";

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

export function fetchProvinceDetail(code: string): Promise<ProvinceDetail> {
  return api<ProvinceDetail>(`/api/provinces/${code}`);
}
