// Tes tesis Track A (f): pemuatan model Apply Model (services/model-loader.ts, jalur "File").
//
// Fokus: berkas > 10 MB, JSON rusak, schema tidak dikenal, kelas kosong, kosakata kosong, ditambah urutan
// pemeriksaan loader dan kode galat AM_E_* yang sebenarnya dihasilkan (diverifikasi terhadap
// constants/apply-model-codes.ts dan services/model-loader.ts).
//
// Sudah tercakup oleh services/__tests__/model-loader.test.ts (tidak diulang di sini):
//  - "ukuran 11 MB -> AM_E_FILE_TOO_LARGE", "ukuran tepat 10 MB masih diterima (batas inklusif)",
//  - 'isi "{bad" -> AM_E_PARSE', "file .txt -> AM_E_PARSE", "file.text() gagal dibaca -> AM_E_PARSE",
//  - "JSON valid tetapi bukan objek -> AM_E_NOT_OBJECT" (satu contoh), model_type "decision_tree",
//  - D1 (1.1) dan D2 (1.0) berhasil dimuat.
// Dan oleh adapters/__tests__/naive-bayes-adapter*.test.ts: validasi schema_version/classes/terms pada level adapter.
// Yang ditambahkan di sini: batas 10 MB + 1 byte tanpa membaca isi, urutan pemeriksaan (ekstensi -> ukuran -> parse),
// variasi JSON rusak (kosong, terpotong), seluruh nilai JSON non-objek, schema tidak dikenal LEWAT loader, kelas kosong
// dan kosakata kosong LEWAT loader, serta pemuatan semua fixture ekspor model nyata (termasuk berkas 3,4 MB).

import * as fs from "fs";
import * as path from "path";

import type { Log } from "@/types/Result";
import type { ModelLoadResult } from "@/components/Modals/Analyze/Classify/apply-model/services/model-loader";
import type { BuiltinModelEntry } from "@/components/Modals/Analyze/Classify/apply-model/constants/builtin-models";

const mockLoadResults = jest.fn();
const mockStoreState: { logs: Log[]; loadResults: jest.Mock } = {
  logs: [],
  loadResults: mockLoadResults,
};
jest.mock("@/stores/useResultStore", () => ({
  useResultStore: { getState: jest.fn(() => mockStoreState) },
}));

const mockBuiltinModels: BuiltinModelEntry[] = [];
jest.mock(
  "@/components/Modals/Analyze/Classify/apply-model/constants/builtin-models",
  () => ({
    get BUILTIN_MODELS() {
      return mockBuiltinModels;
    },
  })
);

import {
  MAX_MODEL_FILE_BYTES,
  loadModelFromFile,
} from "@/components/Modals/Analyze/Classify/apply-model/services/model-loader";
import {
  ALL_APPLY_MODEL_CODES,
  APPLY_MODEL_MESSAGES,
} from "@/components/Modals/Analyze/Classify/apply-model/constants/apply-model-codes";

const FIXTURE_DIR = path.join(__dirname, "..", "..", "__fixtures__");

function readFixtureText(name: string): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8");
}
function readFixtureJson(name: string): Record<string, unknown> {
  return JSON.parse(readFixtureText(name)) as Record<string, unknown>;
}
function clone(value: unknown): Record<string, any> {
  return JSON.parse(JSON.stringify(value)) as Record<string, any>;
}

type FileSpy = { file: File; textSpy: jest.Mock };

/** File tiruan; `size` dapat diatur terpisah dari isi (mensimulasikan berkas besar tanpa memori besar). */
function makeFile(name: string, content: string, size?: number): FileSpy {
  const textSpy = jest.fn(async () => content);
  const file = {
    name,
    size: size ?? Buffer.byteLength(content, "utf8"),
    text: textSpy,
  } as unknown as File;
  return { file, textSpy };
}

function codesOf(result: ModelLoadResult): string[] {
  if (result.ok) throw new Error("Seharusnya gagal, tetapi berhasil");
  return result.errors.map((e) => e.code);
}

function expectSingleFailure(result: ModelLoadResult, code: string, detail?: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].code).toBe(code);
  expect(result.errors[0].severity).toBe("error");
  if (detail !== undefined) expect(result.errors[0].detail).toBe(detail);
}

beforeEach(() => {
  mockStoreState.logs = [];
  mockLoadResults.mockReset();
  mockBuiltinModels.length = 0;
});

// ---------------------------------------------------------------------------
// Berkas > 10 MB
// ---------------------------------------------------------------------------

