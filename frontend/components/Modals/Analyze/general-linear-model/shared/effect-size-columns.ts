import type { ColumnHeader, ResultJson } from "@/types/Table";

/** Options → Estimates of effect size / Observed power of the dialog. */
export type EffectSizePowerDisplay = {
    /** EstEffectSize: shows the Partial Eta Squared columns. */
    effectSize: boolean;
    /** ObsPower: shows the Noncent. Parameter and Observed Power columns. */
    observedPower: boolean;
};

// Column keys of the MV and RM formatters.
const ETA_KEYS = ["partial_eta_squared", "eta2"];
const POWER_KEYS = ["noncent_parameter", "observed_power", "noncent", "power"];

/**
 * As SPSS (/PRINT = ETASQ OPOWER), the effect-size and power columns appear
 * only when the options are checked. The values are still computed (the
 * worker response is unchanged); only the displayed tables lose the columns.
 */
export function applyEffectSizePowerColumns(
    resultJson: ResultJson,
    display: EffectSizePowerDisplay
): ResultJson {
    const drop = new Set<string>([
        ...(display.effectSize ? [] : ETA_KEYS),
        ...(display.observedPower ? [] : POWER_KEYS),
    ]);
    if (drop.size === 0) return resultJson;

    const keep = (headers: ColumnHeader[]): ColumnHeader[] =>
        headers
            .filter((h) => !(h.key && drop.has(h.key)))
            .map((h) => (h.children ? { ...h, children: keep(h.children) } : h));

    for (const table of resultJson.tables) {
        const hasColumn = (headers: ColumnHeader[]): boolean =>
            headers.some((h) => (h.key && drop.has(h.key)) || (h.children ? hasColumn(h.children) : false));
        if (!table.columnHeaders || !hasColumn(table.columnHeaders)) continue;
        table.columnHeaders = keep(table.columnHeaders);
        for (const row of table.rows ?? []) {
            for (const key of drop) delete (row as Record<string, unknown>)[key];
        }
    }
    return resultJson;
}
