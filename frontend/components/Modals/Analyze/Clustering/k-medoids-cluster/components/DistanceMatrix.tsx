/**
 * Komponen Heatmap Matriks Jarak
 * Memvisualisasikan jarak antar medoid klaster
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DistanceMatrix, MedoidDistanceMatrix } from "../types/output";

interface DistanceMatrixProps {
    matrix: MedoidDistanceMatrix;
    actions?: React.ReactNode;
}

export const DistanceMatrixHeatmap: React.FC<DistanceMatrixProps> = ({ matrix, actions }) => {
    // Cari nilai min dan maks untuk skala warna
    const flatDistances = matrix.distances
        .flat()
        .filter(d => d !== null && isFinite(d) && d > 0);
    
    const minDist = flatDistances.length > 0 ? flatDistances.reduce((a, b) => a < b ? a : b) : 0;
    const maxDist = flatDistances.length > 0 ? flatDistances.reduce((a, b) => a > b ? a : b) : 0;

    // Fungsi skala warna
    const getColor = (value: number): string => {
        if (value === 0) return "bg-gray-200 dark:bg-gray-800";
        
        const normalized = (value - minDist) / (maxDist - minDist);
        
        if (normalized < 0.33) return "bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-100";
        if (normalized < 0.67) return "bg-yellow-200 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100";
        return "bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100";
    };

    const getInterpretation = (value: number): string => {
        if (value === 0) return "Same cluster";
        
        const normalized = (value - minDist) / (maxDist - minDist);
        
        if (normalized < 0.33) return "Very similar";
        if (normalized < 0.67) return "Moderately separated";
        return "Well separated";
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Distance Matrix Between Medoids</CardTitle>
                <CardDescription>
                    Lower values indicate more similar clusters. Higher values indicate better separation.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {actions && <div className="mb-3 flex items-center justify-end gap-2">{actions}</div>}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="border border-border p-2 bg-muted"></th>
                                {matrix.clusterLabels.map(label => (
                                    <th key={label} className="border border-border p-2 bg-muted font-semibold">
                                        C{label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {matrix.clusterLabels.map((rowLabel, i) => (
                                <tr key={rowLabel}>
                                    <td className="border border-border p-2 bg-muted font-semibold">
                                        C{rowLabel}
                                    </td>
                                    {matrix.clusterLabels.map((colLabel, j) => {
                                        const distance = matrix.distances[i]?.[j];
                                        const safeDistance = distance !== null && isFinite(distance) ? distance : 0;
                                        
                                        return (
                                            <td
                                                key={colLabel}
                                                className={`border border-border p-3 text-center font-mono text-sm ${getColor(safeDistance)}`}
                                                title={getInterpretation(safeDistance)}
                                            >
                                                {safeDistance.toFixed(2)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-200 dark:bg-green-900 border border-border"></div>
                        <span>Similar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-900 border border-border"></div>
                        <span>Moderate</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-200 dark:bg-red-900 border border-border"></div>
                        <span>Separated</span>
                    </div>
                </div>
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

        const start = { r: 44, g: 123, b: 229 }; // biru
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
            <div className="overflow-auto border border-border rounded">
                <table className="w-full border-collapse text-xs">
                    <thead>
                        <tr>
                            <th className="border border-border bg-muted p-2"></th>
                            {Array.from({ length: colEnd - colStart }, (_, offset) => {
                                const idx = colStart + offset;
                                return (
                                    <th key={idx} className="border border-border bg-muted p-2 text-left">
                                        {rowLabel(idx)}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rowEnd - rowStart }, (_, rowOffset) => {
                            const rowIdx = rowStart + rowOffset;
                            const row = matrix.distances[rowIdx] || [];
                            return (
                                <tr key={rowIdx}>
                                    <td className="border border-border bg-muted p-2 font-semibold">
                                        {rowLabel(rowIdx)}
                                    </td>
                                    {Array.from({ length: colEnd - colStart }, (_, colOffset) => {
                                        const colIdx = colStart + colOffset;
                                        const value = row[colIdx];
                                        return (
                                            <td key={colIdx} className="border border-border p-2 text-right">
                                                {value !== null && isFinite(value) ? value.toFixed(4) : "N/A"}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
