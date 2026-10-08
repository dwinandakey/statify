/** @jest-environment node */
// Track C3 — Black-box BB-31 (Auto-map by name), BB-32 (variabel teks model tidak ada -> pemetaan belum
// lengkap, OK nonaktif) dan BB-34 (nama kolom output bentrok -> akhiran otomatis + peringatan), tingkat
// fungsi aturan (hooks/useApplyModelMappingRules.ts, useApplyModelSaveRules.ts, useApplyModelValidation.ts).
// `processVariableName` yang dipakai adalah kode produksi dari stores/useVariableStore.ts (lihat helper).

import type { Variable } from "@/types/Variable";
import { validateAnyModel } from "@/components/Modals/Analyze/Classify/apply-model/adapters/registry";
import type { ModelDescriptor } from "@/components/Modals/Analyze/Classify/apply-model/adapters/types";
import { naiveBayesModelAdapter } from "@/components/Modals/Analyze/Classify/apply-model/adapters/naive-bayes-adapter";
import { APPLY_MODEL_MESSAGES } from "@/components/Modals/Analyze/Classify/apply-model/constants/apply-model-codes";
import { ApplyModelDefault } from "@/components/Modals/Analyze/Classify/apply-model/constants/apply-model-default";
import {
  autoMapFeatures,
  formatVectorMappingSummary,
  summarizeVectorMapping,
  validateMapping,
} from "@/components/Modals/Analyze/Classify/apply-model/hooks/useApplyModelMappingRules";
import {
  getOutputColumnSpecs,
  resolveFinalOutputNames,
  validateCustomOutputNames,
  validateNamePrefix,
} from "@/components/Modals/Analyze/Classify/apply-model/hooks/useApplyModelSaveRules";
import {
  computeApplyModelValidation,
  formatApplyModelIssueMessage,
} from "@/components/Modals/Analyze/Classify/apply-model/hooks/useApplyModelValidation";
import type { ApplyModelType } from "@/components/Modals/Analyze/Classify/apply-model/types/apply-model";

jest.mock("@/stores/useVariableStore", () => {
  const helpers = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/blackbox.am.helpers");
  return {
    processVariableName: helpers.loadRealProcessVariableName(),
    useVariableStore: jest.fn(),
  };
});

const nbModelV11 = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v1_1.json") as Record<string, unknown>;
const nbModelRaw = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v2_0-raw.json") as Record<string, unknown>;
const nbModelVector = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v2_0-vector.json") as Record<string, unknown>;
// Ekspor nyata dari menu Naive Bayes (dataset Pilkada, jalur Raw Text, Complement).
const nbModelComplementReal = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/Naive_Bayes_Model_Export (6)complement.json") as Record<string, unknown>;
// Ekspor nyata jalur Word-Vector (17.454 kolom VEC_).
const nbModelVectorReal = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/Naive_Bayes_Model_Export (5)17rbVEC.json") as Record<string, unknown>;

function makeVariable(
  name: string,
  measure: Variable["measure"],
  type: Variable["type"],
  columnIndex = 0
): Variable {
  return {
    columnIndex,
    name,
    type,
    width: 8,
    decimals: 0,
    values: [],
    missing: null,
    columns: 8,
    align: "right",
    measure,
    role: "input",
  };
}

function descriptorOf(model: Record<string, unknown>): ModelDescriptor {
  const validation = validateAnyModel(model);
  if (!validation.ok) throw new Error("Fixture harus valid: " + JSON.stringify(validation.errors.slice(0, 3)));
  return validation.descriptor;
}

function formWith(
  model: Record<string, unknown>,
  variables: ApplyModelType["variables"],
  save: Partial<ApplyModelType["save"]> = {}
): ApplyModelType {
  const form = JSON.parse(JSON.stringify(ApplyModelDefault)) as ApplyModelType;
  form.model = { SourceKind: "file", SourceRef: "m.json", SourceLabel: "File: m.json", ModelJson: model };
  form.variables = variables;
  form.save = { ...form.save, ...save };
  return form;
}

const d3Variables = (): Variable[] => [
  makeVariable("Outlook", "nominal", "STRING", 0),
  makeVariable("Temp", "scale", "NUMERIC", 1),
  makeVariable("Play", "nominal", "STRING", 2),
];

