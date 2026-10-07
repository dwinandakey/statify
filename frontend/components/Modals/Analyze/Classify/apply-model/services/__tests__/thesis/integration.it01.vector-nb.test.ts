/** @jest-environment node */
// Track F — IT-01: kolom VEC_ hasil String to Word Vector dipakai sebagai Word-Vector Variables di Naive Bayes.
//   Hasil yang diharapkan: jumlah term model = jumlah kolom VEC_; peringatan kebocoran tampil.
//
// KODE ASLI + WASM ASLI: wasm STWV (process_text_data) -> buildColumnData ASLI dengan processVariableName ASLI
// (penamaan kolom persis seperti addVectorColumns) -> analyzeNaiveBayes ASLI (jalur Word-Vector) dengan Worker
// pengganti yang menjalankan wasm Naive Bayes -> transformNaiveBayesResult/resultNaiveBayes ASLI (tabel Output Viewer).
// Peringatan di ANTARMUKA (Variables tab) diuji di naive-bayes/components/__tests__/thesis/integration.it01.leakage-ui.test.tsx.

jest.mock("@/stores/useResultStore", () => {
  const m = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.mocks");
  return { useResultStore: { getState: () => m.resultStore.state } };
});
jest.mock("@/stores/useVariableStore", () => {
  const m = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.mocks");
  return { useVariableStore: { getState: () => m.variableState }, processVariableName: m.realProcessVariableName };
});

import type { Table } from "@/types/Table";
import type { Variable } from "@/types/Variable";
import { buildColumnData } from "@/components/Modals/Transform/StringToWordVector/utils/buildColumnData";
import { DEFAULT_COLUMN_PREFIX } from "@/components/Modals/Transform/StringToWordVector/utils/columnPrefix";
import { mergeWithDefaults } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import { WARNING_LEAKAGE, getLeakageNote, detectVectorLikeColumns } from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesTextRules";
import {
  PILKADA, installWasmWorkers, loadWasm, makeVariables, pilkadaAvailable, pilkadaOverrides, readCsv, wasmAvailable, wasmSha256,
  workerCalls, deepBitCompare,
} from "@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.helpers";
import { resultStore, realProcessVariableName } from "@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.mocks";
import {
  KCONFIG, nbRawConfig, runNaiveBayesApp, runStwv, trainPilkadaRaw, valueOf,
} from "@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.drivers";
import { STWV_DEFAULT_CONFIG } from "@/components/Modals/Transform/StringToWordVector/config";

const ready = wasmAvailable() && pilkadaAvailable();
const describeIf = ready ? describe : describe.skip;
if (!ready) {
  // eslint-disable-next-line no-console
  console.warn("[integration.it01] wasm atau pilkada_*.csv tidak ditemukan: berkas dilewati.");
}

