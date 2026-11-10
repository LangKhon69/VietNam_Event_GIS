import { type EventStatus, STATUS_COLORS, STATUS_LABELS } from "@/lib/events";

// Nhãn trạng thái tự tính từ thời gian; "Đang diễn ra" có chấm nhấp nháy (Live)
export default function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      data-testid="status-badge"
      data-status={status}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: STATUS_COLORS[status] }}
    >
      {status === "live" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
      {status === "live" ? "LIVE" : STATUS_LABELS[status]}
    </span>
  );
}