describe("eval A(f): batas ukuran berkas 10 MB", () => {
  it("konstanta batas = 10 x 1024 x 1024 byte dan pesan pengguna menyebut 10 MB", () => {
    expect(MAX_MODEL_FILE_BYTES).toBe(10485760);
    expect(APPLY_MODEL_MESSAGES.AM_E_FILE_TOO_LARGE).toContain("10 MB");
    expect(APPLY_MODEL_MESSAGES.AM_E_FILE_TOO_LARGE.endsWith("(AM_E_FILE_TOO_LARGE)")).toBe(true);
  });

  it("10 MB + 1 byte ditolak AM_E_FILE_TOO_LARGE (detail = nama berkas) dan isi TIDAK dibaca", async () => {
    const { file, textSpy } = makeFile("besar.json", JSON.stringify(readFixtureJson("nb-model-v1_1.json")), MAX_MODEL_FILE_BYTES + 1);
    const result = await loadModelFromFile(file);
    expectSingleFailure(result, "AM_E_FILE_TOO_LARGE", "besar.json");
    expect(textSpy).not.toHaveBeenCalled();
  });

  it("10 MB - 1 byte dan tepat 10 MB diterima untuk model valid (isi dibaca)", async () => {
    const isi = JSON.stringify(readFixtureJson("nb-model-v1_1.json"));
    for (const ukuran of [MAX_MODEL_FILE_BYTES - 1, MAX_MODEL_FILE_BYTES]) {
      const { file, textSpy } = makeFile("pas.json", isi, ukuran);
      const result = await loadModelFromFile(file);
      expect(result.ok).toBe(true);
      expect(textSpy).toHaveBeenCalledTimes(1);
    }
  });

  it("urutan pemeriksaan: ekstensi lebih dulu (.txt besar -> AM_E_PARSE), lalu ukuran, baru isi (besar + rusak -> TOO_LARGE)", async () => {
    const txtBesar = makeFile("model.txt", "{}", MAX_MODEL_FILE_BYTES + 1);
    expectSingleFailure(await loadModelFromFile(txtBesar.file), "AM_E_PARSE", "model.txt");
    expect(txtBesar.textSpy).not.toHaveBeenCalled();

    const jsonBesarRusak = makeFile("model.json", "{bad", MAX_MODEL_FILE_BYTES + 1);
    expectSingleFailure(await loadModelFromFile(jsonBesarRusak.file), "AM_E_FILE_TOO_LARGE", "model.json");
    expect(jsonBesarRusak.textSpy).not.toHaveBeenCalled();
  });

  it("ekstensi: .JSON diterima; tanpa ekstensi atau .json.txt ditolak AM_E_PARSE", async () => {
    const isi = JSON.stringify(readFixtureJson("nb-model-v1_1.json"));
    expect((await loadModelFromFile(makeFile("MODEL.JSON", isi).file)).ok).toBe(true);
    expectSingleFailure(await loadModelFromFile(makeFile("model", isi).file), "AM_E_PARSE", "model");
    expectSingleFailure(await loadModelFromFile(makeFile("model.json.txt", isi).file), "AM_E_PARSE", "model.json.txt");
  });
});

// ---------------------------------------------------------------------------
// JSON rusak
// ---------------------------------------------------------------------------

