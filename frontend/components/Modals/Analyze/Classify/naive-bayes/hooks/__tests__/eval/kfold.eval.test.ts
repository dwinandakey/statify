// Tes tesis Track A (e), sisi TypeScript: validasi angka KFolds pada Naive Bayes.
//
// Temuan BUGS_A.md A-1 (SUDAH DIPERBAIKI 22 Okt 2026): getNumericInputError dulu menerima KFolds = 1 (batas bawah
// hanya "< 1"), padahal 1-fold cross-validation menghasilkan data latih KOSONG (lihat
// naive-bayes/rust/tests/eval_partition.rs dan text_analytics_eval/BUGS_A.md). Batas minimum kini 2 di UI dan di Rust;
// tes di sini menegaskan bahwa KFolds = 1 DITOLAK.
//
// Sudah tercakup (tidak diulang): whitebox.getNumericInputError.test.ts (Jalur 20-22 dan 28) dan
// useNaiveBayesValidation.test.ts (penolakan jumlah fold tidak sah pada mode kfold).
// Yang ditambahkan: tabel batas lengkap (-1..1000000000, non-bilangan-bulat, NaN, Infinity, non-number), KFolds diabaikan
// pada mode holdout, penerusan KFolds apa adanya ke konfigurasi worker (penjaga ada di getNumericInputError dan Rust),
// dan pemetaan pesan galat Rust terkait fold ke pesan pengguna.

import { getNumericInputError } from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation";
import { buildNaiveBayesWorkerConfig } from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis";
import { getUserFriendlyNaiveBayesError } from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-error-messages";
import { NaiveBayesDefault } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import type { NaiveBayesType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";

// Modul output/formatter menarik store & UI; tidak relevan di sini (pola sama dengan naiveBayesPayload.test.ts).
jest.mock(
    "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis-output",
    () => ({ resultNaiveBayes: jest.fn() })
);
jest.mock(
    "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis-formatter",
    () => ({ transformNaiveBayesResult: jest.fn() })
);

const base = (): NaiveBayesType => JSON.parse(JSON.stringify(NaiveBayesDefault));
const PESAN_MINIMUM = "The number of folds must be at least 2.";

const kfold = (folds: unknown): NaiveBayesType => {
    const f = base();
    f.validation.ValidationMethod = "kfold";
    f.validation.KFolds = folds as number;
    return f;
};

describe("eval A(e): batas jumlah fold pada getNumericInputError", () => {
    it("nilai bawaan formulir: 10 fold, tanpa galat", () => {
        expect(NaiveBayesDefault.validation.KFolds).toBe(10);
        expect(getNumericInputError(kfold(10))).toBeNull();
    });

    it.each([[-5], [-1], [0], [1]])("KFolds = %p ditolak dengan pesan batas minimum", (nilai) => {
        expect(getNumericInputError(kfold(nilai))).toBe(PESAN_MINIMUM);
    });

    it("PERBAIKAN TEMUAN A-1: KFolds = 1 DITOLAK (minimum 2); KFolds = 2 adalah batas bawah yang sah", () => {
        expect(getNumericInputError(kfold(1))).toBe(PESAN_MINIMUM);
        expect(getNumericInputError(kfold(2))).toBeNull();
    });

    it.each([[2], [3], [10], [100], [1000], [1_000_000_000]])(
        "KFolds = %p diterima (tidak ada batas atas di sisi TypeScript; batas atas ditegakkan Rust)",
        (nilai) => {
            expect(getNumericInputError(kfold(nilai))).toBeNull();
        }
    );

    it.each([[1.5], [2.5], [0.5], [NaN], [Infinity], [-Infinity]])(
        "KFolds = %p (bukan bilangan bulat berhingga) ditolak",
        (nilai) => {
            expect(getNumericInputError(kfold(nilai))).toBe(PESAN_MINIMUM);
        }
    );

    it.each([["5"], [""], [null], [undefined], [true]])("KFolds bukan number (%p) ditolak", (nilai) => {
        expect(getNumericInputError(kfold(nilai))).toBe(PESAN_MINIMUM);
    });

    it("pada mode holdout nilai KFolds yang tidak sah diabaikan; sebaliknya TrainingPercentage tidak diperiksa pada kfold", () => {
        const holdout = base();
        holdout.validation.ValidationMethod = "holdout";
        holdout.validation.KFolds = 0;
        expect(getNumericInputError(holdout)).toBeNull();

        const kf = kfold(5);
        kf.validation.TrainingPercentage = 0;
        expect(getNumericInputError(kf)).toBeNull();
    });
});

describe("eval A(e): KFolds diteruskan apa adanya ke worker (penjaga di getNumericInputError dan Rust)", () => {
    it("buildNaiveBayesWorkerConfig tidak menambah penjaga: ValidationMethod kfold dan KFolds 1 sampai ke Rust (yang menolaknya)", () => {
        const form = kfold(1);
        const config = buildNaiveBayesWorkerConfig(form);
        expect(config.validation.ValidationMethod).toBe("kfold");
        expect(config.validation.KFolds).toBe(1);
    });

    it("nilai KFolds lain juga tidak diubah (2, 10)", () => {
        for (const nilai of [2, 10]) {
            expect(buildNaiveBayesWorkerConfig(kfold(nilai)).validation.KFolds).toBe(nilai);
        }
    });
});

describe("eval A(e): pemetaan pesan galat Rust terkait jumlah fold", () => {
    const hint =
        "Check the cross-validation settings. The number of folds must not exceed the number of cases or the size of the smallest class.";

    // Teks sama dengan format! di naive-bayes/rust/src/stats/partition.rs (validate_fold_count).
    it.each([
        ["Number of folds must be at least 2 (got 1)."],
        [
            "Number of folds (15) cannot be greater than the number of valid instances (10). Choose a smaller number of folds.",
        ],
        [
            "Cannot create cross-validation folds: there are no valid instances after missing-value handling.",
        ],
    ])("galat Rust %j dipetakan ke saran pengaturan cross-validation", (pesanRust) => {
        const pesan = getUserFriendlyNaiveBayesError(new Error(pesanRust));
        // Pesan ketiga memuat 'no valid' sehingga dipetakan ke pesan 'tidak ada kasus valid' lebih dulu.
        if (pesanRust.includes("no valid")) {
            expect(pesan).toContain("no valid cases");
        } else {
            expect(pesan).toBe(hint);
        }
    });

    it("teks peringatan Rust yang memuat kata fold juga dipetakan ke saran yang sama (pemeta berbasis pencocokan kata)", () => {
        const pesan = getUserFriendlyNaiveBayesError(
            new Error(
                "Number of folds (5) exceeds the smallest class size (2). Some folds will not contain any instance of that class, so class proportions across folds will not be perfectly balanced. The analysis will still run."
            )
        );
        expect(pesan).toBe(hint);
    });
});
