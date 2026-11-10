"use client";

import { useEffect, useState } from "react";
import { fetchProvinceDetail, type ProvinceDetail } from "@/lib/provinces";

const nf = new Intl.NumberFormat("vi-VN");

// Bảng thông tin tỉnh: dân số, diện tích, mật độ, số xã/phường, kèm năm và nguồn
export default function ProvinceInfo({ code }: { code: string }) {
  const [detail, setDetail] = useState<ProvinceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProvinceDetail(code)
      .then((d) => {
        if (!cancelled) {
          setDetail(d);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) return <p className="text-sm text-red-600">Không tải được thông tin tỉnh: {error}</p>;
  // Dữ liệu cũ của tỉnh trước vẫn còn trong lúc tải tỉnh mới: chỉ hiện khi khớp mã
  if (!detail || detail.code !== code) return <p className="text-sm text-zinc-500">Đang tải thông tin…</p>;

  const { population, areaKm2, density, wards, source } = detail;
  return (
    <section data-testid="province-info" className="space-y-3">
      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Dân số" value={population ? `${nf.format(population.value)} người` : "—"} testId="stat-population" />
        <Stat label="Diện tích" value={areaKm2 ? `${nf.format(areaKm2.value)} km²` : "—"} testId="stat-area" />
        <Stat label="Mật độ" value={density ? `${nf.format(density)} người/km²` : "—"} testId="stat-density" />
        <Stat
          label="Xã/phường"
          value={String(wards.total)}
          hint={[
            wards.phuong && `${wards.phuong} phường`,
            wards.xa && `${wards.xa} xã`,
            wards.dacKhu && `${wards.dacKhu} đặc khu`,
          ]
            .filter(Boolean)
            .join(", ")}
          testId="stat-wards"
        />
      </dl>
      {detail.adminCenter && (
        <p className="text-sm">
          <span className="text-zinc-500">Trung tâm hành chính: </span>
          {detail.adminCenter}
        </p>
      )}
      {source && (
        <p data-testid="stat-source" className="text-xs leading-relaxed text-zinc-500">
          Dân số, diện tích: số liệu năm {population?.year}, nguồn{" "}
          {source.url ? (
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">
              {source.label}
            </a>
          ) : (
            source.label
          )}
          . Đây là số liệu tại thời điểm sắp xếp đơn vị hành chính, chưa phải số mới nhất. Số xã/phường theo ranh
          giới {detail.boundaryVersion}.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-2.5">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd data-testid={testId} className="font-semibold">
        {value}
      </dd>
      {hint && <dd className="text-xs text-zinc-500">{hint}</dd>}
    </div>
  );
}
