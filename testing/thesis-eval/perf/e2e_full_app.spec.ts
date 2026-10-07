/**
 * e2e_full_app.spec.ts - Track E (OPSIONAL): waktu klik "OK" -> hasil di APLIKASI PENUH (`npm run dev` atau build produksi).
 *
 * STATUS: TIDAK DIVALIDASI DI SANDBOX. Server Next.js tidak dapat dijalankan di sandbox cloud; spesifikasi ini ditulis dari
 * pembacaan kode (label menu, tombol "Continue"/"Import"/"OK", data-testid="dropzone-input", toast sukses STWV). Selektor menu,
 * urutan dialog impor CSV, dan rute /dashboard/data BELUM diuji pada aplikasi yang berjalan. Bila gagal, sesuaikan selektor
 * pada fungsi `bukaDataset` dan `bukaMenu`; bagian pengukuran (Long Tasks + performance.now) sudah mandiri.
 *
 * Yang diukur (per dataset): selang dari klik "OK" pada dialog String to Word Vector sampai toast sukses
 * "N vector columns were added to the dataset." muncul. Ini LEBIH PANJANG daripada waktu worker (jalur harness): ikut terhitung
 * pengambilan data dari IndexedDB (getVariableData), penambahan ~1000 kolom ke DataStore (Dexie), pembaruan VariableStore,
 * dan penulisan Output Viewer. Waktu worker saja dicatat aplikasi sendiri di Output Viewer (durationMs) dan bisa dibandingkan.
 *
 * Menjalankan (dari folder frontend, aplikasi sudah hidup di http://localhost:3000):
 *   E2E_DATASETS=pilkada_900,sms_5574 E2E_RUNS=5 npx playwright test ../testing/thesis-eval/perf/e2e_full_app.spec.ts --reporter=list
 * Prasyarat: `node testing/thesis-eval/perf/prepare_datasets.mjs` (membuat perf/data/<dataset>.csv).
 * Keluaran: perf/raw/e2e_<label>.csv (kolom sama dengan jalur lain; jalur = "e2e-aplikasi-penuh").
 * Catatan: tiap pengukuran memuat ulang halaman dan mengimpor ulang CSV (dataset bersih), jadi satu pengukuran = 1 impor + 1 STWV.
 *          Protokol 1 pemanasan + 5 pengukuran tetap berlaku (run 0 = pemanasan).
 */
import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PERF_DIR = path.resolve(__dirname);
const DATASETS = (process.env.E2E_DATASETS ?? 'pilkada_900').split(',').map((s) => s.trim()).filter(Boolean);
const RUNS = Number(process.env.E2E_RUNS ?? '5');
const LABEL = process.env.E2E_DEVICE ?? 'sandbox';
const OUT = path.join(PERF_DIR, 'raw', `e2e_${LABEL}.csv`);
const COLS = ['run_id', 'perangkat_label', 'jalur', 'lingkungan', 'menu_konfigurasi', 'skenario_id', 'dataset', 'n_dokumen', 'jumlah_term',
  'run', 'ms', 'status', 'pesan_galat', 'longtask_count', 'longtask_max_ms', 'longtask_total_ms', 'frame_p95_ms', 'frame_max_ms',
  'frame_count', 'idle_frame_p95_ms', 'rss_mb', 'payload_sha256_12', 'wasm_sha256_12', 'peramban', 'timestamp'];
const cell = (v: unknown) => { const s = v === null || v === undefined ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function append(row: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, COLS.join(',') + '\n', 'utf8');
  fs.appendFileSync(OUT, COLS.map((c) => cell(row[c])).join(',') + '\n', 'utf8');
}

async function pasangPengamat(page: Page) {
  await page.addInitScript(() => {
    (window as any).__longtasks = [];
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) (window as any).__longtasks.push(e.duration); }).observe({ type: 'longtask' });
    } catch { /* tidak didukung */ }
  });
}

