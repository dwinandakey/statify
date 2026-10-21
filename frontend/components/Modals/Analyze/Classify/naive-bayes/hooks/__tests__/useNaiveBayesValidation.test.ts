import { renderHook } from "@testing-library/react";
import {
    getEffectivePredictors,
    getNumericInputError,
    useNaiveBayesValidation,
} from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation";
import { NaiveBayesDefault } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import type { NaiveBayesType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";
import type { Variable } from "@/types/Variable";

const makeVariable = (
    name: string,
    measure: Variable["measure"]
): Variable => ({
    columnIndex: 0,
    name,
    width: 8,
    decimals: 0,
    values: [],
    missing: null,
    columns: 8,
    align: "right",
    measure,
    role: "input",
});

const baseVariables: Variable[] = [
    makeVariable("target_cat", "nominal"),
    makeVariable("factor_a", "nominal"),
    makeVariable("covariate_a", "scale"),
    makeVariable("covariate_b", "scale"),
    makeVariable("unknown_var", "unknown"),
];

const cloneDefault = (): NaiveBayesType =>
    JSON.parse(JSON.stringify(NaiveBayesDefault));

describe("getEffectivePredictors", () => {
    it("mode exclude: predictor efektif = semua eligible dikurangi target & excluded", () => {
        const main: NaiveBayesType["main"] = {
            TargetVar: "target_cat",
            SpecificationMode: "exclude",
            ExcludedVar: ["factor_a"],
            CandidateFactors: null,
            CandidateCovariates: null,
            // v2: field Text Features (tanpa mengubah ekspektasi test)
            TextSource: "none",
            RawTextVar: null,
            TextVectorVars: null,
        };

        const result = getEffectivePredictors(main, baseVariables);

        expect(result).toEqual(["covariate_a", "covariate_b"]);
        // Variabel measure "unknown" tidak boleh pernah muncul (AGENTS.md §3.2).
        expect(result).not.toContain("unknown_var");
    });

    it("mode candidates: predictor efektif = gabungan CandidateFactors + CandidateCovariates", () => {
        const main: NaiveBayesType["main"] = {
            TargetVar: "target_cat",
            SpecificationMode: "candidates",
            ExcludedVar: [],
            CandidateFactors: ["factor_a"],
            CandidateCovariates: ["covariate_a"],
            // v2: field Text Features (tanpa mengubah ekspektasi test)
            TextSource: "none",
            RawTextVar: null,
            TextVectorVars: null,
        };

        const result = getEffectivePredictors(main, baseVariables);

        expect(result).toEqual(["factor_a", "covariate_a"]);
    });

    it("mode exclude kosong tanpa exclude apapun -> semua eligible selain target", () => {
        const main: NaiveBayesType["main"] = {
            TargetVar: "target_cat",
            SpecificationMode: "exclude",
            ExcludedVar: [],
            CandidateFactors: null,
            CandidateCovariates: null,
            // v2: field Text Features (tanpa mengubah ekspektasi test)
            TextSource: "none",
            RawTextVar: null,
            TextVectorVars: null,
        };

        const result = getEffectivePredictors(main, baseVariables);

        expect(result).toEqual(["factor_a", "covariate_a", "covariate_b"]);
    });

    it("Temuan 2 (Fase 18): SpecificationMode adalah SATU-SATUNYA sumber kebenaran mode, bukan isi array -- heuristik lama keliru menganggap CandidateFactors terisi berarti mode candidates aktif", () => {
        const main: NaiveBayesType["main"] = {
            TargetVar: "target_cat",
            SpecificationMode: "exclude",
            ExcludedVar: ["factor_a"],
            // Sisa data mode "candidates" yang seharusnya sudah kosong
            // (AGENTS.md §3.3 poin 3) tapi disimulasikan di sini masih
            // terisi, untuk membuktikan fungsi tidak lagi membaca array
            // ini untuk MENENTUKAN mode -- hanya SpecificationMode yang
            // menentukan.
            CandidateFactors: ["factor_a"],
            CandidateCovariates: null,
            // v2: field Text Features (tanpa mengubah ekspektasi test)
            TextSource: "none",
            RawTextVar: null,
            TextVectorVars: null,
        };

        const result = getEffectivePredictors(main, baseVariables);

        // Harus mengikuti mode "exclude" (semua eligible dikurangi target
        // & ExcludedVar) -- BUKAN ["factor_a"] seperti yang akan
        // dihasilkan heuristik lama.
        expect(result).toEqual(["covariate_a", "covariate_b"]);
    });

    it("fallback: SpecificationMode belum ada di data lama (kompatibilitas mundur) -> diperlakukan sebagai mode exclude", () => {
        const main = {
            TargetVar: "target_cat",
            ExcludedVar: ["factor_a"],
            CandidateFactors: null,
            CandidateCovariates: null,
        } as unknown as NaiveBayesType["main"];

        const result = getEffectivePredictors(main, baseVariables);

        expect(result).toEqual(["covariate_a", "covariate_b"]);
    });
});

describe("useNaiveBayesValidation", () => {
    it("target + predictor terisi tapi alpha = 0 -> validateNumericInputs mengembalikan pesan alpha", () => {
        const formData = cloneDefault();
        formData.main.TargetVar = "target_cat";
        formData.options.SmoothingAlpha = 0;

        const { result } = renderHook(() =>
            useNaiveBayesValidation(formData, baseVariables)
        );

        expect(result.current.validation.isValid).toBe(true);
        expect(result.current.validateNumericInputs()).toMatch(/Alpha/);
    });

    it("semua valid -> validation.isValid=true dan validateNumericInputs()=null", () => {
        const formData = cloneDefault();
        formData.main.TargetVar = "target_cat";

        const { result } = renderHook(() =>
            useNaiveBayesValidation(formData, baseVariables)
        );

        expect(result.current.validation.isValid).toBe(true);
        expect(result.current.validateNumericInputs()).toBeNull();
    });
});

describe("getNumericInputError", () => {
    it("menerima Smoothing Alpha desimal", () => {
        const formData = cloneDefault();
        formData.options.SmoothingAlpha = 0.5;
        expect(getNumericInputError(formData)).toBeNull();
    });
});
