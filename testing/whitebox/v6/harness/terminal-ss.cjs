// Tangkapan terminal sebagai PNG: menampilkan perintah dan keluarannya (dari
// berkas log yang dihasilkan perintah itu, tanpa diubah) dengan gaya terminal,
// lalu memotretnya dengan Chromium headless (Playwright).
//
// Pemakaian (akar repositori):
//   node testing/whitebox/v6/harness/terminal-ss.cjs <spec.json>
// spec.json: [{ "out": "ss/x.png", "title": "...", "cmd": "$ ...", "file": "log.txt",
//              "grep": "regex (opsional)", "from": n, "to": m }]
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const color = (line) => {
    const t = esc(line);
    if (/\b(FAILED|GAGAL|panicked|BERBEDA)\b|\b[1-9]\d* (gagal|failed|berbeda)\b|(berbeda|beda|tidak identik|Tidak Sesuai): [1-9]/.test(line)) return `<span class="bad">${t}</span>`;
    if (/(test result: ok|IDENTIK|identik|LULUS|lulus|Sesuai|passed|beda: 0|sama true|exit code: 0)/.test(line)) return `<span class="ok">${t}</span>`;
    if (/^\$ /.test(line)) return `<span class="cmd">${t}</span>`;
    return t;
};

(async () => {
    const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1400, height: 800 }, deviceScaleFactor: 1.5 });
    for (const s of spec) {
        let lines = fs.readFileSync(s.file, "utf8").replace(/\x1b\[[0-9;]*m/g, "").split(/\r?\n/);
        if (s.from || s.to) lines = lines.slice((s.from || 1) - 1, s.to || lines.length);
        if (s.grep) lines = lines.filter((l) => new RegExp(s.grep).test(l));
        const body = [s.cmd ? `<span class="cmd">${esc(s.cmd)}</span>` : "", ...lines.map(color)].filter((x) => x !== "").join("\n");
        await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
            body { margin: 0; background: #1e1e1e; }
            .win { margin: 0; border: 1px solid #3c3c3c; }
            .bar { background: #323233; color: #cccccc; font: 13px Segoe UI, sans-serif; padding: 6px 12px; }
            pre { margin: 0; padding: 12px 14px; color: #d4d4d4; font: 13px/1.45 Consolas, 'Cascadia Mono', monospace; white-space: pre-wrap; word-break: break-all; }
            .cmd { color: #dcdcaa; } .ok { color: #6a9955; } .bad { color: #f14c4c; }
            </style></head><body><div class="win" id="w"><div class="bar">${esc(s.title)}</div><pre>${body}</pre></div></body></html>`);
        const out = path.resolve(s.out);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        await (await page.$("#w")).screenshot({ path: out });
        console.log(out);
    }
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
