"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { type EventItem, formatDistance, type TimeFilter } from "@/lib/events";
import type { ProvinceRef, WardRef } from "@/lib/types";
import EventCard from "./events/EventCard";
import EventFilters from "./events/EventFilters";
import EventList from "./events/EventList";
import NearbyControls from "./events/NearbyControls";
import ProvinceInfo from "./ProvinceInfo";

// MapLibre cần đối tượng `window` của trình duyệt nên không render trên server (ssr: false)
const VietnamMap = dynamic(() => import("./map/VietnamMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-zinc-500">Đang tải bản đồ…</div>,
});

type LatLng = { lat: number; lng: number };
type Mode = "browse" | "nearby";

// Bộ lọc thời gian ở chế độ Quanh đây: mặc định chỉ sự kiện đang/sắp diễn ra
const NEARBY_FILTERS: TimeFilter[] = ["upcoming", "live", "today", "tonight", "weekend", "week", "all"];

// Thành phần gốc của trang bản đồ: giữ trạng thái (tỉnh, xã/phường, bộ lọc, sự kiện đang chọn,
// chế độ Quanh đây) và truyền xuống cho bản đồ và bảng bên.
export default function MapApp() {
  const [mode, setMode] = useState<Mode>("browse");
  const [province, setProvince] = useState<ProvinceRef | null>(null);
  const [ward, setWard] = useState<WardRef | null>(null);
  const [filters, setFilters] = useState<{ when: TimeFilter; q: string }>({ when: "all", q: "" });
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Trạng thái Quanh đây. Tọa độ chỉ giữ trong bộ nhớ trình duyệt, không lưu ở đâu cả.
  const [center, setCenter] = useState<LatLng | null>(null);
  const [radiusKm, setRadiusKm] = useState(2);
  const [picking, setPicking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [nearest, setNearest] = useState<EventItem | null>(null);

  // Tải danh sách sự kiện mỗi khi đổi phạm vi hoặc bộ lọc
  useEffect(() => {
    const controller = new AbortController();
    const request =
      mode === "nearby"
        ? center
          ? api<{ events: EventItem[]; nearest: EventItem | null }>("/api/events/nearby", {
              params: { ...center, radiusKm, when: filters.when, q: filters.q },
              signal: controller.signal,
            })
          : Promise.resolve({ events: [], nearest: null })
        : api<EventItem[]>("/api/events", {
            params: { province: province?.code, ward: ward?.code, when: filters.when, q: filters.q },
            signal: controller.signal,
          }).then((list) => ({ events: list, nearest: null }));
    request
      .then((res) => {
        setEvents(res.events);
        setNearest(res.nearest);
        setEventsError(null);
      })
      .catch((err: Error) => err.name !== "AbortError" && setEventsError(err.message));
    return () => controller.abort();
  }, [mode, province, ward, filters, center, radiusKm]);

  const selectProvince = (p: ProvinceRef) => {
    setMode("browse");
    setProvince(p);
    setWard(null);
    setSelectedEvent(null);
  };
  const selectWard = (w: WardRef) => {
    setWard(w);
    setSelectedEvent(null);
  };
  const backToCountry = () => {
    setProvince(null);
    setWard(null);
    setSelectedEvent(null);
  };
  const changeFilters = useCallback((next: { when: TimeFilter; q: string }) => setFilters(next), []);

  const enterNearby = () => {
    setMode("nearby");
    setProvince(null);
    setWard(null);
    setSelectedEvent(null);
    setFilters((f) => ({ ...f, when: "upcoming" }));
  };
  const exitNearby = () => {
    setMode("browse");
    setCenter(null);
    setPicking(false);
    setNearbyError(null);
    setSelectedEvent(null);
    setFilters((f) => ({ ...f, when: "all" }));
  };
  const useGps = () => {
    setNearbyError(null);
    setPicking(false);
    if (!navigator.geolocation) return setNearbyError("Trình duyệt không hỗ trợ định vị. Hãy chọn điểm trên bản đồ.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setNearbyError("Không lấy được vị trí (chưa cho phép, hoặc trang không chạy trên HTTPS). Hãy chọn điểm trên bản đồ.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const pickPoint = (p: LatLng) => {
    setCenter(p);
    setPicking(false);
    setNearbyError(null);
  };

  const scopeName = ward?.fullName ?? province?.fullName ?? "toàn quốc";

  return (
    <div className="relative h-full w-full">
      <VietnamMap
        selectedProvince={province}
        selectedWardCode={ward?.code ?? null}
        onSelectProvince={selectProvince}
        onSelectWard={selectWard}
        events={events}
        selectedEventId={selectedEvent?.id ?? null}
        onSelectEvent={setSelectedEvent}
        nearby={mode === "nearby" ? { center, radiusKm, nearestId: events[0]?.id ?? null } : null}
        pickMode={picking}
        onPickPoint={pickPoint}
      />

      <aside
        data-testid="side-panel"
        className="absolute inset-x-0 bottom-0 z-20 flex max-h-[45%] flex-col overflow-hidden rounded-t-xl border border-zinc-200 bg-white shadow-lg md:inset-y-3 md:right-auto md:bottom-3 md:left-3 md:max-h-none md:w-[390px] md:rounded-xl"
      >
        <div className="flex items-start gap-2 border-b border-zinc-100 p-4">
          <div className="flex-1">
            <p className="text-xs tracking-wide text-zinc-500 uppercase">
              {mode === "nearby" ? "Tìm quanh vị trí" : province ? "Tỉnh/thành" : "Việt Nam"}
            </p>
            <h2 data-testid={province ? "province-name" : "country-name"} className="text-xl font-bold">
              {mode === "nearby" ? "Quanh đây" : province ? province.fullName : "34 tỉnh/thành"}
            </h2>
          </div>
          {mode === "nearby" ? (
            <button data-testid="nearby-exit" onClick={exitNearby} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
              ← Bản đồ
            </button>
          ) : province ? (
            <button
              data-testid="back-button"
              onClick={backToCountry}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              ← Toàn quốc
            </button>
          ) : (
            <button data-testid="nearby-button" onClick={enterNearby} className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700">
              📍 Quanh đây
            </button>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {mode === "nearby" ? (
            <NearbyControls
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              hasCenter={!!center}
              picking={picking}
              locating={locating}
              error={nearbyError}
              onUseGps={useGps}
              onPickOnMap={() => setPicking((p) => !p)}
            />
          ) : province ? (
            <ProvinceInfo code={province.code} />
          ) : (
            <p className="text-sm text-zinc-500">Rê chuột hoặc chạm vào một tỉnh để xem tên, bấm để xem chi tiết.</p>
          )}

          {ward && mode === "browse" && (
            <div className="rounded-lg bg-sky-50 p-3">
              <p className="text-xs text-sky-700">Đang xem {ward.type.toLowerCase()}</p>
              <p data-testid="ward-name" className="font-semibold">
                {ward.fullName}
              </p>
              <button onClick={() => setWard(null)} className="mt-1 text-sm text-sky-700 underline">
                Bỏ chọn, xem cả tỉnh
              </button>
            </div>
          )}

          {selectedEvent && <EventCard event={selectedEvent} onClose={() => setSelectedEvent(null)} />}

          {(mode === "browse" || center) && (
            <section className="space-y-2">
              <h3 className="font-semibold">
                {mode === "nearby" ? `Trong bán kính ${radiusKm} km` : `Sự kiện tại ${scopeName}`}{" "}
                <span data-testid="event-count" className="text-zinc-400">
                  ({events.length})
                </span>
              </h3>
              <EventFilters
                when={filters.when}
                q={filters.q}
                onChange={changeFilters}
                options={mode === "nearby" ? NEARBY_FILTERS : undefined}
              />
              {eventsError ? (
                <p className="text-sm text-red-600">{eventsError}</p>
              ) : (
                <EventList
                  events={events}
                  selectedId={selectedEvent?.id ?? null}
                  onSelect={setSelectedEvent}
                  emptyText={mode === "nearby" ? `Không có sự kiện nào trong ${radiusKm} km.` : "Không có sự kiện nào khớp bộ lọc."}
                />
              )}
              {/* Không có gì trong bán kính: gợi ý tăng bán kính hoặc xem sự kiện gần nhất */}
              {mode === "nearby" && events.length === 0 && (
                <div data-testid="nearby-empty" className="space-y-2 rounded-lg bg-zinc-50 p-3 text-sm">
                  {radiusKm < 5 && (
                    <button onClick={() => setRadiusKm(5)} className="text-sky-700 underline">
                      Tăng bán kính lên 5 km
                    </button>
                  )}
                  {nearest && (
                    <p>
                      Sự kiện gần nhất cách {formatDistance(nearest.distanceM ?? 0)}:{" "}
                      <button data-testid="nearest-link" onClick={() => setSelectedEvent(nearest)} className="font-medium text-sky-700 underline">
                        {nearest.title}
                      </button>
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
