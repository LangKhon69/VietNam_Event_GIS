"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { ExpressionSpecification, MapGeoJSONFeature, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BBox, ProvinceRef, WardRef } from "@/lib/types";
import { type EventItem, STATUS_COLORS } from "@/lib/events";

// Worker là luồng phụ của MapLibre để xử lý dữ liệu không làm đơ giao diện.
// File được chép vào public/ bởi scripts/copy-maplibre-worker.mjs.
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// Khung nhìn toàn quốc, gồm cả Hoàng Sa (~112°E) và Trường Sa (~117°E)
const VIETNAM_BOUNDS: BBox = [101.5, 6.8, 118.2, 23.6];

// Style tối giản: không có bản đồ nền, chỉ một lớp màu biển.
const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#dbeafe" } }],
};

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
const hovered: ExpressionSpecification = ["boolean", ["feature-state", "hover"], false];
const selected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];
const nearestState: ExpressionSpecification = ["boolean", ["feature-state", "nearest"], false];

// Thiết bị cảm ứng không có hover: chạm lần 1 xem tên, chạm lần 2 mới chọn
const isTouchDevice = () => window.matchMedia("(hover: none)").matches;

type Props = {
  selectedProvince: ProvinceRef | null;
  selectedWardCode: string | null;
  onSelectProvince: (province: ProvinceRef) => void;
  onSelectWard: (ward: WardRef) => void;
  /** Sự kiện đang hiển thị (cùng danh sách với bảng bên) */
  events: EventItem[];
  selectedEventId: number | null;
  onSelectEvent: (event: EventItem) => void;
  /** Quanh đây: tâm, bán kính và sự kiện gần nhất (null khi không ở chế độ Quanh đây) */
  nearby: { center: LatLng | null; radiusKm: number; nearestId: number | null } | null;
  /** Đang ở chế độ "chọn điểm trên bản đồ" */
  pickMode: boolean;
  onPickPoint: (point: LatLng) => void;
};

type LatLng = { lat: number; lng: number };

// Đa giác xấp xỉ vòng tròn bán kính `km` quanh tâm (64 đỉnh), để vẽ vùng quét Quanh đây
function circleRing(center: LatLng, km: number): [number, number][] {
  const dLat = km / 111.32; // 1 độ vĩ ≈ 111,32 km
  const dLng = km / (111.32 * Math.cos((center.lat * Math.PI) / 180)); // 1 độ kinh ngắn dần về phía cực
  return Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * 2 * Math.PI;
    return [center.lng + dLng * Math.cos(a), center.lat + dLat * Math.sin(a)];
  });
}

type HoverLabel = { x: number; y: number; text: string } | null;
type Picked = { source: "provinces" | "wards" | "events"; feature: MapGeoJSONFeature };

// Khoảng đệm khi phóng vào tỉnh: chừa chỗ cho bảng thông tin (bên trái trên máy tính, bên dưới trên điện thoại)
function focusPadding(): maplibregl.PaddingOptions {
  return window.innerWidth >= 768
    ? { top: 40, bottom: 40, left: 420, right: 40 }
    : { top: 30, bottom: Math.round(window.innerHeight * 0.45), left: 20, right: 20 };
}

// Đổi danh sách sự kiện thành GeoJSON điểm để vẽ lên bản đồ
function eventsToGeoJSON(events: EventItem[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: events.map((e) => ({
      type: "Feature",
      id: e.id,
      properties: { id: e.id, title: e.title, status: e.status },
      geometry: { type: "Point", coordinates: [e.lng, e.lat] },
    })),
  };
}

