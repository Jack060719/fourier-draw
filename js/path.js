// 傅立葉畫圖機：軌跡處理
// 純函式：不碰 DOM、不修改傳入的資料。

// 筆畫外框對角線至少要這麼長（邏輯座標，畫布寬 1000）才算有效
const MIN_STROKE_SIZE = 40;
const MIN_STROKE_POINTS = 10;

/** 去掉連續重複的點，避免長度為 0 的線段 */
function removeDuplicates(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) out.push(p);
  }
  return out;
}

/** 筆畫是否夠長、夠大，值得做 DFT */
function isValidStroke(rawPoints) {
  const points = removeDuplicates(rawPoints);
  if (points.length < MIN_STROKE_POINTS) return false;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return Math.hypot(maxX - minX, maxY - minY) >= MIN_STROKE_SIZE;
}

/**
 * 把手繪軌跡補上首尾連線形成閉合曲線，再按弧長等距取樣 n 點。
 * 第 0 點是筆畫起點；第 n - 1 點之後回到起點（不重複放起點）。
 * @param {{x:number, y:number}[]} rawPoints 至少 2 個不同的點
 */
function closeAndResample(rawPoints, n) {
  const points = removeDuplicates(rawPoints);
  const loop = points.concat([points[0]]);

  // 每個點到起點的累計弧長
  const cumulative = [0];
  for (let i = 1; i < loop.length; i++) {
    const dx = loop[i].x - loop[i - 1].x;
    const dy = loop[i].y - loop[i - 1].y;
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
  }
  const total = cumulative[cumulative.length - 1];

  const out = [];
  let seg = 0;
  for (let j = 0; j < n; j++) {
    const target = (total * j) / n;
    while (seg < loop.length - 2 && cumulative[seg + 1] < target) seg++;
    const length = cumulative[seg + 1] - cumulative[seg];
    const u = length > 0 ? (target - cumulative[seg]) / length : 0;
    out.push({
      x: loop[seg].x + (loop[seg + 1].x - loop[seg].x) * u,
      y: loop[seg].y + (loop[seg + 1].y - loop[seg].y) * u,
    });
  }
  return out;
}
