// Ringkas json-summary istanbul (coverage_jest_<menu>[_A]_vm.json) menjadi teks; daftar berkas dengan cakupan baris < 70%.
// Pemakaian (dari testing/text_analytics_eval/logs): node ../unit/cov_table.js [sufiks]   (sufiks '' = baseline, 'A' = setelah Track A)
const fs = require('fs');
const suf = process.argv[2] ? `_${process.argv[2]}` : '';
for (const m of ['stwv', 'nb', 'am']) {
  const berkas = `coverage_jest_${m}${suf}_vm.json`;
  if (!fs.existsSync(berkas)) { console.log(`== ${m}: ${berkas} tidak ada`); continue; }
  const j = JSON.parse(fs.readFileSync(berkas, 'utf8'));
  const t = j.total;
  console.log(`== ${m}${suf}: lines ${t.lines.covered}/${t.lines.total} = ${t.lines.pct}% ; stmts ${t.statements.pct}% ; funcs ${t.functions.covered}/${t.functions.total} = ${t.functions.pct}% ; branches ${t.branches.pct}%`);
  for (const [k, v] of Object.entries(j)) {
    if (k === 'total') continue;
    const rel = k.split('/Modals/')[1] || k;
    if (v.lines.pct < 70) console.log(`  <70 lines: ${rel.padEnd(95)} L ${v.lines.covered}/${v.lines.total} ${v.lines.pct}%  F ${v.functions.pct}% B ${v.branches.pct}%`);
  }
}