// ---------------------------------------------------------------------------
// BB-31 Auto-map by name
// ---------------------------------------------------------------------------

describe("BB-31 Auto-map by name (autoMapFeatures)", () => {
  const d1 = descriptorOf(nbModelV11);

  it("BB-31a nama persis: seluruh fitur terpetakan, target aktual otomatis terisi", () => {
    expect(autoMapFeatures(d1, d3Variables())).toEqual({
      FeatureMapping: { Outlook: "Outlook", Temp: "Temp" },
      ActualTargetVar: "Play",
    });
  });

  it("BB-31b nama berbeda huruf besar/kecil tetapi unik: terpetakan ke nama variabel dataset", () => {
    const variables = [
      makeVariable("outlook", "nominal", "STRING", 0),
      makeVariable("TEMP", "scale", "NUMERIC", 1),
      makeVariable("play", "nominal", "STRING", 2),
    ];
    expect(autoMapFeatures(d1, variables)).toEqual({
      FeatureMapping: { Outlook: "outlook", Temp: "TEMP" },
      ActualTargetVar: "play",
    });
  });

  it("BB-31c kecocokan persis diutamakan atas varian huruf lain", () => {
    const variables = [
      makeVariable("OUTLOOK", "nominal", "STRING", 0),
      makeVariable("Outlook", "nominal", "STRING", 1),
      makeVariable("Temp", "scale", "NUMERIC", 2),
    ];
    expect(autoMapFeatures(d1, variables).FeatureMapping.Outlook).toBe("Outlook");
  });

  it("BB-31d varian huruf yang ambigu (lebih dari satu kandidat) tidak dipetakan (null)", () => {
    const variables = [
      makeVariable("OUTLOOK", "nominal", "STRING", 0),
      makeVariable("outlook", "nominal", "STRING", 1),
      makeVariable("Temp", "scale", "NUMERIC", 2),
    ];
    expect(autoMapFeatures(d1, variables).FeatureMapping).toEqual({ Outlook: null, Temp: "Temp" });
  });

  it("BB-31e fitur yang tidak ada di dataset = null; satu variabel tidak dipakai dua fitur", () => {
    expect(autoMapFeatures(d1, [makeVariable("Outlook", "nominal", "STRING")]).FeatureMapping).toEqual({
      Outlook: "Outlook",
      Temp: null,
    });

    // Dua fitur model "Age" dan "age" sama-sama jatuh ke satu-satunya variabel "AGE": hanya yang pertama.
    const twoFeatures: ModelDescriptor = {
      ...d1,
      features: [
        { name: "Age", role: "numerical" },
        { name: "age", role: "numerical" },
      ],
    };
    expect(
      autoMapFeatures(twoFeatures, [makeVariable("AGE", "scale", "NUMERIC")]).FeatureMapping
    ).toEqual({ Age: "AGE", age: null });
  });

  it("BB-31f auto-map tidak memeriksa measure; ketidakcocokan baru muncul sebagai AM_E_MAP_ROLE_MISMATCH saat validasi", () => {
    const variables = [
      makeVariable("Outlook", "nominal", "STRING", 0),
      makeVariable("Temp", "nominal", "NUMERIC", 1), // fitur numerik, tetapi measure nominal
      makeVariable("Play", "nominal", "STRING", 2),
    ];
    const mapped = autoMapFeatures(d1, variables);
    expect(mapped.FeatureMapping.Temp).toBe("Temp");
    const issues = validateMapping(d1, mapped.FeatureMapping, mapped.ActualTargetVar, variables);
    expect(issues.map((i) => [i.code, i.detail])).toEqual([["AM_E_MAP_ROLE_MISMATCH", "Temp"]]);
  });

  it("BB-31g target aktual: tidak terisi bila measure-nya scale atau namanya sudah dipakai sebagai prediktor", () => {
    const scalePlay = [
      makeVariable("Outlook", "nominal", "STRING", 0),
      makeVariable("Temp", "scale", "NUMERIC", 1),
      makeVariable("Play", "scale", "NUMERIC", 2),
    ];
    expect(autoMapFeatures(d1, scalePlay).ActualTargetVar).toBeNull();

    // Fitur model bernama sama dengan target ("Play" sebagai fitur categorical) -> tidak boleh ganda.
    const featureIsTarget: ModelDescriptor = {
      ...d1,
      features: [{ name: "Play", role: "categorical" }],
    };
    const mapped = autoMapFeatures(featureIsTarget, [makeVariable("Play", "nominal", "STRING")]);
    expect(mapped.FeatureMapping).toEqual({ Play: "Play" });
    expect(mapped.ActualTargetVar).toBeNull();
  });

  it("BB-31h model Raw Text nyata (Pilkada): variabel 'Text Tweet' dan target 'Sentiment' terpetakan", () => {
    const pilkada = [
      makeVariable("Id", "scale", "NUMERIC", 0),
      makeVariable("Sentiment", "nominal", "STRING", 1),
      makeVariable("Pasangan Calon", "nominal", "STRING", 2),
      makeVariable("Text Tweet", "nominal", "STRING", 3),
    ];
    const mapped = autoMapFeatures(descriptorOf(nbModelComplementReal), pilkada);
    expect(mapped.RawTextVar).toBe("Text Tweet");
    expect(mapped.ActualTargetVar).toBe("Sentiment");
    expect(mapped.FeatureMapping).toEqual({});
  });

  it("BB-31i model Word-Vector: kolom VEC_ yang ditemukan terpetakan, sisanya null dan diringkas 'm of V found; V-m treated as 0'", () => {
    const descriptor = descriptorOf(nbModelVector);
    const variables = [
      makeVariable("VEC_makan", "scale", "NUMERIC", 0),
      makeVariable("vec_nasi", "scale", "NUMERIC", 1), // huruf berbeda tetapi unik
      makeVariable("VEC_saya", "scale", "NUMERIC", 2),
      makeVariable("Sentimen", "nominal", "STRING", 3),
    ];
    const mapped = autoMapFeatures(descriptor, variables);
    expect(mapped.VectorMapping).toEqual({
      VEC_makan: "VEC_makan",
      VEC_nasi: "vec_nasi",
      VEC_saya: "VEC_saya",
      VEC_suka: null,
      VEC_tidak: null,
    });
    expect(mapped.ActualTargetVar).toBe("Sentimen");
    const summary = summarizeVectorMapping(descriptor, mapped.VectorMapping);
    expect(summary).toEqual({ total: 5, mapped: 3, zeroFilled: ["VEC_suka", "VEC_tidak"] });
    expect(formatVectorMappingSummary(summary)).toBe("3 of 5 vector columns found; 2 treated as 0.");
  });

  it("BB-31j model Word-Vector nyata 17.454 kolom: pemetaan tetap tepat dan cepat", () => {
    const descriptor = descriptorOf(nbModelVectorReal);
    const columns = descriptor.text?.columns ?? [];
    expect(columns.length).toBe(17454);
    const variables = columns.slice(0, 3).map((name, i) => makeVariable(name, "scale", "NUMERIC", i));
    const started = Date.now();
    const mapped = autoMapFeatures(descriptor, variables);
    const elapsedMs = Date.now() - started;
    const summary = summarizeVectorMapping(descriptor, mapped.VectorMapping);
    expect(summary.mapped).toBe(3);
    expect(summary.zeroFilled.length).toBe(17451);
    expect(elapsedMs).toBeLessThan(2000);
  });
});

