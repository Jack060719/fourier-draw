// 在 Node 執行數學測試：node test/run.js [關鍵字]
// 用 vm 依序載入與瀏覽器相同的全域腳本，不需任何套件。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const files = ['js/dft.js', 'js/path.js', 'test/tests.js'];

const context = vm.createContext({ Math, console });
for (const file of files) {
  const full = path.join(root, file);
  if (fs.existsSync(full)) {
    vm.runInContext(fs.readFileSync(full, 'utf8'), context, { filename: file });
  }
}

const results = context.runTests(process.argv[2] || '');
for (const r of results) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.name + (r.ok ? '' : '：' + r.error));
}
const passed = results.filter((r) => r.ok).length;
console.log(`\n通過 ${passed} / ${results.length}`);
process.exit(passed === results.length ? 0 : 1);
