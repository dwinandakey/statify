/**
 * Pemuat hook useStringToWordVector untuk tes Jest (Track C1).
 *
 * Mengapa perlu: hooks/useStringToWordVector.ts memakai `new URL("../stringToWord.processor.ts", import.meta.url)`
 * untuk membuat Web Worker. `import.meta` tidak dapat di-parse oleh ts-jest (keluaran CommonJS),
 * sehingga berkas ini gagal dimuat ("Cannot use 'import.meta' outside a module").
 *
 * Yang dilakukan: membaca SUMBER ASLI hook, mengganti HANYA teks `import.meta.url` dengan URL konstan,
 * men-transpilasi dengan kompiler TypeScript ke CommonJS, lalu mengeksekusinya memakai `require` milik Jest
 * (jadi tiruan store/sonner di berkas tes tetap berlaku). Logika hook TIDAK diubah.
 * Kode produksi tidak disentuh.
 */
import fs from "fs";
import path from "path";

type TsModule = typeof import("typescript");

export function loadStwvHook(): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ts = require("typescript") as TsModule;
    const hooksDir = path.resolve(__dirname, "../../../hooks");
    const file = path.join(hooksDir, "useStringToWordVector.ts");
    const source = fs.readFileSync(file, "utf-8");
    const patched = source.split("import.meta.url").join('"file:///stwv-hook-under-test"');
    const js = ts.transpileModule(patched, {
        fileName: file,
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
            jsx: ts.JsxEmit.ReactJSX,
        },
    }).outputText;

    const mod: { exports: Record<string, unknown> } = { exports: {} };
    const localRequire = (id: string): unknown =>
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        id.startsWith(".") ? require(path.resolve(hooksDir, id)) : require(id);
    // eslint-disable-next-line no-new-func
    new Function("exports", "require", "module", "__filename", "__dirname", js)(mod.exports, localRequire, mod, file, hooksDir);
    return mod.exports;
}
