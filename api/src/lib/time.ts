// Tính khoảng thời gian cho bộ lọc theo giờ Việt Nam (UTC+7, không đổi giờ mùa hè).

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const TIME_FILTERS = ["all", "live", "today", "tonight", "weekend", "week", "upcoming", "ended"] as const;
export type TimeFilter = (typeof TIME_FILTERS)[number];

// Nửa đêm (00:00 giờ VN) của ngày chứa thời điểm `now`, trả về dạng Date (UTC)
function vnMidnight(now: Date): Date {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - VN_OFFSET_MS);
}

/**
 * Khoảng [from, to) mà sự kiện phải "chạm" vào (giao nhau) để khớp bộ lọc.
 * null nghĩa là không lọc theo khoảng (all, live, upcoming, ended xử lý riêng theo trạng thái).
 */
export function timeRange(filter: TimeFilter, now = new Date()): { from: Date; to: Date } | null {
  const midnight = vnMidnight(now);
  switch (filter) {
    case "today":
      return { from: now, to: new Date(midnight.getTime() + DAY_MS) };
    case "tonight": // từ 18:00 đến 24:00 hôm nay
      return {
        from: new Date(Math.max(now.getTime(), midnight.getTime() + 18 * 3600 * 1000)),
        to: new Date(midnight.getTime() + DAY_MS),
      };
    case "weekend": {
      // Thứ Bảy và Chủ Nhật gần nhất (nếu đang cuối tuần thì là cuối tuần này)
      const weekday = new Date(midnight.getTime() + VN_OFFSET_MS).getUTCDay(); // 0 = CN, 6 = T7
      const daysToSaturday = weekday === 0 ? -1 : 6 - weekday;
      const saturday = midnight.getTime() + daysToSaturday * DAY_MS;
      return { from: new Date(Math.max(now.getTime(), saturday)), to: new Date(saturday + 2 * DAY_MS) };
    }
    case "week":
      return { from: now, to: new Date(now.getTime() + 7 * DAY_MS) };
    default:
      return null;
  }
}

/** Trạng thái tự tính từ thời gian: Sắp diễn ra / Đang diễn ra (Live) / Đã kết thúc */
export function eventStatus(startAt: Date, endAt: Date, now = new Date()): "upcoming" | "live" | "ended" {
  if (now < startAt) return "upcoming";
  if (now <= endAt) return "live";
  return "ended";
}
