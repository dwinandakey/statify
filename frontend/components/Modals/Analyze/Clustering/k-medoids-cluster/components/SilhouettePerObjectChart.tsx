/**
 * SilhouettePerObjectChart
 * Classic silhouette plot: one horizontal bar per object, grouped by cluster,
 * sorted descending within each group. Negative bars extend left of zero.
 * The overall mean is shown as a vertical dashed reference line.
 */

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ObjectAssignment } from "../types/output";

interface SilhouettePerObjectChartProps {
    assignments: ObjectAssignment[];
    overall: number;
    width?: number;
}

// Same palette as other k-medoids charts
function clusterColor(idx: number, total: number): string {
    const palette = [
        "#4e9af1", "#f1714e", "#4ef19a", "#f1d44e",
        "#a44ef1", "#f14e9a", "#4ef1e0", "#f1a44e",
        "#9af14e", "#4e6af1",
    ];
    if (total <= palette.length) return palette[idx];
    return `hsl(${(idx * 360) / total}, 65%, 55%)`;
}

function qualityLabel(score: number): string {
    if (score >= 0.70) return "Sangat Baik";
    if (score >= 0.50) return "Baik";
    if (score >= 0.30) return "Cukup";
    return "Lemah";
}

function qualityColor(score: number): string {
    if (score >= 0.70) return "#16a34a";
    if (score >= 0.50) return "#2563eb";
    if (score >= 0.30) return "#d97706";
    return "#dc2626";
}