// ---------------------------------------------------------------------------
// BB-32 variabel teks model tidak ada -> pemetaan belum lengkap, OK nonaktif
// ---------------------------------------------------------------------------

describe("BB-32 pemetaan belum lengkap -> validasi gagal (OK nonaktif)", () => {
  it("BB-32a model Raw Text, dataset tanpa variabel 'Teks': AM_E_MAP_RAW_TEXT_UNMAPPED, isValid=false, pesan berkode", () => {
    const variables = [makeVariable("Catatan", "nominal", "STRING", 0), makeVariable("Sentimen", "nominal", "STRING", 1)];
    const mapped = autoMapFeatures(descriptorOf(nbModelRaw), variables);
    expect(mapped.RawTextVar).toBeNull();

    const form = formWith(nbModelRaw, {
      FeatureMapping: mapped.FeatureMapping,
      ActualTargetVar: mapped.ActualTargetVar,
      RawTextVar: mapped.RawTextVar,
      VectorMapping: {},
    });
    const result = computeApplyModelValidation(form, variables);
    expect(result.validation.isValid).toBe(false);
    expect(result.validation.issues.map((i) => [i.code, i.detail])).toEqual([
      ["AM_E_MAP_RAW_TEXT_UNMAPPED", "Teks"],
    ]);
    expect(result.firstErrorMessage).toBe(
      'The raw text variable "Teks" is not mapped to a dataset variable. (AM_E_MAP_RAW_TEXT_UNMAPPED)'
    );
  });

  it("BB-32b memilih variabel teks yang ada membuat form valid kembali", () => {
    const variables = [makeVariable("Catatan", "nominal", "STRING", 0), makeVariable("Sentimen", "nominal", "STRING", 1)];
    const form = formWith(nbModelRaw, {
      FeatureMapping: {},
      ActualTargetVar: "Sentimen",
      RawTextVar: "Catatan",
      VectorMapping: {},
    });
    const result = computeApplyModelValidation(form, variables);
    expect(result.validation.isValid).toBe(true);
    expect(result.firstErrorMessage).toBeNull();
  });

  it("BB-32c variabel teks dipetakan ke variabel numerik: AM_E_MAP_RAW_TEXT_TYPE (detail = nama variabel teks di model)", () => {
    const variables = [makeVariable("Angka", "scale", "NUMERIC", 0)];
    const form = formWith(nbModelRaw, {
      FeatureMapping: {},
      ActualTargetVar: null,
      RawTextVar: "Angka",
      VectorMapping: {},
    });
    const result = computeApplyModelValidation(form, variables);
    expect(result.validation.isValid).toBe(false);
    expect(result.validation.issues.map((i) => [i.code, i.detail])).toEqual([["AM_E_MAP_RAW_TEXT_TYPE", "Teks"]]);
  });

  it("BB-32d model fitur biasa, dataset tanpa 'Temp': AM_E_MAP_UNMAPPED (detail = nama fitur), isValid=false", () => {
    const variables = [makeVariable("Outlook", "nominal", "STRING", 0), makeVariable("Play", "nominal", "STRING", 1)];
    const mapped = autoMapFeatures(descriptorOf(nbModelV11), variables);
    const form = formWith(nbModelV11, {
      FeatureMapping: mapped.FeatureMapping,
      ActualTargetVar: mapped.ActualTargetVar,
    });
    const result = computeApplyModelValidation(form, variables);
    expect(result.validation.isValid).toBe(false);
    expect(result.firstErrorMessage).toBe('Feature "Temp" is not mapped to a dataset variable. (AM_E_MAP_UNMAPPED)');
  });

  it("BB-32e variabel hasil pemetaan tersimpan sudah tidak ada di dataset: AM_E_MAP_VAR_NOT_FOUND", () => {
    const variables = [makeVariable("Outlook", "nominal", "STRING", 0)];
    const issues = validateMapping(descriptorOf(nbModelV11), { Outlook: "Outlook", Temp: "Suhu" }, null, variables);
    expect(issues.map((i) => [i.code, i.detail])).toEqual([["AM_E_MAP_VAR_NOT_FOUND", "Suhu"]]);
  });

  it("BB-32f penyimpangan dari tabel prompt: model Word-Vector yang semua kolomnya tidak ditemukan TIDAK memblokir OK (peringatan + info)", () => {
    const variables = [makeVariable("Sentimen", "nominal", "STRING", 0)];
    const mapped = autoMapFeatures(descriptorOf(nbModelVector), variables);
    const form = formWith(nbModelVector, {
      FeatureMapping: mapped.FeatureMapping,
      ActualTargetVar: mapped.ActualTargetVar,
      RawTextVar: undefined,
      VectorMapping: mapped.VectorMapping,
    });
    const result = computeApplyModelValidation(form, variables);
    expect(result.validation.isValid).toBe(true);
    expect(result.validation.issues.map((i) => [i.code, i.severity])).toEqual([
      ["AM_W_TEXT_ALL_ZERO_FILLED", "warning"],
      ["AM_I_TEXT_ZERO_FILLED", "info"],
    ]);
  });

  it("BB-32g tanpa model dimuat: AM_E_NO_MODEL dan isValid=false", () => {
    const form = JSON.parse(JSON.stringify(ApplyModelDefault)) as ApplyModelType;
    const result = computeApplyModelValidation(form, []);
    expect(result.validation.isValid).toBe(false);
    expect(result.firstErrorMessage).toBe("No model is loaded yet; load a model first. (AM_E_NO_MODEL)");
  });
});

