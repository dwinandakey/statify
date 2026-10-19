import { getNumericInputError } from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation";
import { NaiveBayesDefault } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import type { NaiveBayesType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";

// White-box testing WB-2 (basis path) fungsi getNumericInputError. Nomor jalur = nomor pada tabel jalur di buku (Subbab 5.2.4).
const base = (): NaiveBayesType => JSON.parse(JSON.stringify(NaiveBayesDefault));
const raw = (f: NaiveBayesType) => { f.main.RawTextVar = "Text Tweet"; };

describe("WB-2 getNumericInputError: jalur independen", () => {
    it("Jalur 1: Nilai bawaan formulir (SmoothingAlpha = 1, tanpa fitur teks, holdout 70%, seed tidak diatur)", () => {
        const f = base(); 
        expect(getNumericInputError(f)).toBe(null);
    });
    it("Jalur 2: SmoothingAlpha = \"1\" (bukan number)", () => {
        const f = base(); f.options.SmoothingAlpha = "1" as unknown as number;
        expect(getNumericInputError(f)).toBe("Enter a valid number for Smoothing Alpha.");
    });
    it("Jalur 3: SmoothingAlpha = NaN", () => {
        const f = base(); f.options.SmoothingAlpha = NaN;
        expect(getNumericInputError(f)).toBe("Enter a valid number for Smoothing Alpha.");
    });
    it("Jalur 4: SmoothingAlpha = 0", () => {
        const f = base(); f.options.SmoothingAlpha = 0;
        expect(getNumericInputError(f)).toBe("Smoothing Alpha must be greater than 0.");
    });
    it("Jalur 5: SmoothingAlpha = 1000", () => {
        const f = base(); f.options.SmoothingAlpha = 1000;
        expect(getNumericInputError(f)).toBe("Smoothing Alpha must not exceed 999.");
    });
    it("Jalur 6: Raw Text Variable terisi, TextFeatureTable = false", () => {
        const f = base(); raw(f); f.output.TextFeatureTable = false;
        expect(getNumericInputError(f)).toBe(null);
    });
    it("Jalur 7: Raw Text terisi, TextAlpha = \"1\"", () => {
        const f = base(); raw(f); f.options.TextAlpha = "1" as unknown as number;
        expect(getNumericInputError(f)).toBe("Enter a valid number for Text smoothing alpha.");
    });
    it("Jalur 8: Raw Text terisi, TextAlpha = Infinity", () => {
        const f = base(); raw(f); f.options.TextAlpha = Infinity;
        expect(getNumericInputError(f)).toBe("Enter a valid number for Text smoothing alpha.");
    });
    it("Jalur 9: Raw Text terisi, TextAlpha = 0", () => {
        const f = base(); raw(f); f.options.TextAlpha = 0;
        expect(getNumericInputError(f)).toBe("Text smoothing alpha must be greater than 0.");
    });
    it("Jalur 10: Raw Text terisi, TextAlpha = 1000", () => {
        const f = base(); raw(f); f.options.TextAlpha = 1000;
        expect(getNumericInputError(f)).toBe("Text smoothing alpha must not exceed 999.");
    });
    it("Jalur 11: Raw Text terisi, TextFeatureTable = true, TextTopK = 100", () => {
        const f = base(); raw(f); f.output.TextFeatureTable = true; f.output.TextTopK = 100;
        expect(getNumericInputError(f)).toBe(null);
    });
    it("Jalur 12: Raw Text terisi, TextTopK = \"100\"", () => {
        const f = base(); raw(f); f.output.TextFeatureTable = true; f.output.TextTopK = "100" as unknown as number;
        expect(getNumericInputError(f)).toBe("Top-k terms per class must be a whole number between 1 and 1000.");
    });
    it("Jalur 13: Raw Text terisi, TextTopK = 10,5", () => {
        const f = base(); raw(f); f.output.TextFeatureTable = true; f.output.TextTopK = 10.5;
        expect(getNumericInputError(f)).toBe("Top-k terms per class must be a whole number between 1 and 1000.");
    });
    it("Jalur 14: Raw Text terisi, TextTopK = 0", () => {
        const f = base(); raw(f); f.output.TextFeatureTable = true; f.output.TextTopK = 0;
        expect(getNumericInputError(f)).toBe("Top-k terms per class must be a whole number between 1 and 1000.");
    });
    it("Jalur 15: Raw Text terisi, TextTopK = 1001", () => {
        const f = base(); raw(f); f.output.TextFeatureTable = true; f.output.TextTopK = 1001;
        expect(getNumericInputError(f)).toBe("Top-k terms per class must be a whole number between 1 and 1000.");
    });
    it("Jalur 16: TrainingPercentage = \"70\"", () => {
        const f = base(); f.validation.TrainingPercentage = "70" as unknown as number;
        expect(getNumericInputError(f)).toBe("Training percentage must be a whole number between 1 and 99.");
    });
    it("Jalur 17: TrainingPercentage = 70,5", () => {
        const f = base(); f.validation.TrainingPercentage = 70.5;
        expect(getNumericInputError(f)).toBe("Training percentage must be a whole number between 1 and 99.");
    });
    it("Jalur 18: TrainingPercentage = 0", () => {
        const f = base(); f.validation.TrainingPercentage = 0;
        expect(getNumericInputError(f)).toBe("Training percentage must be a whole number between 1 and 99.");
    });
    it("Jalur 19: TrainingPercentage = 100", () => {
        const f = base(); f.validation.TrainingPercentage = 100;
        expect(getNumericInputError(f)).toBe("Training percentage must be a whole number between 1 and 99.");
    });
    it("Jalur 20: ValidationMethod = \"kfold\", KFolds = 10", () => {
        const f = base(); f.validation.ValidationMethod = "kfold"; f.validation.KFolds = 10;
        expect(getNumericInputError(f)).toBe(null);
    });
    it("Jalur 21: kfold, KFolds = \"10\"", () => {
        const f = base(); f.validation.ValidationMethod = "kfold"; f.validation.KFolds = "10" as unknown as number;
        expect(getNumericInputError(f)).toBe("The number of folds must be at least 1.");
    });
    it("Jalur 22: kfold, KFolds = 2,5", () => {
        const f = base(); f.validation.ValidationMethod = "kfold"; f.validation.KFolds = 2.5;
        expect(getNumericInputError(f)).toBe("The number of folds must be at least 1.");
    });
    it("Jalur 23: kfold, KFolds = 0", () => {
        const f = base(); f.validation.ValidationMethod = "kfold"; f.validation.KFolds = 0;
        expect(getNumericInputError(f)).toBe("The number of folds must be at least 1.");
    });
    it("Jalur 24: RandomSeed = 42", () => {
        const f = base(); f.validation.RandomSeed = 42;
        expect(getNumericInputError(f)).toBe(null);
    });
    it("Jalur 25: RandomSeed = \"42\"", () => {
        const f = base(); f.validation.RandomSeed = "42" as unknown as number;
        expect(getNumericInputError(f)).toBe("The seed must be a whole number between 0 and 4294967295.");
    });
    it("Jalur 26: RandomSeed = 4,2", () => {
        const f = base(); f.validation.RandomSeed = 4.2;
        expect(getNumericInputError(f)).toBe("The seed must be a whole number between 0 and 4294967295.");
    });
    it("Jalur 27: RandomSeed = −1", () => {
        const f = base(); f.validation.RandomSeed = -1;
        expect(getNumericInputError(f)).toBe("The seed must be a whole number between 0 and 4294967295.");
    });
    it("Jalur 28: RandomSeed = 4294967296", () => {
        const f = base(); f.validation.RandomSeed = 4294967296;
        expect(getNumericInputError(f)).toBe("The seed must be a whole number between 0 and 4294967295.");
    });
    it("Catatan temuan: KFolds = 1 masih diterima (batas minimum seharusnya 2)", () => {
        const f = base(); f.validation.ValidationMethod = "kfold"; f.validation.KFolds = 1;
        // Tes ini LULUS bila KFolds = 1 diterima. Hasilnya dicatat sebagai temuan, bukan kegagalan jalur.
        expect(getNumericInputError(f)).toBeNull();
    });
});