describeIf("IT-01 Kolom VEC_ STWV -> Word-Vector Variables di Naive Bayes (wasm nyata)", () => {
  it("IT-01-a provenans: sha256 ketiga wasm tercatat", () => {
    // eslint-disable-next-line no-console
    console.log(`[integration.it01] wasm sha256 stwv=${wasmSha256("stwv")} nb=${wasmSha256("nb")} am=${wasmSha256("am")}`);
    expect(wasmSha256("nb")).toMatch(/^[0-9a-f]{64}$/);
  });

  // W=1000 (default aplikasi) dan W=200 (supaya kecocokan jumlah bukan kebetulan)
  describe.each([1000, 200])("Words to Keep = %i", (wordsToKeep) => {
    const train = readCsv(PILKADA.train());
    let vecNames: string[] = [];
    let vocabulary: string[] = [];
    let raw: Awaited<ReturnType<typeof runNaiveBayesApp>>;
    let variables: Variable[] = [];
    let rows: string[][] = [];
    let nbCall: { payload: Record<string, unknown> } | undefined;
    let cpsStat: { output_data: string; description: string } | undefined;

    beforeAll(async () => {
      installWasmWorkers();
      resultStore.reset();
      workerCalls.length = 0;
      const tcol = train.header.indexOf(PILKADA.textCol);
      const stwvCfg = { ...STWV_DEFAULT_CONFIG, wordsToKeep };
      const out = runStwv(train.rows.map((r) => r[tcol] ?? ""), stwvCfg);
      vocabulary = out.vocabulary;
      // Penamaan kolom persis addVectorColumns (useStringToWordVector.ts): processVariableName terhadap variabel yang sudah ada.
      const existing = train.header.map((name, columnIndex) => ({ name, columnIndex }) as Variable);
      const columns = buildColumnData(out as never, (baseName, claimed) => {
        const stubs = claimed.map((name) => ({ name, columnIndex: 999 }) as unknown as Variable);
        return realProcessVariableName(baseName, [...existing, ...stubs]).processedName;
      }, DEFAULT_COLUMN_PREFIX);
      vecNames = columns.map((c) => c.variable_name);
      const header = [...train.header, ...vecNames];
      rows = train.rows.map((r, i) => [...r, ...columns.map((c) => String(c.values[i]))]);
      variables = makeVariables(header, rows, pilkadaOverrides());
      const configData = mergeWithDefaults({
        main: {
          TargetVar: PILKADA.labelCol,
          SpecificationMode: "exclude",
          ExcludedVar: [...PILKADA.excluded, PILKADA.textCol],
          TextSource: "vector",
          TextVectorVars: vecNames,
        },
        options: { TextLikelihood: "multinomial", TextAlpha: 1 },
        validation: { RandomSeed: 42 },
      });
      raw = await runNaiveBayesApp({ data: rows, variables, configData });
      nbCall = workerCalls.filter((c) => c.kind === "nb").pop();
      cpsStat = resultStore.statistics().find((s) => s.title === "Case Processing Summary");
    });

    it("IT-01-b STWV menghasilkan kolom VEC_ sebanyak kosakata, nama unik, bertipe NUMERIC/scale", () => {
      expect(vecNames).toHaveLength(vocabulary.length);
      expect(vocabulary.length).toBe(wordsToKeep);
      expect(new Set(vecNames.map((n) => n.toLowerCase())).size).toBe(vecNames.length);
      expect(variables.filter((v) => vecNames.includes(v.name)).every((v) => v.type === "NUMERIC" && v.measure === "scale")).toBe(true);
    });

    it("IT-01-c payload NB: sumber Word-Vector, jumlah kolom teks = jumlah kolom VEC_, tanpa prediktor non-teks", () => {
      const call = nbCall;
      expect(call).toBeDefined();
      const text = (call as { payload: { text: { source: string; columns: string[]; values: unknown[][] } } }).payload.text;
      expect(text.source).toBe("vector");
      expect(text.columns).toEqual(vecNames);
      expect(text.values).toHaveLength(630);
      expect(text.values[0]).toHaveLength(vecNames.length);
      expect(((call as { payload: { predictors: unknown[] } }).payload.predictors)).toHaveLength(0);
    });

    it("IT-01-d JUMLAH TERM MODEL = JUMLAH KOLOM VEC_ (text.terms, text.columns, log_weights per kelas, n_terms ringkasan)", () => {
      const model = raw.trained_model as unknown as { text: { source: string; terms: string[]; columns: string[]; log_weights: Record<string, number[]>; recipe?: unknown } };
      expect(model.text.source).toBe("vector");
      expect(model.text.terms).toHaveLength(vecNames.length);
      expect(model.text.columns).toEqual(vecNames);
      for (const arr of Object.values(model.text.log_weights)) expect(arr).toHaveLength(vecNames.length);
      expect(raw.case_processing_summary.text_features?.n_terms).toBe(vecNames.length);
      expect(raw.case_processing_summary.text_features?.description).toBe(`Word vectors: ${vecNames.length} columns`);
      // model Word-Vector tidak membawa resep (kolom sudah jadi dari STWV)
      expect(model.text.recipe ?? null).toBeNull();
    });

    it("IT-01-e PERINGATAN KEBOCORAN tampil di Output Viewer: baris 'Note' pada Case Processing Summary memuat teks W-LEAK", () => {
      const stat = cpsStat;
      expect(stat).toBeDefined();
      const table = (JSON.parse((stat as { output_data: string }).output_data) as { tables: Table[] }).tables[0];
      expect(valueOf(table, "Text features")).toBe(`Word vectors: ${vecNames.length} columns`);
      const notes = table.rows.filter((r) => r.rowHeader?.[0] === "Note").map((r) => r.value);
      expect(notes).toContain(WARNING_LEAKAGE);
      // interpretasi otomatis (deskripsi statistic) juga memuat catatan
      expect((stat as { description: string }).description).toContain(WARNING_LEAKAGE.slice(0, 40));
      expect(getLeakageNote("vector")).toBe(WARNING_LEAKAGE);
      expect(getLeakageNote("raw")).toBeNull();
    });

    it("IT-01-f model Word-Vector sama dengan model Raw Text pada kosakata sama (log_weights identik, prior identik)", async () => {
      const { raw: rawModelRun } = await trainPilkadaRaw(train, "K1");
      // K1 memakai STWV_DEFAULT_CONFIG (W=1000); untuk W lain latih ulang dengan W yang sama
      const configRaw = nbRawConfig("K1");
      configRaw.text = { ...KCONFIG.K1.stwv, wordsToKeep };
      const rawRun = wordsToKeep === 1000
        ? rawModelRun
        : await runNaiveBayesApp({ data: train.rows, variables: makeVariables(train.header, train.rows, pilkadaOverrides()), configData: configRaw });
      const a = rawRun.trained_model as unknown as { target: { class_priors: number[] }; text: { terms: string[]; log_weights: Record<string, number[]> } };
      const b = raw.trained_model as unknown as { target: { class_priors: number[] }; text: { terms: string[]; log_weights: Record<string, number[]> } };
      expect(a.text.terms).toEqual(vocabulary);
      expect(deepBitCompare(a.target.class_priors, b.target.class_priors).diffs).toEqual([]);
      expect(deepBitCompare(a.text.log_weights, b.text.log_weights).diffs).toEqual([]);
    });

    it("IT-01-g dari sisi dataset: kolom hasil STWV 'mirip vektor kata' memicu W-VEC bila tidak dipindah ke Word-Vector Variables", () => {
      const predictors = vecNames; // kolom VEC_ masih berada di prediktor
      const det = detectVectorLikeColumns(predictors, variables, rows);
      expect(det.columns.length).toBeGreaterThanOrEqual(20);
      expect(det.message).toContain("numeric columns look like word vectors");
      // setelah dipindahkan ke Word-Vector Variables tidak ada lagi prediktor VEC_ (dikecualikan dari prediktor efektif)
      expect(detectVectorLikeColumns([], variables, rows).columns).toHaveLength(0);
    });
  });
});