export const SilhouettePerObjectChart: React.FC<SilhouettePerObjectChartProps> = ({
    assignments,
    overall,
    width = 700,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    // ── Prepare sorted data ──────────────────────────────────────────────────
    const validData = assignments.filter(
        a => typeof a.silhouetteScore === "number" && isFinite(a.silhouetteScore)
    );

    // Group by cluster, sort clusters ascending, sort within cluster descending
    const clusterOrder = Array.from(new Set(validData.map(a => a.clusterLabel))).sort((a, b) => a - b);
    const grouped: ObjectAssignment[][] = clusterOrder.map(cl =>
        validData
            .filter(a => a.clusterLabel === cl)
            .sort((a, b) => b.silhouetteScore - a.silhouetteScore)
    );
    const sortedData = grouped.flat();

    const n = sortedData.length;
    const BAR_H = Math.max(3, Math.min(14, Math.floor(480 / n)));
    const GAP_BETWEEN_CLUSTERS = Math.max(6, BAR_H * 1.5);
    const numClusters = clusterOrder.length;

    useEffect(() => {
        if (!svgRef.current || n === 0) return;

        const margin = { top: 28, right: 28, bottom: 82, left: 72 };
        const innerW = width - margin.left - margin.right;
        const innerH = n * BAR_H + (numClusters - 1) * GAP_BETWEEN_CLUSTERS;
        const totalH = innerH + margin.top + margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // ── CSS tokens ────────────────────────────────────────────────────────
        const style = getComputedStyle(svgRef.current);
        const tok = (name: string, fallback: string) => {
            const v = style.getPropertyValue(name).trim();
            return v ? `hsl(${v})` : fallback;
        };
        const fgColor     = tok("--foreground",       "#374151");
        const mutedColor  = tok("--muted-foreground", "#6b7280");
        const bgColor     = tok("--background",       "#ffffff");
        const borderColor = tok("--border",           "#e5e7eb");

        // ── X scale ───────────────────────────────────────────────────────────
        const xMin = Math.min(-0.2, d3.min(sortedData, d => d.silhouetteScore) ?? -0.2);
        const xMax = Math.max(1.0,  d3.max(sortedData, d => d.silhouetteScore) ?? 1.0);
        const xScale = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([0, innerW])
            .nice();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // ── Grid ─────────────────────────────────────────────────────────────
        g.append("g")
            .call(d3.axisTop(xScale).ticks(6).tickSize(-innerH).tickFormat(() => ""))
            .call(ax => {
                ax.select(".domain").remove();
                ax.selectAll(".tick line")
                    .attr("stroke", borderColor)
                    .attr("stroke-opacity", 0.45);
            });

        // ── Zero line ─────────────────────────────────────────────────────────
        const x0 = xScale(0);
        g.append("line")
            .attr("x1", x0).attr("x2", x0)
            .attr("y1", 0).attr("y2", innerH)
            .attr("stroke", borderColor)
            .attr("stroke-width", 1.5);

        // ── Overall mean line ─────────────────────────────────────────────────
        const xOverall = xScale(overall);
        g.append("line")
            .attr("x1", xOverall).attr("x2", xOverall)
            .attr("y1", 0).attr("y2", innerH)
            .attr("stroke", "#6366f1")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "6,4");
        g.append("text")
            .attr("x", xOverall + 4)
            .attr("y", -8)
            .attr("font-size", "10")
            .attr("fill", "#6366f1")
            .text(`Rata-rata: ${overall.toFixed(3)}`);

        // ── Tooltip ───────────────────────────────────────────────────────────
        if (!svgRef.current) return;
        const parent = svgRef.current.parentElement;
        if (!parent) return;

        const tooltip = d3.select(parent)
            .selectAll<HTMLDivElement, unknown>(".spoc-tooltip")
            .data([null])
            .join("div")
            .attr("class", "spoc-tooltip")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("opacity", "0")
            .style("background", bgColor)
            .style("border", `1px solid ${mutedColor}`)
            .style("border-radius", "6px")
            .style("padding", "7px 11px")
            .style("font-size", "12px")
            .style("line-height", "1.6")
            .style("color", fgColor)
            .style("box-shadow", "0 2px 8px rgba(0,0,0,.15)")
            .style("z-index", "50");

        // ── Bars ─────────────────────────────────────────────────────────────
        let yOffset = 0;
        clusterOrder.forEach((cl, ci) => {
            const group = grouped[ci];
            const color = clusterColor(ci, numClusters);

            // Cluster label on left axis
            const groupMidY = yOffset + (group.length * BAR_H) / 2;
            g.append("text")
                .attr("x", -8)
                .attr("y", groupMidY + BAR_H / 2)
                .attr("text-anchor", "end")
                .attr("dominant-baseline", "middle")
                .attr("font-size", Math.max(9, Math.min(12, BAR_H + 1)))
                .attr("font-weight", "600")
                .attr("fill", color)
                .text(`Cluster ${cl}`);

            group.forEach((obj) => {
                const score = obj.silhouetteScore;
                const barX = score >= 0 ? xScale(0) : xScale(score);
                const barW = Math.abs(xScale(score) - xScale(0));
                const barY = yOffset;

                g.append("rect")
                    .attr("x", barX)
                    .attr("y", barY)
                    .attr("width", Math.max(barW, 1))
                    .attr("height", BAR_H - 1)
                    .attr("fill", score < 0 ? "#ef4444" : color)
                    .attr("opacity", obj.isMedoid ? 1 : 0.82)
                    .style("cursor", "pointer")
                    .on("mouseover", function (event) {
                        d3.select(this).attr("opacity", 1);
                        if (!svgRef.current) return;
                        const parent = svgRef.current.parentElement;
                        if (!parent) return;
                        const [mx, my] = d3.pointer(event, parent);
                        tooltip
                            .style("opacity", "1")
                            .style("left", `${mx + 14}px`)
                            .style("top", `${my - 10}px`)
                            .html(
                                `<strong>Object ${obj.objectId}</strong>${obj.isMedoid ? " ★ Medoid" : ""}<br/>` +
                                `Cluster: <strong>${cl}</strong><br/>` +
                                `Silhouette: <strong style="color:${qualityColor(score)}">${score.toFixed(4)}</strong><br/>` +
                                `Kualitas: <strong style="color:${qualityColor(score)}">${qualityLabel(score)}</strong>`
                            );
                    })
                    .on("mousemove", function (event) {
                        if (!svgRef.current) return;
                        const parent = svgRef.current.parentElement;
                        if (!parent) return;
                        const [mx, my] = d3.pointer(event, parent);
                        tooltip
                            .style("left", `${mx + 14}px`)
                            .style("top", `${my - 10}px`);
                    })
                    .on("mouseleave", function () {
                        d3.select(this).attr("opacity", obj.isMedoid ? 1 : 0.82);
                        tooltip.style("opacity", "0");
                    });

                yOffset += BAR_H;
            });

            // Gap between clusters (except after last)
            if (ci < numClusters - 1) {
                // Separator line
                g.append("line")
                    .attr("x1", 0).attr("x2", innerW)
                    .attr("y1", yOffset + GAP_BETWEEN_CLUSTERS / 2)
                    .attr("y2", yOffset + GAP_BETWEEN_CLUSTERS / 2)
                    .attr("stroke", borderColor)
                    .attr("stroke-opacity", 0.4)
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "3,3");
                yOffset += GAP_BETWEEN_CLUSTERS;
            }
        });

        // ── X axis ────────────────────────────────────────────────────────────
        g.append("g")
            .attr("transform", `translate(0,${innerH + 6})`)
            .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => String(+d % 1 === 0 ? d : (+d).toFixed(1))))
            .call(ax => {
                ax.select(".domain").attr("stroke", borderColor);
                ax.selectAll("text").attr("font-size", "11").attr("fill", mutedColor);
            });

        g.append("text")
            .attr("x", innerW / 2)
            .attr("y", innerH + 42)
            .attr("text-anchor", "middle")
            .attr("font-size", "12")
            .attr("fill", mutedColor)
            .text("Silhouette Score");

        // ── Legend ────────────────────────────────────────────────────────────
        const legendG = svg.append("g")
            .attr("transform", `translate(${margin.left},${totalH - 30})`);

        // Row 1: overall mean reference line
        legendG.append("line")
            .attr("x1", 0).attr("x2", 18).attr("y1", 0).attr("y2", 0)
            .attr("stroke", "#6366f1").attr("stroke-width", 2)
            .attr("stroke-dasharray", "6,4");
        legendG.append("text")
            .attr("x", 23).attr("y", 4)
            .attr("font-size", "11").attr("fill", mutedColor)
            .text("Rata-rata keseluruhan");

        // Row 2: negative silhouette bars
        legendG.append("rect")
            .attr("x", 0).attr("y", 16).attr("width", 13).attr("height", 10)
            .attr("rx", 2).attr("fill", "#ef4444").attr("opacity", 0.82);
        legendG.append("text")
            .attr("x", 18).attr("y", 25)
            .attr("font-size", "11").attr("fill", mutedColor)
            .text("Nilai negatif");

    }, [sortedData, overall, width, BAR_H, GAP_BETWEEN_CLUSTERS, clusterOrder, grouped, n, numClusters]);

    if (n === 0) {
        return (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                Data silhouette per objek tidak tersedia
            </div>
        );
    }

    return (
        <div className="relative w-full flex justify-center">
            <div style={{ maxHeight: 400, overflowY: "auto", width: "100%", display: "flex", justifyContent: "center" }}>
                <svg
                    ref={svgRef}
                    width={width}
                    height={totalH}
                    viewBox={`0 0 ${width} ${totalH}`}
                    style={{ maxWidth: "100%", overflow: "visible" }}
                />
            </div>
        </div>
    );
};
