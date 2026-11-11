// Kiểm thử khói: mở web thật bằng trình duyệt, chạy lại kịch bản demo, chụp ảnh màn hình.
// Yêu cầu: web đang chạy (mặc định http://localhost:3100).
// Chạy: npm run smoke   (ảnh lưu ở docs/screenshots/)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { launchBrowser, waitForMapIdle, lngLatToPagePoint } from "./lib/browser.mjs";

const WEB_URL = process.env.WEB_URL ?? "http://localhost:3100";
const shotsDir = path.resolve(import.meta.dirname, "../docs/screenshots");
fs.mkdirSync(shotsDir, { recursive: true });

// Tọa độ dùng để thử (chỉ dùng trong kiểm thử): 1 điểm trong Hà Nội (Ba Vì), xa các chấm sự kiện
// để rê/bấm trúng tỉnh chứ không trúng sự kiện; và 1 điểm ở Hà Đông để chọn xã/phường.
const HANOI = [105.38, 21.1];
const HANOI_WARD = [105.77, 20.96];
const SON_LA = [104.0, 21.2];
const HO_GUOM = [105.8523, 21.0288];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const textOf = (p, testId) =>
  p.evaluate((id) => document.querySelector(`[data-testid=${id}]`)?.textContent?.trim() ?? "", testId);

// Chờ số sự kiện trong danh sách thỏa điều kiện (danh sách tải lại sau khi đổi bộ lọc)
async function waitForEventCount(p, predicate, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const n = await p.$$eval("[data-testid=event-item]", (els) => els.length);
    if (predicate(n)) return n;
    await sleep(150);
  }
  return -1;
}

// Đọc file .env đơn giản (KEY=VALUE) thành object
function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
}
const repoRoot = path.resolve(import.meta.dirname, "..");
const apiEnv = readEnv(path.join(repoRoot, "api/.env"));

// Xóa dữ liệu do smoke test tạo ra (tài khoản smoke-*@example.com và mọi thứ họ đăng),
// chạy psql bên trong container CSDL để không cần cài thêm thư viện.
function cleanupSmokeData() {
  const smokeUsers = "SELECT id FROM users WHERE email LIKE 'smoke-%@example.com'";
  const sql = `
    DELETE FROM moderation_logs WHERE (target_type = 'user' AND target_id IN (${smokeUsers}))
      OR (target_type = 'event' AND target_id IN (SELECT id FROM events WHERE created_by IN (${smokeUsers})))
      OR (target_type = 'venue' AND target_id IN (SELECT id FROM venues WHERE owner_id IN (${smokeUsers})));
    DELETE FROM events WHERE created_by IN (${smokeUsers});
    DELETE FROM venues WHERE owner_id IN (${smokeUsers});
    DELETE FROM users WHERE email LIKE 'smoke-%@example.com';`;
  const env = readEnv(path.join(repoRoot, ".env"));
  try {
    execFileSync(
      "docker",
      ["compose", "exec", "-T", "db", "psql", "-q", "-U", env.POSTGRES_USER ?? "vegis", "-d", env.POSTGRES_DB ?? "vegis", "-c", sql],
      { cwd: repoRoot, stdio: "pipe" },
    );
    console.log("(Đã dọn dữ liệu kiểm thử)");
  } catch (err) {
    console.log("(Không dọn được dữ liệu kiểm thử: " + String(err.message).split("\n")[0] + ")");
  }
}

