"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ProvinceRef, WardRef } from "@/lib/types";
import ProvinceInfo from "./ProvinceInfo";

// MapLibre cần đối tượng `window` của trình duyệt nên không render trên server (ssr: false)
const VietnamMap = dynamic(() => import("./map/VietnamMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-zinc-500">Đang tải bản đồ…</div>,
});

// Thành phần gốc của trang bản đồ: giữ trạng thái "đang chọn tỉnh nào, xã/phường nào"
// và truyền xuống cho bản đồ và bảng thông tin.
export default function MapApp() {
  const [province, setProvince] = useState<ProvinceRef | null>(null);
  const [ward, setWard] = useState<WardRef | null>(null);

  const selectProvince = (p: ProvinceRef) => {
    setProvince(p);
    setWard(null);
  };
  const backToCountry = () => {
    setProvince(null);
    setWard(null);
  };

  return (
    <div className="relative h-full w-full">
      <VietnamMap
        selectedProvince={province}
        selectedWardCode={ward?.code ?? null}
        onSelectProvince={selectProvince}
        onSelectWard={setWard}
      />

      {province && (
        <aside
          data-testid="side-panel"
          className="absolute inset-x-0 bottom-0 z-20 flex max-h-[45%] flex-col overflow-hidden rounded-t-xl border border-zinc-200 bg-white shadow-lg md:inset-y-3 md:right-auto md:bottom-3 md:left-3 md:max-h-none md:w-[390px] md:rounded-xl"
        >
          <div className="flex items-start gap-2 border-b border-zinc-100 p-4">
            <div className="flex-1">
              <p className="text-xs tracking-wide text-zinc-500 uppercase">Tỉnh/thành</p>
              <h2 data-testid="province-name" className="text-xl font-bold">
                {province.fullName}
              </h2>
            </div>
            <button
              data-testid="back-button"
              onClick={backToCountry}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              ← Toàn quốc
            </button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <ProvinceInfo code={province.code} />
            {ward ? (
              <div className="rounded-lg bg-sky-50 p-3">
                <p className="text-xs text-sky-700">Đang xem {ward.type.toLowerCase()}</p>
                <p data-testid="ward-name" className="font-semibold">
                  {ward.fullName}
                </p>
                <button onClick={() => setWard(null)} className="mt-1 text-sm text-sky-700 underline">
                  Bỏ chọn, xem cả tỉnh
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Rê chuột hoặc chạm vào một xã/phường để xem tên, bấm để chọn.</p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
