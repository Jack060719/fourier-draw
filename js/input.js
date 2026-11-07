// 傅立葉畫圖機：手繪輸入
// 用 Pointer Events 統一處理滑鼠、手指與 Apple Pencil。
// 一次只追蹤一個指標，第二根手指碰到畫布會被忽略。

/**
 * @param {HTMLCanvasElement} canvas
 * @param {(clientX:number, clientY:number) => {x:number, y:number}} toLogical 螢幕座標轉邏輯座標
 * @param {{onStart:Function, onMove:Function, onEnd:Function}} handlers 收到邏輯座標點
 */
function attachInput(canvas, toLogical, { onStart, onMove, onEnd }) {
  let activeId = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (activeId !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return; // 只接受滑鼠左鍵
    e.preventDefault();
    activeId = e.pointerId;
    // 手指滑出畫布外也持續收到事件
    canvas.setPointerCapture(e.pointerId);
    onStart(toLogical(e.clientX, e.clientY));
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activeId) return;
    e.preventDefault();
    // 合併事件能取得影格之間的點，讓快速筆畫更平滑；舊版 Safari 沒有此功能
    const events = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
    for (const ev of events.length > 0 ? events : [e]) {
      onMove(toLogical(ev.clientX, ev.clientY));
    }
  });

  const finish = (e) => {
    if (e.pointerId !== activeId) return;
    activeId = null;
    onEnd();
  };
  // pointercancel：iPad 防誤觸或系統手勢中斷時，照樣把已畫的部分當成完成
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
}
