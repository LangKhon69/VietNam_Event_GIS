// Chép file worker của MapLibre vào public/ để trình duyệt tải được ở /maplibre/maplibre-gl-worker.mjs.
// Lý do: MapLibre v6 tự tìm worker nằm cạnh file JS của nó, nhưng sau khi Next.js đóng gói
// thì đường dẫn đó không còn đúng. Script này tự chạy sau mỗi lần `npm install` (postinstall).
import fs from "node:fs";
import path from "node:path";

const webDir = path.resolve(import.meta.dirname, "..");
const source = path.join(webDir, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const targetDir = path.join(webDir, "public/maplibre");
fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, path.join(targetDir, "maplibre-gl-worker.mjs"));
console.log("Đã chép MapLibre worker vào public/maplibre/");
