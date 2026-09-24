// Pemeriksaan integritas bukti iterasi 2: setiap berkas di
// hasil-eksekusi/iterasi-2 dan bukti/iterasi-2 harus berasal dari run bersih
// terhadap server build v3.
//
// Harness tidak mencatat BUILD_ID per skenario, sehingga dipakai tiga ukuran:
//  1. cap waktu (mtime) setiap berkas berada di dalam rentang run bersih
//     (run-report.json startedAt–finishedAt); di rentang itu satu-satunya
//     server di port 3001 adalah build v3 (linimasa di skenario-black-box.md);
//  2. konsistensi: setiap PNG tercatat di JSON pengamatan run yang sama, dan
//     setiap PNG yang dicatat JSON ada;
//  3. penanda isi yang hanya dihasilkan kode v3 (untuk skenario yang punya).
// Berkas turunan yang tidak berasal dari server (penilaian.json,
// nilai-spss.json) dicatat terpisah.
//
// Pemakaian (root repo): node testing/black-box/harness/bb-integritas.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const BB = path.resolve(here, "..");
const OBS = path.join(BB, "hasil-eksekusi", "iterasi-2");
const SHOTS = path.join(BB, "bukti", "iterasi-2");
const run = JSON.parse(fs.readFileSync(path.join(OBS, "run-report.json"), "utf8"));
const t0 = Date.parse(run.startedAt), t1 = Date.parse(run.finishedAt);
const DERIVED = new Set(["penilaian.json", "nilai-spss.json"]);
const iso = (ms) => new Date(ms + 7 * 3600e3).toISOString().replace("T", " ").replace(/\.\d+Z$/, " WIB");

const lines = [];
let bad = 0;
const inWindow = (ms) => ms >= t0 - 1000 && ms <= t1 + 1000;

// 1. Cap waktu.
const files = [
    ...fs.readdirSync(OBS).map((f) => ({ dir: "hasil-eksekusi/iterasi-2", f, p: path.join(OBS, f) })),
    ...fs.readdirSync(SHOTS).map((f) => ({ dir: "bukti/iterasi-2", f, p: path.join(SHOTS, f) })),
];
lines.push(`Rentang run bersih (run-report.json): ${iso(t0)} – ${iso(t1)}, base ${run.base}`);
for (const x of files) {
    const m = fs.statSync(x.p).mtimeMs;
    let v;
    if (x.dir.startsWith("hasil") && DERIVED.has(x.f)) v = "turunan (dibuat setelah run dari JSON pengamatan; bukan dari server)";
    else if (x.f === "run-report.json") v = inWindow(m) ? "di dalam rentang" : "DI LUAR RENTANG";
    else v = inWindow(m) ? "di dalam rentang" : "DI LUAR RENTANG";
    if (v === "DI LUAR RENTANG") bad += 1;
    lines.push(`${x.dir}/${x.f}\t${iso(m)}\t${v}`);
}

// 2. Konsistensi PNG ↔ JSON.
const obsFiles = fs.readdirSync(OBS).filter((f) => /^BB-.*\.json$/.test(f));
const referenced = new Set();
for (const f of obsFiles) {
    const o = JSON.parse(fs.readFileSync(path.join(OBS, f), "utf8"));
    if (o.status !== "selesai") { bad += 1; lines.push(`${f}: status ${o.status}`); }
    for (const n of o.notes) { const m = n.match(/^(BB-[^:]+\.png):/); if (m) referenced.add(m[1]); }
}
const pngs = fs.readdirSync(SHOTS).filter((f) => f.endsWith(".png"));
const orphan = pngs.filter((f) => !referenced.has(f));
const missing = [...referenced].filter((f) => !pngs.includes(f));
bad += orphan.length + missing.length;
lines.push(`PNG: ${pngs.length}; tercatat di JSON pengamatan: ${referenced.size}; PNG tanpa catatan: ${orphan.length}; catatan tanpa PNG: ${missing.length}`);

// 3. Penanda isi khusus v3.
const load = (id) => JSON.parse(fs.readFileSync(path.join(OBS, `${id}.json`), "utf8"));
const tables = (o) => o.runs.flatMap((r) => (r.output || []).flatMap((s) => s.tables || []));
const toasts = (o) => o.toasts.flatMap((t) => t.texts);
const markers = [];
for (const id of ["BB-KF03-01", "BB-KF06-01", "BB-KF06-02", "BB-KF06-03", "BB-KF10-01", "BB-KF10-02", "BB-KF13-01"]) {
    const lev = tables(load(id)).filter((t) => /^Levene/.test(t.title));
    markers.push([id, "catatan Levene MV diakhiri \"Design: …\" (b24c22ea)", lev.length > 0 && lev.every((t) => /Design: /.test(t.footnote || ""))]);
}
markers.push(["BB-KF03-02", "baris \"jk — Welch-Satterthwaite\" setelah Options dibuka (3494ea5c)", tables(load("BB-KF03-02")).some((t) => t.rows.some((r) => r.effect === "jk — Welch-Satterthwaite"))]);
markers.push(["BB-KF04-02", "toast \"Terdapat pasangan yang belum lengkap…\" untuk Variable 1 saja (fa286c6c)", toasts(load("BB-KF04-02")).some((t) => t.startsWith("Terdapat pasangan yang belum lengkap"))]);
markers.push(["BB-KF07-02", "slot w1_(1,skor) kembali setelah dialog dibuka lagi (5017948c)", load("BB-KF07-02").checks.langkah4Main.slot === 1]);
markers.push(["BB-KF08-02", "toast \"Number of levels must be a valid number.\" untuk \"abc\" (37e0e15b)", toasts(load("BB-KF08-02")).includes("Number of levels must be a valid number.")]);
markers.push(["BB-KF10-03", "slot p1_(1,nilai) tetap setelah Define ulang (5017948c)", /p1_\(1,nilai\)/.test(load("BB-KF10-03").checks.slotSetelahDefineUlang || "")]);
markers.push(["BB-KF11-05", "slot tetap setelah Define ulang pada run LSD(None) dan Sidak (5017948c)", Object.entries(load("BB-KF11-05").checks).filter(([k]) => k.startsWith("slotSetelahDefineUlang")).every(([, v]) => /p1_\(1,nilai\)/.test(v))]);
for (const [id, what, ok] of markers) { if (!ok) bad += 1; lines.push(`penanda v3 ${id}: ${what}: ${ok ? "ada" : "TIDAK ADA"}`); }

lines.push(`HASIL: ${bad === 0 ? "semua berkas dapat dipastikan berasal dari run bersih terhadap server v3" : `${bad} masalah`}`);
const out = lines.join("\n") + "\n";
fs.writeFileSync(path.join(BB, "integritas-iterasi-2.txt"), out);
console.log(lines.filter((l) => !/\tdi dalam rentang$/.test(l)).join("\n"));
process.exit(bad ? 1 : 0);
