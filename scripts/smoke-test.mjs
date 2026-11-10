// Kiểm thử khói: mở web thật bằng trình duyệt, chạy lại kịch bản demo, chụp ảnh màn hình.
// Yêu cầu: web đang chạy (mặc định http://localhost:3000).
// Chạy: npm run smoke   (ảnh lưu ở docs/screenshots/)
import fs from "node:fs";
import path from "node:path";
import { launchBrowser, waitForMapIdle, lngLatToPagePoint } from "./lib/browser.mjs";

const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";
const shotsDir = path.resolve(import.meta.dirname, "../docs/screenshots");
fs.mkdirSync(shotsDir, { recursive: true });

// Tọa độ dùng để thử (chỉ dùng trong kiểm thử): 1 điểm trong Hà Nội (Ba Vì), xa các chấm sự kiện
// để rê/bấm trúng tỉnh chứ không trúng sự kiện; và 1 điểm ở Hà Đông để chọn xã/phường.
const HANOI = [105.38, 21.1];
const HANOI_WARD = [105.77, 20.96];
const SON_LA = [104.0, 21.2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const textOf = (p, testId) =>
  p.evaluate((id) => document.querySelector(`[data-testid=${id}]`)?.textContent?.trim() ?? "", testId);

// Chờ số sự kiện trong danh sách thỏa điều kiện (danh sách tải lại sau khi đổi bộ lọc)
async function waitForEventCount(p, predicate, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const n = await p.$$eval("[data-testid=event-item]", (els) => els.length);
    if (predicate(n)) return n;
    await sleep(150);
  }
  return -1;
}

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

  const wardPoint = await lngLatToPagePoint(page, HANOI_WARD);
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

  console.log("4. Sự kiện: danh sách theo xã/phường và tỉnh, lọc, tìm kiếm, thẻ sự kiện");
  await sleep(500);
  const wardEvents = await page.$$eval("[data-testid=event-item]", (els) => els.map((e) => e.textContent));
  check(wardEvents.every((t) => t.includes(wardName)), `Danh sách chỉ có sự kiện của ${wardName} (${wardEvents.length})`);
  await page.click("[data-testid=ward-name] + button");
  await waitForEventCount(page, (n) => n >= 5);
  const hnEvents = await page.$$eval("[data-testid=event-item]", (els) => els.map((e) => e.textContent));
  check(hnEvents.length >= 5 && hnEvents.every((t) => t.includes("Hà Nội")), `Bỏ chọn xã: danh sách cả Hà Nội (${hnEvents.length} sự kiện)`);
  const mapDots = await page.evaluate(() => window.__vegisMap.querySourceFeatures("events").length);
  check(mapDots === hnEvents.length, `Bản đồ vẽ đúng ${mapDots} điểm sự kiện`);

  await page.type("[data-testid=search-input]", "acoustic");
  await waitForEventCount(page, (n) => n === 1);
  check((await textOf(page, "event-list")).includes("acoustic"), "Tìm 'acoustic' ra đúng 1 sự kiện");
  await page.$eval("[data-testid=search-input]", (el) => el.select());
  await page.keyboard.press("Backspace");
  await waitForEventCount(page, (n) => n >= 5);

  await page.click("[data-testid=filter-live]");
  await sleep(800);
  const liveStatuses = await page.$$eval("[data-testid=event-list] [data-testid=status-badge]", (els) => els.map((e) => e.dataset.status));
  check(liveStatuses.length >= 1 && liveStatuses.every((s) => s === "live"), `Lọc "Đang diễn ra": ${liveStatuses.length} sự kiện, đều LIVE`);
  await page.click("[data-testid=filter-all]");
  await waitForEventCount(page, (n) => n >= 5);
  const allStatuses = new Set(await page.$$eval("[data-testid=event-list] [data-testid=status-badge]", (els) => els.map((e) => e.dataset.status)));
  check(allStatuses.size === 3, `Trạng thái tự tính: ${[...allStatuses].join(", ")}`);

  const firstTitle = await page.$eval("[data-testid=event-item] p", (el) => el.textContent);
  await page.click("[data-testid=event-item]");
  await page.waitForSelector("[data-testid=event-card]");
  check((await textOf(page, "event-card-title")) === firstTitle, `Bấm dòng trong danh sách mở thẻ "${firstTitle}"`);
  await sleep(1000);
  await waitForMapIdle(page);
  // Bấm 1 chấm sự kiện khác trên bản đồ
  const dot = await page.evaluate((current) => {
    const map = window.__vegisMap;
    const r = map.getCanvas().getBoundingClientRect();
    const panel = document.querySelector("[data-testid=side-panel]").getBoundingClientRect();
    // Chỉ chọn chấm nằm trong phần bản đồ không bị bảng bên che
    for (const f of map.queryRenderedFeatures({ layers: ["event-circle"] })) {
      const p = map.project(f.geometry.coordinates);
      const x = r.left + p.x;
      const y = r.top + p.y;
      if (f.properties.title !== current && x > panel.right + 10 && x < r.right - 60 && y > r.top + 10 && y < r.bottom - 10) {
        return { x, y, title: f.properties.title };
      }
    }
    return null;
  }, firstTitle);
  if (dot) {
    await page.mouse.click(dot.x, dot.y);
    await sleep(500);
    check((await textOf(page, "event-card-title")) === dot.title, `Bấm chấm trên bản đồ mở thẻ "${dot.title}"`);
  } else check(false, "Không thấy chấm sự kiện nào khác trên bản đồ");
  await sleep(900);
  await page.screenshot({ path: path.join(shotsDir, "05-su-kien.png") });

  await page.click("[data-testid=back-button]");
  await sleep(1200);
  await waitForMapIdle(page);
  const afterBack = await page.evaluate(() => ({
    province: !!document.querySelector("[data-testid=province-name]"),
    zoom: window.__vegisMap.getZoom(),
    count: Number(document.querySelector("[data-testid=event-count]")?.textContent.replace(/\D/g, "")),
  }));
  check(!afterBack.province && afterBack.zoom < 6, `Nút "Toàn quốc" quay về cả nước (zoom ${afterBack.zoom.toFixed(1)})`);
  check(afterBack.count >= 20, `Toàn quốc có ${afterBack.count} sự kiện`);

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
  // Chạm vào Sơn La (không có sự kiện mẫu, màn hình điện thoại nhỏ nên tránh vùng có chấm sự kiện)
  const tap = await lngLatToPagePoint(mobile, SON_LA);
  await mobile.touchscreen.tap(tap.x, tap.y);
  await new Promise((r) => setTimeout(r, 400));
  const firstTap = { label: await textOf(mobile, "hover-label"), panel: await mobile.$("[data-testid=province-name]") };
  check(firstTap.label.includes("Sơn La") && !firstTap.panel, `Chạm lần 1 chỉ hiện tên "${firstTap.label}"`);
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