describe("eval A(f): JSON rusak", () => {
  const rusak: Array<[string, string]> = [
    ["berkas kosong", ""],
    ["hanya spasi", "   \n  "],
    ["kurung buka saja", "{"],
    ["objek terpotong setelah koma", '{"model_type": "naive_bayes",'],
    ["array terpotong", "[1,2,"],
    ["tanda kutip tunggal", "{'model_type': 'naive_bayes'}"],
    ["literal undefined", "undefined"],
    ["literal NaN", "NaN"],
    ["koma di akhir objek", '{"model_type": "naive_bayes",}'],
    ["teks acak", "bukan json sama sekali"],
  ];

  it.each(rusak)("%s -> AM_E_PARSE dengan detail nama berkas", async (_nama, isi) => {
    const { file } = makeFile("rusak.json", isi);
    expectSingleFailure(await loadModelFromFile(file), "AM_E_PARSE", "rusak.json");
  });

  it("model valid yang dipotong separuh -> AM_E_PARSE", async () => {
    const penuh = JSON.stringify(readFixtureJson("nb-model-v1_1.json"));
    const { file } = makeFile("terpotong.json", penuh.slice(0, Math.floor(penuh.length / 2)));
    expectSingleFailure(await loadModelFromFile(file), "AM_E_PARSE", "terpotong.json");
  });

  it("model valid dengan sampah di akhir -> AM_E_PARSE", async () => {
    const penuh = JSON.stringify(readFixtureJson("nb-model-v1_1.json"));
    const { file } = makeFile("sampah.json", penuh + "xx");
    expectSingleFailure(await loadModelFromFile(file), "AM_E_PARSE", "sampah.json");
  });

  it("pesan pengguna AM_E_PARSE menyebut JSON dan berakhiran kode", () => {
    expect(APPLY_MODEL_MESSAGES.AM_E_PARSE).toContain("JSON");
    expect(APPLY_MODEL_MESSAGES.AM_E_PARSE.endsWith("(AM_E_PARSE)")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Nilai JSON valid tetapi bukan objek / tanpa model_type
// ---------------------------------------------------------------------------

describe("eval A(f): JSON valid tetapi bukan model", () => {
  it.each([["null"], ["[]"], ["[1,2,3]"], ["42"], ['"teks"'], ["true"]])(
    "%s -> AM_E_NOT_OBJECT",
    async (isi) => {
      expectSingleFailure(await loadModelFromFile(makeFile("x.json", isi).file), "AM_E_NOT_OBJECT");
    }
  );

  it.each([
    ["objek kosong", "{}"],
    ["model_type angka", '{"model_type": 1}'],
    ["model_type null", '{"model_type": null}'],
  ])("%s -> AM_E_MODEL_TYPE_MISSING", async (_n, isi) => {
    expectSingleFailure(await loadModelFromFile(makeFile("x.json", isi).file), "AM_E_MODEL_TYPE_MISSING");
  });

  it.each([["decision_tree"], ["Naive_Bayes"], ["constructor"], ["__proto__"], ["toString"]])(
    'model_type "%s" -> AM_E_MODEL_TYPE_UNSUPPORTED (detail = tipe)',
    async (tipe) => {
      const isi = `{"model_type": ${JSON.stringify(tipe)}}`;
      expectSingleFailure(
        await loadModelFromFile(makeFile("x.json", isi).file),
        "AM_E_MODEL_TYPE_UNSUPPORTED",
        tipe
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Schema tidak dikenal
// ---------------------------------------------------------------------------

describe("eval A(f): schema_version tidak dikenal (lewat loader)", () => {
  const dasar = readFixtureJson("nb-model-v1_1.json");

  it.each([["9.9", "9.9"], ["1.2", "1.2"], ["3.0", "3.0"], ["0.9", "0.9"], ["", ""], ["v1.1", "v1.1"]])(
    'schema_version "%s" -> satu galat AM_E_SCHEMA_VERSION_UNSUPPORTED (validasi berhenti, detail = versi)',
    async (versi, detail) => {
      const model = clone(dasar);
      model.schema_version = versi;
      expectSingleFailure(
        await loadModelFromFile(makeFile("v.json", JSON.stringify(model)).file),
        "AM_E_SCHEMA_VERSION_UNSUPPORTED",
        detail
      );
    }
  );

  it("schema_version hilang atau bukan string -> galat yang sama (detail kosong atau nilai teks)", async () => {
    const tanpa = clone(dasar);
    delete tanpa.schema_version;
    expectSingleFailure(
      await loadModelFromFile(makeFile("v.json", JSON.stringify(tanpa)).file),
      "AM_E_SCHEMA_VERSION_UNSUPPORTED",
      ""
    );
    const angka = clone(dasar);
    angka.schema_version = 1.1;
    expectSingleFailure(
      await loadModelFromFile(makeFile("v.json", JSON.stringify(angka)).file),
      "AM_E_SCHEMA_VERSION_UNSUPPORTED",
      "1.1"
    );
  });

  it("versi yang didukung (1.0, 1.1, 2.0) berhasil; pesan pengguna menyebut ketiganya", async () => {
    for (const nama of ["nb-model-v1_0.json", "nb-model-v1_1.json", "nb-model-v2_0-vector.json", "nb-model-v2_0-raw.json"]) {
      const hasil = await loadModelFromFile(makeFile(nama, readFixtureText(nama)).file);
      expect(hasil.ok).toBe(true);
    }
    expect(APPLY_MODEL_MESSAGES.AM_E_SCHEMA_VERSION_UNSUPPORTED).toContain("1.0, 1.1, 2.0");
  });
});

// ---------------------------------------------------------------------------
// Kelas kosong dan kosakata kosong
// ---------------------------------------------------------------------------

describe("eval A(f): kelas kosong dan kosakata kosong (lewat loader)", () => {
  it("target.classes = [] -> gagal dengan AM_E_CLASSES_EMPTY", async () => {
    const model = clone(readFixtureJson("nb-model-v1_1.json"));
    model.target.classes = [];
    const hasil = await loadModelFromFile(makeFile("k.json", JSON.stringify(model)).file);
    expect(hasil.ok).toBe(false);
    expect(codesOf(hasil)).toContain("AM_E_CLASSES_EMPTY");
  });

  it("kelas kosong dengan prior dan jumlah kasus juga kosong -> tetap gagal (bukan lolos tanpa kelas)", async () => {
    const model = clone(readFixtureJson("nb-model-v1_1.json"));
    model.target.classes = [];
    model.target.class_priors = [];
    model.target.class_counts = [];
    const hasil = await loadModelFromFile(makeFile("k.json", JSON.stringify(model)).file);
    expect(hasil.ok).toBe(false);
    expect(codesOf(hasil)).toContain("AM_E_CLASSES_EMPTY");
  });

  it("classes bukan array -> AM_E_FIELD_TYPE (bukan AM_E_CLASSES_EMPTY)", async () => {
    const model = clone(readFixtureJson("nb-model-v1_1.json"));
    model.target.classes = "Yes";
    const hasil = await loadModelFromFile(makeFile("k.json", JSON.stringify(model)).file);
    expect(hasil.ok).toBe(false);
    expect(codesOf(hasil)).toContain("AM_E_FIELD_TYPE");
  });

  it.each([["nb-model-v2_0-vector.json"], ["nb-model-v2_0-raw.json"]])(
    "%s dengan text.terms = [] -> AM_E_NB2_TEXT_SHAPE (detail 'text.terms: empty')",
    async (nama) => {
      const model = clone(readFixtureJson(nama));
      model.text.terms = [];
      const hasil = await loadModelFromFile(makeFile("t.json", JSON.stringify(model)).file);
      expect(hasil.ok).toBe(false);
      if (hasil.ok) return;
      const galat = hasil.errors.find((e) => e.code === "AM_E_NB2_TEXT_SHAPE" && e.detail === "text.terms: empty");
      expect(galat).toBeDefined();
    }
  );

  it("text.terms bukan array -> AM_E_FIELD_TYPE (detail text.terms)", async () => {
    const model = clone(readFixtureJson("nb-model-v2_0-vector.json"));
    model.text.terms = "makan";
    const hasil = await loadModelFromFile(makeFile("t.json", JSON.stringify(model)).file);
    expect(hasil.ok).toBe(false);
    if (hasil.ok) return;
    expect(hasil.errors.some((e) => e.code === "AM_E_FIELD_TYPE" && e.detail === "text.terms")).toBe(true);
  });

  it("model raw dengan recipe.vocabulary kosong -> gagal (kosakata resep tidak sama dengan terms)", async () => {
    const model = clone(readFixtureJson("nb-model-v2_0-raw.json"));
    model.text.recipe.vocabulary = [];
    const hasil = await loadModelFromFile(makeFile("t.json", JSON.stringify(model)).file);
    expect(hasil.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Semua fixture ekspor nyata termuat; kode galat loader terdaftar
// ---------------------------------------------------------------------------

describe("eval A(f): fixture ekspor model nyata dan konsistensi kode galat", () => {
  const nyata = fs
    .readdirSync(FIXTURE_DIR)
    .filter((n) => n.startsWith("Naive_Bayes_Model_Export") && n.endsWith(".json"))
    .sort();

  it("ada fixture ekspor nyata untuk diuji", () => {
    expect(nyata.length).toBeGreaterThanOrEqual(5);
  });

  it.each(nyata)("fixture %s berhasil dimuat lewat loader (ukuran di bawah 10 MB)", async (nama) => {
    const isi = readFixtureText(nama);
    const { file } = makeFile(nama, isi);
    expect(file.size).toBeLessThan(MAX_MODEL_FILE_BYTES);
    const hasil = await loadModelFromFile(file);
    if (!hasil.ok) {
      throw new Error(`Gagal dimuat: ${JSON.stringify(hasil.errors)}`);
    }
    expect(hasil.descriptor.modelType).toBe("naive_bayes");
    expect(hasil.sourceLabel).toBe(`File: ${nama}`);
    expect(hasil.sourceRef).toBe(nama);
  });

  it("setiap kode galat yang dihasilkan jalur file terdaftar di ALL_APPLY_MODEL_CODES dan punya pesan berakhiran kode", () => {
    for (const kode of [
      "AM_E_PARSE",
      "AM_E_FILE_TOO_LARGE",
      "AM_E_NOT_OBJECT",
      "AM_E_MODEL_TYPE_MISSING",
      "AM_E_MODEL_TYPE_UNSUPPORTED",
      "AM_E_SCHEMA_VERSION_UNSUPPORTED",
      "AM_E_CLASSES_EMPTY",
      "AM_E_NB2_TEXT_SHAPE",
      "AM_E_FIELD_TYPE",
    ] as const) {
      expect(ALL_APPLY_MODEL_CODES).toContain(kode);
      expect(APPLY_MODEL_MESSAGES[kode].endsWith(`(${kode})`)).toBe(true);
    }
  });
});