// ---------------------------------------------------------------------------
// BB-34 nama kolom bentrok
// ---------------------------------------------------------------------------

describe("BB-34 nama kolom output bentrok (resolveFinalOutputNames)", () => {
  const d1 = descriptorOf(nbModelV11);
  const defaultSpecs = (overrides: Partial<ApplyModelType["save"]> = {}) =>
    getOutputColumnSpecs(d1, { ...ApplyModelDefault.save, ...overrides }, naiveBayesModelAdapter);

  it("BB-34a nama default tanpa bentrok tidak diubah; urutan kolom: predicted, max probability, probabilitas kelas", () => {
    const specs = defaultSpecs({ SaveClassProbabilities: true });
    const names = specs.map((s) => s.requestedName);
    expect(names).toEqual([
      "NB_PredictedValue",
      "NB_PredictedProbability",
      "NB_Probability_No",
      "NB_Probability_Yes",
    ]);
    const { finalNames, adjusted } = resolveFinalOutputNames(names, d3Variables());
    expect(finalNames).toEqual(names);
    expect(adjusted).toEqual([]);
  });

  it("BB-34b nama sudah ada di dataset: akhiran _1 dan pasangan (diminta, akhir) dilaporkan", () => {
    const existing = [...d3Variables(), makeVariable("NB_PredictedValue", "nominal", "STRING", 3)];
    const names = defaultSpecs().map((s) => s.requestedName);
    const { finalNames, adjusted } = resolveFinalOutputNames(names, existing);
    expect(finalNames).toEqual(["NB_PredictedValue_1", "NB_PredictedProbability"]);
    expect(adjusted).toEqual([{ requested: "NB_PredictedValue", final: "NB_PredictedValue_1" }]);
  });

  it("BB-34c pemeriksaan tidak peka huruf besar/kecil dan akhiran bertambah (_1 sudah ada -> _2)", () => {
    const existing = [
      makeVariable("nb_predictedvalue", "nominal", "STRING", 0),
      makeVariable("NB_PredictedValue_1", "nominal", "STRING", 1),
    ];
    const { finalNames } = resolveFinalOutputNames(["NB_PredictedValue"], existing);
    expect(finalNames).toEqual(["NB_PredictedValue_2"]);
  });

  it("BB-34d menjalankan Apply Model kedua kali pada dataset yang sudah berisi hasil pertama: semua kolom bersufiks _1", () => {
    const names = defaultSpecs({ SaveClassProbabilities: true }).map((s) => s.requestedName);
    const firstRun = resolveFinalOutputNames(names, d3Variables()).finalNames;
    const withFirstRun = [...d3Variables(), ...firstRun.map((n, i) => makeVariable(n, "scale", "NUMERIC", 3 + i))];
    const second = resolveFinalOutputNames(names, withFirstRun);
    expect(second.finalNames).toEqual(names.map((n) => `${n}_1`));
    expect(second.adjusted).toHaveLength(names.length);
  });

  it("BB-34e awalan (prefix) khusus mengubah semua nama default; bentrok dengan variabel pengguna tetap di-sufiks", () => {
    const specs = defaultSpecs({ NamePrefix: "PRED" });
    expect(specs.map((s) => s.requestedName)).toEqual(["PRED_PredictedValue", "PRED_PredictedProbability"]);
    const existing = [makeVariable("PRED_PredictedProbability", "scale", "NUMERIC", 0)];
    const { finalNames } = resolveFinalOutputNames(specs.map((s) => s.requestedName), existing);
    expect(finalNames).toEqual(["PRED_PredictedValue", "PRED_PredictedProbability_1"]);
  });

  it("BB-34f nama kelas bukan identifier (spasi) dirapikan oleh fungsi yang sama dan ikut dicatat sebagai disesuaikan", () => {
    const rainy: ModelDescriptor = { ...d1, classes: ["Rain Day", "Sunny"] };
    const specs = getOutputColumnSpecs(rainy, { ...ApplyModelDefault.save, SaveClassProbabilities: true }, naiveBayesModelAdapter);
    const { finalNames, adjusted } = resolveFinalOutputNames(specs.map((s) => s.requestedName), []);
    expect(finalNames).toContain("NB_Probability_Rain_Day");
    expect(adjusted).toEqual([{ requested: "NB_Probability_Rain Day", final: "NB_Probability_Rain_Day" }]);
  });

  it("BB-34g bentrok dengan variabel dataset BUKAN galat validasi (form tetap valid, tombol OK aktif)", () => {
    const variables = [...d3Variables(), makeVariable("NB_PredictedValue", "nominal", "STRING", 3)];
    const form = formWith(nbModelV11, {
      FeatureMapping: { Outlook: "Outlook", Temp: "Temp" },
      ActualTargetVar: "Play",
    });
    const result = computeApplyModelValidation(form, variables);
    expect(result.validation.isValid).toBe(true);
    expect(result.validation.issues).toEqual([]);
  });

  it("BB-34h peringatan pengguna: teks AM_W_NAME_ADJUSTED tanpa akhiran kode, sesuai konstanta", () => {
    expect(APPLY_MODEL_MESSAGES.AM_W_NAME_ADJUSTED).toBe(
      "Some column names were adjusted automatically because they conflict with existing names or are invalid."
    );
  });
});

