// 傅立葉畫圖機：主程式
// 串接輸入、數學與繪圖，管理狀態與動畫迴圈。
// 狀態：idle（等待作畫）→ drawing（作畫中）→ playing（播放動畫）

const SAMPLE_COUNT = 512;  // 取樣點數 N
const PERIOD_SECONDS = 10; // 畫完一圈的秒數

const MESSAGES = {
  idle: '在畫布上畫一條封閉曲線（放開時會自動閉合）',
  drawing: '放開即自動閉合曲線',
  playing: '拖動滑桿調整圓圈數量，也可直接再畫一條新的曲線',
  invalid: '筆畫太短或太小，請畫大一點的封閉曲線',
};

const canvas = document.getElementById('board');
const messageEl = document.getElementById('message');
const slider = document.getElementById('count');
const countLabel = document.getElementById('count-label');
const view = createView(canvas);

const state = {
  mode: 'idle',
  raw: [],              // 原始筆跡（邏輯座標）
  original: [],         // 閉合後等距取樣的 N 點
  center: ORIGIN,       // 常數項：圓鏈起點（曲線重心）
  circles: [],          // 依頻率排序的全部旋轉圓
  active: [],           // 滑桿選取的前 c 個圓
  approx: [],           // 用 active 重建的完整曲線
  approxDirty: false,   // active 改變後，下一影格才重算 approx（每影格最多一次）
  t: 0,                 // 動畫進度，0 ≤ t < 1
};

/** 顯示提示；warn 為 true 時用警告色 */
function setMessage(text, warn = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle('warn', warn);
}

/** 套用滑桿的圓圈數量 c：使用前 c 個旋轉的圓 */
function applyCircleCount() {
  const c = Number(slider.value);
  state.active = state.circles.slice(0, c);
  state.approxDirty = true;
  countLabel.textContent = `${c} / ${state.circles.length}`;
}

function reset(message = MESSAGES.idle, warn = false) {
  state.mode = 'idle';
  slider.disabled = true;
  countLabel.textContent = '—';
  setMessage(message, warn);
  startLoop(); // 跑一影格清空畫布後自行停止
}

function startPlaying() {
  state.original = closeAndResample(state.raw, SAMPLE_COUNT);
  const { center, circles } = splitConstant(sortByFrequency(dft(state.original)));
  state.center = center;
  state.circles = circles;
  // 新圖形保留目前的圈數設定
  slider.max = String(circles.length);
  slider.disabled = false;
  applyCircleCount();
  state.t = 0;
  state.mode = 'playing';
  setMessage(MESSAGES.playing);
}

slider.addEventListener('input', applyCircleCount);
document.getElementById('clear').addEventListener('click', () => reset());

attachInput(canvas, (x, y) => clientToLogical(view, x, y), {
  onStart(p) {
    state.mode = 'drawing';
    state.raw = [p];
    setMessage(MESSAGES.drawing);
    startLoop();
  },
  onMove(p) {
    if (state.mode === 'drawing') state.raw.push(p);
  },
  onEnd() {
    if (state.mode !== 'drawing') return;
    if (isValidStroke(state.raw)) {
      startPlaying();
    } else {
      reset(MESSAGES.invalid, true);
    }
  },
});

function drawPlaying(dt) {
  if (state.approxDirty) {
    state.approx = reconstruct(state.active, SAMPLE_COUNT, state.center);
    state.approxDirty = false;
  }
  // dt 上限避免切換分頁回來時跳太多
  state.t = (state.t + Math.min(dt, 0.1) / PERIOD_SECONDS) % 1;

  const joints = epicycleChain(state.active, state.t, state.center);
  const tip = joints[joints.length - 1];
  drawOriginal(view, state.original);
  drawApprox(view, state.approx);
  drawTrail(view, state.approx, Math.floor(state.t * state.approx.length) + 1, tip);
  drawEpicycles(view, state.active, joints);
}

// 動畫迴圈只在作畫或播放時執行；idle 時清空畫布後停止
let looping = false;
let lastTime = null;

function startLoop() {
  if (looping) return;
  looping = true;
  lastTime = null;
  requestAnimationFrame(frame);
}

function frame(now) {
  const dt = lastTime === null ? 0 : (now - lastTime) / 1000;
  lastTime = now;

  clearView(view);
  if (state.mode === 'idle') {
    looping = false;
    return;
  }
  if (state.mode === 'drawing') {
    drawStroke(view, state.raw);
  } else {
    drawPlaying(dt);
  }
  requestAnimationFrame(frame);
}

// 畫布尺寸或像素比改變時重設解析度；邏輯座標不變，圖形不需重算
watchResize(view);

slider.max = String(SAMPLE_COUNT - 1);
slider.value = slider.max; // 預設使用全部的圓
reset();
