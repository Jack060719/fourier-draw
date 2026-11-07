// 傅立葉畫圖機：主程式
// 串接輸入、數學與繪圖，管理狀態與動畫迴圈。
// 狀態：idle（等待作畫）→ drawing（作畫中）→ playing（播放動畫）

const SAMPLE_COUNT = 512; // 取樣點數 N

const canvas = document.getElementById('board');
const messageEl = document.getElementById('message');
const view = createView(canvas);

const state = {
  mode: 'idle',
  raw: [],      // 原始筆跡（邏輯座標）
  original: [], // 閉合後等距取樣的 N 點
};

function setMessage(text) {
  messageEl.textContent = text;
}

attachInput(canvas, (x, y) => clientToLogical(view, x, y), {
  onStart(p) {
    state.mode = 'drawing';
    state.raw = [p];
  },
  onMove(p) {
    if (state.mode === 'drawing') state.raw.push(p);
  },
  onEnd() {
    if (state.mode !== 'drawing') return;
    if (!isValidStroke(state.raw)) {
      state.mode = 'idle';
      state.raw = [];
      return;
    }
    state.original = closeAndResample(state.raw, SAMPLE_COUNT);
    state.mode = 'playing';
  },
});

function frame() {
  clearView(view);
  if (state.mode === 'drawing') {
    drawStroke(view, state.raw);
  } else if (state.mode === 'playing') {
    drawCurve(view, state.original, { color: COLORS.stroke, width: 2, closed: true });
  }
  requestAnimationFrame(frame);
}

// 畫布尺寸改變（視窗縮放、iPad 旋轉）時重設解析度；邏輯座標不變，圖形不需重算
new ResizeObserver(() => resizeView(view)).observe(canvas);

requestAnimationFrame(frame);
