"use client";

import { useEffect, useState } from "react";
import { TIME_FILTER_LABELS, type TimeFilter } from "@/lib/events";

type Props = {
  when: TimeFilter;
  q: string;
  onChange: (next: { when: TimeFilter; q: string }) => void;
};

const OPTIONS: TimeFilter[] = ["all", "live", "today", "tonight", "weekend", "week", "ended"];

// Bộ lọc thời gian và ô tìm kiếm
export default function EventFilters({ when, q, onChange }: Props) {
  const [text, setText] = useState(q);

  // Debounce: chờ người dùng ngừng gõ 300 ms rồi mới tìm, tránh gọi API mỗi phím bấm
  useEffect(() => {
    if (text === q) return;
    const t = setTimeout(() => onChange({ when, q: text }), 300);
    return () => clearTimeout(t);
  }, [text, q, when, onChange]);

  return (
    <div className="space-y-2">
      <input
        data-testid="search-input"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tìm sự kiện, địa điểm…"
        className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500"
      />
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            data-testid={`filter-${opt}`}
            onClick={() => onChange({ when: opt, q: text })}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              when === opt ? "border-amber-600 bg-amber-500 text-white" : "border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {TIME_FILTER_LABELS[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}
