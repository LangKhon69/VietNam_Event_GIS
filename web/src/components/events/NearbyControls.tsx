"use client";

type Props = {
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  hasCenter: boolean;
  picking: boolean;
  locating: boolean;
  error: string | null;
  onUseGps: () => void;
  onPickOnMap: () => void;
};

// Điều khiển "Quanh đây": bán kính 1–5 km, lấy vị trí bằng GPS hoặc chọn 1 điểm trên bản đồ
export default function NearbyControls(p: Props) {
  return (
    <div className="space-y-2 rounded-lg bg-sky-50 p-3">
      <div className="flex flex-wrap gap-2">
        <button data-testid="nearby-gps" onClick={p.onUseGps} className="rounded-lg bg-sky-600 px-3 py-1 text-sm text-white hover:bg-sky-700">
          {p.locating ? "Đang lấy vị trí…" : "📍 Vị trí của tôi"}
        </button>
        <button
          data-testid="nearby-pick"
          onClick={p.onPickOnMap}
          className={`rounded-lg border px-3 py-1 text-sm ${p.picking ? "border-sky-600 bg-white font-medium text-sky-700" : "border-sky-300"}`}
        >
          {p.picking ? "Bấm 1 điểm trên bản đồ…" : "Chọn điểm trên bản đồ"}
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        Bán kính
        <input
          data-testid="nearby-radius"
          type="range"
          min={1}
          max={5}
          step={1}
          value={p.radiusKm}
          onChange={(e) => p.onRadiusChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-12 text-right font-medium">{p.radiusKm} km</span>
      </label>
      {p.error && <p className="text-xs text-red-600">{p.error}</p>}
      {!p.hasCenter && !p.error && (
        <p className="text-xs text-zinc-600">
          Vị trí của bạn chỉ được gửi lên để tìm kiếm, không được lưu lại.
        </p>
      )}
    </div>
  );
}