export default function VietnamMap(props: Props) {
  const { selectedProvince, selectedWardCode, events, selectedEventId } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const provincesRef = useRef<Map<string, ProvinceRef>>(new Map());
  const prevSelectedRef = useRef<number | null>(null);
  const prevNearestRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoverLabel, setHoverLabel] = useState<HoverLabel>(null);

  // Các handler sự kiện của MapLibre chỉ đăng ký 1 lần, nên đọc props mới nhất qua ref
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  // 1) Khởi tạo bản đồ, nguồn dữ liệu, các lớp và sự kiện chuột/chạm (chạy 1 lần)
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      bounds: VIETNAM_BOUNDS,
      fitBoundsOptions: { padding: focusPadding() },
      attributionControl: false,
      dragRotate: false,
    });
    mapRef.current = map;
    // Gắn bản đồ vào window để script kiểm thử (scripts/smoke-test.mjs) điều khiển được
    (window as unknown as { __vegisMap: maplibregl.Map }).__vegisMap = map;
    map.touchZoomRotate.disableRotation();
    // Trên màn hình cảm ứng, chạm 2 lần dùng để chọn tỉnh/xã nên tắt "chạm đúp để phóng to"
    // (vẫn phóng to được bằng 2 ngón tay)
    if (isTouchDevice()) map.doubleClickZoom.disable();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ customAttribution: "Ranh giới: vietnamese-provinces-database (MIT)" }),
    );

    let hoveredFeature: { source: string; id: string | number } | null = null;
    let lastTapId: string | number | null = null;

    const setHover = (picked: Picked | null, point?: maplibregl.Point) => {
      if (hoveredFeature && (hoveredFeature.source !== picked?.source || hoveredFeature.id !== picked.feature.id)) {
        map.setFeatureState(hoveredFeature, { hover: false });
        hoveredFeature = null;
      }
      if (!picked || !point) {
        setHoverLabel(null);
        map.getCanvas().style.cursor = "";
        return;
      }
      hoveredFeature = { source: picked.source, id: picked.feature.id! };
      map.setFeatureState(hoveredFeature, { hover: true });
      map.getCanvas().style.cursor = "pointer";
      // Tên lấy từ dữ liệu GeoJSON, không viết cứng trong mã
      const p = picked.feature.properties;
      setHoverLabel({ x: point.x, y: point.y, text: String(picked.source === "events" ? p.title : p.fullName) });
    };

    // Tìm đối tượng dưới con trỏ: ưu tiên điểm sự kiện, rồi xã/phường (khi đã chọn tỉnh), sau đó tới tỉnh
    const pick = (point: maplibregl.Point): Picked | null => {
      // Vùng bắt rộng hơn chấm tròn vài pixel cho dễ bấm (nhất là trên điện thoại)
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [
        [point.x - 6, point.y - 6],
        [point.x + 6, point.y + 6],
      ];
      const event = map.getLayer("event-circle") && map.queryRenderedFeatures(box, { layers: ["event-circle"] })[0];
      if (event) return { source: "events", feature: event };
      const ward = map.queryRenderedFeatures(point, { layers: ["ward-fill"] })[0];
      if (ward) return { source: "wards", feature: ward };
      const province = map.queryRenderedFeatures(point, { layers: ["province-fill"] })[0];
      // Trong tỉnh đang chọn mà không trúng xã/phường nào (khe hở ranh giới) thì bỏ qua
      if (province && province.properties.code === propsRef.current.selectedProvince?.code) return null;
      return province ? { source: "provinces", feature: province } : null;
    };

    const select = (picked: Picked) => {
      const props = picked.feature.properties;
      if (picked.source === "events") {
        const event = propsRef.current.events.find((e) => e.id === props.id);
        if (event) propsRef.current.onSelectEvent(event);
      } else if (picked.source === "wards") {
        propsRef.current.onSelectWard({
          code: props.code,
          name: props.name,
          fullName: props.fullName,
          type: props.type,
          provinceCode: props.provinceCode,
        });
      } else {
        const province = provincesRef.current.get(props.code);
        if (province) propsRef.current.onSelectProvince(province);
      }
    };

    map.on("load", async () => {
      // Tự tải GeoJSON tỉnh để có thêm focusBbox cho từng tỉnh
      const provinces: GeoJSON.FeatureCollection = await (await fetch("/geo/provinces.json")).json();
      for (const f of provinces.features) {
        const p = f.properties as { code: string; name: string; fullName: string };
        provincesRef.current.set(p.code, { ...p, focusBbox: (f as unknown as { focusBbox: BBox }).focusBbox });
      }
      map.addSource("provinces", { type: "geojson", data: provinces });
      map.addSource("wards", { type: "geojson", data: EMPTY_FC });

      map.addLayer({
        id: "province-fill",
        type: "fill",
        source: "provinces",
        paint: {
          "fill-color": ["case", hovered, "#f59e0b", "#fef3c7"],
          "fill-opacity": ["case", hovered, 0.85, 0.7],
        },
      });
      map.addLayer({
        id: "ward-fill",
        type: "fill",
        source: "wards",
        paint: {
          "fill-color": ["case", selected, "#0ea5e9", hovered, "#7dd3fc", "#fef3c7"],
          "fill-opacity": ["case", selected, 0.75, hovered, 0.8, 0.9],
        },
      });
      map.addLayer({
        id: "ward-line",
        type: "line",
        source: "wards",
        paint: { "line-color": ["case", selected, "#0369a1", "#a16207"], "line-width": ["case", selected, 2, 0.6] },
      });
      map.addLayer({
        id: "province-line",
        type: "line",
        source: "provinces",
        paint: {
          "line-color": ["case", hovered, "#b45309", "#92400e"],
          "line-width": ["case", hovered, 2.5, 0.8],
        },
      });

      // Vùng quét "Quanh đây": vòng tròn bán kính và điểm tâm
      map.addSource("nearby-area", { type: "geojson", data: EMPTY_FC });
      map.addSource("nearby-center", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "nearby-fill",
        type: "fill",
        source: "nearby-area",
        paint: { "fill-color": "#0ea5e9", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "nearby-line",
        type: "line",
        source: "nearby-area",
        paint: { "line-color": "#0284c7", "line-width": 2, "line-dasharray": [2, 2] },
      });
      map.addLayer({
        id: "nearby-center",
        type: "circle",
        source: "nearby-center",
        paint: { "circle-color": "#0284c7", "circle-radius": 6, "circle-stroke-color": "#fff", "circle-stroke-width": 2 },
      });

      // Điểm sự kiện: màu theo trạng thái (đỏ = đang diễn ra, xanh = sắp diễn ra, xám = đã kết thúc)
      map.addSource("events", { type: "geojson", data: eventsToGeoJSON(propsRef.current.events) });
      map.addLayer({
        id: "event-circle",
        type: "circle",
        source: "events",
        paint: {
          "circle-color": [
            "match",
            ["get", "status"],
            "live",
            STATUS_COLORS.live,
            "upcoming",
            STATUS_COLORS.upcoming,
            STATUS_COLORS.ended,
          ],
          // Bán kính tăng theo mức zoom (MapLibre yêu cầu ["zoom"] nằm ngoài cùng); chấm đang chọn to hơn
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, ["case", selected, 7, 4.5], 12, ["case", selected, 12, 8]],
          // Sự kiện gần nhất (Quanh đây) có viền vàng nổi bật
          "circle-stroke-color": ["case", nearestState, "#facc15", "#ffffff"],
          "circle-stroke-width": ["case", nearestState, 4, selected, 3, hovered, 2.5, 1.5],
        },
      });

      // Nhãn các đặc khu (Hoàng Sa, Trường Sa, Phú Quốc...) bằng HTML, không cần font bản đồ
      // Ở mức xem toàn quốc chỉ hiện nhãn đặc khu xa đất liền của tỉnh (> 1,5 độ), tránh chồng chữ;
      // phóng gần (zoom >= 7) thì hiện tất cả.
      const zones: GeoJSON.FeatureCollection<GeoJSON.Point> = await (await fetch("/geo/special-zones.json")).json();
      const nearShoreLabels: HTMLElement[] = [];
      for (const z of zones.features) {
        const [lng, lat] = z.geometry.coordinates;
        const el = document.createElement("div");
        el.className = "special-zone-label";
        el.textContent = String(z.properties?.fullName);
        const box = provincesRef.current.get(String(z.properties?.provinceCode))?.focusBbox;
        const offshore = box ? Math.max(box[0] - lng, lng - box[2], box[1] - lat, lat - box[3]) : 0;
        if (offshore < 1.5) nearShoreLabels.push(el);
        new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      }
      const updateLabels = () => {
        const show = map.getZoom() >= 7;
        for (const el of nearShoreLabels) el.style.visibility = show ? "visible" : "hidden";
      };
      map.on("zoom", updateLabels);
      updateLabels();
      setMapReady(true);
    });

    map.on("mousemove", (e) => {
      if (isTouchDevice()) return;
      setHover(pick(e.point), e.point);
    });
    map.getCanvas().addEventListener("mouseleave", () => setHover(null));

    map.on("click", (e) => {
      // Chế độ "chọn điểm trên bản đồ" cho Quanh đây: lấy tọa độ, không chọn tỉnh/sự kiện
      if (propsRef.current.pickMode) {
        propsRef.current.onPickPoint({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        return;
      }
      const picked = pick(e.point);
      if (!picked) {
        setHover(null);
        lastTapId = null;
        return;
      }
      if (isTouchDevice() && lastTapId !== `${picked.source}:${picked.feature.id}`) {
        // Chạm lần 1: chỉ hiện tên
        lastTapId = `${picked.source}:${picked.feature.id}`;
        setHover(picked, e.point);
        return;
      }
      lastTapId = null;
      setHover(null);
      select(picked);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2) Khi đổi tỉnh được chọn: phóng tới tỉnh, làm mờ tỉnh khác, nạp ranh giới xã/phường của riêng tỉnh đó
  const provinceCode = selectedProvince?.code ?? null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const wardsSource = map.getSource("wards") as maplibregl.GeoJSONSource;
    let cancelled = false;

    if (!provinceCode) {
      map.setPaintProperty("province-fill", "fill-color", ["case", hovered, "#f59e0b", "#fef3c7"]);
      map.setPaintProperty("province-fill", "fill-opacity", ["case", hovered, 0.85, 0.7]);
      wardsSource.setData(EMPTY_FC);
      map.fitBounds(VIETNAM_BOUNDS, { padding: focusPadding(), duration: 800 });
      return;
    }
    const isSelected: ExpressionSpecification = ["==", ["get", "code"], provinceCode];
    // Tỉnh khác bị làm mờ (độ đậm thấp); tỉnh đang chọn được phủ bởi lớp xã/phường
    map.setPaintProperty("province-fill", "fill-color", ["case", isSelected, "#fef3c7", hovered, "#fcd34d", "#d4d4d8"]);
    map.setPaintProperty("province-fill", "fill-opacity", ["case", isSelected, 0.7, hovered, 0.6, 0.35]);
    wardsSource.setData(EMPTY_FC);
    fetch(`/geo/wards/${provinceCode}.json`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) wardsSource.setData(data);
      });
    const province = provincesRef.current.get(provinceCode);
    if (province) map.fitBounds(province.focusBbox, { padding: focusPadding(), duration: 1000 });
    return () => {
      cancelled = true;
    };
  }, [provinceCode, mapReady]);

  // 3) Đánh dấu xã/phường đang chọn
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.removeFeatureState({ source: "wards" });
    if (selectedWardCode) map.setFeatureState({ source: "wards", id: Number(selectedWardCode) }, { selected: true });
  }, [selectedWardCode, provinceCode, mapReady]);

  // 4) Cập nhật điểm sự kiện khi danh sách đổi (theo tỉnh, xã/phường, bộ lọc, tìm kiếm)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    (map.getSource("events") as maplibregl.GeoJSONSource).setData(eventsToGeoJSON(events));
  }, [events, mapReady]);

  // 5) Sự kiện đang chọn: phóng chấm to và đưa vào giữa khung nhìn
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    // Chỉ xóa trạng thái "selected" của chấm cũ (giữ nguyên trạng thái "nearest")
    if (prevSelectedRef.current !== null) {
      map.setFeatureState({ source: "events", id: prevSelectedRef.current }, { selected: false });
    }
    prevSelectedRef.current = selectedEventId;
    if (selectedEventId === null) return;
    map.setFeatureState({ source: "events", id: selectedEventId }, { selected: true });
    const event = propsRef.current.events.find((e) => e.id === selectedEventId);
    if (event) {
      map.easeTo({ center: [event.lng, event.lat], zoom: Math.max(map.getZoom(), 12), padding: focusPadding(), duration: 800 });
    }
  }, [selectedEventId, mapReady]);

  // 6) Quanh đây: vẽ vòng tròn bán kính, căn khung theo vòng tròn
  const nearby = props.nearby;
  const nearbyKey = nearby?.center ? `${nearby.center.lat},${nearby.center.lng},${nearby.radiusKm}` : null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const area = map.getSource("nearby-area") as maplibregl.GeoJSONSource;
    const center = map.getSource("nearby-center") as maplibregl.GeoJSONSource;
    const current = propsRef.current.nearby;
    if (!current?.center) {
      area.setData(EMPTY_FC);
      center.setData(EMPTY_FC);
      return;
    }
    const ring = circleRing(current.center, current.radiusKm);
    area.setData({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } });
    center.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [current.center.lng, current.center.lat] },
    });
    const lngs = ring.map((c) => c[0]);
    const lats = ring.map((c) => c[1]);
    map.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)], {
      padding: focusPadding(),
      duration: 800,
    });
  }, [nearbyKey, mapReady]);

  // 7) Tô nổi sự kiện gần nhất
  const nearestId = nearby?.nearestId ?? null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (prevNearestRef.current !== null) {
      map.setFeatureState({ source: "events", id: prevNearestRef.current }, { nearest: false });
    }
    prevNearestRef.current = nearestId;
    if (nearestId !== null) map.setFeatureState({ source: "events", id: nearestId }, { nearest: true });
  }, [nearestId, mapReady]);

  // Con trỏ hình chữ thập khi đang chọn điểm
  useEffect(() => {
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = props.pickMode ? "crosshair" : "";
  }, [props.pickMode]);

  return (
    <div className="relative h-full w-full">
      {/* Không dùng absolute: CSS của MapLibre đặt khung bản đồ là position: relative */}
      <div ref={containerRef} className="h-full w-full" />
      {hoverLabel && (
        <div
          data-testid="hover-label"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded bg-zinc-900/85 px-2 py-1 text-sm font-medium whitespace-nowrap text-white shadow"
          style={{ left: hoverLabel.x, top: hoverLabel.y - 12 }}
        >
          {hoverLabel.text}
        </div>
      )}
    </div>
  );
}
