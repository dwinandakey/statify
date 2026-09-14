// discriminant-number-format.ts
//
// Cell formatting for the discriminant output tables, following SPSS pivot-table
// conventions. These are for display only: never parse the strings back into a
// calculation. The Rust engine, Save and the XML export all keep full precision.

type Cell = number | string | null | undefined;

const STAT_DECIMALS = 3;
const PERCENT_DECIMALS = 1;
const SIG_FLOOR = 0.001;

/** Strings pass through, missing values are blank, infinities are spelled out. */
function nonNumericCell(value: Cell): string | null {
  if (typeof value === "string") return value;
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  if (!Number.isFinite(value)) return value > 0 ? "Infinity" : "-Infinity";
  return null;
}

/**
 * Round to nearest and drop the zero before the decimal point, as SPSS prints
 * it: 0.1234 -> ".123", -0.5 -> "-.500".
 */
function fixed(value: number, decimals: number): string {
  // toFixed rounds the exact stored double to nearest (ties away from zero).
  let text = value.toFixed(decimals);
  // A tiny negative that rounds to zero would print as "-0.000".
  if (/^-0\.0*$/.test(text)) text = text.slice(1);
  return text.replace(/^(-?)0\./, "$1.");
}

/** Continuous statistics: means, coefficients, lambdas, F, tolerances, … */
export function formatStat(value: Cell): string {
  return nonNumericCell(value) ?? fixed(value as number, STAT_DECIMALS);
}

/** Significance: SPSS prints anything below .001 as "<.001". */
export function formatSig(value: Cell): string {
  const text = nonNumericCell(value);
  if (text !== null) return text;
  const p = value as number;
  return p < SIG_FLOOR ? "<.001" : fixed(p, STAT_DECIMALS);
}

/** Percentages (case summaries, % of variance, classification): one decimal. */
export function formatPercent(value: Cell): string {
  return nonNumericCell(value) ?? fixed(value as number, PERCENT_DECIMALS);
}

/**
 * Counts, steps, ranks and degrees of freedom print as whole numbers. An
 * approximate df that is genuinely fractional (Box's M df2, Rao's F df2) keeps
 * three decimals rather than being rounded to a misleading integer.
 */
export function formatCount(value: Cell): string {
  const text = nonNumericCell(value);
  if (text !== null) return text;
  const n = value as number;
  return Number.isInteger(n) ? String(n) : fixed(n, STAT_DECIMALS);
}
