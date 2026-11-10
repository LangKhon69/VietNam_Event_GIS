"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { api } from "@/lib/api";

maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type PickedLocation = {
  lat: number;
  lng: number;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
};

type Props = {
  value: { lat: number; lng: number } | null;
  onChange: (point: { lat: number; lng: number }) => void;
  /** Kết quả kiểm tra ranh giới (null = chưa ghim hoặc ngoài ranh giới) */
  onLocated: (loc: PickedLocation | null, error: string | null) => void;
};

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

// Bản đồ nhỏ để ghim vị trí: bấm lên bản đồ, kéo ghim, hoặc dùng GPS.
// Mỗi lần đổi vị trí sẽ hỏi API /api/geo/locate (PostGIS ST_Covers) xem điểm thuộc tỉnh, xã/phường nào.
export default function PinPicker({ value, onChange, onLocated }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const loadedProvince = useRef<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  const onLocatedRef = useRef(onLocated);
  useEffect(() => {
    onChangeRef.current = onChange;
    onLocatedRef.current = onLocated;
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#dbeafe" } }] },
      bounds: [102, 8, 110, 23.5],
      attributionControl: false,
      dragRotate: false,
    });
    mapRef.current = map;
    (window as unknown as { __vegisPinMap: maplibregl.Map }).__vegisPinMap = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("provinces", { type: "geojson", data: "/geo/provinces.json" });
      map.addSource("wards", { type: "geojson", data: EMPTY_FC });
      map.addLayer({ id: "p-fill", type: "fill", source: "provinces", paint: { "fill-color": "#fef3c7", "fill-opacity": 0.8 } });
      map.addLayer({ id: "w-line", type: "line", source: "wards", paint: { "line-color": "#a16207", "line-width": 0.6 } });
      map.addLayer({ id: "p-line", type: "line", source: "provinces", paint: { "line-color": "#92400e", "line-width": 1 } });
    });
    map.on("click", (e) => onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    return () => map.remove();
  }, []);

  // Khi vị trí đổi: đặt ghim, kiểm tra ranh giới, nạp ranh giới xã/phường của tỉnh đó để dễ định hướng
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ draggable: true, color: "#dc2626" }).setLngLat(value).addTo(map);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLngLat();
        onChangeRef.current({ lat: ll.lat, lng: ll.lng });
      });
    } else {
      markerRef.current.setLngLat(value);
    }
    const controller = new AbortController();
    api<Omit<PickedLocation, "lat" | "lng">>("/api/geo/locate", { params: value, signal: controller.signal })
      .then((loc) => {
        onLocatedRef.current({ ...loc, ...value }, null);
        if (loadedProvince.current !== loc.provinceCode && map.getSource("wards")) {
          loadedProvince.current = loc.provinceCode;
          (map.getSource("wards") as maplibregl.GeoJSONSource).setData(`/geo/wards/${loc.provinceCode}.json`);
        }
      })
      .catch((err: Error) => err.name !== "AbortError" && onLocatedRef.current(null, err.message));
    return () => controller.abort();
  }, [value]);

  const useGps = () => {
    setGpsError(null);
    if (!navigator.geolocation) return setGpsError("Trình duyệt không hỗ trợ định vị");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChangeRef.current(point);
        mapRef.current?.flyTo({ center: point, zoom: 15 });
      },
      () => setGpsError("Không lấy được vị trí (bạn đã chặn quyền vị trí, hoặc trang không chạy trên HTTPS/localhost)"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-1">
      <div className="relative h-72 overflow-hidden rounded-lg border border-zinc-300">
        <div ref={containerRef} data-testid="pin-map" className="h-full w-full" />
        <button
          type="button"
          onClick={useGps}
          className="absolute bottom-2 left-2 rounded-lg bg-white px-2 py-1 text-sm shadow hover:bg-zinc-50"
        >
          📍 Dùng vị trí hiện tại (GPS)
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Bấm lên bản đồ để ghim, kéo ghim để chỉnh. Phóng to để thấy ranh giới xã/phường. (Chưa có bản đồ nền đường phố.)
      </p>
      {gpsError && <p className="text-xs text-red-600">{gpsError}</p>}
    </div>
  );
}
