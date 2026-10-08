/** @jest-environment node */
// Track C3 — Black-box BB-29 (berkas bukan model / > 10 MB) dan BB-30 (model dari Output Viewer), tingkat service.
// Sumber kebenaran: services/model-loader.ts (loadModelFromFile, listResultStoreModels, loadModelFromResultStore),
// adapters/registry.ts (validateAnyModel), constants/apply-model-codes.ts, services/apply-model-error-messages.ts.
// Store hasil (useResultStore) di-mock dengan pola services/__tests__/model-loader.test.ts.

import type { Log } from "@/types/Result";
import { APPLY_MODEL_MESSAGES } from "@/components/Modals/Analyze/Classify/apply-model/constants/apply-model-codes";
import type { ModelLoadResult } from "@/components/Modals/Analyze/Classify/apply-model/services/model-loader";

const mockLoadResults = jest.fn();
const mockStoreState: { logs: Log[]; loadResults: jest.Mock } = {
  logs: [],
  loadResults: mockLoadResults,
};
jest.mock("@/stores/useResultStore", () => ({
  useResultStore: { getState: jest.fn(() => mockStoreState) },
}));

import {
  MAX_MODEL_FILE_BYTES,
  listResultStoreModels,
  loadModelFromFile,
  loadModelFromResultStore,
} from "@/components/Modals/Analyze/Classify/apply-model/services/model-loader";

// Fixture dimuat via require (tsconfig composite melarang import JSON lewat alias).
const nbModelV11 = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v1_1.json") as Record<string, unknown>;
const nbModelRaw = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v2_0-raw.json") as Record<string, unknown>;

type FakeFile = File & { textSpy: jest.Mock };

function makeFile(name: string, content: string, size?: number): FakeFile {
  const textSpy = jest.fn(async () => content);
  return {
    name,
    size: size ?? content.length,
    text: textSpy,
    textSpy,
  } as unknown as FakeFile;
}

