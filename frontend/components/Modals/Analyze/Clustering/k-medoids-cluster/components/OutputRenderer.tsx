/**
 * K-Medoids Comprehensive Output Renderer
 * Main component that displays all analysis results
 * Integrates with existing ResultOutput infrastructure
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { KMedoidsOutput } from "../types/output";
import { DistanceMatrixTable } from "./DistanceMatrix";
import { ClusterScatterPlot } from "./ClusterScatterPlot";
import { PCAClusterPlot } from "./PCAClusterPlot";
import { ClusterSizeDistribution } from "./ClusterSizeDistribution";
import { SilhouettePerObjectChart } from "./SilhouettePerObjectChart";
import { ElbowChart } from "./ElbowChart";
import { SilhouetteKChart } from "./SilhouetteKChart";
import { ConvergenceChart } from "./ConvergenceChart";
import DataTableRenderer from "@/components/Output/Table/DataTableRenderer";

interface KMedoidsOutputRendererProps {
    output: KMedoidsOutput;
    variables: { name: string; label?: string }[];
}

// Max data points to render in SVG charts (display only – analysis uses all data)
const MAX_DISPLAY_POINTS = 500;
const ASSIGNMENTS_PAGE_SIZE = 25;

/** Stratified sample: pick up to `max` points while preserving cluster ratios. */
function samplePoints<T extends { cluster: number }>(pts: T[], max: number): T[] {
    if (pts.length <= max) return pts;
    const byCluster = new Map<number, T[]>();
    for (const p of pts) {
        if (!byCluster.has(p.cluster)) byCluster.set(p.cluster, []);
        const bucket = byCluster.get(p.cluster);
        if (bucket) bucket.push(p);
    }
    const result: T[] = [];
    byCluster.forEach((clusterPts) => {
        const quota = Math.max(1, Math.round((clusterPts.length / pts.length) * max));
        const step = clusterPts.length / quota;
        for (let i = 0; i < quota; i++) {
            result.push(clusterPts[Math.floor(i * step)]);
        }
    });
    return result;
}

type ExportFormat = "svg" | "png";

function cloneNodeWithInlineStyles(source: HTMLElement): HTMLElement {
    const clone = source.cloneNode(true) as HTMLElement;

    const applyStyles = (src: Element, dst: Element) => {
        if (!(dst instanceof HTMLElement)) return;
        const computed = window.getComputedStyle(src);
        const dstStyle = dst.style as CSSStyleDeclaration;
        for (const prop of Array.from(computed)) {
            try {
                dstStyle.setProperty(prop, computed.getPropertyValue(prop));
            } catch {
                // Ignore non-writable computed properties
            }
        }

        const srcChildren = Array.from(src.children);
        const dstChildren = Array.from(dst.children);
        for (let i = 0; i < srcChildren.length; i++) {
            if (dstChildren[i]) applyStyles(srcChildren[i], dstChildren[i]);
        }
    };

    applyStyles(source, clone);
    return clone;
}

