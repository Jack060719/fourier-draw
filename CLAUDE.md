# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 執行與測試

- 開啟網頁：直接雙擊 `index.html`（不需伺服器）
- 數學測試（命令列）：`node test/run.js`；只跑名稱含關鍵字的測試：`node test/run.js 排序`
- 數學測試（瀏覽器）：開啟 `test/test.html`
- 部署：GitHub Pages 從 `main` 分支根目錄提供，`git push` 後約 1 分鐘自動更新：https://jack060719.github.io/fourier-draw/
- iPad 實機測試：push 後直接在 iPad 開上述網址（看到舊版就強制重新整理）

## 架構

- 用傳統 `<script>` 載入，不用 ES modules（`file://` 下 modules 會被 CORS 擋）。函式放全域，載入順序由 `index.html` 決定。
- 資料流程：`input.js`（指標事件 → 邏輯座標）→ `path.js`（閉合、按弧長取樣成 N 點）→ `dft.js`（DFT、依 |頻率| 排序）→ `app.js`（狀態與動畫迴圈）→ `render.js`（Canvas 繪製）。
- 座標：畫布固定為邏輯座標 ±500、原點在中心，只有 `render.js` 換算實際像素與 devicePixelRatio。
- `freq = 0` 的常數項由 `splitConstant` 分離成圓鏈起點 `center`，不算一個圓；滑桿值 c 代表使用 `circles.slice(0, c)`。
- 顏色與線寬只在 `render.js`（`COLORS` 與各 `draw*` 函式）；`app.js` 不直接指定樣式。
- `test/tests.js` 同時給瀏覽器（`test.html`）與 Node（`run.js`）使用，改測試只需改這個檔。

# 專案：傅立葉畫圖機（多媒體課作品）
- 技術：純 HTML/CSS/JS + Canvas，不使用框架與建置工具
- 註解與介面文字用繁體中文
- 數學運算放 js/dft.js，必須是純函式，可單獨測試
- 每完成一個功能就 git commit
- 驗收：在 Chrome 與 iPad Safari 都能操作