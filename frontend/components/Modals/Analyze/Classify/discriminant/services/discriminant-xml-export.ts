/**
 * Discriminant Analysis — model export
 *
 * The SPSS counterpart is the Save dialog's "Export model information to XML
 * file", which writes out everything needed to score new cases with the fitted
 * model. SPSS points at a path with a Browse button; a browser cannot, so the
 * dialog takes a file name here and the document is handed to the user as a
 * download instead.
 *
 * The document is well-formed, self-describing XML rather than schema-validated
 * PMML: it carries the same model information, but the element names are our
 * own, so do not expect a PMML consumer to read it back.
 */

import type { DiscriminantType } from "@/components/Modals/Analyze/Classify/discriminant/types/discriminant";

type FunctionValues = { variable: string; values: number[] };
type GroupValues = { group: string; values: number[] };

/** The slice of the WASM `get_formatted_results()` payload the export reads. */
export type DiscriminantExportModel = {
    canonical_functions?: {
        coefficients?: FunctionValues[];
        standardized_coefficients?: FunctionValues[];
        function_at_centroids?: GroupValues[];
    } | null;
    classification_function_coefficients?: {
        groups?: number[];
        variables?: string[];
        coefficients?: FunctionValues[];
        constant_terms?: number[];
    } | null;
    prior_probabilities?: {
        groups?: string[];
        prior_probabilities?: number[];
        total?: number;
    } | null;
    eigen_description?: {
        functions?: string[];
        eigenvalue?: number[];
        variance_percentage?: number[];
        cumulative_percentage?: number[];
        canonical_correlation?: number[];
    } | null;
};

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/** Full precision — this file is meant to be scored against, not read. */
function num(value: number | undefined): string {
    return Number.isFinite(value) ? String(value) : "";
}

