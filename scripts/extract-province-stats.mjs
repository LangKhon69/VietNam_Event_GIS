// Trích dân số, diện tích, trung tâm hành chính của 34 tỉnh/thành từ 2 bảng Wikipedia
// (đã tải về data/raw/wiki/*.json qua MediaWiki API), khớp với mã tỉnh của bộ dữ liệu
// vietnamese-provinces-database, rồi ghi ra data/province-stats.json (file này được commit).
//
// Chạy: node scripts/extract-province-stats.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const raw = (p) => path.join(root, "data/raw", p);

// Chuẩn hóa tên để so khớp: bỏ dấu, viết thường ("Khánh Hoà" == "Khánh Hòa")
const normalize = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d")
    .toLowerCase().replace(/^(thanh pho|tinh)\s+/, "").trim();

// "6.772,59" -> 6772.59 ; "14.002.598" -> 14002598
const parseVnNumber = (s) => Number(s.replace(/\./g, "").replace(",", "."));

// Lấy chữ hiển thị của liên kết wiki: [[A|B]] -> B, [[A]] -> A, bỏ thẻ <center>, {{Nowrap|x}}
const cleanCell = (s) =>
  s.replace(/<\/?center>/g, "")
    .replace(/\{\{Nowrap\|([^}]*)\}\}/gi, "$1")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .trim();

function readWikitext(file) {
  return JSON.parse(fs.readFileSync(raw(file), "utf8")).parse.wikitext;
}

// Tách bảng wiki đầu tiên chứa `marker` thành các hàng, mỗi hàng là mảng ô
function parseTable(wikitext, marker) {
  const start = wikitext.indexOf("{|", wikitext.indexOf(marker) - 4000);
  const end = wikitext.indexOf("\n|}", start);
  const body = wikitext.slice(start, end);
  return body
    .split("\n|-")
    .slice(1)
    .map((row) =>
      row.split("\n").filter((l) => l.startsWith("|") && !l.startsWith("|+")).map((l) => cleanCell(l.slice(1))),
    )
    .filter((cells) => cells.length >= 5 && !cells[0].startsWith("!"));
}

// Danh sách tỉnh chuẩn (mã + tên) lấy từ bộ dữ liệu hành chính, không viết cứng
const units = JSON.parse(fs.readFileSync(raw("full_units.json"), "utf8"));
const byName = new Map(units.map((u) => [normalize(u.Name), u]));

const stats = [];
const addRow = (name, area, population, adminCenter) => {
  const unit = byName.get(normalize(name));
  if (!unit) throw new Error(`Không khớp được tên tỉnh: ${name}`);
  // Đếm xã/phường/đặc khu từ bộ dữ liệu hành chính (không lấy từ Wikipedia)
  const countType = (type) => unit.Wards.filter((w) => w.AdministrativeUnitShortName === type).length;
  stats.push({
    code: unit.Code,
    name: unit.Name,
    fullName: unit.FullName,
    areaKm2: parseVnNumber(area),
    population: parseVnNumber(population),
    adminCenter: adminCenter ?? null,
    wardCount: unit.Wards.length,
    wardTypes: { phuong: countType("Phường"), xa: countType("Xã"), dacKhu: countType("Đặc khu") },
  });
};

// Bảng 25 tỉnh: STT | Tên | Diện tích | Dân số | Mật độ | Phường | Xã | Đặc khu | Trung tâm
for (const c of parseTable(readWikitext("wiki/tinh.json"), "Dưới đây là bảng liệt kê gồm 25 tỉnh")) {
  addRow(c[1], c[2], c[3], c[8]);
}
// Bảng 9 thành phố: Tên | Vùng | Năm | Diện tích | Dân số | ...
for (const c of parseTable(readWikitext("wiki/thanh-pho.json"), "! rowspan=\"2\" |Vùng")) {
  addRow(c[0], c[3], c[4], null);
}

if (stats.length !== units.length) {
  throw new Error(`Cần ${units.length} tỉnh nhưng chỉ trích được ${stats.length}`);
}
stats.sort((a, b) => a.code.localeCompare(b.code));

const out = {
  // Mô tả nguồn để hiển thị trên giao diện
  source: {
    label: "Nghị quyết 202/2025/QH15 (số liệu đề án sắp xếp, tổng hợp bởi Tuổi Trẻ 13/5/2025, qua Wikipedia tiếng Việt)",
    year: 2025,
    urls: [
      "https://vi.wikipedia.org/wiki/T%E1%BB%89nh_(Vi%E1%BB%87t_Nam)",
      "https://vi.wikipedia.org/wiki/Th%C3%A0nh_ph%E1%BB%91_tr%E1%BB%B1c_thu%E1%BB%99c_trung_%C6%B0%C6%A1ng_(Vi%E1%BB%87t_Nam)",
      "https://tuoitre.vn/chi-tiet-du-kien-quy-mo-dan-so-dien-tich-kinh-te-cua-34-tinh-thanh-sau-sap-nhap-20250513081155167.htm",
    ],
  },
  // Nguồn số xã/phường
  adminSource: {
    label: "vietnamese-provinces-database (Quyết định 19/2025/QĐ-TTg và các nghị quyết cập nhật)",
    version: JSON.parse(fs.readFileSync(raw("vn_provinces_metadata.json"), "utf8")).DatasetVersion,
    url: "https://github.com/thanglequoc/vietnamese-provinces-database",
  },
  provinces: stats,
};
const json = JSON.stringify(out, null, 2) + "\n";
fs.writeFileSync(path.join(root, "data/province-stats.json"), json);
// Bản sao cho web dùng trực tiếp ở Bước 3 (trước khi có API)
fs.mkdirSync(path.join(root, "web/public/data"), { recursive: true });
fs.writeFileSync(path.join(root, "web/public/data/province-stats.json"), json);
console.log(`Đã ghi ${stats.length} tỉnh vào data/province-stats.json và web/public/data/`);
