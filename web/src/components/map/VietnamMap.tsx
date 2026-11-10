"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { MapGeoJSONFeature, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Khung nhìn toàn quốc, gồm cả Hoàng Sa (~112°E) và Trường Sa (~117°E)
const VIETNAM_BOUNDS: [[number, number], [number, number]] = [
  [101.5, 6.8],
  [118.2, 23.6],
];

// Style tối giản: không có bản đồ nền, chỉ một lớp màu biển.
// Các lớp ranh giới được thêm sau khi bản đồ tải xong.
const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#dbeafe" } }],
};

// Worker là luồng phụ của MapLibre để xử lý dữ liệu không làm đơ giao diện.
// File được chép vào public/ bởi scripts/copy-maplibre-worker.mjs.
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type HoverLabel = { x: number; y: number; text: string } | null;

export default function VietnamMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverLabel, setHoverLabel] = useState<HoverLabel>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      bounds: VIETNAM_BOUNDS,
      fitBoundsOptions: { padding: 20 },
      attributionControl: false,
      dragRotate: false,
    });
    // Gắn bản đồ vào window để script kiểm thử (scripts/smoke-test.mjs) điều khiển được
    (window as unknown as { __vegisMap: maplibregl.Map }).__vegisMap = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({
        customAttribution: "Ranh giới: vietnamese-provinces-database (MIT)",
      }),
    );

    // id của tỉnh đang được rê chuột, để tắt hiệu ứng khi chuyển sang tỉnh khác
    let hoveredId: number | string | undefined;

    map.on("load", () => {
      map.addSource("provinces", { type: "geojson", data: "/geo/provinces.json" });

      // Lớp tô màu: sáng hơn khi feature-state "hover" = true
      map.addLayer({
        id: "province-fill",
        type: "fill",
        source: "provinces",
        paint: {
          "fill-color": ["case", ["boolean", ["feature-state", "hover"], false], "#f59e0b", "#fef3c7"],
          "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.85, 0.7],
        },
      });
      // Lớp đường viền tỉnh
      map.addLayer({
        id: "province-line",
        type: "line",
        source: "provinces",
        paint: {
          "line-color": ["case", ["boolean", ["feature-state", "hover"], false], "#b45309", "#92400e"],
          "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.5, 0.8],
        },
      });
    });

    const clearHover = () => {
      if (hoveredId !== undefined) map.setFeatureState({ source: "provinces", id: hoveredId }, { hover: false });
      hoveredId = undefined;
      setHoverLabel(null);
      map.getCanvas().style.cursor = "";
    };

    map.on("mousemove", "province-fill", (e) => {
      const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
      if (!feature) return;
      if (hoveredId !== feature.id) {
        clearHover();
        hoveredId = feature.id;
        map.setFeatureState({ source: "provinces", id: hoveredId! }, { hover: true });
      }
      map.getCanvas().style.cursor = "pointer";
      // Tên tỉnh lấy từ dữ liệu GeoJSON, không viết cứng trong mã
      setHoverLabel({ x: e.point.x, y: e.point.y, text: String(feature.properties.fullName) });
    });
    map.on("mouseleave", "province-fill", clearHover);

    return () => map.remove();
  }, []);

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
