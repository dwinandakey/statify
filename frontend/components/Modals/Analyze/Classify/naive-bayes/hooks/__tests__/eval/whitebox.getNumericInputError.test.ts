// Tes evaluasi Track B (white-box, basis path) WB-2: getNumericInputError.
// Satu tes per jalur independen; ID jalur ada pada nama tes. Deterministik (tanpa acak, tanpa jam).
// Nilai bertipe salah (string, di luar union) dimasukkan lewat type assertion karena predikat `typeof` hanya
// dapat bernilai benar untuk data yang melanggar tipe (mis. dari input UI atau IndexedDB lama).
import { getNumericInputError } from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation";
import { NaiveBayesDefault } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import type { NaiveBayesType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";

// Salinan dalam default agar tiap tes mandiri.
const base = (): NaiveBayesType => JSON.parse(JSON.stringify(NaiveBayesDefault));

it("WB-2 jalur 1: nilai bawaan formulir (tanpa fitur teks, holdout 70%, seed tidak diatur)", () => {
    const f = base();
    expect(getNumericInputError(f)).toBeNull();
});

it("WB-2 jalur 2: SmoothingAlpha = \"1\" (string)", () => {
    const f = base();
    f.options.SmoothingAlpha = "1" as unknown as number;
    expect(getNumericInputError(f)).toBe("Enter a valid number for Smoothing Alpha.");
});

it("WB-2 jalur 3: SmoothingAlpha = NaN", () => {
    const f = base();
    f.options.SmoothingAlpha = NaN;
    expect(getNumericInputError(f)).toBe("Enter a valid number for Smoothing Alpha.");
});

it("WB-2 jalur 4: SmoothingAlpha = 0", () => {
    const f = base();
    f.options.SmoothingAlpha = 0;
    expect(getNumericInputError(f)).toBe("Smoothing Alpha must be greater than 0.");
});

it("WB-2 jalur 5: SmoothingAlpha = 1000", () => {
    const f = base();
    f.options.SmoothingAlpha = 1000;
    expect(getNumericInputError(f)).toBe("Smoothing Alpha must not exceed 999.");
});

it("WB-2 jalur 6: RawTextVar = \"Text Tweet\" (fitur teks aktif); TextAlpha = \"1\" (string)", () => {
    const f = base();
    f.main.RawTextVar = "Text Tweet";
    f.options.TextAlpha = "1" as unknown as number;
    expect(getNumericInputError(f)).toBe("Enter a valid number for Text smoothing alpha.");
});

it("WB-2 jalur 7: RawTextVar = \"Text Tweet\" (fitur teks aktif); TextAlpha = Infinity", () => {
    const f = base();
    f.main.RawTextVar = "Text Tweet";
    f.options.TextAlpha = Infinity;
    expect(getNumericInputError(f)).toBe("Enter a valid number for Text smoothing alpha.");
});

it("WB-2 jalur 8: RawTextVar = \"Text Tweet\" (fitur teks aktif); TextAlpha = 0", () => {
    const f = base();
    f.main.RawTextVar = "Text Tweet";
    f.options.TextAlpha = 0;
    expect(getNumericInputError(f)).toBe("Text smoothing alpha must be greater than 0.");
});

it("WB-2 jalur 9: RawTextVar = \"Text Tweet\" (fitur teks aktif); TextAlpha = 1000", () => {
    const f = base();
    f.main.RawTextVar = "Text Tweet";
    f.options.TextAlpha = 1000;
    expect(getNumericInputError(f)).toBe("Text smoothing alpha must not exceed 999.");
});

it("WB-2 jalur 10: RawTextVar = \"Text Tweet\" (fitur teks aktif); TextTopK = \"100\" (string)", () => {
    const f = base();
    f.main.RawTextVar = "Text Tweet";
    f.output.TextTopK = "100" as unknown as number;
    expect(getNumericInputError(f)).toBe("Top-k terms per class must be a whole number between 1 and 1000.");
});

it("WB-2 jalur 11: RawTextVar = \"Text Tweet\" (fitur teks aktif); TextTopK = 10.5", () => {
    const f = base();
    f.main.RawTextVar = "Text Tweet";
    f.output.TextTopK = 10.5;
    expect(getNumericInputError(f)).toBe("Top-k terms per class must be a whole number between 1 and 1000.");
});

it("WB-2 jalur 12: RawTextVar = \"Text Tweet\" (fitur teks aktif); TextTopK = 0", () => {
    const f = base();
    f.main.RawTextVar = "Text Tweet";
    f.output.TextTopK = 0;
    expect(getNumericInputError(f)).toBe("Top-k terms per class must be a whole number between 1 and 1000.");
});

it("WB-2 jalur 13: RawTextVar = \"Text Tweet\" (fitur teks aktif); TextTopK = 1001", () => {
    const f = base();
    f.main.RawTextVar = "Text Tweet";
    f.output.TextTopK = 1001;
    expect(getNumericInputError(f)).toBe("Top-k terms per class must be a whole number between 1 and 1000.");
});

it("WB-2 jalur 14: TrainingPercentage = \"70\" (string)", () => {
    const f = base();
    f.validation.TrainingPercentage = "70" as unknown as number;
    expect(getNumericInputError(f)).toBe("Training percentage must be a whole number between 1 and 99.");
});

it("WB-2 jalur 15: TrainingPercentage = 70.5", () => {
    const f = base();
    f.validation.TrainingPercentage = 70.5;
    expect(getNumericInputError(f)).toBe("Training percentage must be a whole number between 1 and 99.");
});

it("WB-2 jalur 16: TrainingPercentage = 0", () => {
    const f = base();
    f.validation.TrainingPercentage = 0;
    expect(getNumericInputError(f)).toBe("Training percentage must be a whole number between 1 and 99.");
});

it("WB-2 jalur 17: TrainingPercentage = 100", () => {
    const f = base();
    f.validation.TrainingPercentage = 100;
    expect(getNumericInputError(f)).toBe("Training percentage must be a whole number between 1 and 99.");
});

it("WB-2 jalur 18: RawTextVar = \"Text Tweet\" (fitur teks aktif); TextFeatureTable = false; TrainingPercentage = \"70\" (string)", () => {
    const f = base();
    f.main.RawTextVar = "Text Tweet";
    f.output.TextFeatureTable = false;
    f.validation.TrainingPercentage = "70" as unknown as number;
    expect(getNumericInputError(f)).toBe("Training percentage must be a whole number between 1 and 99.");
});

it("WB-2 jalur 19: RawTextVar = \"Text Tweet\" (fitur teks aktif); TrainingPercentage = \"70\" (string)", () => {
    const f = base();
    f.main.RawTextVar = "Text Tweet";
    f.validation.TrainingPercentage = "70" as unknown as number;
    expect(getNumericInputError(f)).toBe("Training percentage must be a whole number between 1 and 99.");
});

it("WB-2 jalur 20: ValidationMethod = \"kfold\"; KFolds = \"10\" (string)", () => {
    const f = base();
    f.validation.ValidationMethod = "kfold";
    f.validation.KFolds = "10" as unknown as number;
    expect(getNumericInputError(f)).toBe("The number of folds must be at least 1.");
});

it("WB-2 jalur 21: ValidationMethod = \"kfold\"; KFolds = 2.5", () => {
    const f = base();
    f.validation.ValidationMethod = "kfold";
    f.validation.KFolds = 2.5;
    expect(getNumericInputError(f)).toBe("The number of folds must be at least 1.");
});

it("WB-2 jalur 22: ValidationMethod = \"kfold\"; KFolds = 0", () => {
    const f = base();
    f.validation.ValidationMethod = "kfold";
    f.validation.KFolds = 0;
    expect(getNumericInputError(f)).toBe("The number of folds must be at least 1.");
});

it("WB-2 jalur 23: RandomSeed = \"42\" (string)", () => {
    const f = base();
    f.validation.RandomSeed = "42" as unknown as number;
    expect(getNumericInputError(f)).toBe("The seed must be a whole number between 0 and 4294967295.");
});

it("WB-2 jalur 24: RandomSeed = 4.2", () => {
    const f = base();
    f.validation.RandomSeed = 4.2;
    expect(getNumericInputError(f)).toBe("The seed must be a whole number between 0 and 4294967295.");
});

it("WB-2 jalur 25: RandomSeed = -1", () => {
    const f = base();
    f.validation.RandomSeed = -1;
    expect(getNumericInputError(f)).toBe("The seed must be a whole number between 0 and 4294967295.");
});

it("WB-2 jalur 26: RandomSeed = 4294967296", () => {
    const f = base();
    f.validation.RandomSeed = 4294967296;
    expect(getNumericInputError(f)).toBe("The seed must be a whole number between 0 and 4294967295.");
});

it("WB-2 jalur 27: ValidationMethod = \"none\" (di luar union tipe; hanya lewat type assertion)", () => {
    const f = base();
    f.validation.ValidationMethod = "none" as unknown as "holdout";
    expect(getNumericInputError(f)).toBeNull();
});

it("WB-2 jalur 28: ValidationMethod = \"kfold\"", () => {
    const f = base();
    f.validation.ValidationMethod = "kfold";
    expect(getNumericInputError(f)).toBeNull();
});

it("WB-2 jalur 29: RandomSeed = 42", () => {
    const f = base();
    f.validation.RandomSeed = 42;
    expect(getNumericInputError(f)).toBeNull();
});
