// Pembantu bersama tes black-box Track C3 (BB-29..BB-36). Bukan berkas tes (tidak berakhiran .test.ts).
//
// 1. `loadRealProcessVariableName()`  : memuat fungsi `processVariableName` ASLI dari
//    `frontend/stores/useVariableStore.ts` (potongan sumber ditranspilasi lalu dieksekusi), sehingga tes
//    penamaan kolom (BB-34) memakai logika produksi, bukan salinan tangan. Store penuh (zustand + Dexie)
//    sengaja tidak diimpor.
// 2. `loadApplyModelWasm()`           : memuat biner WASM Apply Model yang sudah dibangun
//    (`public/workers/Classify/ApplyModel/pkg/wasm_bg.wasm`) tanpa worker/bundler, supaya BB-33 dan BB-35
//    dapat menjalankan komputasi Rust yang SUNGGUHAN (bukan mock) dari Jest.
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

/** Naik dari folder ini sampai menemukan folder `frontend` (berisi stores/useVariableStore.ts). */
export function findFrontendRoot(start: string = __dirname): string {
  let dir = start;
  for (let i = 0; i < 14; i += 1) {
    if (fs.existsSync(path.join(dir, "stores", "useVariableStore.ts"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Folder frontend tidak ditemukan dari " + start);
}

export type ProcessVariableName = (
  name: string,
  existing: Array<{ name: string }>
) => { isValid: boolean; message?: string; processedName?: string };

export function loadRealProcessVariableName(): ProcessVariableName {
  const source = fs.readFileSync(
    path.join(findFrontendRoot(), "stores", "useVariableStore.ts"),
    "utf8"
  );
  const start = source.indexOf("const RESERVED_KEYWORDS");
  const end = source.indexOf("export const createDefaultVariable");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Potongan processVariableName tidak ditemukan di useVariableStore.ts");
  }
  const snippet = source
    .slice(start, end)
    .replace("export const processVariableName", "const processVariableName");
  const js = ts.transpileModule(
    `${snippet}\nmodule.exports = { processVariableName };`,
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }
  ).outputText;
  const sandboxModule: { exports: { processVariableName?: ProcessVariableName } } = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function("module", "exports", js)(sandboxModule, sandboxModule.exports);
  const fn = sandboxModule.exports.processVariableName;
  if (typeof fn !== "function") throw new Error("processVariableName gagal dimuat");
  return fn;
}

// ---------------------------------------------------------------------------
// WASM Apply Model
// ---------------------------------------------------------------------------

export type WasmAnalysis = {
  get_formatted_results(): unknown;
  get_all_errors(): unknown;
  free(): void;
};
export type WasmAnalysisCtor = new (
  predictors: unknown,
  predictorDefs: unknown,
  mapping: unknown,
  actual: unknown,
  actualDefs: unknown,
  model: unknown,
  text: unknown
) => WasmAnalysis;

function pkgDir(): string {
  return path.join(findFrontendRoot(), "public", "workers", "Classify", "ApplyModel", "pkg");
}

export function applyModelWasmAvailable(): boolean {
  try {
    return (
      fs.existsSync(path.join(pkgDir(), "wasm.js")) &&
      fs.existsSync(path.join(pkgDir(), "wasm_bg.wasm"))
    );
  } catch {
    return false;
  }
}

/** SHA-256 biner WASM yang dipakai (dicatat sebagai bukti provenans di laporan). */
export function applyModelWasmSha256(): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(pkgDir(), "wasm_bg.wasm")))
    .digest("hex");
}

let cachedCtor: WasmAnalysisCtor | null = null;

export function loadApplyModelWasm(): WasmAnalysisCtor {
  if (cachedCtor) return cachedCtor;
  const glue = fs.readFileSync(path.join(pkgDir(), "wasm.js"), "utf8");
  // wasm.js adalah modul ES (`export`, `import.meta`). Diubah menjadi badan fungsi biasa; jalur
  // `default init()` (yang memakai import.meta.url) tidak pernah dipanggil, hanya `initSync`.
  const body = glue
    .replace(/^export class ApplyModelAnalysis/m, "class ApplyModelAnalysis")
    .replace(/^export \{[^}]*\};?\s*$/m, "")
    .replace(/import\.meta\.url/g, "'file:///wasm.js'");
  if (/^\s*export\s/m.test(body) || /import\.meta/.test(body)) {
    throw new Error("Glue wasm.js memuat sintaks modul yang belum ditangani");
  }
  // eslint-disable-next-line no-new-func
  const factory = new Function(`"use strict";\n${body}\nreturn { ApplyModelAnalysis, initSync };`);
  const exported = factory() as {
    ApplyModelAnalysis: WasmAnalysisCtor;
    initSync: (input: { module: Uint8Array }) => unknown;
  };
  const bytes = new Uint8Array(fs.readFileSync(path.join(pkgDir(), "wasm_bg.wasm")));
  exported.initSync({ module: bytes });
  cachedCtor = exported.ApplyModelAnalysis;
  return cachedCtor;
}
