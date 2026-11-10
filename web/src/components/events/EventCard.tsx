import { type EventItem, formatDistance, formatTimeRange } from "@/lib/events";
import Directions from "./Directions";
import StatusBadge from "./StatusBadge";

// Thẻ chi tiết sự kiện, mở khi bấm vào điểm trên bản đồ hoặc dòng trong danh sách
export default function EventCard({ event, onClose }: { event: EventItem; onClose: () => void }) {
  return (
    <article data-testid="event-card" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-xs text-zinc-500">{event.category}</p>
          <h3 data-testid="event-card-title" className="text-lg leading-snug font-bold">
            {event.title}
          </h3>
        </div>
        <button onClick={onClose} aria-label="Đóng" className="rounded px-2 text-xl leading-none text-zinc-500 hover:bg-zinc-100">
          ×
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={event.status} />
        <span>{formatTimeRange(event.startAt, event.endAt)}</span>
      </div>
      <p className="text-sm">
        📍 {event.venueName ? `${event.venueName}, ` : ""}
        {event.address}
        <br />
        <span className="text-zinc-500">
          {event.wardName}, {event.provinceName}
          {event.distanceM !== undefined && ` · cách bạn ${formatDistance(event.distanceM)}`}
        </span>
      </p>
      {event.description && <p className="text-sm whitespace-pre-line text-zinc-700">{event.description}</p>}
      <Directions lat={event.lat} lng={event.lng} />
      {event.ticketUrl && (
        <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-amber-700 underline">
          Mua vé (trang đối tác) ↗
        </a>
      )}
    </article>
  );
}
