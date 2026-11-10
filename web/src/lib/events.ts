export type EventStatus = "upcoming" | "live" | "ended";

export type EventItem = {
  id: number;
  title: string;
  description: string;
  category: string;
  startAt: string;
  endAt: string;
  status: EventStatus;
  lat: number;
  lng: number;
  address: string | null;
  venueName: string | null;
  ticketUrl: string | null;
  provinceCode: string;
  provinceName: string;
  wardCode: string | null;
  wardName: string | null;
  /** Chỉ có trong kết quả "Quanh đây" */
  distanceM?: number;
  /** Chỉ có ở "Sự kiện của tôi" và trang quản trị */
  approvalStatus?: "pending" | "approved" | "rejected";
};

export type TimeFilter = "all" | "live" | "today" | "tonight" | "weekend" | "week" | "upcoming" | "ended";

export const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  all: "Tất cả",
  live: "Đang diễn ra",
  today: "Hôm nay",
  tonight: "Tối nay",
  weekend: "Cuối tuần",
  week: "7 ngày tới",
  upcoming: "Đang & sắp diễn ra",
  ended: "Đã kết thúc",
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: "Sắp diễn ra",
  live: "Đang diễn ra",
  ended: "Đã kết thúc",
};

// Màu dùng chung cho nhãn trạng thái và chấm trên bản đồ
export const STATUS_COLORS: Record<EventStatus, string> = {
  live: "#dc2626",
  upcoming: "#2563eb",
  ended: "#71717a",
};

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function formatTimeRange(startAt: string, endAt: string): string {
  return `${dateFmt.format(new Date(startAt))} → ${dateFmt.format(new Date(endAt))}`;
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}
