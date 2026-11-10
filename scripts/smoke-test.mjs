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

const textOf = (p, testId) =>
  p.evaluate((id) => document.querySelector(`[data-testid=${id}]`)?.textContent?.trim() ?? "", testId);

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

  console.log("2. Cấp xã/phường");
  await page.mouse.click(hanoi.x, hanoi.y);
  await page.waitForSelector("[data-testid=province-name]");
  await waitForMapIdle(page);
  await new Promise((r) => setTimeout(r, 500));
  const panelName = await textOf(page, "province-name");
  check(panelName.includes("Hà Nội"), `Bấm Hà Nội mở bảng "${panelName}"`);
  const wardState = await page.evaluate(() => ({
    zoom: window.__vegisMap.getZoom(),
    wards: new Set(window.__vegisMap.querySourceFeatures("wards").map((f) => f.properties.code)).size,
    otherProvinces: new Set(window.__vegisMap.querySourceFeatures("wards").map((f) => f.properties.provinceCode)).size,
  }));
  check(wardState.zoom > 7, `Đã phóng vào tỉnh (zoom ${wardState.zoom.toFixed(1)})`);

  // Bảng thông tin tỉnh (Bước 3)
  await page.waitForSelector("[data-testid=province-info]");
  const info = await page.evaluate(() =>
    Object.fromEntries(
      ["stat-population", "stat-area", "stat-density", "stat-wards", "stat-source"].map((id) => [
        id,
        document.querySelector(`[data-testid=${id}]`)?.textContent ?? "",
      ]),
    ),
  );
  check(info["stat-population"].includes("8.807.523"), `Dân số Hà Nội: ${info["stat-population"]}`);
  check(info["stat-area"].includes("3.359,82"), `Diện tích: ${info["stat-area"]}`);
  check(/\d/.test(info["stat-density"]), `Mật độ: ${info["stat-density"]}`);
  check(info["stat-wards"] === "126", `Số xã/phường: ${info["stat-wards"]}`);
  check(/2025/.test(info["stat-source"]) && /202\/2025\/QH15/.test(info["stat-source"]), "Có ghi năm và nguồn số liệu");
  check(wardState.wards > 100 && wardState.otherProvinces === 1, `Chỉ nạp xã/phường của Hà Nội (${wardState.wards} đơn vị)`);

  const wardPoint = await lngLatToPagePoint(page, HANOI);
  await page.mouse.move(wardPoint.x + 3, wardPoint.y + 3);
  await new Promise((r) => setTimeout(r, 300));
  const wardTooltip = await textOf(page, "hover-label");
  check(/^(Phường|Xã|Đặc khu) /.test(wardTooltip), `Rê vào xã/phường hiện nhãn "${wardTooltip}"`);
  await page.mouse.click(wardPoint.x + 3, wardPoint.y + 3);
  await page.waitForSelector("[data-testid=ward-name]");
  const wardName = await textOf(page, "ward-name");
  check(wardName === wardTooltip, `Bấm xã/phường thì chọn "${wardName}"`);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(shotsDir, "03-chon-tinh-xa.png") });

  await page.click("[data-testid=back-button]");
  await new Promise((r) => setTimeout(r, 1200));
  await waitForMapIdle(page);
  const afterBack = await page.evaluate(() => ({
    panel: !!document.querySelector("[data-testid=side-panel]"),
    zoom: window.__vegisMap.getZoom(),
  }));
  check(!afterBack.panel && afterBack.zoom < 6, `Nút "Toàn quốc" đóng bảng và thu nhỏ (zoom ${afterBack.zoom.toFixed(1)})`);

  console.log("3. Thiết bị cảm ứng: chạm 1 lần xem tên, chạm lần 2 chọn");
  const mobile = await browser.newPage();
  await mobile.emulate({
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    userAgent: "Mozilla/5.0 (Linux; Android 14) Mobile",
  });
  await mobile.goto(WEB_URL, { waitUntil: "networkidle2" });
  await waitForMapIdle(mobile);
  const hoverNone = await mobile.evaluate(() => window.matchMedia("(hover: none)").matches);
  check(hoverNone, "Trình duyệt giả lập điện thoại báo (hover: none)");
  const tap = await lngLatToPagePoint(mobile, HANOI);
  await mobile.touchscreen.tap(tap.x, tap.y);
  await new Promise((r) => setTimeout(r, 400));
  const firstTap = { label: await textOf(mobile, "hover-label"), panel: await mobile.$("[data-testid=side-panel]") };
  check(firstTap.label.includes("Hà Nội") && !firstTap.panel, `Chạm lần 1 chỉ hiện tên "${firstTap.label}"`);
  await mobile.touchscreen.tap(tap.x, tap.y);
  await mobile.waitForSelector("[data-testid=province-name]", { timeout: 5000 }).catch(() => null);
  check(!!(await mobile.$("[data-testid=province-name]")), "Chạm lần 2 thì chọn tỉnh");
  await waitForMapIdle(mobile);
  await new Promise((r) => setTimeout(r, 500));
  await mobile.screenshot({ path: path.join(shotsDir, "04-dien-thoai.png") });
  await mobile.close();
} catch (err) {
  console.error(err);
  failures++;
} finally {
  if (consoleErrors.length) console.log("Lỗi trong console trình duyệt:\n  " + consoleErrors.join("\n  "));
  await browser.close();
}

console.log(failures ? `\nCÓ ${failures} KIỂM TRA LỖI` : "\nTẤT CẢ KIỂM TRA ĐẠT");
process.exit(failures ? 1 : 0);
