import { type EventItem, formatDistance, formatTimeRange } from "@/lib/events";
import StatusBadge from "./StatusBadge";

type Props = {
  events: EventItem[];
  selectedId: number | null;
  onSelect: (event: EventItem) => void;
  emptyText: string;
};

// Danh sách sự kiện trong bảng bên (theo tỉnh, xã/phường hoặc kết quả Quanh đây)
export default function EventList({ events, selectedId, onSelect, emptyText }: Props) {
  if (!events.length) return <p className="py-4 text-center text-sm text-zinc-500">{emptyText}</p>;
  return (
    <ul data-testid="event-list" className="divide-y divide-zinc-100">
      {events.map((e) => (
        <li key={e.id}>
          <button
            data-testid="event-item"
            onClick={() => onSelect(e)}
            className={`w-full px-1 py-2.5 text-left hover:bg-zinc-50 ${selectedId === e.id ? "bg-amber-50" : ""}`}
          >
            <div className="flex items-start gap-2">
              <p className="flex-1 leading-snug font-medium">{e.title}</p>
              {e.distanceM !== undefined && (
                <span data-testid="event-distance" className="text-sm font-semibold whitespace-nowrap text-sky-700">
                  {formatDistance(e.distanceM)}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
              <StatusBadge status={e.status} />
              <span>{formatTimeRange(e.startAt, e.endAt)}</span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {e.venueName ?? e.address} · {e.wardName}, {e.provinceName}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
