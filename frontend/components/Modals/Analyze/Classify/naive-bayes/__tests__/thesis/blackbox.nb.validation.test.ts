/**
 * Evaluasi skripsi — Track C2 (black-box menu Naive Bayes), lapisan validasi & pemetaan pesan galat.
 *
 * Skenario: BB-14, BB-17, BB-18, BB-19 (sisi TS), BB-21, BB-22 (validasi seed), BB-24 (sisi TS).
 *
 * Semua string galat Rust di berkas ini DISALIN LITERAL dari sumber:
 *   - NB_E_TEXT_NEGATIVE      : rust/src/models/data.rs  (`text_negative_message`)
 *   - NB_E_COMPLEMENT_MIXED   : rust/src/stats/text_features.rs (`validate_text_model_setup`)
 *   - galat fold              : rust/src/stats/partition.rs (`validate_fold_count`)
 *   - ringkasan galat konstruktor : rust/src/utils/error.rs (`ErrorCollector::get_error_summary`)
 * Pasangan sisi Rust diuji di rust/tests/thesis_blackbox_nb.rs (belum dijalankan di sandbox).
 */
import { renderHook } from "@testing-library/react";
import {
    getNumericInputError,
    useNaiveBayesValidation,
} from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation";
import { mergeWithDefaults } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import { getUserFriendlyNaiveBayesError } from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-error-messages";
import type { NaiveBayesType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";
import type { Variable, VariableMeasure, VariableType } from "@/types/Variable";

const makeVar = (name: string, columnIndex: number, type: VariableType, measure: VariableMeasure): Variable => ({
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
});

const VARIABLES: Variable[] = [
    makeVar("Kelas", 0, "STRING", "nominal"),
    makeVar("Kota", 1, "STRING", "nominal"),
    makeVar("Umur", 2, "NUMERIC", "scale"),
    makeVar("Teks", 3, "STRING", "nominal"),
];

const form = (patch: Parameters<typeof mergeWithDefaults>[0] = null): NaiveBayesType => mergeWithDefaults(patch);

const validate = (data: NaiveBayesType) =>
    renderHook(() => useNaiveBayesValidation(data, VARIABLES)).result.current;

// Pesan sumber (kode produksi) yang menjadi "hasil yang diharapkan" di tabel BB.
const MSG_NO_TARGET = "Select a target variable.";
const MSG_NO_PREDICTOR =
    "Select at least one predictor variable (using Variables to Exclude or Candidate Factors / Covariates) or add Text Features.";
const MSG_COMPLEMENT_MIXED_UI =
    "Complement Naive Bayes can only be used when the model contains Text Features only. Choose Multinomial or Bernoulli, or remove the numeric/categorical predictors.";

// =============================================================================================
describe("BB-14 NB tanpa target (lapisan hook validasi)", () => {
    it("BB-14: tanpa target, isValid=false dengan pesan 'Select a target variable.'", () => {
        const { validation } = validate(form());
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain(MSG_NO_TARGET);
        // Mode Exclude tanpa target: pesan predictor ikut muncul (N5-8).
        expect(validation.errors).toEqual([MSG_NO_TARGET, MSG_NO_PREDICTOR]);
    });

    it("BB-14: target terisi + Text Features (tanpa prediktor lain) -> valid; target terisi tanpa apa pun di mode candidates -> pesan prediktor", () => {
        const withText = form({ main: { TargetVar: "Kelas", RawTextVar: "Teks", ExcludedVar: ["Kota", "Umur"] } });
        expect(validate(withText).validation.isValid).toBe(true);

        const noPredictor = form({
            main: { TargetVar: "Kelas", SpecificationMode: "candidates", CandidateFactors: [], CandidateCovariates: [] },
        });
        const result = validate(noPredictor).validation;
        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual([MSG_NO_PREDICTOR]);
    });
});

// =============================================================================================
describe("BB-17 Complement + prediktor numerik/kategorik", () => {
    it("BB-17: hook memblokir OK dengan pesan Complement (tanpa kode di UI)", () => {
        const data = form({
            main: { TargetVar: "Kelas", RawTextVar: "Teks" }, // Kota & Umur tetap menjadi prediktor (mode exclude)
            options: { TextLikelihood: "complement" },
        });
        const { validation } = validate(data);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toEqual([MSG_COMPLEMENT_MIXED_UI]);
    });

    it("BB-17: Complement dengan Text Features saja -> valid; Multinomial/Bernoulli dengan prediktor lain -> valid", () => {
        const only = form({
            main: { TargetVar: "Kelas", RawTextVar: "Teks", ExcludedVar: ["Kota", "Umur"] },
            options: { TextLikelihood: "complement" },
        });
        expect(validate(only).validation.isValid).toBe(true);
        for (const likelihood of ["multinomial", "bernoulli"] as const) {
            const mixed = form({
                main: { TargetVar: "Kelas", RawTextVar: "Teks" },
                options: { TextLikelihood: likelihood },
            });
            expect(validate(mixed).validation.isValid).toBe(true);
        }
    });

    it("BB-17: galat Rust NB_E_COMPLEMENT_MIXED dipetakan ke pesan ramah dengan kode di akhir", () => {
        const rustMessage =
            "NB_E_COMPLEMENT_MIXED: Complement Naive Bayes can only be used when the model contains Text Features only, but this model also has 3 numeric/categorical predictor(s).";
        // Konstruktor mengembalikan ringkasan ErrorCollector untuk run ber-Text.
        const summary = `Error Summary:\nContext: text_features\n  1. ${rustMessage}\n`;
        const expected =
            "Complement Naive Bayes can only be used when the model contains Text Features only. This model also has 3 numeric/categorical predictor(s). Choose Multinomial or Bernoulli, or remove the numeric/categorical predictors. (NB_E_COMPLEMENT_MIXED)";
        expect(getUserFriendlyNaiveBayesError(new Error(rustMessage))).toBe(expected);
        expect(getUserFriendlyNaiveBayesError(new Error(summary))).toBe(expected);
    });
});

// =============================================================================================
describe("BB-18 Alpha di luar batas (getNumericInputError)", () => {
    const withText = (patch: Parameters<typeof mergeWithDefaults>[0]) =>
        form({ main: { TargetVar: "Kelas", RawTextVar: "Teks" }, ...(patch ?? {}) });

    it("BB-18: Text smoothing alpha 0, negatif, > 999, NaN", () => {
        expect(getNumericInputError(withText({ options: { TextAlpha: 0 } }))).toBe(
            "Text smoothing alpha must be greater than 0."
        );
        expect(getNumericInputError(withText({ options: { TextAlpha: -0.5 } }))).toBe(
            "Text smoothing alpha must be greater than 0."
        );
        expect(getNumericInputError(withText({ options: { TextAlpha: 1000 } }))).toBe(
            "Text smoothing alpha must not exceed 999."
        );
        expect(getNumericInputError(withText({ options: { TextAlpha: Number.NaN } }))).toBe(
            "Enter a valid number for Text smoothing alpha."
        );
    });

    it("BB-18: batas sah Text alpha (0.01 dan 999) diterima", () => {
        expect(getNumericInputError(withText({ options: { TextAlpha: 0.01 } }))).toBeNull();
        expect(getNumericInputError(withText({ options: { TextAlpha: 999 } }))).toBeNull();
    });

    it("BB-18: Text alpha tidak divalidasi bila tidak ada Text Features (kolom tersembunyi)", () => {
        expect(getNumericInputError(form({ options: { TextAlpha: 0 } }))).toBeNull();
    });

    it("BB-18: Smoothing Alpha (kategorik) 0, > 999, NaN", () => {
        expect(getNumericInputError(form({ options: { SmoothingAlpha: 0 } }))).toBe(
            "Smoothing Alpha must be greater than 0."
        );
        expect(getNumericInputError(form({ options: { SmoothingAlpha: 1000 } }))).toBe(
            "Smoothing Alpha must not exceed 999."
        );
        expect(getNumericInputError(form({ options: { SmoothingAlpha: Number.NaN } }))).toBe(
            "Enter a valid number for Smoothing Alpha."
        );
    });
});

// =============================================================================================
describe("BB-19 NB_E_TEXT_NEGATIVE (pemetaan pesan Rust di sisi TS)", () => {
    // Persis `text_negative_message` di rust/src/models/data.rs
    const rustNegative = (column: string, n: number) =>
        `NB_E_TEXT_NEGATIVE: Text vector column '${column}' contains negative values (${n} column(s) affected). Multinomial, Bernoulli and Complement Naive Bayes require values >= 0. Check that the column is a real word vector (not a standardized/PCA column or a missing-value code such as -1) and remove it from Word-Vector Variables.`;
    const summaryOf = (message: string) => `Error Summary:\nContext: text_features\n  1. ${message}\n`;

    it("BB-19: satu kolom negatif -> pesan menyebut nama kolom dan kode", () => {
        const expected =
            "Text vector column 'VEC_makan' contains negative values. Text likelihoods require values >= 0; remove it from Word-Vector Variables. (NB_E_TEXT_NEGATIVE)";
        expect(getUserFriendlyNaiveBayesError(new Error(rustNegative("VEC_makan", 1)))).toBe(expected);
        expect(getUserFriendlyNaiveBayesError(new Error(summaryOf(rustNegative("VEC_makan", 1))))).toBe(expected);
    });

    it("BB-19: beberapa kolom negatif -> nama kolom pertama dan jumlah kolom lain", () => {
        const message = getUserFriendlyNaiveBayesError(new Error(summaryOf(rustNegative("VEC_b", 3))));
        expect(message).toBe(
            "Text vector column 'VEC_b' contains negative values and 2 more column(s). Text likelihoods require values >= 0; remove it from Word-Vector Variables. (NB_E_TEXT_NEGATIVE)"
        );
        expect(message).toContain("'VEC_b'");
        expect(message).toContain("NB_E_TEXT_NEGATIVE");
    });

    it("BB-19: UI tidak memblokir kolom negatif sebelum analisis (hook validasi tetap valid)", () => {
        const data = form({ main: { TargetVar: "Kelas", TextVectorVars: ["Umur"], ExcludedVar: ["Kota", "Teks"] } });
        expect(validate(data).validation.isValid).toBe(true);
    });
});

// =============================================================================================
describe("BB-21 Training Percentage (getNumericInputError)", () => {
    const MSG = "Training percentage must be a whole number between 1 and 99.";
    const holdout = (training: number) =>
        form({ validation: { ValidationMethod: "holdout", TrainingPercentage: training } });

    it.each([0, 100, -5, 70.5, 150])("BB-21: Training Percentage %s ditolak", (value) => {
        expect(getNumericInputError(holdout(value))).toBe(MSG);
    });

    it.each([1, 70, 99])("BB-21: Training Percentage %s diterima", (value) => {
        expect(getNumericInputError(holdout(value))).toBeNull();
    });

    it("BB-21: pada metode k-fold, Training Percentage tidak divalidasi", () => {
        expect(
            getNumericInputError(form({ validation: { ValidationMethod: "kfold", TrainingPercentage: 0, KFolds: 10 } }))
        ).toBeNull();
    });
});

// =============================================================================================
describe("BB-22 Seed (validasi)", () => {
    const withSeed = (seed: number | null) =>
        form({ validation: { ValidationMethod: "holdout", TrainingPercentage: 70, RandomSeed: seed } });

    it("BB-22: seed 42 sah; tanpa seed (null) sah", () => {
        expect(getNumericInputError(withSeed(42))).toBeNull();
        expect(getNumericInputError(withSeed(null))).toBeNull();
    });

    it("BB-22: seed di luar 0..4294967295 atau pecahan ditolak", () => {
        const msg = "The seed must be a whole number between 0 and 4294967295.";
        expect(getNumericInputError(withSeed(-1))).toBe(msg);
        expect(getNumericInputError(withSeed(4294967296))).toBe(msg);
        expect(getNumericInputError(withSeed(4.2))).toBe(msg);
        expect(getNumericInputError(withSeed(0))).toBeNull();
        expect(getNumericInputError(withSeed(4294967295))).toBeNull();
    });
});

// =============================================================================================
describe("BB-24 Fold melebihi anggota kelas terkecil (sisi TS)", () => {
    it("BB-24: TS hanya memeriksa fold >= 1 dan bilangan bulat; batas terhadap ukuran data diserahkan ke Rust", () => {
        const kfold = (folds: number) =>
            form({ validation: { ValidationMethod: "kfold", TrainingPercentage: 70, KFolds: folds } });
        expect(getNumericInputError(kfold(0))).toBe("The number of folds must be at least 1.");
        expect(getNumericInputError(kfold(-3))).toBe("The number of folds must be at least 1.");
        expect(getNumericInputError(kfold(2.5))).toBe("The number of folds must be at least 1.");
        // Tidak ada batas atas di TS: 1000 fold lolos validasi UI (ditolak oleh Rust bila > jumlah baris valid).
        expect(getNumericInputError(kfold(1000))).toBeNull();
        expect(getNumericInputError(kfold(10))).toBeNull();
    });

    it("BB-24: galat Rust 'fold melebihi jumlah instance' (run ber-Text, ringkasan konstruktor) -> pesan ramah tanpa kode NB_E_", () => {
        const rustSummary =
            "Error Summary:\nContext: validation.kfold\n  1. Number of folds (40) cannot be greater than the number of valid instances (15). Choose a smaller number of folds.\n";
        const message = getUserFriendlyNaiveBayesError(new Error(rustSummary));
        expect(message).toBe(
            "Check the cross-validation settings. The number of folds must not exceed the number of cases or the size of the smallest class."
        );
        expect(message).not.toMatch(/NB_E_/);
    });

    it("BB-24 (temuan): run TANPA fitur Text yang gagal karena fold hanya sampai sebagai 'No analysis results available' -> pesan generik", () => {
        // worker: konstruktor Rust Ok (result=None) -> get_formatted_results() Err("No analysis results available").
        const message = getUserFriendlyNaiveBayesError("No analysis results available");
        expect(message).toBe(
            "The Naive Bayes analysis could not be completed. Check the selected variables and settings, then try again."
        );
        expect(message).not.toMatch(/fold/i);
    });
});
