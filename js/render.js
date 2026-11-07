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

/**
 * 畫一條折線。
 * @param {object} options color、width（CSS 像素）、closed（是否接回起點）
 */
function drawCurve(view, points, { color, width = 2, closed = false }) {
  if (points.length < 2) return;
  const ctx = view.ctx;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  if (closed) ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width * view.unit;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** 手繪中的筆跡 */
function drawStroke(view, points) {
  drawCurve(view, points, { color: COLORS.stroke, width: 3 });
}

/**
 * 畫圓鏈。joints 來自 epicycleChain：第 i 個圓的圓心是 joints[i]、臂尖是 joints[i + 1]。
 * 頻率 0 的常數項不轉動，不畫圓也不畫臂。
 * 所有圓合成一條路徑、所有臂合成一條路徑，減少 stroke 次數。
 */
function drawEpicycles(view, terms, joints) {
  const ctx = view.ctx;

  ctx.beginPath();
  for (let i = 0; i < terms.length; i++) {
    if (terms[i].freq === 0) continue;
    const c = joints[i];
    ctx.moveTo(c.x + terms[i].amp, c.y);
    ctx.arc(c.x, c.y, terms[i].amp, 0, 2 * Math.PI);
  }
  ctx.strokeStyle = COLORS.circle;
  ctx.lineWidth = 1 * view.unit;
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < terms.length; i++) {
    if (terms[i].freq === 0) continue;
    ctx.moveTo(joints[i].x, joints[i].y);
    ctx.lineTo(joints[i + 1].x, joints[i + 1].y);
  }
  ctx.strokeStyle = COLORS.arm;
  ctx.lineWidth = 1.5 * view.unit;
  ctx.stroke();

  // 畫筆位置
  const tip = joints[joints.length - 1];
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 4 * view.unit, 0, 2 * Math.PI);
  ctx.fillStyle = COLORS.pen;
  ctx.fill();
}
