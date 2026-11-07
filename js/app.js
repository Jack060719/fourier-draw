// 傅立葉畫圖機：主程式
// 串接輸入、數學與繪圖，管理狀態與動畫迴圈。
// 狀態：idle（等待作畫）→ drawing（作畫中）→ playing（播放動畫）

const SAMPLE_COUNT = 512;  // 取樣點數 N
const PERIOD_SECONDS = 10; // 畫完一圈的秒數

const canvas = document.getElementById('board');
const messageEl = document.getElementById('message');
const view = createView(canvas);

const state = {
  mode: 'idle',
  raw: [],       // 原始筆跡（邏輯座標）
  original: [],  // 閉合後等距取樣的 N 點
  terms: [],     // 依頻率排序的全部項，第 0 項是常數項
  active: [],    // 目前使用的項
  approx: [],    // 用 active 重建的完整曲線
  t: 0,          // 動畫進度，0 ≤ t < 1
  lastTime: null,
};

const MESSAGES = {
  idle: '在畫布上畫一條封閉曲線（放開時會自動閉合）',
  drawing: '放開即自動閉合曲線',
  playing: '拖動滑桿調整圓圈數量，也可直接再畫一條新的曲線',
  invalid: '筆畫太短或太小，請畫大一點的封閉曲線',
};

/** 顯示提示；warn 為 true 時用警告色 */
function setMessage(text, warn = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle('warn', warn);
}

const slider = document.getElementById('count');
const countLabel = document.getElementById('count-label');

/**
 * 套用滑桿的圓圈數量 c：使用常數項加上前 c 個旋轉的圓。
 * 立刻重算完整逼近曲線，不必等動畫跑完一圈。
 */
function applyCircleCount() {
  const c = Number(slider.value);
  state.active = state.terms.slice(0, c + 1);
  updateApprox();
  countLabel.textContent = `${c} / ${state.terms.length - 1}`;
}

slider.addEventListener('input', applyCircleCount);

function reset() {
  state.mode = 'idle';
  state.raw = [];
  slider.disabled = true;
  countLabel.textContent = '—';
  setMessage(MESSAGES.idle);
}

document.getElementById('clear').addEventListener('click', reset);

/** 依目前使用的項重新計算逼近曲線 */
function updateApprox() {
  state.approx = reconstruct(state.active, SAMPLE_COUNT);
}

function startPlaying() {
  state.original = closeAndResample(state.raw, SAMPLE_COUNT);
  state.terms = sortByFrequency(dft(state.original));
  // 滑桿範圍 1 到全部旋轉的圓（扣掉常數項）；新圖形保留目前的圈數設定
  slider.max = String(state.terms.length - 1);
  slider.disabled = false;
  applyCircleCount();
  state.t = 0;
  state.lastTime = null;
  state.mode = 'playing';
}

attachInput(canvas, (x, y) => clientToLogical(view, x, y), {
  onStart(p) {
    state.mode = 'drawing';
    state.raw = [p];
    setMessage(MESSAGES.drawing);
  },
  onMove(p) {
    if (state.mode === 'drawing') state.raw.push(p);
  },
  onEnd() {
    if (state.mode !== 'drawing') return;
    if (!isValidStroke(state.raw)) {
      reset();
      setMessage(MESSAGES.invalid, true);
      return;
    }
    startPlaying();
    setMessage(MESSAGES.playing);
  },
});

function drawPlaying(dt) {
  // dt 上限避免切換分頁回來時跳太多
  state.t = (state.t + Math.min(dt, 0.1) / PERIOD_SECONDS) % 1;

  drawCurve(view, state.original, { color: COLORS.original, width: 2, closed: true });
  drawCurve(view, state.approx, { color: COLORS.approx, width: 2, closed: true });

  // 畫筆已走過的軌跡：逼近曲線上 t 之前的點，再接到目前畫筆位置
  const joints = epicycleChain(state.active, state.t);
  const tip = joints[joints.length - 1];
  const done = Math.floor(state.t * SAMPLE_COUNT) + 1;
  drawCurve(view, state.approx.slice(0, done).concat([tip]), { color: COLORS.trail, width: 2.5 });

  drawEpicycles(view, state.active, joints);
}

function frame(now) {
  const dt = state.lastTime === null ? 0 : (now - state.lastTime) / 1000;
  state.lastTime = now;

  clearView(view);
  if (state.mode === 'drawing') {
    drawStroke(view, state.raw);
  } else if (state.mode === 'playing') {
    drawPlaying(dt);
  }
  requestAnimationFrame(frame);
}

// 畫布尺寸改變（視窗縮放、iPad 旋轉）時重設解析度；邏輯座標不變，圖形不需重算
new ResizeObserver(() => resizeView(view)).observe(canvas);

requestAnimationFrame(frame);
