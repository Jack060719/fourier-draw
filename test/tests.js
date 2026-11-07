// 傅立葉畫圖機：數學單元測試
// 同時給 test.html（瀏覽器）與 run.js（Node）使用。
// 每個測試是 [名稱, 函式]，函式失敗時丟出錯誤。

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertClose(actual, expected, tolerance, label) {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${label}：預期 ${expected}，實際 ${actual}（容許誤差 ${tolerance}）`
  );
}

// 固定種子的亂數，讓測試結果可重現
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const TESTS = [
  ['DFT 後用全部的項重建，誤差 < 1e-9', () => {
    const rand = seededRandom(42);
    const points = [];
    for (let i = 0; i < 64; i++) {
      points.push({ x: rand() * 1000 - 500, y: rand() * 1000 - 500 });
    }
    const back = reconstruct(dft(points), points.length);
    for (let i = 0; i < points.length; i++) {
      assertClose(back[i].x, points[i].x, 1e-9, `第 ${i} 點 x`);
      assertClose(back[i].y, points[i].y, 1e-9, `第 ${i} 點 y`);
    }
  }],

  ['單一正圓只在 k = 1 有能量，半徑相符', () => {
    const N = 32;
    const r = 120;
    const points = [];
    for (let n = 0; n < N; n++) {
      const a = (2 * Math.PI * n) / N;
      points.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
    }
    for (const term of dft(points)) {
      if (term.freq === 1) {
        assertClose(term.amp, r, 1e-9, 'k = 1 的半徑');
      } else {
        assertClose(term.amp, 0, 1e-9, `k = ${term.freq} 的半徑`);
      }
    }
  }],

  ['反向的圓落在 k = -1', () => {
    const N = 16;
    const points = [];
    for (let n = 0; n < N; n++) {
      const a = (-2 * Math.PI * n) / N;
      points.push({ x: 50 * Math.cos(a), y: 50 * Math.sin(a) });
    }
    const big = dft(points).filter((term) => term.amp > 1e-9);
    assert(big.length === 1 && big[0].freq === -1, '應只有 k = -1 有能量');
  }],

  ['常數項等於重心', () => {
    const points = [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 0 }, { x: 70, y: -20 }];
    const dc = dft(points).find((term) => term.freq === 0);
    assertClose(dc.re, 40, 1e-9, '重心 x');
    assertClose(dc.im, 10, 1e-9, '重心 y');
  }],

  ['排序結果為 0, +1, -1, +2, -2, ...', () => {
    const points = [];
    for (let i = 0; i < 8; i++) points.push({ x: i, y: i * i });
    const freqs = sortByFrequency(dft(points)).map((term) => term.freq);
    assert(
      freqs.join(',') === '0,1,-1,2,-2,3,-3,4',
      `實際順序：${freqs.join(',')}`
    );
  }],

  ['排序不修改原陣列', () => {
    const terms = [{ freq: 2 }, { freq: 0 }, { freq: -1 }];
    sortByFrequency(terms);
    assert(terms.map((term) => term.freq).join(',') === '2,0,-1', '原陣列被改動');
  }],

  ['圓鏈最後一點等於重建曲線上的點', () => {
    const rand = seededRandom(7);
    const points = [];
    for (let i = 0; i < 20; i++) points.push({ x: rand() * 100, y: rand() * 100 });
    const terms = sortByFrequency(dft(points));
    const joints = epicycleChain(terms, 5 / 20);
    assert(joints.length === terms.length + 1, '節點數應為項數 + 1');
    const tip = joints[joints.length - 1];
    assertClose(tip.x, points[5].x, 1e-9, '畫筆 x');
    assertClose(tip.y, points[5].y, 1e-9, '畫筆 y');
  }],
];

/** 執行測試，可用關鍵字篩選名稱。回傳 [{name, ok, error}] */
function runTests(filter) {
  return TESTS
    .filter(([name]) => !filter || name.includes(filter))
    .map(([name, fn]) => {
      try {
        fn();
        return { name, ok: true };
      } catch (e) {
        return { name, ok: false, error: e.message };
      }
    });
}