describe("BB-34 nama kustom: bentrok antar-kolom baru adalah GALAT (bukan akhiran otomatis)", () => {
  const d1 = descriptorOf(nbModelV11);

  it("BB-34i dua nama kustom sama (tanpa membedakan huruf) -> AM_E_NAME_DUPLICATE dan OK nonaktif", () => {
    const save = {
      ...ApplyModelDefault.save,
      UseCustomNames: true,
      CustomNames: { PredictedValue: "Hasil", MaxProbability: "hasil", ClassProbabilities: {} },
    };
    const specs = getOutputColumnSpecs(d1, save, naiveBayesModelAdapter);
    const issues = validateCustomOutputNames(specs);
    expect(issues.map((i) => [i.code, i.detail])).toEqual([["AM_E_NAME_DUPLICATE", "hasil"]]);

    const form = formWith(
      nbModelV11,
      { FeatureMapping: { Outlook: "Outlook", Temp: "Temp" }, ActualTargetVar: null },
      save
    );
    const result = computeApplyModelValidation(form, d3Variables());
    expect(result.validation.isValid).toBe(false);
    expect(result.firstErrorMessage).toBe(
      'The column name "hasil" is used more than once among the result columns. (AM_E_NAME_DUPLICATE)'
    );
  });

  it("BB-34j nama kustom yang sama dengan variabel yang sudah ada di dataset diberi akhiran otomatis (bukan galat)", () => {
    const save = {
      ...ApplyModelDefault.save,
      UseCustomNames: true,
      CustomNames: { PredictedValue: "Play", MaxProbability: "Skor", ClassProbabilities: {} },
    };
    const specs = getOutputColumnSpecs(d1, save, naiveBayesModelAdapter);
    expect(validateCustomOutputNames(specs)).toEqual([]);
    const { finalNames, adjusted } = resolveFinalOutputNames(specs.map((s) => s.requestedName), d3Variables());
    expect(finalNames).toEqual(["Play_1", "Skor"]);
    expect(adjusted).toEqual([{ requested: "Play", final: "Play_1" }]);
  });

  it("BB-34k aturan nama: kosong, tidak valid, > 64 karakter, kata cadangan; pesan lewat formatApplyModelIssueMessage", () => {
    const issueOf = (name: string) => {
      const [issue] = validateNamePrefix(name);
      return issue;
    };
    expect(issueOf("   ").code).toBe("AM_E_NAME_EMPTY");
    expect(issueOf("1abc").code).toBe("AM_E_NAME_INVALID");
    expect(issueOf("a".repeat(65)).code).toBe("AM_E_NAME_TOO_LONG");
    expect(issueOf("all").code).toBe("AM_E_NAME_RESERVED");
    expect(validateNamePrefix(null)).toEqual([]);
    expect(formatApplyModelIssueMessage(issueOf("WITH"))).toBe(
      'The column name "WITH" is a reserved word and cannot be used. (AM_E_NAME_RESERVED)'
    );
  });
});
