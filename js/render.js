// 傅立葉畫圖機：Canvas 繪製
// 畫布使用固定的邏輯座標：中心為原點，x、y 範圍 ±500。
// 只有這個檔案知道實際像素與 devicePixelRatio。

const LOGICAL_SIZE = 1000;

const COLORS = {
  stroke: '#4fc3f7',      // 手繪中的筆跡
  original: 'rgba(230, 233, 236, 0.18)', // 原圖
  approx: 'rgba(79, 195, 247, 0.30)',    // 完整逼近曲線
  trail: '#4fc3f7',       // 畫筆已走過的軌跡
  circle: 'rgba(230, 233, 236, 0.22)',
  arm: 'rgba(230, 233, 236, 0.70)',
  pen: '#ffd166',
};

/** 建立繪圖物件；canvas 尺寸改變時要再呼叫 resizeView */
function createView(canvas) {
  const view = { canvas, ctx: canvas.getContext('2d'), unit: 1 };
  resizeView(view);
  return view;
}

/** 依 CSS 尺寸與 devicePixelRatio 設定畫布解析度與座標轉換 */
function resizeView(view) {
  const rect = view.canvas.getBoundingClientRect();
  if (rect.width === 0) return;
  const dpr = window.devicePixelRatio || 1;
  view.canvas.width = Math.round(rect.width * dpr);
  view.canvas.height = Math.round(rect.height * dpr);
  const scale = view.canvas.width / LOGICAL_SIZE;
  view.ctx.setTransform(scale, 0, 0, scale, view.canvas.width / 2, view.canvas.height / 2);
  // 1 個 CSS 像素等於多少邏輯單位，用來讓線寬在各種螢幕上一致
  view.unit = LOGICAL_SIZE / rect.width;
}

/**
 * 畫布尺寸或 devicePixelRatio 改變時重設解析度（會清空畫布）。
 * 視窗縮放、iPad 旋轉會改變尺寸；把視窗移到另一個螢幕只會改變 devicePixelRatio，
 * ResizeObserver 偵測不到，所以另外用 resolution 媒體查詢監聽。
 */
function watchResize(view) {
  new ResizeObserver(() => resizeView(view)).observe(view.canvas);
  const watchPixelRatio = () => {
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', () => {
      resizeView(view);
      watchPixelRatio(); // 新的比例要用新的查詢
    }, { once: true });
  };
  watchPixelRatio();
}

/** 螢幕座標（clientX/Y）轉邏輯座標 */
function clientToLogical(view, clientX, clientY) {
  const rect = view.canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * LOGICAL_SIZE - LOGICAL_SIZE / 2,
    y: ((clientY - rect.top) / rect.height) * LOGICAL_SIZE - LOGICAL_SIZE / 2,
  };
}

function clearView(view) {
  const half = LOGICAL_SIZE / 2;
  view.ctx.clearRect(-half, -half, LOGICAL_SIZE, LOGICAL_SIZE);
}

/** 用指定顏色與線寬（CSS 像素）描繪目前的路徑 */
function strokePath(view, color, width) {
  const ctx = view.ctx;
  ctx.strokeStyle = color;
  ctx.lineWidth = width * view.unit;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * 畫一條折線，可只畫前 end 個點，再接到 extra 點（不另外建立陣列）。
 * @param {object} options color、width（CSS 像素）、closed、end、extra
 */
function drawCurve(view, points, { color, width = 2, closed = false, end = points.length, extra = null }) {
  if (points.length === 0) return;
  const ctx = view.ctx;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < end; i++) ctx.lineTo(points[i].x, points[i].y);
  if (extra) ctx.lineTo(extra.x, extra.y);
  if (closed) ctx.closePath();
  strokePath(view, color, width);
}

/** 手繪中的筆跡 */
function drawStroke(view, points) {
  drawCurve(view, points, { color: COLORS.stroke, width: 3 });
}

/** 播放時的原圖（淡灰） */
function drawOriginal(view, points) {
  drawCurve(view, points, { color: COLORS.original, closed: true });
}

/** 目前圈數的完整逼近曲線（淡色） */
function drawApprox(view, points) {
  drawCurve(view, points, { color: COLORS.approx, closed: true });
}

/** 畫筆已走過的軌跡：points 的前 end 點再接到畫筆位置 tip */
function drawTrail(view, points, end, tip) {
  drawCurve(view, points, { color: COLORS.trail, width: 2.5, end, extra: tip });
}

/**
 * 畫圓鏈。joints 來自 epicycleChain：第 i 個圓的圓心是 joints[i]、臂尖是 joints[i + 1]。
 * 半徑小於 0.5 個 CSS 像素的圓在畫面上看不見，略過不畫；
 * 它們的位移已包含在 joints 裡，所以畫筆位置仍然正確。
 * 所有圓合成一條路徑，所有臂則是一條穿過各節點的折線，減少 stroke 次數。
 */
function drawEpicycles(view, circles, joints) {
  const ctx = view.ctx;
  const minRadius = 0.5 * view.unit;

  ctx.beginPath();
  for (let i = 0; i < circles.length; i++) {
    const r = circles[i].amp;
    if (r < minRadius) continue;
    ctx.moveTo(joints[i].x + r, joints[i].y);
    ctx.arc(joints[i].x, joints[i].y, r, 0, 2 * Math.PI);
  }
  strokePath(view, COLORS.circle, 1);

  // 臂全部都畫：略過的話許多小臂累積起來會讓圓鏈與畫筆之間出現空隙
  drawCurve(view, joints, { color: COLORS.arm, width: 1.5 });

  // 畫筆位置
  const tip = joints[joints.length - 1];
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 4 * view.unit, 0, 2 * Math.PI);
  ctx.fillStyle = COLORS.pen;
  ctx.fill();
}
