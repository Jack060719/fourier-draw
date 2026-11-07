// 在 Node 執行數學測試：node test/run.js [關鍵字]
// 用 vm 依序載入與瀏覽器相同的全域腳本，不需任何套件。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const files = ['js/dft.js', 'js/path.js', 'test/tests.js'];

const context = vm.createContext({ Math, console });
for (const file of files) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const results = context.runTests(process.argv[2] || '');
for (const r of results) console.log(context.formatResult(r));
console.log('\n' + context.summarize(results));
process.exit(results.every((r) => r.ok) ? 0 : 1);
