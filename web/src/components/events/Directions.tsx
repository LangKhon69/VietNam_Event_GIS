"use client";

import { useState } from "react";

// Phương tiện theo tham số travelmode của Google Maps URLs.
// "two-wheeler" (xe máy) chỉ có tác dụng ở nước Google hỗ trợ; nơi khác Google Maps tự chọn phương tiện khác.
const MODES = [
  { value: "two-wheeler", label: "Xe máy" },
  { value: "driving", label: "Ô tô" },
  { value: "walking", label: "Đi bộ" },
] as const;
type Mode = (typeof MODES)[number]["value"];

/**
 * Liên kết chỉ đường Google Maps (Maps URLs, không cần khóa API).
 * Không truyền điểm xuất phát (origin) để Google Maps tự dùng vị trí hiện tại của người dùng;
 * ứng dụng của mình không cần lấy hay lưu vị trí người dùng.
 */
export function directionsUrl(lat: number, lng: number, mode: Mode): string {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", `${lat},${lng}`);
  url.searchParams.set("travelmode", mode);
  return url.toString();
}

export default function Directions({ lat, lng }: { lat: number; lng: number }) {
  const [mode, setMode] = useState<Mode>("two-wheeler");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Phương tiện"
        data-testid="travel-mode"
        value={mode}
        onChange={(e) => setMode(e.target.value as Mode)}
        className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
      >
        {MODES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      {/* Trên điện thoại liên kết này mở thẳng ứng dụng Google Maps; trên máy tính mở tab mới */}
      <a
        data-testid="directions-link"
        href={directionsUrl(lat, lng, mode)}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
      >
        Chỉ đường ↗
      </a>
    </div>
  );
}