function sanitizeFilename(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Charts style themselves with `hsl(var(--border))`-style CSS custom
 * properties resolved against the app's :root. A downloaded/exported SVG
 * is opened outside that context (a standalone file, or an <img> loaded
 * from a blob URL for PNG conversion), so those vars are undefined and the
 * strokes/text silently disappear. Bake the current computed values in
 * before serializing so the export looks the same as on screen.
 */
function inlineCssVars(svgText: string): string {
    const rootStyle = getComputedStyle(document.documentElement);
    const varNames = new Set<string>();
    const varPattern = /var\((--[\w-]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = varPattern.exec(svgText)) !== null) {
        varNames.add(match[1]);
    }

    let resolved = svgText;
    varNames.forEach((name) => {
        const value = rootStyle.getPropertyValue(name).trim();
        if (!value) return;
        resolved = resolved.split(`var(${name})`).join(value);
    });
    return resolved;
}

export const KMedoidsOutputRenderer: React.FC<KMedoidsOutputRendererProps> = ({ output, variables }) => {
    const pcaChartRef = useRef<HTMLDivElement>(null);
    const scatterChartRef = useRef<HTMLDivElement>(null);
    const sizeDistChartRef = useRef<HTMLDivElement>(null);
    const silhouetteObjRef = useRef<HTMLDivElement>(null);
    const optimalKChartRef = useRef<HTMLDivElement>(null);
    const silhouetteKChartRef = useRef<HTMLDivElement>(null);
    const convergenceChartRef = useRef<HTMLDivElement>(null);

    // Use variables from output if not provided as prop
    const effectiveVariables = useMemo(
        () =>
            variables && variables.length > 0
                ? variables
                : output?.variables ?? [],
        [variables, output?.variables]
    );

    const [selectedXVar, setSelectedXVar] = useState(effectiveVariables[0]?.name || "");
    const [selectedYVar, setSelectedYVar] = useState(effectiveVariables[1]?.name || effectiveVariables[0]?.name || "");
    const [currentAssignmentsPage, setCurrentAssignmentsPage] = useState(1);
    const silhouetteChartHeight = Math.max(360, (output?.silhouetteScores?.perCluster?.length ?? 1) * 60 + 160);
    const showOptimalKChart = output?.visualizationOptions?.showOptimalKChart;
    const hasOptimalKChartData = Boolean(output?.elbowData && output.elbowData.length > 0);
    const shouldShowOptimalKCard =
        showOptimalKChart ??
        (hasOptimalKChartData || Boolean(output?.optimalKMethod));
    const showOverallQualityAssessment =
        output?.visualizationOptions?.showOverallQualityAssessment ?? true;

    // Determine which charts to show based on cluster mode
    const clusterMode = output?.clusterMode ?? "automatic";
    const autoKMethod = output?.autoKMethod ?? "silhouette";

    // Logic for determining which optimal K chart to display:
    // - Automatic Silhouette: show SilhouetteKChart only
    // - Automatic Elbow: show ElbowChart only
    // - Manual: show ElbowChart only (with silhouette annotation)
    const showOnlySilhouetteKChart = clusterMode === "automatic" && autoKMethod === "silhouette";
    const showOnlyElbowChart = clusterMode === "automatic" && autoKMethod === "elbow";
    const showElbowChartWithSilhouetteAnnotation = clusterMode === "manual";

    // Prepare silhouette K chart data
    const silhouetteKChartData = useMemo(() => {
        if (!output?.elbowData) return [];
        return output.elbowData.map(point => ({
            k: point.k,
            silhouetteScore: point.silhouetteScore,
        }));
    }, [output?.elbowData]);

    // Calculate k optimal from silhouette method
    const silhouetteOptimalK = useMemo(() => {
        if (!output?.elbowData || output.elbowData.length === 0) return undefined;
        const best = output.elbowData.reduce((a, b) =>
            b.silhouetteScore > a.silhouetteScore ? b : a
        );
        return best.k;
    }, [output?.elbowData]);

    const totalAssignmentsRows = output?.assignments?.length ?? 0;
    const totalAssignmentsPages = Math.max(
        1,
        Math.ceil(totalAssignmentsRows / ASSIGNMENTS_PAGE_SIZE)
    );

    useEffect(() => {
        setCurrentAssignmentsPage(1);
    }, [totalAssignmentsRows]);

    // Memoize PCA points to avoid recreating on every render
    const pcaPoints = useMemo(() => {
        if (!output?.assignments) return [];
        return samplePoints(
            output.assignments
                .filter(a => !a.isMedoid)
                .map(a => ({
                    features: effectiveVariables.map(v => {
                        const n = Number(a.attributes?.[v.name]);
                        return isFinite(n) ? n : 0;
                    }),
                    cluster: a.clusterLabel,
                    label: `Case ${a.objectId}`,
                })),
            MAX_DISPLAY_POINTS
        );
    }, [output?.assignments, effectiveVariables]);

    const pcaMedoids = useMemo(() => {
        if (!output?.assignments) return [];
        return output.assignments
            .filter(a => a.isMedoid)
            .map(a => ({
                features: effectiveVariables.map(v => {
                    const n = Number(a.attributes?.[v.name]);
                    return isFinite(n) ? n : 0;
                }),
                cluster: a.clusterLabel,
            }));
    }, [output?.assignments, effectiveVariables]);

    const scatterPoints = useMemo(() => {
        if (!output?.assignments) return [];
        return samplePoints(
            output.assignments
                .filter(a => isFinite(Number(a.attributes?.[selectedXVar])) && isFinite(Number(a.attributes?.[selectedYVar])))
                .map(a => ({
                    x: Number(a.attributes?.[selectedXVar]),
                    y: Number(a.attributes?.[selectedYVar]),
                    cluster: a.clusterLabel,
                    label: `Case ${a.objectId}`,
                })),
            MAX_DISPLAY_POINTS
        );
    }, [output?.assignments, selectedXVar, selectedYVar]);

    const scatterMedoids = useMemo(() => {
        if (!output?.assignments) return [];
        return output.assignments
            .filter(a => a.isMedoid && isFinite(Number(a.attributes?.[selectedXVar])) && isFinite(Number(a.attributes?.[selectedYVar])))
            .map(a => ({
                x: Number(a.attributes?.[selectedXVar]),
                y: Number(a.attributes?.[selectedYVar]),
                cluster: a.clusterLabel,
            }));
    }, [output?.assignments, selectedXVar, selectedYVar]);

    const pagedAssignments = useMemo(() => {
        if (!output?.assignments) return [];
        const start = (currentAssignmentsPage - 1) * ASSIGNMENTS_PAGE_SIZE;
        return output.assignments.slice(start, start + ASSIGNMENTS_PAGE_SIZE);
    }, [output?.assignments, currentAssignmentsPage]);

    const hasStandardizedAssignmentData = useMemo(
        () =>
            Boolean(
                output?.assignments?.some(
                    (a) => a.standardizedAttributes && Object.keys(a.standardizedAttributes).length > 0
                )
            ),
        [output?.assignments]
    );

    const assignmentsNormalizationLabel = output?.normalizationMethod === "zscore"
        ? "Z-score"
        : output?.normalizationMethod === "minmax"
        ? "Min-Max"
        : "Standardized";

    // Builds the paginated assignments table JSON, parameterized by title so it can be
    // reused both for the "Cluster Assignments" tab and the standalone "Cluster Membership" view.
    const buildAssignmentsTableJson = useCallback((titleBase: string) => {
        if (!output?.assignments) return "{}";
        return JSON.stringify({
            tables: [
                {
                    key: "assignments",
                    title: hasStandardizedAssignmentData
                        ? `${titleBase} (${assignmentsNormalizationLabel})`
                        : titleBase,
                    columnHeaders: [
                        { header: "ID" },
                        { header: "Cluster" },
                        { header: "Distance" },
                        { header: "Silhouette" },
                        ...effectiveVariables.map(v => ({ header: v.label ?? v.name, key: v.name })),
                        ...(hasStandardizedAssignmentData
                            ? effectiveVariables.map(v => ({
                                header: `${v.label ?? v.name} (${assignmentsNormalizationLabel})`,
                                key: `${v.name}_zscore`,
                            }))
                            : [])
                    ],
                    rows: pagedAssignments.map(a => ({
                        rowHeader: [],
                        ID: a.isMedoid ? `★ ${a.objectId}` : a.objectId,
                        Cluster: a.clusterLabel,
                        Distance: typeof a.distanceToMedoid === 'number' ? a.distanceToMedoid.toFixed(4) : 'N/A',
                        Silhouette: typeof a.silhouetteScore === 'number' ? a.silhouetteScore.toFixed(3) : 'N/A',
                        ...Object.fromEntries(
                            effectiveVariables.map(v => {
                                const value = a.attributes[v.name];
                                return [v.name, typeof value === 'number' && isFinite(value) ? value.toFixed(4) : (value ?? 'N/A')];
                            })
                        ),
                        ...Object.fromEntries(
                            hasStandardizedAssignmentData
                                ? effectiveVariables.map(v => {
                                    const standardizedValue = a.standardizedAttributes?.[v.name];
                                    return [
                                        `${v.name}_zscore`,
                                        typeof standardizedValue === 'number' && isFinite(standardizedValue)
                                            ? standardizedValue.toFixed(4)
                                            : 'N/A',
                                    ];
                                })
                                : []
                        ),
                    }))
                }
            ]
        });
    }, [output?.assignments, pagedAssignments, effectiveVariables, hasStandardizedAssignmentData, assignmentsNormalizationLabel]);

    const membershipTableJson = useMemo(
        () => buildAssignmentsTableJson("Cluster Membership"),
        [buildAssignmentsTableJson]
    );

    const buildSvgFromContainer = useCallback((container: HTMLDivElement): { svgText: string; width: number; height: number } | null => {
        const svgElement = container.querySelector("svg");

        if (svgElement) {
            const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
            if (!clonedSvg.getAttribute("xmlns")) {
                clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            }

            const rect = svgElement.getBoundingClientRect();
            const viewBox = clonedSvg.viewBox?.baseVal;
            const width = Math.ceil(
                (viewBox && viewBox.width > 0 ? viewBox.width : rect.width) || Number(clonedSvg.getAttribute("width")) || 800
            );
            const height = Math.ceil(
                (viewBox && viewBox.height > 0 ? viewBox.height : rect.height) || Number(clonedSvg.getAttribute("height")) || 500
            );

            clonedSvg.setAttribute("width", String(width));
            clonedSvg.setAttribute("height", String(height));
            if (!clonedSvg.getAttribute("viewBox")) {
                clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
            }

            return {
                svgText: inlineCssVars(new XMLSerializer().serializeToString(clonedSvg)),
                width,
                height,
            };
        }

        const rect = container.getBoundingClientRect();
        const width = Math.max(320, Math.ceil(rect.width));
        const height = Math.max(200, Math.ceil(rect.height));
        const clonedContainer = cloneNodeWithInlineStyles(container);
        const wrapper = document.createElement("div");
        wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
        wrapper.style.width = `${width}px`;
        wrapper.style.height = `${height}px`;
        wrapper.style.background = "#ffffff";
        wrapper.style.boxSizing = "border-box";
        wrapper.appendChild(clonedContainer);

        const svgText =
            `<?xml version="1.0" encoding="UTF-8"?>` +
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
            `<foreignObject width="100%" height="100%">${wrapper.outerHTML}</foreignObject>` +
            `</svg>`;

        return { svgText: inlineCssVars(svgText), width, height };
    }, []);

    const handleDownloadVisualization = useCallback(async (
        containerRef: React.RefObject<HTMLDivElement | null>,
        baseFileName: string,
        format: ExportFormat
    ) => {
        const container = containerRef.current;
        if (!container) return;

        const built = buildSvgFromContainer(container);
        if (!built) return;

        const safeName = sanitizeFilename(baseFileName);

        if (format === "svg") {
            const blob = new Blob([built.svgText], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${safeName}.svg`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            return;
        }

        const svgBlob = new Blob([built.svgText], { type: "image/svg+xml;charset=utf-8" });
        const svgUrl = URL.createObjectURL(svgBlob);

        try {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("Failed to load SVG for PNG export"));
                img.src = svgUrl;
            });

            const canvas = document.createElement("canvas");
            canvas.width = built.width;
            canvas.height = built.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const pngBlob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((blob) => resolve(blob), "image/png");
            });
            if (!pngBlob) return;

            const pngUrl = URL.createObjectURL(pngBlob);
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = `${safeName}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(pngUrl);
        } finally {
            URL.revokeObjectURL(svgUrl);
        }
    }, [buildSvgFromContainer]);

    const handleDownloadAllAssignmentsExcel = useCallback(() => {
        if (!output?.assignments || output.assignments.length === 0) return;

        const headers: string[] = [
            "ID",
            "Cluster",
            "Distance",
            "Silhouette",
            ...effectiveVariables.map((v) => v.label ?? v.name),
            ...(hasStandardizedAssignmentData
                ? effectiveVariables.map((v) => `${v.label ?? v.name} (${assignmentsNormalizationLabel})`)
                : []),
        ];

        const bodyRows = output.assignments.map((a) => [
            a.isMedoid ? `★ ${a.objectId}` : a.objectId,
            a.clusterLabel,
            typeof a.distanceToMedoid === "number" ? Number(a.distanceToMedoid.toFixed(4)) : "N/A",
            typeof a.silhouetteScore === "number" ? Number(a.silhouetteScore.toFixed(4)) : "N/A",
            ...effectiveVariables.map((v) => {
                const value = a.attributes?.[v.name];
                return typeof value === "number" && isFinite(value) ? Number(value.toFixed(4)) : (value ?? "N/A");
            }),
            ...(hasStandardizedAssignmentData
                ? effectiveVariables.map((v) => {
                    const z = a.standardizedAttributes?.[v.name];
                    return typeof z === "number" && isFinite(z) ? Number(z.toFixed(4)) : "N/A";
                })
                : []),
        ]);

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...bodyRows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Object Assignments");

        const filename = `${sanitizeFilename(`object-assignments-all-${output.assignments.length}-rows`)}.xlsx`;
        XLSX.writeFile(workbook, filename);
    }, [output?.assignments, effectiveVariables, hasStandardizedAssignmentData, assignmentsNormalizationLabel]);

    const handleDownloadDistanceMatrixCsv = useCallback(() => {
        if (!output?.distanceMatrix) return;

        const { labels, clusters, distances } = output.distanceMatrix;
        const header = ["Label", "Cluster", ...labels.map((label, idx) => `C${clusters[idx]} ${label}`)];

        const rows = distances.map((row, rowIdx) => [
            labels[rowIdx],
            `C${clusters[rowIdx]}`,
            ...row.map((value) =>
                value !== null && isFinite(value) ? value.toFixed(4) : ""
            ),
        ]);

        const escapeCsv = (value: string) => {
            if (value.includes("\"") || value.includes(",") || value.includes("\n")) {
                return `"${value.replace(/\"/g, '""')}"`;
            }
            return value;
        };

        const csvContent = [header, ...rows]
            .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${sanitizeFilename("distance-matrix")}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }, [output?.distanceMatrix]);

    const handleDownloadDistanceMatrixExcel = useCallback(() => {
        if (!output?.distanceMatrix) return;

        const { labels, clusters, distances } = output.distanceMatrix;
        const header = ["Label", "Cluster", ...labels.map((label, idx) => `C${clusters[idx]} ${label}`)];

        const rows = distances.map((row, rowIdx) => [
            labels[rowIdx],
            `C${clusters[rowIdx]}`,
            ...row.map((value) =>
                value !== null && isFinite(value) ? Number(value.toFixed(4)) : ""
            ),
        ]);

        const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Distance Matrix");

        const filename = `${sanitizeFilename("distance-matrix")}.xlsx`;
        XLSX.writeFile(workbook, filename);
    }, [output?.distanceMatrix]);


    const renderDownloadActions = useCallback((
        targetRef: React.RefObject<HTMLDivElement | null>,
        fileName: string
    ) => (
        <div className="mb-3 flex items-center justify-end gap-2">
            <button
                className="p-2 bg-white rounded-md shadow-sm hover:bg-gray-100"
                onClick={() => void handleDownloadVisualization(targetRef, fileName, "svg")}
                title="Download as SVG"
                type="button"
            >
                <Download className="w-4 h-4 inline-block mr-1" />
                <span className="text-xs">SVG</span>
            </button>
            <button
                className="p-2 bg-white rounded-md shadow-sm hover:bg-gray-100"
                onClick={() => void handleDownloadVisualization(targetRef, fileName, "png")}
                title="Download as PNG"
                type="button"
            >
                <Download className="w-4 h-4 inline-block mr-1" />
                <span className="text-xs">PNG</span>
            </button>
        </div>
    ), [handleDownloadVisualization]);

    // Validate input
    if (!output) {
        return (
            <div className="text-sm text-destructive p-4 bg-destructive/10 rounded-md">
                Error: No output data available
            </div>
        );
    }

    // Check if we have variables to display
    if (effectiveVariables.length === 0) {
        return (
            <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
                No variable information available for visualization. Analysis data may be loading...
            </div>
        );
    }

    // Standalone "Cluster Membership" statistic: just the paginated membership table,
    // without the full dashboard (summary cards, tabs, visualizations).
    if (output.viewMode === "clusterMembershipOnly") {
        return (
            <div>
                <div className="mb-3 flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadAllAssignmentsExcel}
                        disabled={totalAssignmentsRows === 0}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download Excel (All Rows)
                    </Button>
                </div>
                <div className="mb-3 flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-center">
                        Rows {totalAssignmentsRows === 0 ? 0 : (currentAssignmentsPage - 1) * ASSIGNMENTS_PAGE_SIZE + 1}
                        -{Math.min(currentAssignmentsPage * ASSIGNMENTS_PAGE_SIZE, totalAssignmentsRows)} of {totalAssignmentsRows}
                    </span>
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentAssignmentsPage((p) => Math.max(1, p - 1))}
                            disabled={currentAssignmentsPage <= 1}
                        >
                            Prev
                        </Button>
                        <span>Page {currentAssignmentsPage} / {totalAssignmentsPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentAssignmentsPage((p) => Math.min(totalAssignmentsPages, p + 1))
                            }
                            disabled={currentAssignmentsPage >= totalAssignmentsPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <DataTableRenderer data={membershipTableJson} />
                </div>
            </div>
        );
    }

    // Standalone "Silhouette Score" statistic: just the silhouette plot (one bar per object).
    if (output.viewMode === "silhouettePerObjectOnly") {
        return (
            <div>
                {renderDownloadActions(silhouetteObjRef, "silhouette-score")}
                <div ref={silhouetteObjRef}>
                    <SilhouettePerObjectChart
                        assignments={output.assignments}
                        overall={output.silhouetteScores?.overall ?? 0}
                        width={700}
                        height={silhouetteChartHeight}
                    />
                </div>
            </div>
        );
    }

    // Standalone "Optimal K Chart" statistic: just the optimal-K chart (silhouette or elbow).
    if (output.viewMode === "optimalKChartOnly") {
        if (!hasOptimalKChartData) {
            return (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Optimal K chart data is not available in this output. Re-run the K-Medoids analysis in automatic mode to generate the silhouette/elbow curve data.
                </div>
            );
        }
        return (
            <div>
                {showOnlySilhouetteKChart && (
                    <>
                        {renderDownloadActions(silhouetteKChartRef, "optimal-k-chart-silhouette")}
                        <div ref={silhouetteKChartRef}>
                            <SilhouetteKChart
                                data={silhouetteKChartData}
                                currentK={output.summary.numClusters}
                                width={560}
                                height={400}
                            />
                        </div>
                    </>
                )}

                {showOnlyElbowChart && (
                    <>
                        {renderDownloadActions(optimalKChartRef, "optimal-k-chart-elbow")}
                        <div ref={optimalKChartRef}>
                            <ElbowChart
                                data={output.elbowData ?? []}
                                currentK={output.summary.numClusters}
                                method="elbow"
                                width={560}
                                height={400}
                            />
                        </div>
                    </>
                )}

                {showElbowChartWithSilhouetteAnnotation && (
                    <>
                        {renderDownloadActions(optimalKChartRef, "optimal-k-chart-elbow")}
                        <div ref={optimalKChartRef}>
                            <ElbowChart
                                data={output.elbowData ?? []}
                                currentK={output.summary.numClusters}
                                method="elbow"
                                silhouetteOptimalK={silhouetteOptimalK}
                                width={560}
                                height={400}
                            />
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Standalone "Overall Quality Assessment" statistic: just the overall silhouette score
    // and its interpretation guide.
    if (output.viewMode === "overallQualityOnly") {
        return (
            <div className="space-y-4">
                <div>
                    <div className="text-sm text-muted-foreground">Overall Silhouette Score</div>
                    <div className="text-3xl font-bold">{output.silhouetteScores?.overall !== null ? output.silhouetteScores.overall.toFixed(3) : 'N/A'}</div>
                </div>

                <div className="space-y-2">
                    <div className="text-sm font-medium">Interpretation Guide:</div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-600"></div>
                            <span>0.7 - 1.0: Very strong cluster structure</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                            <span>0.5 - 0.7: Strong cluster structure</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                            <span>0.3 - 0.5: Moderate cluster structure</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-600"></div>
                            <span>&lt; 0.3: Weak cluster structure</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Standalone "PCA Projection" statistic: just the PCA projection scatter plot.
    if (output.viewMode === "pcaProjectionOnly") {
        return (
            <div>
                {renderDownloadActions(pcaChartRef, "pca-projection")}
                <div ref={pcaChartRef}>
                    <PCAClusterPlot
                        points={pcaPoints}
                        medoids={pcaMedoids}
                        variableNames={effectiveVariables.map(v => v.label ?? v.name)}
                        title="PCA Projection of K-Medoids Clusters"
                        height={420}
                    />
                </div>
            </div>
        );
    }

    // Standalone "Cluster Scatter Plot" statistic: just the 2D cluster scatter plot
    // with its X/Y variable selectors.
    if (output.viewMode === "clusterScatterPlotOnly") {
        return (
            <div>
                {renderDownloadActions(scatterChartRef, "cluster-scatter-plot")}
                <div className="flex gap-2 mb-4">
                    <select
                        value={selectedXVar}
                        onChange={(e) => setSelectedXVar(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
                    >
                        {effectiveVariables.map(v => (
                            <option key={v.name} value={v.name} className="bg-background text-foreground">{v.label || v.name}</option>
                        ))}
                    </select>
                    <span className="flex items-center text-muted-foreground">vs</span>
                    <select
                        value={selectedYVar}
                        onChange={(e) => setSelectedYVar(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
                    >
                        {effectiveVariables.map(v => (
                            <option key={v.name} value={v.name} className="bg-background text-foreground">{v.label || v.name}</option>
                        ))}
                    </select>
                </div>
                <div ref={scatterChartRef}>
                    <ClusterScatterPlot
                        points={scatterPoints}
                        medoids={scatterMedoids}
                        xLabel={effectiveVariables.find(v => v.name === selectedXVar)?.label || selectedXVar}
                        yLabel={effectiveVariables.find(v => v.name === selectedYVar)?.label || selectedYVar}
                        title="K-Medoids Cluster Visualization"
                        subtitle={`${output.summary.numClusters} cluster(s) — ${output.assignments.length} observations`}
                        height={420}
                    />
                </div>
            </div>
        );
    }

    // Standalone "Cluster Size Distribution" statistic: just the donut chart.
    if (output.viewMode === "clusterSizeDistributionOnly") {
        return (
            <div>
                {renderDownloadActions(sizeDistChartRef, "cluster-size-distribution")}
                <div ref={sizeDistChartRef}>
                    <ClusterSizeDistribution
                        profiles={output.clusterProfiles}
                        width={480}
                        height={400}
                    />
                </div>
            </div>
        );
    }

    // Standalone "Algorithm Convergence Chart" statistic: dual-axis total-cost/improvement
    // line chart. Independent of the "Algorithm Convergence" table (see the Results tab).
    if (output.viewMode === "convergenceChartOnly") {
        return (
            <div>
                {renderDownloadActions(convergenceChartRef, "algorithm-convergence-chart")}
                <div ref={convergenceChartRef}>
                    <ConvergenceChart
                        data={output.iterationHistory ?? []}
                        converged={output.summary?.converged}
                        width={640}
                        height={420}
                    />
                </div>
            </div>
        );
    }

    // Standalone "Distance Matrix Table (All Objects)" statistic: just the full pairwise
    // distance matrix table, sorted by cluster, with its Excel/CSV download buttons.
    if (output.viewMode === "distanceMatrixTableOnly") {
        if (!output.distanceMatrix) {
            return (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Distance matrix data is not available in this output.
                </div>
            );
        }
        return (
            <div>
                <p className="mb-3 text-center text-xs text-muted-foreground">
                    Sorted by cluster to highlight block patterns along the diagonal.
                </p>
                <div className="mb-3 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadDistanceMatrixExcel}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download Excel
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadDistanceMatrixCsv}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                    </Button>
                </div>
                <DistanceMatrixTable matrix={output.distanceMatrix} pageSize={50} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overall Quality Assessment — always last */}
            {showOverallQualityAssessment && <Card>
                <CardHeader>
                    <CardTitle>Overall Quality Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <div className="text-sm text-muted-foreground">Overall Silhouette Score</div>
                            <div className="text-3xl font-bold">{output.silhouetteScores?.overall !== null ? output.silhouetteScores.overall.toFixed(3) : 'N/A'}</div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm font-medium">Interpretation Guide:</div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                                    <span>0.7 - 1.0: Very strong cluster structure</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                    <span>0.5 - 0.7: Strong cluster structure</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                                    <span>0.3 - 0.5: Moderate cluster structure</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-600"></div>
                                    <span>&lt; 0.3: Weak cluster structure</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>}
        </div>
    );
}