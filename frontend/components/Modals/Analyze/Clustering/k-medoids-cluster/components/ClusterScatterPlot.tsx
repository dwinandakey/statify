/**
 * K-Medoids Cluster Scatter Plot
 *
 * Displays all data points colored by cluster label with medoids marked by
 * a star symbol. Works for any number of clusters — colors are generated
 * automatically via an HSL palette.
 *
 * Input shape:
 *   points  – [{ x, y, cluster }]   regular observations
 *   medoids – [{ x, y, cluster }]   one representative per cluster
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// ─── Public types ────────────────────────────────────────────────────────────

export interface ScatterPoint {
    x: number;
    y: number;
    cluster: number;
    /** Optional case ID shown in the tooltip */
    label?: string;
}

export interface MedoidPoint {
    x: number;
    y: number;
    cluster: number;
}

export interface ClusterScatterPlotProps {
    points: ScatterPoint[];
    medoids: MedoidPoint[];
    xLabel?: string;
    yLabel?: string;
    title?: string;
    subtitle?: string;
    width?: number;
    height?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a visually-distinct HSL color for cluster index `idx` out of `total`. */
function clusterColor(idx: number, total: number): string {
    const hue = (idx * 360) / Math.max(total, 1);
    return `hsl(${hue}, 65%, 50%)`;
}

/**
 * Build an SVG path string for a star with `n` points, outer radius `R`
 * and inner radius `r`, centred on (0,0).
 */
function starPath(n = 5, R = 10, r = 4.5): string {
    const step = Math.PI / n;
    const pts: [number, number][] = [];
    for (let i = 0; i < 2 * n; i++) {
        const rad = i % 2 === 0 ? R : r;
        const angle = i * step - Math.PI / 2;
        pts.push([rad * Math.cos(angle), rad * Math.sin(angle)]);
    }
    return `M${pts.map(([px, py]) => `${px},${py}`).join("L")}Z`;
}

const STAR = starPath(5, 11, 5);

// ─── Component ───────────────────────────────────────────────────────────────

export const ClusterScatterPlot: React.FC<ClusterScatterPlotProps> = ({
    points,
    medoids,
    xLabel = "X",
    yLabel = "Y",
    title = "K-Medoids Cluster Visualization",
    subtitle,
    width = 600,
    height = 440,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Track responsive width
    const [svgWidth, setSvgWidth] = useState(width);
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver((entries) => {
            const cw = entries[0]?.contentRect.width;
            if (cw && cw > 0) setSvgWidth(Math.min(cw, width));
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [width]);

    useEffect(() => {
        if (!svgRef.current) return;

        const validPoints = points.filter(
            (p) => isFinite(p.x) && isFinite(p.y)
        );
        const validMedoids = medoids.filter(
            (m) => isFinite(m.x) && isFinite(m.y)
        );

        const allX = [...validPoints, ...validMedoids].map((p) => p.x);
        const allY = [...validPoints, ...validMedoids].map((p) => p.y);

        if (allX.length === 0) return;

        // Sorted unique cluster IDs
        const clusterIds = Array.from(
            new Set([...validPoints, ...validMedoids].map((p) => p.cluster))
        ).sort((a, b) => a - b);
        const numClusters = clusterIds.length;

        const colorMap = new Map<number, string>(
            clusterIds.map((id, i) => [id, clusterColor(i, numClusters)])
        );

        // ── Layout ──────────────────────────────────────────────────────────
        const legendWidth = Math.max(90, numClusters * 5);
        const margin = {
            top: subtitle ? 54 : 38,
            right: legendWidth + 24,
            bottom: 50,
            left: 58,
        };
        const chartW = svgWidth;
        const chartH = height;
        const innerW = chartW - margin.left - margin.right;
        const innerH = chartH - margin.top - margin.bottom;

        // ── Scales ───────────────────────────────────────────────────────────
        const xMax = d3.max(allX) ?? 0;
        const xMin = d3.min(allX) ?? 0;
        const yMax = d3.max(allY) ?? 0;
        const yMin = d3.min(allY) ?? 0;
        const xPad = (xMax - xMin) * 0.06 || 1;
        const yPad = (yMax - yMin) * 0.06 || 1;

        const xScale = d3
            .scaleLinear()
            .domain([xMin - xPad, xMax + xPad])
            .nice()
            .range([0, innerW]);

        const yScale = d3
            .scaleLinear()
            .domain([yMin - yPad, yMax + yPad])
            .nice()
            .range([innerH, 0]);

        // ── SVG root ─────────────────────────────────────────────────────────
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        svg.attr("width", chartW).attr("height", chartH).attr("viewBox", `0 0 ${chartW} ${chartH}`)
            .attr("style", "max-width:100%;height:auto;");

        // Clip path so points don't overflow the plot area
        const clipId = "kmedoids-scatter-clip";
        svg.append("defs").append("clipPath").attr("id", clipId)
            .append("rect").attr("width", innerW).attr("height", innerH);

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        // ── Grid ─────────────────────────────────────────────────────────────
        g.append("g")
            .attr("class", "grid-x")
            .attr("transform", `translate(0,${innerH})`)
            .call(
                d3.axisBottom(xScale).tickSize(-innerH).tickFormat(() => "")
            )
            .call((sel) => {
                sel.select(".domain").remove();
                sel.selectAll("line")
                    .attr("stroke", "hsl(var(--border))")
                    .attr("stroke-opacity", 0.4)
                    .attr("stroke-dasharray", "3,3");
            });

        g.append("g")
            .attr("class", "grid-y")
            .call(
                d3.axisLeft(yScale).tickSize(-innerW).tickFormat(() => "")
            )
            .call((sel) => {
                sel.select(".domain").remove();
                sel.selectAll("line")
                    .attr("stroke", "hsl(var(--border))")
                    .attr("stroke-opacity", 0.4)
                    .attr("stroke-dasharray", "3,3");
            });

        // ── Axes ─────────────────────────────────────────────────────────────
        const fmtTick = (v: d3.NumberValue) => {
            const n = +v;
            if (Math.abs(n) >= 1e4) return d3.format(".2e")(n);
            if (Number.isInteger(n)) return String(n);
            return d3.format(".2f")(n);
        };

        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale).ticks(6).tickFormat(fmtTick as (n: d3.NumberValue) => string))
            .call((sel) => {
                sel.select(".domain").attr("stroke", "hsl(var(--border))");
                sel.selectAll("text")
                    .attr("fill", "hsl(var(--muted-foreground))")
                    .attr("font-size", "11px");
                sel.selectAll("line").attr("stroke", "hsl(var(--border))");
            });

        g.append("g")
            .call(d3.axisBottom(xScale).ticks(6).tickFormat(fmtTick as (n: d3.NumberValue) => string))
            .call((sel) => {
                sel.select(".domain").attr("stroke", "hsl(var(--border))");
                sel.selectAll("text")
                    .attr("fill", "hsl(var(--muted-foreground))")
                    .attr("font-size", "11px");
                sel.selectAll("line").attr("stroke", "hsl(var(--border))");
            });

        // Axis labels
        g.append("text")
            .attr("text-anchor", "middle")
            .attr("x", innerW / 2)
            .attr("y", innerH + 40)
            .attr("font-size", "12px")
            .attr("fill", "hsl(var(--foreground))")
            .text(xLabel);

        g.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${-42},${innerH / 2}) rotate(-90)`)
            .attr("font-size", "12px")
            .attr("fill", "hsl(var(--foreground))")
            .text(yLabel);

        // ── Data points (clipped) ─────────────────────────────────────────────
        const plotG = g.append("g").attr("clip-path", `url(#${clipId})`);

        const tooltipNode = tooltipRef.current;
        const containerNode = containerRef.current;
        if (!tooltipNode || !containerNode) return;
        const tooltip = d3.select(tooltipNode);

        const showTooltip = (
            event: MouseEvent,
            html: string
        ) => {
            tooltip
                .style("opacity", "1")
                .style("pointer-events", "none")
                .html(html);
            moveTooltip(event);
        };

        const moveTooltip = (event: MouseEvent) => {
            const rect = containerNode.getBoundingClientRect();
            const tx = event.clientX - rect.left + 12;
            const ty = event.clientY - rect.top - 28;
            tooltip.style("left", `${tx}px`).style("top", `${ty}px`);
        };

        const hideTooltip = () => tooltip.style("opacity", "0");

        // Regular points
        plotG
            .selectAll<SVGCircleElement, ScatterPoint>("circle.pt")
            .data(validPoints)
            .join("circle")
            .attr("class", "pt")
            .attr("cx", (d) => xScale(d.x))
            .attr("cy", (d) => yScale(d.y))
            .attr("r", 5)
            .attr("fill", (d) => colorMap.get(d.cluster) ?? "#888")
            .attr("fill-opacity", 0.72)
            .attr("stroke", (d) => colorMap.get(d.cluster) ?? "#888")
            .attr("stroke-width", 0.6)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => {
                d3.select(event.currentTarget as Element)
                    .attr("r", 7)
                    .attr("fill-opacity", 1);
                showTooltip(
                    event,
                    `<strong>${d.label ?? `(${d.x.toFixed(3)}, ${d.y.toFixed(3)})`}</strong>
                     <br/>Cluster: ${d.cluster}
                     <br/>${xLabel}: ${d.x.toFixed(4)}
                     <br/>${yLabel}: ${d.y.toFixed(4)}`
                );
            })
            .on("mousemove", (event) => moveTooltip(event))
            .on("mouseleave", (event) => {
                d3.select(event.currentTarget as Element)
                    .attr("r", 5)
                    .attr("fill-opacity", 0.72);
                hideTooltip();
            });

        // Medoid stars (drawn on top)
        plotG
            .selectAll<SVGPathElement, MedoidPoint>("path.medoid")
            .data(validMedoids)
            .join("path")
            .attr("class", "medoid")
            .attr("d", STAR)
            .attr("transform", (d) =>
                `translate(${xScale(d.x)},${yScale(d.y)})`
            )
            .attr("fill", "#fbbf24")
            .attr("stroke", "#78350f")
            .attr("stroke-width", 1.8)
            .style("cursor", "pointer")
            .attr("filter", "drop-shadow(0 1px 2px rgba(0,0,0,.35))")
            .on("mouseover", (event, d) => {
                d3.select(event.currentTarget as Element)
                    .attr("transform",
                        `translate(${xScale(d.x)},${yScale(d.y)}) scale(1.3)`
                    );
                showTooltip(
                    event,
                    `<strong>★ Medoid – Cluster ${d.cluster}</strong>
                     <br/>${xLabel}: ${d.x.toFixed(4)}
                     <br/>${yLabel}: ${d.y.toFixed(4)}`
                );
            })
            .on("mousemove", (event) => moveTooltip(event))
            .on("mouseleave", (event, d) => {
                d3.select(event.currentTarget as Element)
                    .attr("transform",
                        `translate(${xScale(d.x)},${yScale(d.y)})`
                    );
                hideTooltip();
            });

        // ── Legend ────────────────────────────────────────────────────────────
        const lx = chartW - margin.right + 16;
        const legendG = svg.append("g").attr("transform", `translate(${lx},${margin.top + 4})`);

        legendG.append("text")
            .attr("x", 0).attr("y", 0)
            .attr("font-size", "11px").attr("font-weight", "700")
            .attr("fill", "hsl(var(--foreground))")
            .text("Klaster");

        // Cluster entries
        clusterIds.forEach((id, i) => {
            const gy = 20 + i * 22;
            const color = colorMap.get(id) ?? "#888";

            legendG.append("circle")
                .attr("cx", 7).attr("cy", gy)
                .attr("r", 6)
                .attr("fill", color)
                .attr("fill-opacity", 0.8);

            legendG.append("text")
                .attr("x", 17).attr("y", gy + 4)
                .attr("font-size", "11px")
                .attr("fill", "hsl(var(--foreground))")
                .text(`Cluster ${id}`);
        });

        // Medoid entry
        const medoidLegendY = 20 + clusterIds.length * 22 + 12;
        legendG.append("line")
            .attr("x1", 0).attr("y1", medoidLegendY - 8)
            .attr("x2", legendWidth - 4).attr("y2", medoidLegendY - 8)
            .attr("stroke", "hsl(var(--border))")
            .attr("stroke-dasharray", "3,3");

        legendG.append("path")
            .attr("d", STAR)
            .attr("transform", `translate(7,${medoidLegendY + 6})`)
            .attr("fill", "#fbbf24")
            .attr("stroke", "#78350f")
            .attr("stroke-width", 1.4);

        legendG.append("text")
            .attr("x", 17).attr("y", medoidLegendY + 6 + 4)
            .attr("font-size", "11px")
            .attr("fill", "hsl(var(--foreground))")
            .text("Medoid");

        // ── Title ─────────────────────────────────────────────────────────────
        svg.append("text")
            .attr("x", margin.left + innerW / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px").attr("font-weight", "700")
            .attr("fill", "hsl(var(--foreground))")
            .text(title);

        if (subtitle) {
            svg.append("text")
                .attr("x", margin.left + innerW / 2)
                .attr("y", 36)
                .attr("text-anchor", "middle")
                .attr("font-size", "11px")
                .attr("fill", "hsl(var(--muted-foreground))")
                .text(subtitle);
        }
    }, [points, medoids, xLabel, yLabel, title, subtitle, svgWidth, height]);

    return (
        <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
            <svg ref={svgRef} />
            {/* Tooltip */}
            <div
                ref={tooltipRef}
                style={{
                    position: "absolute",
                    opacity: 0,
                    background: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    fontSize: "12px",
                    lineHeight: "1.5",
                    boxShadow: "0 2px 8px rgba(0,0,0,.18)",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    transition: "opacity 0.1s",
                    zIndex: 50,
                }}
            />
        </div>
    );
};
