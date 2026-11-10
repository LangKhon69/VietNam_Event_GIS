// Kiểm thử khói: mở web thật bằng trình duyệt, chạy lại kịch bản demo, chụp ảnh màn hình.
// Yêu cầu: web đang chạy (mặc định http://localhost:3000).
// Chạy: npm run smoke   (ảnh lưu ở docs/screenshots/)
import fs from "node:fs";
import path from "node:path";
import { launchBrowser, waitForMapIdle, lngLatToPagePoint } from "./lib/browser.mjs";

const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";
const shotsDir = path.resolve(import.meta.dirname, "../docs/screenshots");
fs.mkdirSync(shotsDir, { recursive: true });

// Tọa độ dùng để thử (chỉ dùng trong kiểm thử): trung tâm Hà Nội
const HANOI = [105.85, 21.03];

let failures = 0;
function check(condition, message) {
  console.log(`${condition ? "  ĐẠT " : "  LỖI "} ${message}`);
  if (!condition) failures++;
}

const browser = await launchBrowser();
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

try {
  console.log("1. Bản đồ 34 tỉnh");
  await page.goto(WEB_URL, { waitUntil: "networkidle2" });
  await waitForMapIdle(page);
  const provinceCount = await page.evaluate(
    () => new Set(window.__vegisMap.querySourceFeatures("provinces").map((f) => f.properties.code)).size,
  );
  check(provinceCount === 34, `Có 34 tỉnh/thành trên bản đồ (thấy ${provinceCount})`);

  // Hoàng Sa (~112°E) phải thuộc Đà Nẵng, Trường Sa (~114–117°E) thuộc Khánh Hòa
  const islands = await page.evaluate(() => {
    const map = window.__vegisMap;
    // Lấy 1 đỉnh thật của đảo thay vì đoán tọa độ: đỉnh có kinh độ lớn nhất trong mỗi tỉnh
    const features = map.querySourceFeatures("provinces");
    const farthestEast = (code) => {
      let best = null;
      for (const f of features.filter((x) => x.properties.code === code)) {
        const walk = (a) => (typeof a[0] === "number" ? (!best || a[0] > best[0]) && (best = a) : a.forEach(walk));
        walk(f.geometry.coordinates);
      }
      return best;
    };
    return { danang: farthestEast("48"), khanhhoa: farthestEast("56") };
  });
  check(islands.danang && islands.danang[0] > 111, `Đà Nẵng có lãnh thổ tới kinh độ ${islands.danang?.[0]} (Hoàng Sa)`);
  check(islands.khanhhoa && islands.khanhhoa[0] > 114, `Khánh Hòa có lãnh thổ tới kinh độ ${islands.khanhhoa?.[0]} (Trường Sa)`);
  await page.screenshot({ path: path.join(shotsDir, "01-toan-quoc.png") });

  const hanoi = await lngLatToPagePoint(page, HANOI);
  await page.mouse.move(hanoi.x, hanoi.y);
  await new Promise((r) => setTimeout(r, 300));
  const tooltip = await page.evaluate(() => document.querySelector("[data-testid=hover-label]")?.textContent ?? "");
  check(tooltip.includes("Hà Nội"), `Rê chuột vào Hà Nội hiện nhãn "${tooltip}"`);
  await page.screenshot({ path: path.join(shotsDir, "02-hover-tinh.png") });
} catch (err) {
  console.error(err);
  failures++;
} finally {
  if (consoleErrors.length) console.log("Lỗi trong console trình duyệt:\n  " + consoleErrors.join("\n  "));
  await browser.close();
}

console.log(failures ? `\nCÓ ${failures} KIỂM TRA LỖI` : "\nTẤT CẢ KIỂM TRA ĐẠT");
process.exit(failures ? 1 : 0);
