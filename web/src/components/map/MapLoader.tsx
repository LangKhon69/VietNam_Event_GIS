"use client";

import dynamic from "next/dynamic";

// MapLibre cần đối tượng `window` của trình duyệt nên không thể render trên server.
// `ssr: false` bảo Next.js chỉ tải component bản đồ ở phía trình duyệt.
const VietnamMap = dynamic(() => import("./VietnamMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-zinc-500">Đang tải bản đồ…</div>,
});

export default function MapLoader() {
  return <VietnamMap />;
}
