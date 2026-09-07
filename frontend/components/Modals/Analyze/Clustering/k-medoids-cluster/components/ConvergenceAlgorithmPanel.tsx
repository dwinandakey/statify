/**
 * ConvergenceAlgorithmPanel
 * Tabel iterasi gabungan (Iterasi | Medoid Aktif | Total Cost | Status)
 * diikuti line chart Total-Cost sederhana berbasis D3 — sesuai desain "Proses Iterasi
 * K-Medoids (PAM)" dengan baris Init dan badge status Berubah / Konvergen.
 */

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { IterationHistory, MedoidInfo } from "../types/output";

interface ConvergenceAlgorithmPanelProps {
    data: IterationHistory[];
    medoids: MedoidInfo[];
    converged?: boolean;
}

// ── fungsi pembantu ──────────────────────────────────────────────────────────

function fmtCost(n: number): string {
    if (!isFinite(n)) return "—";
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    return n.toFixed(1);
}

function medoidLabel(m: MedoidInfo): string {
    if (m.objectName) return m.objectName;
    return `ID_${String(m.objectId).padStart(3, "0")}`;
}

// ── komponen ─────────────────────────────────────────────────────────────────

export const ConvergenceAlgorithmPanel: React.FC<ConvergenceAlgorithmPanelProps> = ({
    data = [],
    medoids = [],
    converged = false,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    // Baris 0 = state Init (improvement selalu 0 dari builder), baris 1+ = iterasi
    const initEntry  = data[0];
    const iterEntries = data.slice(1);
    const numIterations = iterEntries.length;

    // Pembantu: ubah array indeks medoid menjadi string "Case X, Case Y" yang mudah dibaca.
    // Prioritaskan snapshot per-iterasi (row.medoids) daripada daftar medoid akhir.
    const medoidStr = (indices?: number[]): string => {
        if (indices && indices.length > 0) {
            return indices.map(idx => `Case ${idx + 1}`).join(", ");
        }
        // Fallback ke info medoid akhir (untuk jalur non-PAM tanpa histori)
        return medoids.length > 0 ? medoids.map(medoidLabel).join(", ") : "—";
    };

    // Data chart: Init + setiap iterasi
    const chartData = data.map((d, i) => ({
        label: i === 0 ? "Init" : `Iter ${i}`,
        cost: d.totalCost,
    }));

    // ── Chart D3 ─────────────────────────────────────────────────────────────
    const chartW = 580;
    const chartH = 200;

    useEffect(() => {
        if (!svgRef.current || chartData.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const margin = { top: 20, right: 16, bottom: 36, left: 52 };
        const innerW = chartW - margin.left - margin.right;
        const innerH = chartH - margin.top - margin.bottom;

        const cs = getComputedStyle(svgRef.current);
        const tok = (name: string, fallback: string) => {
            const v = cs.getPropertyValue(name).trim();
            return v ? `hsl(${v})` : fallback;
        };
        const mutedColor  = tok("--muted-foreground", "#6b7280");
        const borderColor = tok("--border",           "#e5e7eb");

        const costs    = chartData.map(d => d.cost);
        const minCost  = Math.min(...costs);
        const maxCost  = Math.max(...costs);
        const pad      = (maxCost - minCost) * 0.15 || 10;

        const xScale = d3.scalePoint()
            .domain(chartData.map(d => d.label))
            .range([0, innerW])
            .padding(0.3);

        const yScale = d3.scaleLinear()
            .domain([minCost - pad, maxCost + pad])
            .range([innerH, 0])
            .nice();

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        // Grid horizontal
        g.append("g")
            .call(d3.axisLeft(yScale).ticks(4).tickSize(-innerW).tickFormat(() => ""))
            .call(s => s.select(".domain").remove())
            .call(s => s.selectAll(".tick line")
                .attr("stroke", borderColor)
                .attr("stroke-opacity", 0.55));

        // Pengisian area
        g.append("path")
            .datum(chartData)
            .attr("fill", "#10b981")
            .attr("fill-opacity", 0.12)
            .attr("d", d3.area<typeof chartData[0]>()
                .x(d => xScale(d.label) ?? 0)
                .y0(innerH)
                .y1(d => yScale(d.cost))
                .curve(d3.curveMonotoneX));

        // Garis
        g.append("path")
            .datum(chartData)
            .attr("fill", "none")
            .attr("stroke", "#10b981")
            .attr("stroke-width", 2.5)
            .attr("d", d3.line<typeof chartData[0]>()
                .x(d => xScale(d.label) ?? 0)
                .y(d => yScale(d.cost))
                .curve(d3.curveMonotoneX));

        // Titik
        g.selectAll(".dot")
            .data(chartData)
            .enter().append("circle")
            .attr("cx", d => xScale(d.label) ?? 0)
            .attr("cy", d => yScale(d.cost))
            .attr("r", 5)
            .attr("fill", "#10b981")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);

        // Label cost di atas titik
        g.selectAll(".cost-lbl")
            .data(chartData)
            .enter().append("text")
            .attr("x", d => xScale(d.label) ?? 0)
            .attr("y", d => yScale(d.cost) - 9)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", mutedColor)
            .text(d => fmtCost(d.cost));

        // Sumbu X
        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale).tickSize(0))
            .call(s => s.select(".domain").attr("stroke", borderColor))
            .call(s => s.selectAll(".tick text")
                .attr("fill", mutedColor)
                .attr("font-size", "11px")
                .attr("dy", "1.3em"));

        // Sumbu Y
        g.append("g")
            .call(d3.axisLeft(yScale).ticks(4).tickFormat(v => fmtCost(v as number)))
            .call(s => s.select(".domain").remove())
            .call(s => s.selectAll(".tick line").remove())
            .call(s => s.selectAll(".tick text")
                .attr("fill", mutedColor)
                .attr("font-size", "11px"));

    }, [chartData, chartW, chartH]);

    // ── render ───────────────────────────────────────────────────────────────
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                Data iterasi tidak tersedia
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header (judul panel) */}
            <div className="flex items-center gap-3">
                <span className="text-base font-semibold">Konvergensi Algoritma</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border">
                    {numIterations} ITERASI
                </span>
            </div>

            {/* Tabel */}
            <div className="rounded-md border overflow-hidden text-sm">
                <table className="w-full">
                    <thead className="bg-muted/60">
                        <tr className="border-b">
                            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide w-20">
                                Iterasi
                            </th>
                            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                Medoid Aktif
                            </th>
                            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide w-32">
                                Total Cost
                            </th>
                            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide w-36">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Baris Init */}
                        <tr className="border-b">
                            <td className="px-4 py-2.5 font-mono font-semibold text-amber-500 dark:text-amber-400">
                                Init
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                                {medoidStr(initEntry.medoids)}{" "}
                                <span className="text-muted-foreground/60">(BUILD)</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium">
                                {fmtCost(initEntry.totalCost)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                                {numIterations === 0 && converged ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                        ✓ Konvergen
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                        Inisialisasi
                                    </span>
                                )}
                            </td>
                        </tr>

                        {/* Baris iterasi */}
                        {iterEntries.map((row, i) => {
                            const isLast    = i === iterEntries.length - 1;
                            const isKonvergen = isLast && converged;
                            const isBerubah = row.improvement > 0.0001;

                            return (
                                <tr
                                    key={row.iteration}
                                    className={[
                                        "border-b last:border-0 transition-colors",
                                        isKonvergen
                                            ? "bg-green-50 dark:bg-green-950/20"
                                            : i % 2 === 1
                                                ? "bg-muted/20"
                                                : "",
                                    ].join(" ")}
                                >
                                    <td className="px-4 py-2.5 font-mono font-semibold">
                                        {i + 1}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-xs text-foreground/80">
                                        {medoidStr(row.medoids)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono font-medium">
                                        {fmtCost(row.totalCost)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        {isKonvergen ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                                ✓ Konvergen
                                            </span>
                                        ) : isBerubah ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                                Berubah
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">
                                                Stabil
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Line chart konvergensi */}
            <div className="w-full flex justify-center pt-2">
                <svg
                    ref={svgRef}
                    width={chartW}
                    height={chartH}
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    style={{ maxWidth: "100%", overflow: "visible" }}
                />
            </div>
        </div>
    );
};
