// Tes evaluasi Track B (white-box, basis path) WB-3: blok validasi useMemo pada useNaiveBayesValidation.
// Blok dijalankan lewat renderHook (hook asli, tanpa mock). Satu tes per jalur independen yang layak.
// Jalur 13 (infeasible) tidak punya tes: lihat B_whitebox.md untuk bukti ketaklayakannya.
import { renderHook } from "@testing-library/react";
import { useNaiveBayesValidation } from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation";
import { NaiveBayesDefault } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import type { NaiveBayesType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";
import type { Variable } from "@/types/Variable";

const v = (name: string, measure: Variable["measure"] = "nominal"): Variable => ({
    columnIndex: 0, name, width: 8, decimals: 0, values: [], missing: null, columns: 8, align: "left", measure, role: "input",
});
const base = (): NaiveBayesType => JSON.parse(JSON.stringify(NaiveBayesDefault));

it("WB-3 jalur 1: TargetVar = Sentiment, SpecificationMode = exclude (bawaan), ada prediktor efektif (Pasangan Calon), tanpa fitur teks", () => {
    const f = base();
    f.main.TargetVar = 'Sentiment';
    const { result } = renderHook(() => useNaiveBayesValidation(f, [v("Sentiment"), v("Pasangan Calon")]));
    expect(result.current.validation).toEqual({ isValid: true, errors: [] });
});

it("WB-3 jalur 2: TargetVar = Sentiment, SpecificationMode = exclude (bawaan), ada prediktor efektif (Pasangan Calon), Word-Vector = VEC_baik, VEC_buruk", () => {
    const f = base();
    f.main.TargetVar = 'Sentiment';
    f.main.TextVectorVars = ['VEC_baik', 'VEC_buruk'];
    const { result } = renderHook(() => useNaiveBayesValidation(f, [v("Sentiment"), v("Pasangan Calon"), v("VEC_baik", 'scale'), v("VEC_buruk", 'scale')]));
    expect(result.current.validation).toEqual({ isValid: true, errors: [] });
});

it("WB-3 jalur 3: TargetVar = Sentiment, SpecificationMode = exclude (bawaan), tanpa prediktor efektif, tanpa fitur teks", () => {
    const f = base();
    f.main.TargetVar = 'Sentiment';
    const { result } = renderHook(() => useNaiveBayesValidation(f, [v("Sentiment")]));
    expect(result.current.validation).toEqual({ isValid: false, errors: ["Select at least one predictor variable (using Variables to Exclude or Candidate Factors / Covariates) or add Text Features."] });
});

it("WB-3 jalur 4: TargetVar = Sentiment, SpecificationMode = exclude (bawaan), tanpa prediktor efektif, Word-Vector = VEC_baik, VEC_buruk", () => {
    const f = base();
    f.main.TargetVar = 'Sentiment';
    f.main.TextVectorVars = ['VEC_baik', 'VEC_buruk'];
    const { result } = renderHook(() => useNaiveBayesValidation(f, [v("Sentiment"), v("VEC_baik", 'scale'), v("VEC_buruk", 'scale')]));
    expect(result.current.validation).toEqual({ isValid: true, errors: [] });
});

it("WB-3 jalur 5: TargetVar = Sentiment, SpecificationMode = exclude (bawaan), ada prediktor efektif (Pasangan Calon), Raw Text = Text Tweet", () => {
    const f = base();
    f.main.TargetVar = 'Sentiment';
    f.main.RawTextVar = 'Text Tweet';
    const { result } = renderHook(() => useNaiveBayesValidation(f, [v("Sentiment"), v("Pasangan Calon"), v("Text Tweet")]));
    expect(result.current.validation).toEqual({ isValid: true, errors: [] });
});

it("WB-3 jalur 6: TargetVar = Sentiment, SpecificationMode = exclude (bawaan), tanpa prediktor efektif, Word-Vector = VEC_baik, VEC_buruk, TextLikelihood = complement", () => {
    const f = base();
    f.main.TargetVar = 'Sentiment';
    f.main.TextVectorVars = ['VEC_baik', 'VEC_buruk'];
    f.options.TextLikelihood = 'complement';
    const { result } = renderHook(() => useNaiveBayesValidation(f, [v("Sentiment"), v("VEC_baik", 'scale'), v("VEC_buruk", 'scale')]));
    expect(result.current.validation).toEqual({ isValid: true, errors: [] });
});

it("WB-3 jalur 7: TargetVar = Sentiment, SpecificationMode = exclude (bawaan), ada prediktor efektif (Pasangan Calon), Word-Vector = VEC_baik, VEC_buruk, TextLikelihood = complement", () => {
    const f = base();
    f.main.TargetVar = 'Sentiment';
    f.main.TextVectorVars = ['VEC_baik', 'VEC_buruk'];
    f.options.TextLikelihood = 'complement';
    const { result } = renderHook(() => useNaiveBayesValidation(f, [v("Sentiment"), v("Pasangan Calon"), v("VEC_baik", 'scale'), v("VEC_buruk", 'scale')]));
    expect(result.current.validation).toEqual({ isValid: false, errors: ["Complement Naive Bayes can only be used when the model contains Text Features only. Choose Multinomial or Bernoulli, or remove the numeric/categorical predictors."] });
});

it("WB-3 jalur 8: TargetVar kosong (null), SpecificationMode = candidates, ada prediktor efektif (Pasangan Calon), tanpa fitur teks", () => {
    const f = base();
    f.main.SpecificationMode = 'candidates';
    f.main.CandidateFactors = ['Pasangan Calon'];
    const { result } = renderHook(() => useNaiveBayesValidation(f, [v("Pasangan Calon")]));
    expect(result.current.validation).toEqual({ isValid: false, errors: ["Select a target variable."] });
});

it("WB-3 jalur 9: TargetVar = Sentiment, SpecificationMode = exclude (bawaan), ada prediktor efektif (Pasangan Calon), Raw Text = Text Tweet, wordsToKeep = -1", () => {
    const f = base();
    f.main.TargetVar = 'Sentiment';
    f.main.RawTextVar = 'Text Tweet';
    f.text.wordsToKeep = -1;
    const { result } = renderHook(() => useNaiveBayesValidation(f, [v("Sentiment"), v("Pasangan Calon"), v("Text Tweet")]));
    expect(result.current.validation).toEqual({ isValid: false, errors: ["Text Preprocessing: Words to Keep must be a whole number of 0 or more (0 keeps all words)."] });
});

it("WB-3 jalur 10: TargetVar kosong (null), SpecificationMode = exclude (bawaan), tanpa prediktor efektif, tanpa fitur teks", () => {
    const f = base();
    const { result } = renderHook(() => useNaiveBayesValidation(f, []));
    expect(result.current.validation).toEqual({ isValid: false, errors: ["Select a target variable.", "Select at least one predictor variable (using Variables to Exclude or Candidate Factors / Covariates) or add Text Features."] });
});

it("WB-3 jalur 11: TargetVar kosong (null), SpecificationMode tidak ada (undefined), ada prediktor efektif (Pasangan Calon), tanpa fitur teks", () => {
    const f = base();
    delete (f.main as Partial<typeof f.main>).SpecificationMode;
    const { result } = renderHook(() => useNaiveBayesValidation(f, [v("Pasangan Calon")]));
    expect(result.current.validation).toEqual({ isValid: false, errors: ["Select a target variable.", "Select at least one predictor variable (using Variables to Exclude or Candidate Factors / Covariates) or add Text Features."] });
});

it("WB-3 jalur 12: TargetVar kosong (null), SpecificationMode = exclude (bawaan), ada prediktor efektif (Pasangan Calon), tanpa fitur teks", () => {
    const f = base();
    const { result } = renderHook(() => useNaiveBayesValidation(f, [v("Pasangan Calon")]));
    expect(result.current.validation).toEqual({ isValid: false, errors: ["Select a target variable.", "Select at least one predictor variable (using Variables to Exclude or Candidate Factors / Covariates) or add Text Features."] });
});
