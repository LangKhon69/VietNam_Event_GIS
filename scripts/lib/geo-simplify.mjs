// Đơn giản hóa hình học GeoJSON để gửi cho trình duyệt nhẹ hơn.
// Douglas–Peucker: giữ lại các điểm "quan trọng" (lệch khỏi đường thẳng nối 2 đầu
// nhiều hơn `tolerance` độ), bỏ các điểm gần như thẳng hàng.

// Bình phương khoảng cách từ điểm p tới đoạn thẳng a-b
function sqSegmentDistance(p, a, b) {
  let [x, y] = a;
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) [x, y] = b;
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

function douglasPeucker(points, sqTolerance) {
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSqDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegmentDistance(points[i], points[first], points[last]);
      if (d > maxSqDist) { maxSqDist = d; index = i; }
    }
    if (maxSqDist > sqTolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const round = (n, digits) => Math.round(n * 10 ** digits) / 10 ** digits;

// Đơn giản hóa 1 vòng (ring) đa giác. Đảo nhỏ có thể bị co còn < 4 điểm:
// khi đó giữ vòng gốc (chỉ làm tròn) để không làm mất đảo như Hoàng Sa, Trường Sa.
function simplifyRing(ring, tolerance, digits) {
  const rounded = ring.map(([x, y]) => [round(x, digits), round(y, digits)]);
  const simplified = douglasPeucker(rounded, tolerance * tolerance);
  return simplified.length >= 4 ? simplified : rounded;
}

export function simplifyGeometry(geometry, tolerance, digits = 5) {
  const polygon = (rings) => rings.map((r) => simplifyRing(r, tolerance, digits));
  if (geometry.type === "Polygon") return { type: "Polygon", coordinates: polygon(geometry.coordinates) };
  if (geometry.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: geometry.coordinates.map(polygon) };
  }
  throw new Error(`Không hỗ trợ kiểu hình học ${geometry.type}`);
}

export function countPoints(geometry) {
  let n = 0;
  const walk = (a) => (typeof a[0] === "number" ? n++ : a.forEach(walk));
  walk(geometry.coordinates);
  return n;
}
