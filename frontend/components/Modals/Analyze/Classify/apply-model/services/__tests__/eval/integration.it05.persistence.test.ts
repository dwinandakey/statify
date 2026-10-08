/** @jest-environment node */
// Track F — IT-05: simpan model ke berkas, muat ulang setelah sesi baru -> prediksi identik (float_roundtrip).
//
// Tes ini mensimulasikan "sesi baru" DALAM SATU proses Jest: cache wasm dibuang (resetWasm) sehingga Apply Model
// berjalan pada instance wasm baru dengan memori baru, store dikosongkan, dan model dibaca dari berkas di disk lewat
// loadModelFromFile ASLI. Pembuktian dengan DUA PROSES Node terpisah (fase 1: latih+ekspor; fase 2: muat+terap) ada di
// testing/text_analytics_eval/integration/it05_persist.mjs (log integration_it05_*.txt).
//
// Peran float_roundtrip dan batasannya (dijelaskan di F_integration.md):
//  - Jalur browser: model berpindah sebagai OBJEK JavaScript (serde_wasm_bindgen) dan sebagai TEKS JSON hanya di sisi
//    JavaScript (JSON.stringify saat Export Model, JSON.parse saat memuat berkas). JSON.stringify menulis setiap double
//    sebagai representasi desimal terpendek yang kembali ke double yang sama, dan JSON.parse membulatkan dengan benar,
//    sehingga round-trip eksak (bit-per-bit) untuk semua double hingga.
//  - serde_json::from_str pada teks JSON hanya relevan untuk kode Rust yang membaca model sebagai teks; di sana fitur
//    `float_roundtrip` (statify-text-core/Cargo.toml) mencegah pergeseran 1 ulp. Tes Rust: statify-text-core/tests/
//    s4_fit_transform.rs (model_json_roundtrip_menghasilkan_transform_identik) dan tests/eval_integration.rs.

jest.mock("@/stores/useResultStore", () => {
  const m = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/integration.mocks");
  return { useResultStore: { getState: () => m.resultStore.state } };
});
jest.mock("@/stores/useVariableStore", () => {
  const m = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/integration.mocks");
  return { useVariableStore: { getState: () => m.variableState }, processVariableName: m.realProcessVariableName };
});

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { ModelLoadSuccess } from "@/components/Modals/Analyze/Classify/apply-model/services/model-loader";
import {
  PILKADA, bitsOf, collectNumberBits, columnValues, findFrontendRoot, installWasmWorkers, loadWasm, makeVariables, pilkadaAvailable,
  pilkadaOverrides, readCsv, resetWasm, wasmAvailable, workerCalls,
} from "@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/integration.helpers";
import { resultStore, variableState } from "@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/integration.mocks";
import {
  applyRawModelApp, exportModelText, loadModel, trainPilkadaRaw, type KName,
} from "@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/integration.drivers";

const ready = wasmAvailable() && pilkadaAvailable();
const describeIf = ready ? describe : describe.skip;
if (!ready) {
  // eslint-disable-next-line no-console
  console.warn("[integration.it05] wasm atau pilkada_*.csv tidak ditemukan: berkas dilewati.");
}

