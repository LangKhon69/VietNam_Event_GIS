"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { type EventItem, formatTimeRange } from "@/lib/events";
import type { PickedLocation } from "./map/PinPicker";

const PinPicker = dynamic(() => import("./map/PinPicker"), { ssr: false });

const CATEGORIES = ["Âm nhạc", "Lễ hội", "Ẩm thực", "Thể thao", "Triển lãm", "Sân khấu", "Văn hóa", "Hội thảo", "Khác"];
const APPROVAL_LABELS = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Bị từ chối" } as const;
const inputClass = "w-full rounded-lg border border-zinc-300 px-3 py-1.5 outline-none focus:border-amber-500";

type MyVenue = { id: number; name: string; address: string | null; approvalStatus: keyof typeof APPROVAL_LABELS; lat: number; lng: number };

// Ô datetime-local cho chuỗi "2026-11-10T19:00" không kèm múi giờ: hiểu là giờ Việt Nam (UTC+7)
const vnLocalToIso = (local: string) => new Date(`${local}:00+07:00`).toISOString();

export default function PostForm() {
  const { user, loading } = useAuth();
  const [kind, setKind] = useState<"event" | "venue">("event");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", category: CATEGORIES[0], description: "", startAt: "", endAt: "", address: "", ticketUrl: "", venueId: "",
    venueName: "", venueCategory: "",
  });
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [myEvents, setMyEvents] = useState<EventItem[]>([]);
  const [myVenues, setMyVenues] = useState<MyVenue[]>([]);

  const reloadMine = useCallback(() => {
    api<EventItem[]>("/api/me/events").then(setMyEvents).catch(() => {});
    api<MyVenue[]>("/api/me/venues").then(setMyVenues).catch(() => {});
  }, []);
  useEffect(() => {
    if (user) reloadMine();
  }, [user, reloadMine]);

  const onLocated = useCallback((loc: PickedLocation | null, err: string | null) => {
    setLocation(loc);
    setLocError(err);
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  // Chọn địa điểm có sẵn thì dùng luôn vị trí của địa điểm đó
  const chooseVenue = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const venue = myVenues.find((v) => String(v.id) === e.target.value);
    setForm({ ...form, venueId: e.target.value, address: venue?.address ?? form.address });
    if (venue) setPoint({ lat: venue.lat, lng: venue.lng });
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    if (!point || !location) {
      setResult({ ok: false, text: "Hãy ghim một vị trí hợp lệ trên bản đồ." });
      return;
    }
    setBusy(true);
    try {
      const res =
        kind === "event"
          ? await api<{ approvalStatus: string; location: PickedLocation }>("/api/events", {
              method: "POST",
              body: {
                title: form.title,
                category: form.category,
                description: form.description,
                startAt: vnLocalToIso(form.startAt),
                endAt: vnLocalToIso(form.endAt),
                address: form.address || undefined,
                ticketUrl: form.ticketUrl || undefined,
                venueId: form.venueId ? Number(form.venueId) : undefined,
                ...point,
              },
            })
          : await api<{ approvalStatus: string; location: PickedLocation }>("/api/venues", {
              method: "POST",
              body: { name: form.venueName, address: form.address || undefined, category: form.venueCategory || undefined, ...point },
            });
      setResult({
        ok: true,
        text: `Đã đăng tại ${res.location.wardName}, ${res.location.provinceName}. ${
          res.approvalStatus === "approved" ? "Đã hiển thị trên bản đồ." : "Đang chờ quản trị viên duyệt."
        }`,
      });
      reloadMine();
    } catch (err) {
      setResult({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="p-6 text-zinc-500">Đang tải…</p>;
  if (!user)
    return (
      <p className="p-6">
        Bạn cần <Link href="/dang-nhap" className="text-amber-700 underline">đăng nhập</Link> để đăng sự kiện.
      </p>
    );

  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-4 lg:grid-cols-[1fr_320px]">
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex gap-2">
          {(["event", "venue"] as const).map((k) => (
            <button
              key={k}
              type="button"
              data-testid={`kind-${k}`}
              onClick={() => setKind(k)}
              className={`rounded-lg px-3 py-1.5 text-sm ${kind === k ? "bg-amber-500 text-white" : "border border-zinc-300"}`}
            >
              {k === "event" ? "Đăng sự kiện" : "Đăng địa điểm"}
            </button>
          ))}
        </div>
        {!user.isVerified && user.role !== "admin" && (
          <p className="rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600">
            Tài khoản chưa xác thực: nội dung bạn đăng sẽ chờ quản trị viên duyệt trước khi hiện trên bản đồ.
          </p>
        )}

        {kind === "event" ? (
          <>
            <label className="block text-sm">
              Tên sự kiện
              <input data-testid="f-title" required value={form.title} onChange={set("title")} className={inputClass} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Danh mục
                <select value={form.category} onChange={set("category")} className={inputClass}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                Địa điểm của tôi (không bắt buộc)
                <select value={form.venueId} onChange={chooseVenue} className={inputClass}>
                  <option value="">— Không chọn —</option>
                  {myVenues.filter((v) => v.approvalStatus !== "rejected").map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Bắt đầu (giờ VN)
                <input data-testid="f-start" type="datetime-local" required value={form.startAt} onChange={set("startAt")} className={inputClass} />
              </label>
              <label className="block text-sm">
                Kết thúc (giờ VN)
                <input data-testid="f-end" type="datetime-local" required value={form.endAt} onChange={set("endAt")} className={inputClass} />
              </label>
            </div>
            <label className="block text-sm">
              Mô tả
              <textarea rows={3} value={form.description} onChange={set("description")} className={inputClass} />
            </label>
            <label className="block text-sm">
              Liên kết mua vé (trang đối tác, không bắt buộc)
              <input type="url" value={form.ticketUrl} onChange={set("ticketUrl")} className={inputClass} placeholder="https://" />
            </label>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Tên địa điểm
              <input data-testid="f-venue-name" required value={form.venueName} onChange={set("venueName")} className={inputClass} />
            </label>
            <label className="block text-sm">
              Loại địa điểm
              <input value={form.venueCategory} onChange={set("venueCategory")} className={inputClass} placeholder="Quán cà phê, nhà hát…" />
            </label>
          </div>
        )}
        <label className="block text-sm">
          Địa chỉ (để người xem dễ tìm)
          <input data-testid="f-address" value={form.address} onChange={set("address")} className={inputClass} />
        </label>

        <div className="space-y-1">
          <p className="text-sm font-medium">Vị trí</p>
          <PinPicker value={point} onChange={setPoint} onLocated={onLocated} />
          <p data-testid="location-check" className={`text-sm ${locError ? "text-red-600" : "text-emerald-700"}`}>
            {locError
              ? `✗ ${locError}`
              : location
                ? `✓ Thuộc ${location.wardName}, ${location.provinceName} (tự gán bằng PostGIS ST_Covers)`
                : point
                  ? "Đang kiểm tra ranh giới…"
                  : "Chưa ghim vị trí"}
          </p>
        </div>

        {result && (
          <p data-testid="post-result" className={`rounded-lg p-2 text-sm ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {result.text}
          </p>
        )}
        <button data-testid="f-submit" disabled={busy} className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:opacity-60">
          {busy ? "Đang gửi…" : kind === "event" ? "Đăng sự kiện" : "Đăng địa điểm"}
        </button>
      </form>

      <aside className="space-y-4">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">Sự kiện của tôi</h2>
          {myEvents.length === 0 && <p className="text-sm text-zinc-500">Chưa có.</p>}
          <ul data-testid="my-events" className="space-y-2 text-sm">
            {myEvents.map((e) => (
              <li key={e.id} className="border-b border-zinc-100 pb-2">
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-zinc-500">{formatTimeRange(e.startAt, e.endAt)}</p>
                <p className="text-xs">
                  {e.wardName}, {e.provinceName} ·{" "}
                  <span data-testid="my-event-approval" className="font-medium">{APPROVAL_LABELS[e.approvalStatus ?? "pending"]}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">Địa điểm của tôi</h2>
          {myVenues.length === 0 && <p className="text-sm text-zinc-500">Chưa có.</p>}
          <ul className="space-y-1 text-sm">
            {myVenues.map((v) => (
              <li key={v.id}>
                {v.name} · <span className="text-xs">{APPROVAL_LABELS[v.approvalStatus]}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
