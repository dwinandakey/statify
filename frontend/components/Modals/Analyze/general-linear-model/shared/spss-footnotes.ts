import type { ResultJson, Table } from "@/types/Table";

/**
 * SPSS-style footnotes (v5 A4). The texts are copied from the SPSS 27 output
 * in the repository:
 *   - "Design: Intercept + jk", "Exact statistic", "Computed using alpha = .05"
 *     (testing/glm-mv-reference/spss-output/mv2_dua_populasi.xlsx,
 *     Multivariate Tests; mv1_satu_populasi.xlsx: "Design: Intercept");
 *   - "The statistic is an upper bound on F that yields a lower bound on the
 *     significance level." (mv4_one_way.xlsx, Multivariate Tests, Roy);
 *   - "Design: Intercept + kelompok" / "Within Subjects Design: waktu"
 *     (testing/glm-rm-reference/spss-output/rm_a.xlsx, Multivariate Tests);
 *   - "Computed using alpha = .05" as the only footnote of Tests of
 *     Within-Subjects Effects / Contrasts and Tests of Between-Subjects
 *     Effects (rm_a.xlsx, rm_c.xlsx) and after the R Squared lines of the MV
 *     Tests of Between-Subjects Effects (mv4_one_way.xlsx).
 * SPSS marks cells with superscript letters; the Statify tables carry the
 * lettered lines only.
 */

export const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

/** ".05" as SPSS prints alpha. */
export function spssAlpha(alpha: number): string {
    return String(alpha).replace(/^0\./, ".");
}

const EXACT = "Exact statistic";
const UPPER_BOUND = "The statistic is an upper bound on F that yields a lower bound on the significance level.";
const alphaLine = (alpha: number) => `Computed using alpha = ${spssAlpha(alpha)}`;

/** Existing note, then the lettered lines (one per line). The Result page
 *  shows line breaks as spaces, so an existing note without a final period
 *  (e.g. "Type III sum of squares") is closed with one first. */
function appendLettered(table: Table, lines: string[], startLetter = 0) {
    if (lines.length === 0) return;
    const lettered = lines.map((line, i) => `${LETTERS[startLetter + i]}. ${line}`).join("\n");
    const base = String(table.note ?? "").trimEnd();
    if (!base) {
        table.note = lettered;
        return;
    }
    table.note = `${/[.!?]$/.test(base) ? base : `${base}.`}\n${lettered}`;
}

type TestEntry = { is_exact_statistic?: boolean };
type TestEffects = Record<string, Record<string, TestEntry>>;

/** Exact / upper-bound flags of a Multivariate Tests result. */
function exactFlags(effects: TestEffects | undefined) {
    let exact = false;
    let upperBound = false;
    for (const tests of Object.values(effects ?? {})) {
        for (const [name, entry] of Object.entries(tests ?? {})) {
            if (entry?.is_exact_statistic) exact = true;
            if (name === "Roy's Largest Root" && entry && entry.is_exact_statistic === false) upperBound = true;
        }
    }
    return { exact, upperBound };
}

/** Multivariate Tests footnotes: Design, exact / upper bound, alpha. */
export function addMultivariateTestsFootnotes(
    table: Table,
    designLines: string[],
    effects: TestEffects | undefined,
    observedPower: boolean,
    alpha: number
) {
    const { exact, upperBound } = exactFlags(effects);
    const lines: string[] = [];
    if (designLines.length) lines.push(designLines.join("\n"));
    if (exact) lines.push(EXACT);
    if (upperBound) lines.push(UPPER_BOUND);
    if (observedPower) lines.push(alphaLine(alpha));
    appendLettered(table, lines);
}

/** "Computed using alpha = .05" as the next letter after `usedLetters`. */
export function addAlphaFootnote(table: Table, alpha: number, usedLetters = 0) {
    appendLettered(table, [alphaLine(alpha)], usedLetters);
}

/** MV design line from the effects of the Multivariate Tests, in SPSS order:
 *  Intercept, main effects / covariates, interactions ("A * B"). */
export function mvDesignLine(effectNames: string[]): string {
    const terms = effectNames
        .filter((e) => e !== "Intercept")
        .map((e) => e.split("*").map((p) => p.trim()).filter(Boolean));
    const order = (a: string[], b: string[]) =>
        a.length !== b.length
            ? a.length - b.length
            : a.join("*").localeCompare(b.join("*"), undefined, { numeric: true, sensitivity: "base" });
    return ["Intercept", ...terms.sort(order).map((t) => t.join(" * "))].join(" + ");
}

export function applyRmFootnotes(
    resultJson: ResultJson,
    data: any,
    observedPower: boolean,
    alpha: number
) {
    for (const table of resultJson.tables) {
        const key = table.key ?? "";
        if (key === "multivariate_tests" || key === "tests_within_subjects_effects__multivariate") {
            // Existing note "Design: Intercept + g; Within Subjects Design: f"
            // → SPSS lines "Design: Intercept + g" / "Within Subjects Design: f".
            const raw = String(table.note ?? "");
            const m = raw.match(/^Design: (.*?)(?:;\s*|\s+)Within Subjects Design: (.*?)(\s+Tests are based on averaged variables\.)?$/);
            const source = key === "multivariate_tests" ? data?.multivariate_tests : data?.within_subjects_multivariate;
            if (m) {
                table.note = m[3] ? m[3].trim() : undefined;
                addMultivariateTestsFootnotes(table, [`Design: ${m[1].trim()}`, `Within Subjects Design: ${m[2].trim()}`], source?.effects, observedPower, alpha);
            } else {
                addMultivariateTestsFootnotes(table, [], source?.effects, observedPower, alpha);
            }
        } else if (
            observedPower &&
            (key.startsWith("tests_within_subjects_effects") ||
                key.startsWith("tests_within_subjects_contrasts") ||
                key === "tests_between_subjects_effects")
        ) {
            addAlphaFootnote(table, alpha);
        }
    }
}
