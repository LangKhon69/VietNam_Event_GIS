// Mở trình duyệt Edge/Chrome có sẵn trên máy bằng puppeteer-core để kiểm thử giao diện.
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const CANDIDATES = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

export async function launchBrowser() {
  const executablePath = CANDIDATES.find((p) => fs.existsSync(p));
  if (!executablePath) throw new Error("Không tìm thấy Edge/Chrome. Đặt biến BROWSER_PATH tới file chạy trình duyệt.");
  return puppeteer.launch({
    executablePath,
    headless: true,
    // swiftshader: vẽ WebGL bằng CPU, để bản đồ MapLibre chạy được khi không có GPU
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--window-size=1280,800"],
    defaultViewport: { width: 1280, height: 800 },
  });
}

// Chờ bản đồ (được gắn vào window.__vegisMap) đã thêm đủ các lớp, vẽ xong và hết chuyển động.
// Lớp "event-circle" được thêm cuối cùng, sau khi tải xong GeoJSON tỉnh.
export async function waitForMapIdle(page, timeout = 60000) {
  await page.waitForFunction(
    () => window.__vegisMap?.getLayer("event-circle") && window.__vegisMap.loaded() && !window.__vegisMap.isMoving(),
    { timeout },
  );
  await page.evaluate(
    () => new Promise((resolve) => (window.__vegisMap.areTilesLoaded() ? resolve() : window.__vegisMap.once("idle", resolve))),
  );
}

// Đổi tọa độ [kinh độ, vĩ độ] thành vị trí pixel trên trang
export async function lngLatToPagePoint(page, lngLat) {
  return page.evaluate((ll) => {
    const map = window.__vegisMap;
    const p = map.project(ll);
    const rect = map.getCanvas().getBoundingClientRect();
    return { x: rect.left + p.x, y: rect.top + p.y };
  }, lngLat);
}
