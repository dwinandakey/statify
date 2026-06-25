/**
 * SilhouetteBarChart
 * Horizontal grouped bar chart showing average, min, and max silhouette score
 * per cluster, with a vertical reference line for the overall mean.
 */

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { SilhouetteClusterScore } from "../types/output";

interface SilhouetteBarChartProps {
    perCluster: SilhouetteClusterScore[];
    overall: number;
    width?: number;
    height?: number;
}

function clusterColor(idx: number, total: number): string {
    const palette = [
        "#4e9af1", "#f1714e", "#4ef19a", "#f1d44e",
        "#a44ef1", "#f14e9a", "#4ef1e0", "#f1a44e",
        "#9af14e", "#4e6af1",
    ];
    if (total <= palette.length) return palette[idx];
    return `hsl(${(idx * 360) / total}, 65%, 55%)`;
}

/** Return a colour band for a silhouette score */
function zoneColor(score: number): string {
    if (score >= 0.70) return "#16a34a";   // green  — excellent
    if (score >= 0.50) return "#2563eb";   // blue   — good
    if (score >= 0.30) return "#d97706";   // amber  — fair
    return "#dc2626";                       // red    — weak
}

/** Human-readable quality label */
function qualityLabel(score: number): string {
    if (score >= 0.70) return "Sangat Baik";
    if (score >= 0.50) return "Baik";
    if (score >= 0.30) return "Cukup";
    return "Lemah";
}

