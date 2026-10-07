// Tes thesis Track B (white-box, basis path) WB-4: loadModelFromFile (+ finalizeLoad).
// File dimock sebagai objek { name, size, text() } seperti pada services/__tests__/model-loader.test.ts.
// validateAnyModel/adapter NB dipakai ASLI (tidak dimock); hanya result store yang dimock agar modul dapat diimpor.
import type { ModelLoadResult } from "@/components/Modals/Analyze/Classify/apply-model/services/model-loader";

jest.mock("@/stores/useResultStore", () => ({
    useResultStore: { getState: jest.fn(() => ({ logs: [], loadResults: jest.fn() })) },
}));

import {
    MAX_MODEL_FILE_BYTES,
    loadModelFromFile,
} from "@/components/Modals/Analyze/Classify/apply-model/services/model-loader";

// Fixture dimuat via require (tsconfig composite tidak mengizinkan import JSON via alias).
const nbModelV11 = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v1_1.json") as Record<string, unknown>;

function makeFile(name: string, content: string, size?: number): File {
    return { name, size: size ?? content.length, text: async () => content } as unknown as File;
}

function expectFailure(result: ModelLoadResult, code: string, detail?: string): void {
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected load to fail, but it succeeded");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe(code);
    expect(result.errors[0].severity).toBe("error");
    if (detail === undefined) expect(result.errors[0]).not.toHaveProperty("detail");
    else expect(result.errors[0].detail).toBe(detail);
}

it("WB-4 jalur 1: file \"model.json\" berisi fixture model NB sah (nb-model-v1_1.json), ukuran wajar", async () => {
    const result = await loadModelFromFile(makeFile("model.json", JSON.stringify(nbModelV11)));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.sourceRef).toBe("model.json");
    expect(result.sourceLabel).toBe("File: model.json");
    expect(result.descriptor.modelType).toBe("naive_bayes");
    expect((result.model as Record<string, unknown>).model_type).toBe("naive_bayes");
});

it("WB-4 jalur 2: file.name = \"model.txt\" (bukan .json)", async () => {
    const result = await loadModelFromFile(makeFile("model.txt", JSON.stringify(nbModelV11)));
    expectFailure(result, "AM_E_PARSE", "model.txt");
});

it("WB-4 jalur 3: file.name = \"big.json\", file.size = MAX_MODEL_FILE_BYTES + 1", async () => {
    const result = await loadModelFromFile(makeFile("big.json", "{}", MAX_MODEL_FILE_BYTES + 1));
    expectFailure(result, "AM_E_FILE_TOO_LARGE", "big.json");
});

it("WB-4 jalur 4: file.text() ditolak (reject) pada \"unreadable.json\"", async () => {
    const file = { name: "unreadable.json", size: 10, text: async () => { throw new Error("read error"); } } as unknown as File;
    expectFailure(await loadModelFromFile(file), "AM_E_PARSE", "unreadable.json");
});

it("WB-4 jalur 5: isi file \"{bad\" (JSON.parse melempar SyntaxError)", async () => {
    const result = await loadModelFromFile(makeFile("bad.json", "{bad"));
    expectFailure(result, "AM_E_PARSE", "bad.json");
});

it("WB-4 jalur 6: isi file \"[]\" (JSON sah, bukan objek; validateAnyModel gagal)", async () => {
    const result = await loadModelFromFile(makeFile("arr.json", "[]"));
    expectFailure(result, "AM_E_NOT_OBJECT");
});