describeIf.each(["K1", "K5"] as KName[])("IT-05 %s: simpan model ke berkas -> sesi baru -> muat -> prediksi identik", (k) => {
  const train = readCsv(PILKADA.train());
  const test = readCsv(PILKADA.test());
  const testVars = makeVariables(test.header, test.rows, pilkadaOverrides());
  let tmpDir = "";
  let modelFile = "";
  let modelTextSession1 = "";
  let bitsSession1: string[] = [];
  let colsSession1: Record<number, Array<string | number | null>> = {};
  let colsSession2: Record<number, Array<string | number | null>> = {};
  let bitsSession2: string[] = [];
  let loadedFromFile: ModelLoadSuccess;
  let amModuleBefore: unknown;
  let amModuleAfter: unknown;
  let sessionTwoModelPayload: unknown;

  beforeAll(async () => {
    // ---------------- sesi 1: latih, Export Model ke berkas, terapkan dengan model DI MEMORI
    resetWasm();
    installWasmWorkers();
    resultStore.reset();
    workerCalls.length = 0;
    const { raw } = await trainPilkadaRaw(train, k);
    modelTextSession1 = exportModelText(raw);
    bitsSession1 = collectNumberBits(raw.trained_model);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "statify-it05-jest-"));
    modelFile = path.join(tmpDir, `Naive_Bayes_Model_Export_${k}.json`);
    fs.writeFileSync(modelFile, modelTextSession1);
    const memLoaded = { ...(await loadModel("memori.json", modelTextSession1)), model: raw.trained_model } as ModelLoadSuccess;
    const first = await applyRawModelApp({ loaded: memLoaded, data: test.rows, variables: testVars });
    for (const col of [4, 5, 6, 7]) colsSession1[col] = columnValues(first.updates, col, 270);
    amModuleBefore = loadWasm("am");

    // ---------------- sesi 2: instance wasm baru, store kosong, model dibaca dari DISK
    resetWasm();
    resultStore.reset();
    variableState.addVariables.mockClear();
    workerCalls.length = 0;
    const text = fs.readFileSync(modelFile, "utf8");
    loadedFromFile = await loadModel(path.basename(modelFile), text);
    const second = await applyRawModelApp({ loaded: loadedFromFile, data: test.rows, variables: testVars });
    for (const col of [4, 5, 6, 7]) colsSession2[col] = columnValues(second.updates, col, 270);
    bitsSession2 = collectNumberBits(loadedFromFile.model);
    sessionTwoModelPayload = workerCalls.filter((c) => c.kind === "am").pop()?.payload.model;
    amModuleAfter = loadWasm("am");
  }, 180000);

  it(`IT-05 ${k}-a sesi baru = instance wasm baru (modul AM berbeda) dan berkas model ada di disk`, () => {
    expect(amModuleAfter).not.toBe(amModuleBefore);
    expect(fs.existsSync(modelFile)).toBe(true);
    expect(fs.readFileSync(modelFile, "utf8")).toBe(modelTextSession1);
  });

  it(`IT-05 ${k}-b model hasil muat berkas == model asal bit-per-bit (semua angka IEEE-754 sama)`, () => {
    expect(bitsSession2.length).toBe(bitsSession1.length);
    expect(bitsSession1.length).toBeGreaterThan(5000);
    const diff = bitsSession1.filter((b, i) => b !== bitsSession2[i]).length;
    expect(diff).toBe(0);
    expect(collectNumberBits(sessionTwoModelPayload)).toEqual(bitsSession1);
  });

  it(`IT-05 ${k}-c prediksi sesi 2 (model dari berkas) IDENTIK dengan sesi 1 (model di memori): kelas dan keempat kolom NB_ pada 270 baris, nilai demi nilai (Object.is)`, () => {
    for (const col of [4, 5, 6, 7]) {
      const a = colsSession1[col];
      const b = colsSession2[col];
      expect(b).toHaveLength(270);
      expect(a.every((v) => v !== null)).toBe(true);
      const mism = a.filter((v, i) => !Object.is(v, b[i])).length;
      expect(mism).toBe(0);
      if (typeof a[0] === "number") expect(a.map((v) => bitsOf(v as number))).toEqual(b.map((v) => bitsOf(v as number)));
    }
  });
});

describeIf("IT-05 batas jaminan JSON JavaScript dan fitur float_roundtrip", () => {
  it("IT-05-d JSON.parse(JSON.stringify(x)) === x untuk 300.000 double acak (seed 42) dan nilai tepi; contoh pergeseran 1 ulp S4 dibedakan", () => {
    let s = 42 >>> 0;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s; };
    const buf = new DataView(new ArrayBuffer(8));
    const edge = [Number.MIN_VALUE, Number.MAX_VALUE, Number.EPSILON, 5e-324, -0.5, 1 / 3, 0.1, 0.2, 0.30000000000000004, 1.1104084639816971, 1.1104084639816973, Math.log(0.5), -Math.LN2];
    let bad = 0, tested = 0;
    const examine = (x: number) => { if (!Number.isFinite(x)) return; tested++; if (!Object.is(JSON.parse(JSON.stringify(x)), x)) bad++; };
    edge.forEach(examine);
    for (let i = 0; i < 300000; i++) { buf.setUint32(0, rnd()); buf.setUint32(4, rnd()); examine(buf.getFloat64(0)); }
    // eslint-disable-next-line no-console
    console.log(`[integration.it05] round-trip JSON JS: ${tested} double diuji, ${bad} selisih`);
    expect(bad).toBe(0);
    expect(bitsOf(1.1104084639816971)).not.toBe(bitsOf(1.1104084639816973));
  });

  it("IT-05-e statify-text-core/Cargo.toml mengaktifkan serde_json float_roundtrip (berlaku untuk crate NB dan AM lewat penyatuan fitur Cargo)", () => {
    const cargo = path.join(findFrontendRoot(), "public", "workers", "TextAnalytics", "statify-text-core", "Cargo.toml");
    expect(fs.readFileSync(cargo, "utf8")).toMatch(/serde_json\s*=\s*\{[^}]*float_roundtrip/);
  });
});