export const SilhouetteBarChart: React.FC<SilhouetteBarChartProps> = ({
    perCluster,
    overall,
    width = 560,
    height = 380,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const chartHeight = Math.max(height, perCluster.length * 90 + 120);

    useEffect(() => {
        if (!svgRef.current || !perCluster || perCluster.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // --- Margins ---
        const margin = { top: 24, right: 32, bottom: 92, left: 72 };
        const innerW = width - margin.left - margin.right;
        const innerH = chartHeight - margin.top - margin.bottom;

        const style = getComputedStyle(svgRef.current);
        const fgColor = style.getPropertyValue("--foreground").trim()
            ? `hsl(${style.getPropertyValue("--foreground").trim()})`
            : "#374151";
        const mutedColor = style.getPropertyValue("--muted-foreground").trim()
            ? `hsl(${style.getPropertyValue("--muted-foreground").trim()})`
            : "#6b7280";
        const bgColor = style.getPropertyValue("--background").trim()
            ? `hsl(${style.getPropertyValue("--background").trim()})`
            : "#ffffff";
        const borderColor = style.getPropertyValue("--border").trim()
            ? `hsl(${style.getPropertyValue("--border").trim()})`
            : "#e5e7eb";

        // --- Scales ---
        const allScores = perCluster.flatMap(d => [d.averageScore, d.minScore, d.maxScore]);
        const xMin = Math.min(-0.15, ...allScores) * 1.1;
        const xMax = Math.max(1.0, ...allScores) * 1.05;

        const xScale = d3.scaleLinear()
            .domain([Math.min(xMin, -0.2), Math.min(xMax, 1.1)])
            .range([0, innerW])
            .nice();

        const clusterLabels = perCluster.map(d => `Cluster ${d.clusterLabel}`);

        const yOuter = d3.scaleBand()
            .domain(clusterLabels)
            .range([0, innerH])
            .paddingInner(0.28)
            .paddingOuter(0.15);

        // 3 sub-bars: avg, min, max
        const yInner = d3.scaleBand()
            .domain(["avg", "min", "max"])
            .range([0, yOuter.bandwidth()])
            .padding(0.12);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // --- Zero line ---
        const zeroX = xScale(0);
        g.append("line")
            .attr("x1", zeroX).attr("x2", zeroX)
            .attr("y1", 0).attr("y2", innerH)
            .attr("stroke", borderColor)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4,3");

        // --- Overall reference line ---
        const overallX = xScale(overall);
        g.append("line")
            .attr("x1", overallX).attr("x2", overallX)
            .attr("y1", 0).attr("y2", innerH)
            .attr("stroke", "#6366f1")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "6,4");

        g.append("text")
            .attr("x", overallX + 5)
            .attr("y", -6)
            .attr("font-size", "10")
            .attr("fill", "#6366f1")
            .text(`Overall avg: ${overall.toFixed(3)}`);

        // --- Grid lines ---
        g.append("g")
            .attr("class", "grid")
            .call(
                d3.axisBottom(xScale)
                    .ticks(6)
                    .tickSize(innerH)
                    .tickFormat(() => "")
            )
            .call(g2 => {
                g2.select(".domain").remove();
                g2.selectAll(".tick line")
                    .attr("stroke", borderColor)
                    .attr("stroke-opacity", 0.5);
            });

        // --- Tooltip ---
        const parent = svgRef.current.parentElement;
        if (!parent) return;

        const tooltip = d3.select(parent)
            .selectAll<HTMLDivElement, unknown>(".sbc-tooltip")
            .data([null])
            .join("div")
            .attr("class", "sbc-tooltip")
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
            .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)")
            .style("z-index", "50");

        // --- Bars ---
        const subBarMeta: { key: "avg" | "min" | "max"; label: string; getter: (d: SilhouetteClusterScore) => number; opacity: number }[] = [
            { key: "avg", label: "Rata-rata", getter: d => d.averageScore, opacity: 1 },
            { key: "min", label: "Minimum",  getter: d => d.minScore,     opacity: 0.55 },
            { key: "max", label: "Maksimum", getter: d => d.maxScore,     opacity: 0.75 },
        ];

        perCluster.forEach((d, i) => {
            const outerY = yOuter(`Cluster ${d.clusterLabel}`) ?? 0;
            const color = clusterColor(i, perCluster.length);

            subBarMeta.forEach(({ key, label, getter, opacity }) => {
                const score = getter(d);
                const barY = outerY + (yInner(key) ?? 0);
                const barH = yInner.bandwidth();
                const x0 = xScale(Math.min(0, score));
                const barW = Math.abs(xScale(score) - xScale(0));

                g.append("rect")
                    .attr("x", x0)
                    .attr("y", barY)
                    .attr("width", Math.max(barW, 1))
                    .attr("height", barH)
                    .attr("rx", 3)
                    .attr("fill", color)
                    .attr("opacity", opacity)
                    .style("cursor", "pointer")
                    .on("mouseover", function () {
                        d3.select(this).attr("opacity", Math.min(1, opacity + 0.25));
                        tooltip
                            .style("opacity", "1")
                            .html(
                                `<strong>Cluster ${d.clusterLabel}</strong> — ${label}<br/>` +
                                `Score: <strong>${score.toFixed(4)}</strong><br/>` +
                                `Kualitas: <strong style="color:${zoneColor(d.averageScore)}">${qualityLabel(d.averageScore)}</strong><br/>` +
                                `Jumlah objek: ${d.count}`
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
                        d3.select(this).attr("opacity", opacity);
                        tooltip.style("opacity", "0");
                    });

                // Score label at end of avg bar only
                if (key === "avg") {
                    const labelX = score >= 0
                        ? xScale(score) + 4
                        : xScale(score) - 4;
                    const anchor = score >= 0 ? "start" : "end";
                    g.append("text")
                        .attr("x", labelX)
                        .attr("y", barY + barH / 2 + 1)
                        .attr("dominant-baseline", "middle")
                        .attr("text-anchor", anchor)
                        .attr("font-size", "11")
                        .attr("font-weight", "600")
                        .attr("fill", zoneColor(score))
                        .text(score.toFixed(3));
                }
            });
        });

        // --- Y axis ---
        g.append("g")
            .call(d3.axisLeft(yOuter).tickSize(0))
            .call(ax => {
                ax.select(".domain").remove();
                ax.selectAll("text")
                    .attr("font-size", "12")
                    .attr("fill", fgColor)
                    .attr("dx", "-6");
            });

        // --- X axis ---
        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(
                d3.axisBottom(xScale)
                    .ticks(6)
                    .tickFormat(d => String(+d % 1 === 0 ? d : (+d).toFixed(1)))
            )
            .call(ax => {
                ax.select(".domain").attr("stroke", borderColor);
                ax.selectAll("text")
                    .attr("font-size", "11")
                    .attr("fill", mutedColor);
            });

        // X axis label
        g.append("text")
            .attr("x", innerW / 2)
            .attr("y", innerH + 46)
            .attr("text-anchor", "middle")
            .attr("font-size", "12")
            .attr("fill", mutedColor)
            .text("Silhouette Score");

        // --- Sub-bar legend ---
        const legendData: { label: string; opacity: number }[] = [
            { label: "Rata-rata", opacity: 1 },
            { label: "Min",       opacity: 0.55 },
            { label: "Maks",      opacity: 0.75 },
            { label: "Overall avg", opacity: 1 },
        ];
        const legendG = svg.append("g")
            .attr("transform", `translate(${margin.left},${chartHeight - 30})`);

        legendData.forEach(({ label, opacity }, i) => {
            const ly = i * 18;
            if (i === 3) {
                // dashed reference line swatch
                legendG.append("line")
                    .attr("x1", 0).attr("x2", 18)
                    .attr("y1", ly).attr("y2", ly)
                    .attr("stroke", "#6366f1")
                    .attr("stroke-width", 2)
                    .attr("stroke-dasharray", "5,3");
            } else {
                legendG.append("rect")
                    .attr("x", 0).attr("y", ly - 7)
                    .attr("width", 13).attr("height", 10)
                    .attr("rx", 2)
                    .attr("fill", "#4e9af1")
                    .attr("opacity", opacity);
            }
            legendG.append("text")
                .attr("x", 22)
                .attr("y", ly + 4)
                .attr("font-size", "11")
                .attr("fill", mutedColor)
                .text(label);
        });

    }, [perCluster, overall, width, chartHeight]);

    if (!perCluster || perCluster.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                Data silhouette tidak tersedia
            </div>
        );
    }

    return (
        <div className="relative w-full flex justify-center">
            <svg
                ref={svgRef}
                width={width}
                height={chartHeight}
                viewBox={`0 0 ${width} ${chartHeight}`}
                style={{ maxWidth: "100%", overflow: "visible" }}
            />
        </div>
    );
};
