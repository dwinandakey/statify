/**
 * Distance Matrix Heatmap Component
 * Visualizes distances between cluster medoids
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTableRenderer from "@/components/Output/Table/DataTableRenderer";
import type { DistanceMatrix, MedoidDistanceMatrix } from "../types/output";

interface DistanceMatrixProps {
    matrix: MedoidDistanceMatrix;
}

export const DistanceMatrixHeatmap: React.FC<DistanceMatrixProps> = ({ matrix }) => {
    const tableJson = useMemo(() => {
        return JSON.stringify({
            tables: [
                {
                    key: "distance_matrix_medoids",
                    title: "Distance Matrix Between Medoids",
                    columnHeaders: [
                        { header: "" },
                        ...matrix.clusterLabels.map(label => ({ header: `C${label}`, key: `c${label}` })),
                    ],
                    rows: matrix.clusterLabels.map((rowLabel, i) => ({
                        rowHeader: [`C${rowLabel}`],
                        ...Object.fromEntries(
                            matrix.clusterLabels.map((colLabel, j) => {
                                const distance = matrix.distances[i]?.[j];
                                const safeDistance = distance !== null && isFinite(distance) ? distance : 0;
                                return [`c${colLabel}`, safeDistance.toFixed(2)];
                            })
                        ),
                    })),
                    footer: "Lower values indicate more similar clusters. Higher values indicate better separation.",
                },
            ],
        });
    }, [matrix]);

    return (
        <Card>
            <CardContent className="pt-6">
                <DataTableRenderer data={tableJson} />
            </CardContent>
        </Card>
    );
};

interface FullDistanceMatrixProps {
    matrix: DistanceMatrix;
    actions?: React.ReactNode;
}

const MAX_HEATMAP_SIZE = 500;

export const FullDistanceMatrixHeatmap: React.FC<FullDistanceMatrixProps> = ({ matrix, actions }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const { stride, sampledSize, minDist, maxDist } = useMemo(() => {
        const n = matrix.distances.length;
        const strideValue = n > MAX_HEATMAP_SIZE ? Math.ceil(n / MAX_HEATMAP_SIZE) : 1;
        const size = Math.ceil(n / strideValue);

        let minValue = Infinity;
        let maxValue = -Infinity;
        for (let i = 0; i < n; i += strideValue) {
            const row = matrix.distances[i] || [];
            for (let j = 0; j < n; j += strideValue) {
                const value = row[j];
                if (value === null || !isFinite(value)) continue;
                if (value < minValue) minValue = value;
                if (value > maxValue) maxValue = value;
            }
        }

        if (!isFinite(minValue)) minValue = 0;
        if (!isFinite(maxValue)) maxValue = 1;
        if (minValue === maxValue) maxValue = minValue + 1;

        return {
            stride: strideValue,
            sampledSize: size,
            minDist: minValue,
            maxDist: maxValue,
        };
    }, [matrix.distances]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = sampledSize;
        canvas.height = sampledSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const imageData = ctx.createImageData(sampledSize, sampledSize);
        const range = maxDist - minDist;

        const start = { r: 44, g: 123, b: 229 }; // blue
        const end = { r: 251, g: 140, b: 0 }; // amber

        for (let i = 0; i < sampledSize; i++) {
            const sourceRow = matrix.distances[i * stride] || [];
            for (let j = 0; j < sampledSize; j++) {
                const value = sourceRow[j * stride];
                const safeValue = value !== null && isFinite(value) ? value : minDist;
                const normalized = Math.min(1, Math.max(0, (safeValue - minDist) / range));
                const r = Math.round(start.r + (end.r - start.r) * normalized);
                const g = Math.round(start.g + (end.g - start.g) * normalized);
                const b = Math.round(start.b + (end.b - start.b) * normalized);
                const idx = (i * sampledSize + j) * 4;
                imageData.data[idx] = r;
                imageData.data[idx + 1] = g;
                imageData.data[idx + 2] = b;
                imageData.data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        if (stride > 1) {
            ctx.imageSmoothingEnabled = false;
        }
    }, [matrix.distances, minDist, maxDist, sampledSize, stride]);

    const totalCases = matrix.labels.length;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Distance Matrix (All Cases)</CardTitle>
                <CardDescription>
                    Darker cells indicate closer distances; lighter cells indicate farther distances.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {actions && <div className="mb-3 flex items-center justify-end gap-2">{actions}</div>}
                <div className="flex flex-col gap-2">
                    <div className="overflow-auto">
                        <canvas
                            ref={canvasRef}
                            className="block rounded border border-border"
                            style={{
                                width: "100%",
                                maxWidth: "600px",
                                height: "auto",
                            }}
                        />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{`Cases: ${totalCases}`}</span>
                        {stride > 1 && (
                            <span>{`Downsampled every ${stride} row/col for display`}</span>
                        )}
                    </div>
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-8 rounded bg-[#2c7be5]"></div>
                            <span>Near</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-8 rounded bg-[#fb8c00]"></div>
                            <span>Far</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

interface DistanceMatrixTableProps {
    matrix: DistanceMatrix;
    pageSize?: number;
}

export const DistanceMatrixTable: React.FC<DistanceMatrixTableProps> = ({
    matrix,
    pageSize = 50,
}) => {
    const [page, setPage] = useState(1);

    const totalRows = matrix.labels.length;
    const totalCols = matrix.labels.length;
    const totalRowPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const totalColPages = Math.max(1, Math.ceil(totalCols / pageSize));
    const totalPages = Math.max(totalRowPages, totalColPages);

    useEffect(() => {
        setPage(1);
    }, [totalRows, totalCols, pageSize]);

    const rowStart = (page - 1) * pageSize;
    const rowEnd = Math.min(rowStart + pageSize, totalRows);
    const colStart = (page - 1) * pageSize;
    const colEnd = Math.min(colStart + pageSize, totalCols);

    const rowLabel = (idx: number) => `C${matrix.clusters[idx]} · ${matrix.labels[idx]}`;

    const tableJson = useMemo(() => {
        const colIndices = Array.from({ length: colEnd - colStart }, (_, offset) => colStart + offset);
        return JSON.stringify({
            tables: [
                {
                    key: "distance_matrix_all_cases",
                    title: "Distance Matrix",
                    columnHeaders: [
                        { header: "" },
                        ...colIndices.map((idx) => ({ header: rowLabel(idx), key: `col_${idx}` })),
                    ],
                    rows: Array.from({ length: rowEnd - rowStart }, (_, rowOffset) => {
                        const rowIdx = rowStart + rowOffset;
                        const row = matrix.distances[rowIdx] || [];
                        return {
                            rowHeader: [rowLabel(rowIdx)],
                            ...Object.fromEntries(
                                colIndices.map((colIdx) => {
                                    const value = row[colIdx];
                                    return [`col_${colIdx}`, value !== null && isFinite(value) ? value.toFixed(4) : "N/A"];
                                })
                            ),
                        };
                    }),
                },
            ],
        });
    }, [matrix, rowStart, rowEnd, colStart, colEnd]);

    return (
        <div className="space-y-3">
            <div className="mb-3 flex flex-col items-center gap-2 text-xs text-muted-foreground">
                <span className="text-center">
                    Rows {totalRows === 0 ? 0 : rowStart + 1}-{rowEnd} of {totalRows}
                    {" "}• Columns {totalCols === 0 ? 0 : colStart + 1}-{colEnd} of {totalCols}
                </span>
                <div className="flex items-center justify-center gap-2">
                    <button
                        className="rounded border border-border px-2 py-1"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        type="button"
                        disabled={page <= 1}
                    >
                        Prev
                    </button>
                    <span>Page {page} / {totalPages}</span>
                    <button
                        className="rounded border border-border px-2 py-1"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        type="button"
                        disabled={page >= totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
            <div className="overflow-auto">
                <DataTableRenderer data={tableJson} />
            </div>
        </div>
    );
};