// Gán giá trị cho ô input theo cách React nhận biết được (dùng cho ô ngày giờ)
async function setInputValue(p, selector, value) {
  await p.$eval(
    selector,
    (el, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    value,
  );
}

// "2026-11-10T19:00" theo giờ Việt Nam
function vnLocal(ms) {
  return new Date(ms + 7 * 3600e3).toISOString().slice(0, 16);
}

// Bấm lên bản đồ nhỏ ở trang đăng sự kiện
async function clickPinMap(p, lngLat) {
  await p.evaluate(() => new Promise((r) => (window.__vegisPinMap.loaded() ? r() : window.__vegisPinMap.once("idle", r))));
  const pt = await p.evaluate((ll) => {
    const map = window.__vegisPinMap;
    const q = map.project(ll);
    const rect = map.getCanvas().getBoundingClientRect();
    return { x: rect.left + q.x, y: rect.top + q.y };
  }, lngLat);
  await p.mouse.click(pt.x, pt.y);
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
page.on("response", (r) => r.status() >= 400 && consoleErrors.push(`  ↳ ${r.status()} ${r.url().split("?")[0]}`));

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
  // Chờ danh sách tải lại xong (tối đa 10 giây) thay vì chờ một khoảng cố định
  await page
    .waitForFunction(() => {
      const s = [...document.querySelectorAll("[data-testid=event-list] [data-testid=status-badge]")].map((e) => e.dataset.status);
      return s.length > 0 && s.every((x) => x === "live");
    }, { timeout: 10000 })
    .catch(() => null);
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

  console.log("5. Quanh đây và Chỉ đường");
  // Giả lập GPS: cho phép quyền vị trí và đặt vị trí ở Hồ Gươm
  await browser.defaultBrowserContext().overridePermissions(new URL(WEB_URL).origin, ["geolocation"]);
  await page.setGeolocation({ latitude: HO_GUOM[1], longitude: HO_GUOM[0] });
  await page.click("[data-testid=nearby-button]");
  await page.click("[data-testid=nearby-gps]");
  await waitForEventCount(page, (n) => n >= 2);
  await sleep(1200);
  await waitForMapIdle(page);
  const nearbyRows = await page.$$eval("[data-testid=event-item]", (els) =>
    els.map((e) => ({
      text: e.querySelector("[data-testid=event-distance]")?.textContent ?? "",
      status: e.querySelector("[data-testid=status-badge]")?.dataset.status,
    })),
  );
  const meters = nearbyRows.map((r) => (r.text.endsWith(" km") ? parseFloat(r.text.replace(",", ".")) * 1000 : parseFloat(r.text)));
  check(nearbyRows.length >= 2, `Quanh Hồ Gươm 2 km có ${nearbyRows.length} sự kiện: ${nearbyRows.map((r) => r.text).join(", ")}`);
  check(meters.every((m, i) => i === 0 || m >= meters[i - 1]) && meters.every((m) => m <= 2000), "Xếp gần đến xa, đều trong 2 km");
  check(nearbyRows.every((r) => r.status !== "ended"), "Mặc định chỉ sự kiện đang hoặc sắp diễn ra");
  const nearestHighlighted = await page.evaluate(() => {
    const map = window.__vegisMap;
    // 1 chấm có thể xuất hiện trong nhiều ô (tile) nên lọc trùng theo id
    const ids = [...new Set(map.querySourceFeatures("events").map((f) => f.id))];
    return ids.filter((id) => map.getFeatureState({ source: "events", id }).nearest).length;
  });
  check(nearestHighlighted === 1, "Sự kiện gần nhất được tô nổi trên bản đồ");
  const areaDrawn = await page.evaluate(() => window.__vegisMap.querySourceFeatures("nearby-area").length > 0);
  check(areaDrawn, "Vẽ vòng tròn bán kính quét trên bản đồ");
  await page.screenshot({ path: path.join(shotsDir, "06-quanh-day.png") });

  await page.click("[data-testid=event-item]");
  await page.waitForSelector("[data-testid=directions-link]");
  const link = await page.$eval("[data-testid=directions-link]", (a) => ({ href: a.href, target: a.target }));
  const u = new URL(link.href);
  check(
    u.hostname === "www.google.com" && u.searchParams.get("api") === "1" && /^[\d.]+,[\d.]+$/.test(u.searchParams.get("destination")) && !u.searchParams.has("origin"),
    `Chỉ đường: Google Maps, có điểm đến, không có điểm xuất phát (${u.search})`,
  );
  check(u.searchParams.get("travelmode") === "two-wheeler" && link.target === "_blank", "Mặc định xe máy, mở tab mới");
  await page.select("[data-testid=travel-mode]", "walking");
  const walking = await page.$eval("[data-testid=directions-link]", (a) => new URL(a.href).searchParams.get("travelmode"));
  check(walking === "walking", "Đổi phương tiện sang đi bộ");

  // Chọn 1 điểm trên bản đồ ở nơi không có sự kiện gần: gợi ý sự kiện gần nhất
  await page.click("[data-testid=nearby-pick]");
  await page.evaluate(() => window.__vegisMap.jumpTo({ center: [103.47, 22.39], zoom: 10 }));
  await waitForMapIdle(page);
  const far = await lngLatToPagePoint(page, [103.47, 22.39]);
  await page.mouse.click(far.x, far.y);
  await page.waitForSelector("[data-testid=nearby-empty]", { timeout: 5000 }).catch(() => null);
  check(!!(await page.$("[data-testid=nearest-link]")), "Không có gì trong bán kính: gợi ý sự kiện gần nhất");
  await page.click("[data-testid=nearby-exit]");
  await sleep(500);

  console.log("6. Đăng ký và đăng sự kiện (kiểm tra ranh giới ST_Covers)");
  const stamp = Date.now();
  const testEmail = `smoke-${stamp}@example.com`;
  await page.goto(`${WEB_URL}/dang-ky`, { waitUntil: "networkidle2" });
  await page.type("[data-testid=input-name]", "Ca sĩ Smoke Test");
  await page.type("[data-testid=input-email]", testEmail);
  await page.type("[data-testid=input-password]", "matkhau123");
  await page.select("[data-testid=input-role]", "celebrity");
  await page.click("[data-testid=submit]");
  await page.waitForSelector("[data-testid=f-title]", { timeout: 10000 });
  check((await textOf(page, "current-user")).includes("Ca sĩ Smoke Test"), "Đăng ký xong thì đã đăng nhập và vào trang đăng sự kiện");

  await page.type("[data-testid=f-title]", `Đêm nhạc smoke test ${stamp}`);
  await setInputValue(page, "[data-testid=f-start]", vnLocal(Date.now() + 2 * 3600e3));
  await setInputValue(page, "[data-testid=f-end]", vnLocal(Date.now() + 5 * 3600e3));
  await page.type("[data-testid=f-address]", "Phố đi bộ Hồ Gươm");
  await page.waitForFunction(() => window.__vegisPinMap?.loaded());
  // Ghim giữa biển: phải bị từ chối
  await page.evaluate(() => window.__vegisPinMap.jumpTo({ center: [111, 14], zoom: 6 }));
  await clickPinMap(page, [111, 14]);
  await page.waitForFunction(() => document.querySelector("[data-testid=location-check]")?.textContent.startsWith("✗"), { timeout: 5000 }).catch(() => null);
  check((await textOf(page, "location-check")).startsWith("✗"), `Ghim giữa biển bị từ chối: "${await textOf(page, "location-check")}"`);
  // Ghim ở Hồ Gươm: tự gán Hà Nội
  await page.evaluate((c) => window.__vegisPinMap.jumpTo({ center: c, zoom: 14 }), HO_GUOM);
  await clickPinMap(page, HO_GUOM);
  await page.waitForFunction(() => document.querySelector("[data-testid=location-check]")?.textContent.startsWith("✓"), { timeout: 5000 }).catch(() => null);
  const located = await textOf(page, "location-check");
  check(located.startsWith("✓") && located.includes("Hà Nội"), `Ghim ở Hồ Gươm: "${located}"`);
  await page.$eval("[data-testid=location-check]", (el) => el.scrollIntoView({ block: "end" }));
  await sleep(800);
  await page.screenshot({ path: path.join(shotsDir, "07-dang-su-kien.png") });
  await page.click("[data-testid=f-submit]");
  await page.waitForSelector("[data-testid=post-result]", { timeout: 10000 });
  const postResult = await textOf(page, "post-result");
  check(postResult.includes("chờ quản trị viên duyệt"), `Tài khoản chưa xác thực: "${postResult}"`);
  await sleep(500);
  check((await textOf(page, "my-events")).includes("Chờ duyệt"), "Sự kiện của tôi hiện trạng thái Chờ duyệt");

  console.log("7. Quản trị: duyệt sự kiện, xác thực tài khoản");
  const smokeTitle = `Đêm nhạc smoke test ${stamp}`;
  // Đăng xuất người dùng thử, đăng nhập bằng tài khoản admin trong api/.env
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${WEB_URL}/dang-nhap`, { waitUntil: "networkidle2" });
  await page.type("[data-testid=input-email]", apiEnv.ADMIN_EMAIL);
  await page.type("[data-testid=input-password]", apiEnv.ADMIN_PASSWORD);
  await page.click("[data-testid=submit]");
  await page.waitForSelector("[data-testid=pending-events]", { timeout: 10000 });
  await sleep(500);
  const pendingTitles = await page.$$eval("[data-testid=pending-event-title]", (els) => els.map((e) => e.textContent));
  check(pendingTitles.includes(smokeTitle), `Hàng chờ duyệt có ${pendingTitles.length} sự kiện, gồm sự kiện vừa đăng`);
  await page.screenshot({ path: path.join(shotsDir, "08-quan-tri.png") });
  // Bấm "Duyệt" đúng dòng của sự kiện vừa đăng
  await page.$$eval(
    "[data-testid=pending-event]",
    (rows, title) => rows.find((r) => r.textContent.includes(title))?.querySelector("[data-testid=approve-event]")?.click(),
    smokeTitle,
  );
  await page.waitForFunction((t) => !document.body.textContent.includes(t), { timeout: 5000 }, smokeTitle).catch(() => null);
  check(!(await page.$$eval("[data-testid=pending-event-title]", (els) => els.map((e) => e.textContent))).includes(smokeTitle), "Duyệt xong thì rời hàng chờ");
  // Xác thực tài khoản người nổi tiếng vừa đăng ký
  await page.$$eval(
    "[data-testid=verify-user]",
    (rows, email) => rows.find((r) => r.textContent.includes(email))?.querySelector("[data-testid=toggle-verify]")?.click(),
    testEmail,
  );
  await sleep(800);
  const verifiedRow = await page.$$eval("[data-testid=verify-user]", (rows, email) => rows.find((r) => r.textContent.includes(email))?.textContent ?? "", testEmail);
  check(verifiedRow.includes("✔"), "Xác thực người nổi tiếng: có huy hiệu ✔");
  check(await page.evaluate(() => document.body.textContent.includes("duyệt sự kiện")), "Nhật ký kiểm duyệt ghi lại thao tác");

  // Sự kiện đã duyệt hiện trên bản đồ
  await page.goto(WEB_URL, { waitUntil: "networkidle2" });
  await waitForMapIdle(page);
  await page.type("[data-testid=search-input]", String(stamp));
  await waitForEventCount(page, (n) => n === 1);
  check((await textOf(page, "event-list")).includes(smokeTitle), "Sự kiện đã duyệt xuất hiện trên bản đồ công khai");

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
  cleanupSmokeData();
  if (consoleErrors.length) console.log("Lỗi trong console trình duyệt:\n  " + consoleErrors.join("\n  "));
  await browser.close();
}

console.log(failures ? `\nCÓ ${failures} KIỂM TRA LỖI` : "\nTẤT CẢ KIỂM TRA ĐẠT");
process.exit(failures ? 1 : 0);
