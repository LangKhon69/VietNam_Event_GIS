"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ROLE_LABELS, type User, useAuth } from "@/lib/auth";
import { type EventItem, formatTimeRange } from "@/lib/events";

type AdminEvent = EventItem & { createdByName: string | null; createdByRole: User["role"] | null; createdByVerified: boolean | null };
type AdminVenue = { id: number; name: string; address: string | null; category: string | null; provinceName: string; wardName: string | null; ownerName: string | null };
type LogRow = { id: number; targetType: string; targetId: number; action: string; createdAt: string; adminName: string };

type AdminData = { events: AdminEvent[]; venues: AdminVenue[]; users: (User & { createdAt: string })[]; logs: LogRow[] };

async function loadAdminData(): Promise<AdminData> {
  const [events, venues, users, logs] = await Promise.all([
    api<AdminEvent[]>("/api/admin/events", { params: { status: "pending" } }),
    api<AdminVenue[]>("/api/admin/venues", { params: { status: "pending" } }),
    api<AdminData["users"]>("/api/admin/users"),
    api<LogRow[]>("/api/admin/logs"),
  ]);
  return { events, venues, users, logs };
}

const ACTION_LABELS: Record<string, string> = { approved: "duyệt", rejected: "từ chối", verify: "xác thực", unverify: "bỏ xác thực" };
const TARGET_LABELS: Record<string, string> = { event: "sự kiện", venue: "địa điểm", user: "tài khoản" };

// Trang quản trị: duyệt sự kiện/địa điểm chờ duyệt, xác thực người nổi tiếng và chủ địa điểm
export default function AdminPanel() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<AdminData>({ events: [], venues: [], users: [], logs: [] });
  const [error, setError] = useState<string | null>(null);
  const { events, venues, users, logs } = data;

  const reload = useCallback(
    () =>
      loadAdminData()
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((err: Error) => setError(err.message)),
    [],
  );

  useEffect(() => {
    if (user?.role === "admin") reload();
  }, [user, reload]);

  const act = async (path: string, body: unknown) => {
    try {
      await api(path, { method: "POST", body });
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) return <p className="p-6 text-zinc-500">Đang tải…</p>;
  if (user?.role !== "admin")
    return (
      <p className="p-6">
        Trang này chỉ dành cho quản trị viên. <Link href="/dang-nhap" className="text-amber-700 underline">Đăng nhập</Link>
      </p>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Quản trị</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Sự kiện chờ duyệt ({events.length})</h2>
        {events.length === 0 && <p className="text-sm text-zinc-500">Không có sự kiện nào chờ duyệt.</p>}
        <ul data-testid="pending-events" className="divide-y divide-zinc-100">
          {events.map((e) => (
            <li key={e.id} data-testid="pending-event" className="flex flex-wrap items-start gap-3 py-3">
              <div className="min-w-60 flex-1">
                <p data-testid="pending-event-title" className="font-medium">{e.title}</p>
                <p className="text-xs text-zinc-500">
                  {e.category} · {formatTimeRange(e.startAt, e.endAt)}
                </p>
                <p className="text-xs text-zinc-500">
                  {e.address} · {e.wardName}, {e.provinceName}
                </p>
                <p className="text-xs text-zinc-500">
                  Người đăng: {e.createdByName} ({e.createdByRole && ROLE_LABELS[e.createdByRole]}
                  {e.createdByVerified ? ", đã xác thực" : ", chưa xác thực"})
                </p>
                {e.description && <p className="mt-1 text-sm text-zinc-700">{e.description}</p>}
              </div>
              <div className="flex gap-2">
                <button data-testid="approve-event" onClick={() => act(`/api/admin/events/${e.id}/review`, { decision: "approved" })} className="rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700">
                  Duyệt
                </button>
                <button onClick={() => act(`/api/admin/events/${e.id}/review`, { decision: "rejected" })} className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50">
                  Từ chối
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Địa điểm chờ duyệt ({venues.length})</h2>
        {venues.length === 0 && <p className="text-sm text-zinc-500">Không có địa điểm nào chờ duyệt.</p>}
        <ul className="divide-y divide-zinc-100">
          {venues.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 py-2">
              <div className="flex-1 text-sm">
                <p className="font-medium">{v.name}</p>
                <p className="text-xs text-zinc-500">
                  {v.category} · {v.address} · {v.wardName}, {v.provinceName} · Chủ: {v.ownerName}
                </p>
              </div>
              <button onClick={() => act(`/api/admin/venues/${v.id}/review`, { decision: "approved" })} className="rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white">
                Duyệt
              </button>
              <button onClick={() => act(`/api/admin/venues/${v.id}/review`, { decision: "rejected" })} className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700">
                Từ chối
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-1 font-semibold">Xác thực người nổi tiếng và chủ địa điểm</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Xác minh thủ công (giấy tờ, kênh liên hệ chính thức) trước khi bấm. Tài khoản đã xác thực có huy hiệu ✔ và sự kiện được duyệt ngay.
        </p>
        {users.length === 0 && <p className="text-sm text-zinc-500">Chưa có tài khoản nào.</p>}
        <ul data-testid="verify-users" className="divide-y divide-zinc-100">
          {users.map((u) => (
            <li key={u.id} data-testid="verify-user" className="flex items-center gap-3 py-2 text-sm">
              <div className="flex-1">
                <p className="font-medium">
                  {u.displayName} {u.isVerified && <span className="text-sky-600">✔</span>}
                </p>
                <p className="text-xs text-zinc-500">
                  {u.email} · {ROLE_LABELS[u.role]}
                </p>
              </div>
              <button
                data-testid="toggle-verify"
                onClick={() => act(`/api/admin/users/${u.id}/verify`, { verified: !u.isVerified })}
                className={`rounded-lg px-3 py-1 text-sm ${u.isVerified ? "border border-zinc-300" : "bg-sky-600 text-white hover:bg-sky-700"}`}
              >
                {u.isVerified ? "Bỏ xác thực" : "Xác thực"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Nhật ký kiểm duyệt</h2>
        {logs.length === 0 && <p className="text-sm text-zinc-500">Chưa có thao tác nào.</p>}
        <ul className="space-y-1 text-xs text-zinc-600">
          {logs.map((l) => (
            <li key={l.id}>
              {new Date(l.createdAt).toLocaleString("vi-VN")} · {l.adminName} {ACTION_LABELS[l.action] ?? l.action}{" "}
              {TARGET_LABELS[l.targetType] ?? l.targetType} #{l.targetId}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
