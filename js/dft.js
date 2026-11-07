// 傅立葉畫圖機：DFT 與 epicycle 數學
// 全部是純函式：不碰 DOM、不修改傳入的資料，可在瀏覽器或 Node 單獨測試。
// 點的格式為 {x, y}，視為複數 x + iy。

/**
 * 離散傅立葉轉換：X[k] = (1/N) Σ z[n]·e^(-2πikn/N)
 * 下標 k > N/2 換成 k - N，讓圓可以正轉或反轉。
 * @param {{x:number, y:number}[]} points 等距取樣的閉合曲線
 * @returns {{freq:number, re:number, im:number, amp:number, phase:number}[]}
 */
function dft(points) {
  const N = points.length;
  const terms = [];
  for (let k = 0; k < N; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * k * n) / N;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      // (x + iy)(c + is) = (xc - ys) + i(xs + yc)
      re += points[n].x * c - points[n].y * s;
      im += points[n].x * s + points[n].y * c;
    }
    re /= N;
    im /= N;
    terms.push({
      freq: k > N / 2 ? k - N : k,
      re,
      im,
      amp: Math.hypot(re, im),
      phase: Math.atan2(im, re),
    });
  }
  return terms;
}

/**
 * 依頻率絕對值排序：0, +1, -1, +2, -2, ...（同絕對值時正頻率在前）
 * 若想改成依振幅排序，只需改這裡的比較條件。
 * @returns 新陣列，不修改原陣列
 */
function sortByFrequency(terms) {
  return terms.slice().sort((a, b) => {
    const diff = Math.abs(a.freq) - Math.abs(b.freq);
    return diff !== 0 ? diff : b.freq - a.freq;
  });
}

/**
 * 求時間 t（0 ≤ t < 1，一圈）時圓鏈各節點的位置。
 * 回傳 terms.length + 1 個點：第 0 點是原點，第 i + 1 點是第 i 個圓的臂尖，
 * 也就是第 i 個圓的圓心是第 i 點。最後一點就是畫筆位置。
 */
function epicycleChain(terms, t) {
  let x = 0;
  let y = 0;
  const joints = [{ x, y }];
  for (const term of terms) {
    const angle = 2 * Math.PI * term.freq * t + term.phase;
    x += term.amp * Math.cos(angle);
    y += term.amp * Math.sin(angle);
    joints.push({ x, y });
  }
  return joints;
}

/**
 * 用給定的項重建整條曲線，在 t = j / samples 取樣。
 * 用全部的項且 samples 等於原點數時，會精確還原原本的點。
 */
function reconstruct(terms, samples) {
  const points = [];
  for (let j = 0; j < samples; j++) {
    const t = j / samples;
    let x = 0;
    let y = 0;
    for (const term of terms) {
      const angle = 2 * Math.PI * term.freq * t + term.phase;
      x += term.amp * Math.cos(angle);
      y += term.amp * Math.sin(angle);
    }
    points.push({ x, y });
  }
  return points;
}
