// Tes thesis Track B (white-box, basis path) WB-1: validateColumnPrefix.
// Satu tes per jalur independen; ID jalur ada pada nama tes. Deterministik (tanpa acak, tanpa jam).
// Jalur dan simpul: testing/thesis-eval/B_whitebox.md, testing/thesis-eval/whitebox/WB-1_validateColumnPrefix.dot
import { MAX_COLUMN_PREFIX_LENGTH, validateColumnPrefix } from "@/components/Modals/Transform/StringToWordVector/utils/columnPrefix";

it("WB-1 jalur 1: awalan bawaan yang sah -> null", () => {
    expect(validateColumnPrefix("VEC_")).toBeNull();
});

it("WB-1 jalur 2: prefix kosong -> pesan galat", () => {
    expect(validateColumnPrefix("")).toBe("Vector column name cannot be empty.");
});

it("WB-1 jalur 3: spasi di awal (prefix != trim) -> pesan galat", () => {
    expect(validateColumnPrefix(" VEC_")).toBe("Vector column name cannot contain spaces.");
});

it("WB-1 jalur 4: spasi di tengah (tanpa spasi di tepi) -> pesan galat", () => {
    expect(validateColumnPrefix("a b")).toBe("Vector column name cannot contain spaces.");
});

it("WB-1 jalur 5: 33 karakter (> 32) -> pesan galat", () => {
    expect(validateColumnPrefix("A".repeat(MAX_COLUMN_PREFIX_LENGTH + 1))).toBe("Vector column name must be at most 32 characters long.");
});

it("WB-1 jalur 6: diawali angka -> pesan galat", () => {
    expect(validateColumnPrefix("1VEC_")).toBe("Vector column name must start with a letter, @, # or $.");
});

it("WB-1 jalur 7: memuat tanda hubung -> pesan galat", () => {
    expect(validateColumnPrefix("VEC-")).toBe("Vector column name can only contain letters, digits, periods, underscores, @, # and $.");
});