/** Build the model XML document as a string. */
export function buildDiscriminantModelXml(
    model: DiscriminantExportModel,
    config: DiscriminantType,
): string {
    const canonical = model.canonical_functions;
    const coefficients = canonical?.coefficients ?? [];
    const standardized = canonical?.standardized_coefficients ?? [];
    const centroids = canonical?.function_at_centroids ?? [];
    const fisher = model.classification_function_coefficients;
    const priors = model.prior_probabilities;
    const eigen = model.eigen_description;

    const predictors = coefficients.filter((c) => c.variable !== "(Constant)");
    const constants = coefficients.find((c) => c.variable === "(Constant)")?.values ?? [];
    const numFunctions = predictors[0]?.values.length ?? centroids[0]?.values.length ?? 0;

    const L: string[] = [];
    L.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    L.push(`<DiscriminantModel version="1.0" generator="Statify">`);

    L.push(`  <Header>`);
    L.push(`    <Timestamp>${escapeXml(new Date().toISOString())}</Timestamp>`);
    L.push(
        `    <GroupingVariable>${escapeXml(config.main.GroupingVariable ?? "")}</GroupingVariable>`,
    );
    L.push(
        `    <Method>${config.main.Stepwise ? "Stepwise" : "Enter independents together"}</Method>`,
    );
    L.push(
        `    <PriorProbabilities>${config.classify.AllGroupEqual ? "All groups equal" : "Compute from group sizes"}</PriorProbabilities>`,
    );
    const { minRange, maxRange } = config.defineRange;
    if (minRange !== null || maxRange !== null) {
        L.push(`    <GroupRange min="${num(minRange ?? undefined)}" max="${num(maxRange ?? undefined)}"/>`);
    }
    L.push(`  </Header>`);

    // Predictors actually in the fitted model (post-stepwise).
    L.push(`  <Predictors count="${predictors.length}">`);
    for (const p of predictors) {
        L.push(`    <Predictor name="${escapeXml(p.variable)}"/>`);
    }
    L.push(`  </Predictors>`);

    // Groups, with the prior used and the centroid in discriminant space.
    const priorOf = new Map<string, number>();
    (priors?.groups ?? []).forEach((g, i) => {
        const p = priors?.prior_probabilities?.[i];
        if (p !== undefined) priorOf.set(g, p);
    });

    L.push(`  <Groups count="${centroids.length}">`);
    for (const c of centroids) {
        const prior = priorOf.get(c.group);
        L.push(
            `    <Group label="${escapeXml(c.group)}"${prior !== undefined ? ` prior="${num(prior)}"` : ""}>`,
        );
        c.values.forEach((v, f) => {
            L.push(`      <Centroid function="${f + 1}">${num(v)}</Centroid>`);
        });
        L.push(`    </Group>`);
    }
    L.push(`  </Groups>`);

    // Unstandardized canonical functions: the coefficients that turn a case's
    // predictor values into its discriminant scores.
    L.push(`  <CanonicalDiscriminantFunctions count="${numFunctions}">`);
    for (let f = 0; f < numFunctions; f++) {
        L.push(`    <Function index="${f + 1}">`);
        for (const p of predictors) {
            L.push(
                `      <Coefficient variable="${escapeXml(p.variable)}">${num(p.values[f])}</Coefficient>`,
            );
        }
        L.push(`      <Constant>${num(constants[f] ?? 0)}</Constant>`);
        const std = standardized.filter((s) => s.variable !== "(Constant)");
        for (const s of std) {
            L.push(
                `      <StandardizedCoefficient variable="${escapeXml(s.variable)}">${num(s.values[f])}</StandardizedCoefficient>`,
            );
        }
        if (eigen) {
            L.push(
                `      <Eigenvalue>${num(eigen.eigenvalue?.[f])}</Eigenvalue>`,
            );
            L.push(
                `      <VariancePercent>${num(eigen.variance_percentage?.[f])}</VariancePercent>`,
            );
            L.push(
                `      <CanonicalCorrelation>${num(eigen.canonical_correlation?.[f])}</CanonicalCorrelation>`,
            );
        }
        L.push(`    </Function>`);
    }
    L.push(`  </CanonicalDiscriminantFunctions>`);

    // Fisher's linear classification functions, when the user asked for them.
    if (fisher && (fisher.coefficients?.length ?? 0) > 0) {
        const groupLabels = priors?.groups ?? [];
        const groupCount = fisher.constant_terms?.length ?? 0;
        L.push(`  <ClassificationFunctions count="${groupCount}">`);
        for (let g = 0; g < groupCount; g++) {
            const label = groupLabels[g] ?? String(g + 1);
            L.push(`    <ClassificationFunction group="${escapeXml(label)}">`);
            for (const c of fisher.coefficients ?? []) {
                L.push(
                    `      <Coefficient variable="${escapeXml(c.variable)}">${num(c.values[g])}</Coefficient>`,
                );
            }
            L.push(`      <Constant>${num(fisher.constant_terms?.[g])}</Constant>`);
            L.push(`    </ClassificationFunction>`);
        }
        L.push(`  </ClassificationFunctions>`);
    }

    L.push(`</DiscriminantModel>`);
    return L.join("\n");
}

/** Normalize whatever the user typed into a usable `.xml` file name. */
export function normalizeXmlFileName(raw: string | null | undefined): string {
    const trimmed = (raw ?? "").trim();
    const base = trimmed.length > 0 ? trimmed : "discriminant_model";
    // Strip anything a file system would reject, plus any path the user pasted.
    const safe = base.replace(/[\\/:*?"<>|]/g, "_");
    return safe.toLowerCase().endsWith(".xml") ? safe : `${safe}.xml`;
}

/** Build the document and hand it to the browser as a download. */
export function exportDiscriminantModelXml(
    model: DiscriminantExportModel,
    config: DiscriminantType,
): string {
    const xml = buildDiscriminantModelXml(model, config);
    const fileName = normalizeXmlFileName(config.save.XmlFile);

    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Give the download a tick to start before the blob goes away.
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return fileName;
}