function errorsOf(result: ModelLoadResult): Array<{ code: string; detail?: string }> {
  if (result.ok) throw new Error("Pemuatan seharusnya gagal");
  return result.errors.map((e) => ({ code: e.code, detail: e.detail }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreState.logs = [];
});

// ---------------------------------------------------------------------------
// BB-29
// ---------------------------------------------------------------------------

describe("BB-29 loader berkas: berkas bukan model", () => {
  it("BB-29a ekstensi bukan .json ditolak AM_E_PARSE sebelum dibaca", async () => {
    for (const name of ["model.txt", "model.csv", "model", "model.json.bak"]) {
      const file = makeFile(name, JSON.stringify(nbModelV11));
      const result = await loadModelFromFile(file);
      expect(result.ok).toBe(false);
      expect(errorsOf(result)).toEqual([{ code: "AM_E_PARSE", detail: name }]);
      expect(file.textSpy).not.toHaveBeenCalled();
    }
  });

  it("BB-29b ekstensi .JSON huruf besar tetap diterima (pemeriksaan case-insensitive)", async () => {
    const result = await loadModelFromFile(makeFile("MODEL.JSON", JSON.stringify(nbModelV11)));
    expect(result.ok).toBe(true);
  });

  it("BB-29c isi .json bukan JSON valid -> AM_E_PARSE", async () => {
    const result = await loadModelFromFile(makeFile("rusak.json", "{ ini bukan json"));
    expect(errorsOf(result)).toEqual([{ code: "AM_E_PARSE", detail: "rusak.json" }]);
  });

  it("BB-29d JSON valid tetapi bukan objek -> AM_E_NOT_OBJECT", async () => {
    for (const content of ["[1,2,3]", '"teks"', "42", "null", "true"]) {
      const result = await loadModelFromFile(makeFile("x.json", content));
      expect(errorsOf(result)).toEqual([{ code: "AM_E_NOT_OBJECT", detail: undefined }]);
    }
  });

  it("BB-29e objek tanpa model_type (atau bukan string) -> AM_E_MODEL_TYPE_MISSING", async () => {
    for (const content of ['{"foo":1}', "{}", '{"model_type":123}', '{"model_type":null}']) {
      const result = await loadModelFromFile(makeFile("x.json", content));
      expect(errorsOf(result)).toEqual([{ code: "AM_E_MODEL_TYPE_MISSING", detail: undefined }]);
    }
  });

  it("BB-29f model_type tidak terdaftar -> AM_E_MODEL_TYPE_UNSUPPORTED dengan detail jenis model", async () => {
    for (const type of ["svm", "knn", "constructor", "toString"]) {
      const result = await loadModelFromFile(
        makeFile("x.json", JSON.stringify({ ...nbModelV11, model_type: type }))
      );
      expect(errorsOf(result)).toEqual([{ code: "AM_E_MODEL_TYPE_UNSUPPORTED", detail: type }]);
    }
  });

  it("BB-29g naive_bayes dengan schema_version tak dikenal -> AM_E_SCHEMA_VERSION_UNSUPPORTED", async () => {
    const result = await loadModelFromFile(
      makeFile("x.json", JSON.stringify({ ...nbModelV11, schema_version: "3.0" }))
    );
    expect(errorsOf(result)).toEqual([{ code: "AM_E_SCHEMA_VERSION_UNSUPPORTED", detail: "3.0" }]);
  });

  it("BB-29h naive_bayes tanpa field wajib -> semua AM_E_FIELD_MISSING (target termasuk)", async () => {
    const result = await loadModelFromFile(
      makeFile("x.json", JSON.stringify({ model_type: "naive_bayes", schema_version: "1.1" }))
    );
    const errors = errorsOf(result);
    expect(errors.length).toBeGreaterThan(1);
    expect(new Set(errors.map((e) => e.code))).toEqual(new Set(["AM_E_FIELD_MISSING"]));
    expect(errors.map((e) => e.detail)).toContain("target");
  });

  it("BB-29i model valid tidak menghasilkan galat; label sumber 'File: <nama>'", async () => {
    const result = await loadModelFromFile(makeFile("nb.json", JSON.stringify(nbModelV11)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sourceLabel).toBe("File: nb.json");
    expect(result.descriptor.targetName).toBe("Play");
    expect(result.descriptor.classes).toEqual(["No", "Yes"]);
  });
});

describe("BB-29 loader berkas: batas ukuran 10 MB", () => {
  it("BB-29j konstanta batas = 10 * 1024 * 1024 byte", () => {
    expect(MAX_MODEL_FILE_BYTES).toBe(10 * 1024 * 1024);
  });

  it("BB-29k ukuran = batas diterima; batas + 1 byte -> AM_E_FILE_TOO_LARGE tanpa membaca isi", async () => {
    const json = JSON.stringify(nbModelV11);
    const atLimit = makeFile("pas.json", json, MAX_MODEL_FILE_BYTES);
    const okResult = await loadModelFromFile(atLimit);
    expect(okResult.ok).toBe(true);

    const tooBig = makeFile("besar.json", json, MAX_MODEL_FILE_BYTES + 1);
    const result = await loadModelFromFile(tooBig);
    expect(errorsOf(result)).toEqual([{ code: "AM_E_FILE_TOO_LARGE", detail: "besar.json" }]);
    expect(tooBig.textSpy).not.toHaveBeenCalled();
  });

  it("BB-29l berkas non-.json yang juga sangat besar dilaporkan sebagai AM_E_PARSE (ekstensi diperiksa lebih dulu)", async () => {
    const result = await loadModelFromFile(makeFile("besar.zip", "x", MAX_MODEL_FILE_BYTES * 5));
    expect(errorsOf(result)).toEqual([{ code: "AM_E_PARSE", detail: "besar.zip" }]);
  });

  it("BB-29m teks pesan pengguna sesuai konstanta (kode di akhir kalimat)", () => {
    expect(APPLY_MODEL_MESSAGES.AM_E_FILE_TOO_LARGE).toBe(
      "The model file is larger than the 10 MB limit. (AM_E_FILE_TOO_LARGE)"
    );
    expect(APPLY_MODEL_MESSAGES.AM_E_PARSE).toBe(
      "The model content could not be read as valid JSON. (AM_E_PARSE)"
    );
  });
});

// ---------------------------------------------------------------------------
// BB-30
// ---------------------------------------------------------------------------

/** Meniru statistic "Export Model" yang dipasang NB (naive-bayes-analysis-output.ts). */
function exportModelStatistic(id: number, model: unknown, asString = false) {
  return {
    id,
    title: "Export Model",
    description: "",
    components: "Export Model",
    output_data: JSON.stringify({
      naiveBayesTrainedModel: asString ? JSON.stringify(model) : model,
    }),
  };
}

function makeLogs(): Log[] {
  return [
    {
      id: 1,
      log: "Naive Bayes",
      analytics: [
        {
          id: 1,
          title: "Naive Bayes Result",
          statistics: [
            { id: 3, title: "Case Processing Summary", description: "", components: "Case Processing Summary", output_data: "{}" },
            exportModelStatistic(4, nbModelV11),
          ],
        },
      ],
    },
    {
      id: 2,
      log: "Naive Bayes (teks)",
      analytics: [
        {
          id: 2,
          title: "Naive Bayes Result",
          statistics: [exportModelStatistic(9, nbModelRaw, true)],
        },
      ],
    },
  ] as unknown as Log[];
}

describe("BB-30 model dari Output Viewer (service)", () => {
  it("BB-30a daftar memuat hanya statistic 'Export Model', terbaru (id terbesar) dulu, label 'log › analytic — trained_at'", async () => {
    mockStoreState.logs = makeLogs();
    const items = await listResultStoreModels();
    expect(items.map((i) => i.statisticId)).toEqual([9, 4]);
    expect(items[1]).toEqual({
      statisticId: 4,
      label: "Naive Bayes › Naive Bayes Result — 2026-10-01T00:00:00.000Z",
      modelType: "naive_bayes",
      trainedAt: "2026-10-01T00:00:00.000Z",
    });
    expect(mockLoadResults).not.toHaveBeenCalled();
  });

  it("BB-30b result store kosong: loadResults dipanggil tepat sekali, daftar kosong", async () => {
    mockStoreState.logs = [];
    const items = await listResultStoreModels();
    expect(items).toEqual([]);
    expect(mockLoadResults).toHaveBeenCalledTimes(1);
  });

  it("BB-30c memuat model objek-JSON: ok, deskriptor (target, kelas, fitur) sesuai model asal, label sumber memuat id", async () => {
    mockStoreState.logs = makeLogs();
    const result = await loadModelFromResultStore(4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sourceRef).toBe("4");
    expect(result.sourceLabel).toBe("Output Viewer: Naive Bayes › Naive Bayes Result (#4)");
    expect(result.descriptor.schemaVersion).toBe("1.1");
    expect(result.descriptor.targetName).toBe("Play");
    expect(result.descriptor.classes).toEqual(["No", "Yes"]);
    expect(result.descriptor.features).toEqual([
      { name: "Outlook", role: "categorical" },
      { name: "Temp", role: "numerical" },
    ]);
    expect(result.model).toEqual(nbModelV11);
  });

  it("BB-30d memuat model yang tersimpan sebagai string JSON bersarang (model teks Raw): deskriptor teks terisi", async () => {
    mockStoreState.logs = makeLogs();
    const result = await loadModelFromResultStore(9);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.descriptor.schemaVersion).toBe("2.0");
    expect(result.descriptor.text?.source).toBe("raw");
    expect(result.descriptor.text?.rawVariable).toBe("Teks");
    expect(result.descriptor.targetName).toBe("Sentimen");
  });

  it("BB-30e id tidak ada -> AM_E_NO_MODEL; statistic bukan model -> AM_E_NO_MODEL; payload rusak -> AM_E_PARSE", async () => {
    mockStoreState.logs = makeLogs();
    mockStoreState.logs[0].analytics![0].statistics!.push({
      id: 20,
      title: "Export Model",
      description: "",
      components: "Export Model",
      output_data: "{bukan json",
    });

    expect(errorsOf(await loadModelFromResultStore(999))).toEqual([{ code: "AM_E_NO_MODEL", detail: "999" }]);
    expect(errorsOf(await loadModelFromResultStore(3))).toEqual([{ code: "AM_E_NO_MODEL", detail: "3" }]);
    expect(errorsOf(await loadModelFromResultStore(20))).toEqual([{ code: "AM_E_PARSE", detail: "20" }]);
  });

  it("BB-30f model di result store yang melanggar skema ditolak validasi umum (tidak dipakai)", async () => {
    const broken = { ...nbModelV11, model_type: "svm" };
    mockStoreState.logs = [
      {
        id: 1,
        log: "Naive Bayes",
        analytics: [{ id: 1, title: "Hasil", statistics: [exportModelStatistic(5, broken)] }],
      },
    ] as unknown as Log[];

    const result = await loadModelFromResultStore(5);
    expect(errorsOf(result)).toEqual([{ code: "AM_E_MODEL_TYPE_UNSUPPORTED", detail: "svm" }]);
  });
});