async function bukaMenu(page: Page, menu: string, ...item: string[]) {
  await page.getByRole('menuitem', { name: menu }).first().click();   // Radix Menubar: pemicu bisa berperan 'menuitem'; sesuaikan bila perlu
  for (const i of item) await page.getByRole('menuitem', { name: i }).first().click();
}

async function bukaDataset(page: Page, csv: string) {
  await page.goto('/dashboard/data');
  await bukaMenu(page, 'File', 'Import Data');
  await page.getByRole('menuitem', { name: /CSV/i }).first().click();
  await page.getByTestId('dropzone-input').setInputFiles(csv);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();     // dialog "Configure Import"
  await expect(page.getByText(/berhasil diimpor/i)).toBeVisible({ timeout: 120_000 });
}

for (const ds of DATASETS) {
  test(`STWV default Weka, klik OK -> toast sukses, ${ds}`, async ({ page, browserName }) => {
    test.setTimeout(30 * 60_000);
    const csv = path.join(PERF_DIR, 'data', `${ds}.csv`);
    test.skip(!fs.existsSync(csv), `${csv} tidak ada (jalankan prepare_datasets.mjs)`);
    let nDocs: unknown = '';
    try { nDocs = JSON.parse(fs.readFileSync(path.join(PERF_DIR, 'data', 'payloads_index.json'), 'utf8'))[ds]?.n ?? ''; } catch { /* belum ada indeks */ }
    const runId = `e2e_${LABEL}_${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}`;
    await pasangPengamat(page);
    for (let run = 0; run <= RUNS; run++) {
      await bukaDataset(page, csv);
      await bukaMenu(page, 'Transform', 'String to Word Vector');
      const dialog = page.getByRole('dialog');
      // Pilih variabel teks "Text" pada daftar variabel tersedia, pindahkan ke kotak target (tombol panah).
      await dialog.getByText('Text', { exact: true }).first().click();
      await dialog.getByRole('button', { name: /move|right|>/i }).first().click();
      await (page as any).evaluate(() => { (window as any).__longtasks.length = 0; });
      const toast = page.getByText(/vector columns? (was|were) added to the dataset/i);
      const tStart = await page.evaluate(() => performance.now());
      await dialog.getByRole('button', { name: 'OK' }).click();
      let status = 'OK', err = '';
      try { await expect(toast).toBeVisible({ timeout: 25 * 60_000 }); } catch (e) { status = 'TIMEOUT'; err = String(e).split('\n')[0]; }
      const ms = (await page.evaluate(() => performance.now())) - tStart;      // jam halaman (performance.now), bukan jam Node
      const lt: number[] = await page.evaluate(() => (window as any).__longtasks.slice());
      const m = (await toast.first().textContent().catch(() => '')) ?? '';
      const nCols = /^1 vector column/.test(m) ? 1 : Number((m.match(/(\d+) vector columns/) ?? [])[1] ?? 0);
      append({
        run_id: runId, perangkat_label: process.env.E2E_DEVICE_LABEL ?? `E2E-${LABEL} (isi label perangkat sendiri)`, jalur: 'e2e-aplikasi-penuh',
        lingkungan: `${os.cpus()[0]?.model?.trim()} x${os.cpus().length}; ${os.type()} ${os.release()}; Node ${process.version}`,
        menu_konfigurasi: 'String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) [klik OK -> toast, aplikasi penuh]',
        skenario_id: 'stwv_default', dataset: ds, n_dokumen: nDocs, jumlah_term: nCols || '', run, ms: ms.toFixed(1), status, pesan_galat: err,
        longtask_count: lt.length, longtask_max_ms: (lt.length ? Math.max(...lt) : 0).toFixed(1), longtask_total_ms: lt.reduce((a, b) => a + b, 0).toFixed(1),
        peramban: browserName, timestamp: new Date().toISOString(),
      });
      if (status !== 'OK') break;
    }
  });
}
