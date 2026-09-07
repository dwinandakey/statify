/**
 * ConvergenceAlgorithmPanel
 * Combined iteration table (Iterasi | Medoid Aktif | Total Cost | Status)
 * followed by a simple D3 Total-Cost line chart — matches the "Proses Iterasi
 * K-Medoids (PAM)" design with Init row, Berubah / Konvergen status badges.
 */

import React, { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import DataTableRenderer from "@/components/Output/Table/DataTableRenderer";
import type { IterationHistory, MedoidInfo } from "../types/output";

interface ConvergenceAlgorithmPanelProps {
    data: IterationHistory[];
    medoids: MedoidInfo[];
    converged?: boolean;
}

// ── helpers ─────────────────────────────────────────────────────────────────

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

// ── component ────────────────────────────────────────────────────────────────

export const ConvergenceAlgorithmPanel: React.FC<ConvergenceAlgorithmPanelProps> = ({
    data = [],
    medoids = [],
    converged = false,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    // Row 0 = Init state (improvement always 0 from builder), rows 1+ = iterations
    const initEntry  = data[0];
    const iterEntries = data.slice(1);
    const numIterations = iterEntries.length;

    // Helper: turn a medoid index array into a readable "Case X, Case Y" string.
    // Prefers per-iteration snapshot (row.medoids) over the final medoid list.
    const medoidStr = (indices?: number[]): string => {
        if (indices && indices.length > 0) {
            return indices.map(idx => `Case ${idx + 1}`).join(", ");
        }
        // Fallback to final medoids info (for non-PAM paths without history)
        return medoids.length > 0 ? medoids.map(medoidLabel).join(", ") : "—";
    };

    // Chart data: Init + each iteration
    const chartData = data.map((d, i) => ({
        label: i === 0 ? "Init" : `Iter ${i}`,
        cost: d.totalCost,
    }));

    // ── D3 chart ─────────────────────────────────────────────────────────────
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

        // Horizontal grid
        g.append("g")
            .call(d3.axisLeft(yScale).ticks(4).tickSize(-innerW).tickFormat(() => ""))
            .call(s => s.select(".domain").remove())
            .call(s => s.selectAll(".tick line")
                .attr("stroke", borderColor)
                .attr("stroke-opacity", 0.55));

        // Area fill
        g.append("path")
            .datum(chartData)
            .attr("fill", "#10b981")
            .attr("fill-opacity", 0.12)
            .attr("d", d3.area<typeof chartData[0]>()
                .x(d => xScale(d.label) ?? 0)
                .y0(innerH)
                .y1(d => yScale(d.cost))
                .curve(d3.curveMonotoneX));

        // Line
        g.append("path")
            .datum(chartData)
            .attr("fill", "none")
            .attr("stroke", "#10b981")
            .attr("stroke-width", 2.5)
            .attr("d", d3.line<typeof chartData[0]>()
                .x(d => xScale(d.label) ?? 0)
                .y(d => yScale(d.cost))
                .curve(d3.curveMonotoneX));

        // Dots
        g.selectAll(".dot")
            .data(chartData)
            .enter().append("circle")
            .attr("cx", d => xScale(d.label) ?? 0)
            .attr("cy", d => yScale(d.cost))
            .attr("r", 5)
            .attr("fill", "#10b981")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);

        // Cost labels above dots
        g.selectAll(".cost-lbl")
            .data(chartData)
            .enter().append("text")
            .attr("x", d => xScale(d.label) ?? 0)
            .attr("y", d => yScale(d.cost) - 9)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", mutedColor)
            .text(d => fmtCost(d.cost));

        // X axis
        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale).tickSize(0))
            .call(s => s.select(".domain").attr("stroke", borderColor))
            .call(s => s.selectAll(".tick text")
                .attr("fill", mutedColor)
                .attr("font-size", "11px")
                .attr("dy", "1.3em"));

        // Y axis
        g.append("g")
            .call(d3.axisLeft(yScale).ticks(4).tickFormat(v => fmtCost(v as number)))
            .call(s => s.select(".domain").remove())
            .call(s => s.selectAll(".tick line").remove())
            .call(s => s.selectAll(".tick text")
                .attr("fill", mutedColor)
                .attr("font-size", "11px"));

    }, [chartData, chartW, chartH]);

    const tableJson = useMemo(() => {
        if (!initEntry) return "{}";
        return JSON.stringify({
            tables: [
                {
                    key: "convergence_algorithm",
                    title: `Konvergensi Algoritma (${numIterations} Iterasi)`,
                    columnHeaders: [
                        { header: "Iterasi" },
                        { header: "Medoid Aktif" },
                        { header: "Total Cost" },
                        { header: "Status" },
                    ],
                    rows: [
                        {
                            rowHeader: ["Init"],
                            "Medoid Aktif": `${medoidStr(initEntry.medoids)} (BUILD)`,
                            "Total Cost": fmtCost(initEntry.totalCost),
                            Status: numIterations === 0 && converged ? "Konvergen" : "Inisialisasi",
                        },
                        ...iterEntries.map((row, i) => {
                            const isLast = i === iterEntries.length - 1;
                            const isKonvergen = isLast && converged;
                            const isBerubah = row.improvement > 0.0001;
                            return {
                                rowHeader: [String(i + 1)],
                                "Medoid Aktif": medoidStr(row.medoids),
                                "Total Cost": fmtCost(row.totalCost),
                                Status: isKonvergen ? "Konvergen" : isBerubah ? "Berubah" : "Stabil",
                            };
                        }),
                    ],
                },
            ],
        });
    }, [numIterations, initEntry, iterEntries, converged]);

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
            {/* Table */}
            <div className="overflow-x-auto">
                <DataTableRenderer data={tableJson} />
            </div>

            {/* Line chart */}
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
