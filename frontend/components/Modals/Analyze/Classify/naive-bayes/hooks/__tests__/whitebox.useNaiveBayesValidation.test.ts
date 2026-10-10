import { renderHook } from "@testing-library/react";
import { useNaiveBayesValidation } from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation";
import { NaiveBayesDefault } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import type { NaiveBayesType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";
import type { Variable } from "@/types/Variable";

// White-box testing WB-3 (basis path) blok validasi useMemo pada useNaiveBayesValidation. Nomor jalur = tabel di buku.
const v = (name: string, measure: Variable["measure"] = "nominal"): Variable => ({
    columnIndex: 0, name, width: 8, decimals: 0, values: [], missing: null, columns: 8, align: "left", measure, role: "input",
});
const base = (): NaiveBayesType => JSON.parse(JSON.stringify(NaiveBayesDefault));
const PRED = "Select at least one predictor variable (using Variables to Exclude or Candidate Factors / Covariates) or add Text Features.";
const COMPL = "Complement Naive Bayes can only be used when the model contains Text Features only. Choose Multinomial or Bernoulli, or remove the numeric/categorical predictors.";

describe("WB-3 useNaiveBayesValidation: jalur independen", () => {
    it("Jalur 1: Target Sentiment, prediktor Pasangan Calon, tanpa fitur teks", () => {
        const f = base(); f.main.TargetVar = 'Sentiment';
        const { result } = renderHook(() => useNaiveBayesValidation(f, [v('Sentiment'), v('Pasangan Calon')]));
        expect(result.current.validation.isValid).toBe(true);
        expect(result.current.validation.errors).toEqual([]);
    });
    it("Jalur 2: Target kosong (mode Exclude), variabel Sentiment dan Pasangan Calon, tanpa fitur teks", () => {
        const f = base(); f.main.TargetVar = '';
        const { result } = renderHook(() => useNaiveBayesValidation(f, [v('Sentiment'), v('Pasangan Calon')]));
        expect(result.current.validation.isValid).toBe(false);
        expect(result.current.validation.errors).toEqual(['Select a target variable.', PRED]);
    });
    it("Jalur 3: Target Sentiment, tidak ada prediktor lain, tanpa fitur teks", () => {
        const f = base(); f.main.TargetVar = 'Sentiment';
        const { result } = renderHook(() => useNaiveBayesValidation(f, [v('Sentiment')]));
        expect(result.current.validation.isValid).toBe(false);
        expect(result.current.validation.errors).toEqual([PRED]);
    });
    it("Jalur 4: Target kosong (mode Exclude), Raw Text = Text Tweet, Multinomial, konfigurasi teks bawaan", () => {
        const f = base(); f.main.TargetVar = ''; f.main.RawTextVar = 'Text Tweet'; f.options.TextLikelihood = 'multinomial';
        const { result } = renderHook(() => useNaiveBayesValidation(f, [v('Sentiment'), v('Pasangan Calon'), v('Text Tweet')]));
        expect(result.current.validation.isValid).toBe(false);
        expect(result.current.validation.errors).toEqual(['Select a target variable.']);
    });
    it("Jalur 5: Target Sentiment, prediktor Pasangan Calon, Raw Text = Text Tweet, Multinomial", () => {
        const f = base(); f.main.TargetVar = 'Sentiment'; f.main.RawTextVar = 'Text Tweet'; f.options.TextLikelihood = 'multinomial';
        const { result } = renderHook(() => useNaiveBayesValidation(f, [v('Sentiment'), v('Pasangan Calon'), v('Text Tweet')]));
        expect(result.current.validation.isValid).toBe(true);
        expect(result.current.validation.errors).toEqual([]);
    });
    it("Jalur 6: Target Sentiment, tanpa prediktor, Raw Text, Complement", () => {
        const f = base(); f.main.TargetVar = 'Sentiment'; f.main.RawTextVar = 'Text Tweet'; f.options.TextLikelihood = 'complement';
        const { result } = renderHook(() => useNaiveBayesValidation(f, [v('Sentiment'), v('Text Tweet')]));
        expect(result.current.validation.isValid).toBe(true);
        expect(result.current.validation.errors).toEqual([]);
    });
    it("Jalur 7: Target Sentiment, prediktor Pasangan Calon, Raw Text, Complement", () => {
        const f = base(); f.main.TargetVar = 'Sentiment'; f.main.RawTextVar = 'Text Tweet'; f.options.TextLikelihood = 'complement';
        const { result } = renderHook(() => useNaiveBayesValidation(f, [v('Sentiment'), v('Pasangan Calon'), v('Text Tweet')]));
        expect(result.current.validation.isValid).toBe(false);
        expect(result.current.validation.errors).toEqual([COMPL]);
    });
    it("Jalur 8: Target Sentiment, prediktor Pasangan Calon, Word-Vector Variables (kolom VEC_), Multinomial", () => {
        const f = base(); f.main.TargetVar = 'Sentiment'; f.main.TextVectorVars = ['VEC_baik', 'VEC_buruk']; f.options.TextLikelihood = 'multinomial';
        const { result } = renderHook(() => useNaiveBayesValidation(f, [v('Sentiment'), v('Pasangan Calon'), v('VEC_baik', 'scale'), v('VEC_buruk', 'scale')]));
        expect(result.current.validation.isValid).toBe(true);
        expect(result.current.validation.errors).toEqual([]);
    });
    it("Jalur 9: Target Sentiment, Raw Text, Words to Keep = −1", () => {
        const f = base(); f.main.TargetVar = 'Sentiment'; f.main.RawTextVar = 'Text Tweet'; f.options.TextLikelihood = 'multinomial'; f.text.wordsToKeep = -1;
        const { result } = renderHook(() => useNaiveBayesValidation(f, [v('Sentiment'), v('Pasangan Calon'), v('Text Tweet')]));
        expect(result.current.validation.isValid).toBe(false);
        expect(result.current.validation.errors).toEqual(['Text Preprocessing: Words to Keep must be a whole number of 0 or more (0 keeps all words).']);
    });
    it("Jalur 10: Target kosong, mode Candidate Factors / Covariates berisi Pasangan Calon, tanpa fitur teks", () => {
        const f = base(); f.main.TargetVar = ''; f.main.SpecificationMode = 'candidates'; f.main.CandidateFactors = ['Pasangan Calon'];
        const { result } = renderHook(() => useNaiveBayesValidation(f, [v('Sentiment'), v('Pasangan Calon')]));
        expect(result.current.validation.isValid).toBe(false);
        expect(result.current.validation.errors).toEqual(['Select a target variable.']);
    });
});
