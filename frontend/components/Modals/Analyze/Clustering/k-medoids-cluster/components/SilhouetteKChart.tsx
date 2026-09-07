/**
 * Silhouette Score vs Jumlah Klaster K
 *
 * Line chart that helps select the optimal number of clusters by plotting the
 * average silhouette score for each tested K value.
 *
 * Zones (background bands):
 *   ≥ 0.70  → green   "Sangat Baik"
 *   0.50–0.70 → blue  "Baik"
 *   0.30–0.50 → amber "Cukup"
 *   < 0.30  → red     "Lemah"
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SilhouetteKPoint {
    k: number;
    silhouetteScore: number;
}

export interface SilhouetteKChartProps {
    data: SilhouetteKPoint[];
    /** K currently used in this analysis run (shown as a dashed vertical line). */
    currentK?: number;
    width?: number;
    height?: number;
}

// ─── Interpretation zones ─────────────────────────────────────────────────────

const ZONES = [
    { lo: 0.70, hi: 1.00, color: "#16a34a", label: "Sangat Baik (≥ 0.70)" },
    { lo: 0.50, hi: 0.70, color: "#2563eb", label: "Baik (0.50 – 0.70)" },
    { lo: 0.30, hi: 0.50, color: "#d97706", label: "Cukup (0.30 – 0.50)" },
    { lo: -1.0, hi: 0.30, color: "#dc2626", label: "Lemah (< 0.30)" },
] as const;

type AxisStyleSelection = d3.Selection<SVGGElement, unknown, null, undefined>;

function zoneColor(score: number): string {
    if (score >= 0.70) return "#16a34a";
    if (score >= 0.50) return "#2563eb";
    if (score >= 0.30) return "#d97706";
    return "#dc2626";
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SilhouetteKChart: React.FC<SilhouetteKChartProps> = ({
    data,
    currentK,
    width = 680,
    height = 380,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
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
        if (!svgRef.current || data.length === 0) return;

        const sorted = [...data].sort((a, b) => a.k - b.k);
        const optimalPoint = sorted.reduce(
            (best, p) => (p.silhouetteScore > best.silhouetteScore ? p : best),
            sorted[0]
        );

        // ── Layout ────────────────────────────────────────────────────────
        const margin = { top: 52, right: 32, bottom: 58, left: 62 };
        const chartW = svgWidth;
        const chartH = height;
        const innerW = chartW - margin.left - margin.right;
        const innerH = chartH - margin.top - margin.bottom;

        // ── Scales ────────────────────────────────────────────────────────
        const kValues = sorted.map((d) => d.k);
        const allScores = sorted.map((d) => d.silhouetteScore);
        const yMin = Math.min(0, ...allScores) - 0.05;
        const yMax = Math.max(1, ...allScores) + 0.05;

        const xScale = d3
            .scalePoint<number>()
            .domain(kValues)
            .range([0, innerW])
            .padding(0.3);

        const yScale = d3
            .scaleLinear()
            .domain([yMin, yMax])
            .nice()
            .range([innerH, 0]);

        // ── SVG root ──────────────────────────────────────────────────────
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        svg.attr("width", chartW)
            .attr("height", chartH)
            .attr("viewBox", `0 0 ${chartW} ${chartH}`)
            .attr("style", "max-width:100%;height:auto;");

        const g = svg
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Clip path
        const clipId = "sil-k-clip";
        svg.append("defs")
            .append("clipPath")
            .attr("id", clipId)
            .append("rect")
            .attr("width", innerW)
            .attr("height", innerH);

        // ── Background quality bands ──────────────────────────────────────
        ZONES.forEach(({ lo, hi, color }) => {
            const y0 = yScale(Math.min(hi, yMax));
            const y1 = yScale(Math.max(lo, yMin));
            if (y1 <= y0) return;
            g.append("rect")
                .attr("x", 0)
                .attr("y", y0)
                .attr("width", innerW)
                .attr("height", y1 - y0)
                .attr("fill", color)
                .attr("fill-opacity", 0.06);
        });

        // Zone boundary lines
        [0.3, 0.5, 0.7].forEach((threshold) => {
            if (threshold < yMin || threshold > yMax) return;
            g.append("line")
                .attr("x1", 0)
                .attr("x2", innerW)
                .attr("y1", yScale(threshold))
                .attr("y2", yScale(threshold))
                .attr("stroke", zoneColor(threshold))
                .attr("stroke-opacity", 0.35)
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "6,4");

            g.append("text")
                .attr("x", innerW + 4)
                .attr("y", yScale(threshold) + 4)
                .attr("font-size", "9px")
                .attr("fill", zoneColor(threshold))
                .attr("fill-opacity", 0.7)
                .text(threshold.toFixed(1));
        });

        // ── Grid lines (Y-axis) ───────────────────────────────────────────
        g.append("g")
            .call(
                d3
                    .axisLeft(yScale)
                    .ticks(6)
                    .tickSize(-innerW)
                    .tickFormat(() => "")
            )
            .call((sel) => {
                sel.select(".domain").remove();
                sel.selectAll("line")
                    .attr("stroke", "hsl(var(--border))")
                    .attr("stroke-opacity", 0.3)
                    .attr("stroke-dasharray", "3,3");
            });

        // ── Axes ──────────────────────────────────────────────────────────
        const axisStyle = (sel: AxisStyleSelection) => {
            sel.select(".domain").attr("stroke", "hsl(var(--border))");
            sel.selectAll("text")
                .attr("fill", "hsl(var(--muted-foreground))")
                .attr("font-size", "11px");
            sel.selectAll("line").attr(
                "stroke",
                "hsl(var(--border))"
            );
        };

        // X axis — integer ticks for K
        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(
                d3
                    .axisBottom(xScale)
                    .tickValues(kValues)
                    .tickFormat((d) => String(d))
            )
            .call(axisStyle);

        // Y axis
        g.append("g")
            .call(
                d3
                    .axisLeft(yScale)
                    .ticks(6)
                    .tickFormat(d3.format(".2f"))
            )
            .call(axisStyle);

        // Axis labels
        g.append("text")
            .attr("text-anchor", "middle")
            .attr("x", innerW / 2)
            .attr("y", innerH + 46)
            .attr("font-size", "12px")
            .attr("fill", "hsl(var(--foreground))")
            .text("Jumlah Klaster (K)");

        g.append("text")
            .attr("text-anchor", "middle")
            .attr(
                "transform",
                `translate(${-46},${innerH / 2}) rotate(-90)`
            )
            .attr("font-size", "12px")
            .attr("fill", "hsl(var(--foreground))")
            .text("Silhouette Score");

        // ── Current-K reference line ──────────────────────────────────────
        if (currentK !== null && currentK !== undefined) {
            const cx = xScale(currentK);
            if (cx !== undefined) {
                g.append("line")
                    .attr("x1", cx)
                    .attr("x2", cx)
                    .attr("y1", 0)
                    .attr("y2", innerH)
                    .attr("stroke", "hsl(var(--foreground))")
                    .attr("stroke-opacity", 0.35)
                    .attr("stroke-width", 1.5)
                    .attr("stroke-dasharray", "6,4");

                g.append("text")
                    .attr("x", cx + 5)
                    .attr("y", 10)
                    .attr("font-size", "9px")
                    .attr("fill", "hsl(var(--muted-foreground))")
                    .text(`K aktif = ${currentK}`);
            }
        }

        // ── Area fill under line ──────────────────────────────────────────
        const area = d3
            .area<SilhouetteKPoint>()
            .x((d) => xScale(d.k) ?? 0)
            .y0(innerH)
            .y1((d) => yScale(d.silhouetteScore))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(sorted)
            .attr("clip-path", `url(#${clipId})`)
            .attr("d", area)
            .attr("fill", "hsl(var(--primary))")
            .attr("fill-opacity", 0.07);

        // ── Line ──────────────────────────────────────────────────────────
        const line = d3
            .line<SilhouetteKPoint>()
            .x((d) => xScale(d.k) ?? 0)
            .y((d) => yScale(d.silhouetteScore))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(sorted)
            .attr("clip-path", `url(#${clipId})`)
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", "hsl(var(--primary))")
            .attr("stroke-width", 2.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round");

        // ── Tooltip helpers ───────────────────────────────────────────────
        const tooltipNode = tooltipRef.current;
        const containerNode = containerRef.current;
        if (!tooltipNode || !containerNode) return;
        const ttip = d3.select(tooltipNode);
        const showTip = (event: MouseEvent, html: string) => {
            ttip.style("opacity", "1").html(html);
            const rect = containerNode.getBoundingClientRect();
            ttip
                .style("left", `${event.clientX - rect.left + 14}px`)
                .style("top", `${event.clientY - rect.top - 36}px`);
        };
        const hideTip = () => ttip.style("opacity", "0");

        // ── Data points ───────────────────────────────────────────────────
        g.selectAll("circle.pt")
            .data(sorted)
            .join("circle")
            .attr("class", "pt")
            .attr("cx", (d) => xScale(d.k) ?? 0)
            .attr("cy", (d) => yScale(d.silhouetteScore))
            .attr("r", (d) => (d.k === optimalPoint.k ? 7 : 5))
            .attr("fill", (d) =>
                d.k === optimalPoint.k
                    ? zoneColor(d.silhouetteScore)
                    : "hsl(var(--primary))"
            )
            .attr("stroke", "hsl(var(--background))")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                d3.select(this).attr("r", 8).attr("stroke-width", 3);
                const qual =
                    d.silhouetteScore >= 0.7
                        ? "Sangat Baik"
                        : d.silhouetteScore >= 0.5
                        ? "Baik"
                        : d.silhouetteScore >= 0.3
                        ? "Cukup"
                        : "Lemah";
                showTip(
                    event,
                    `<strong>K = ${d.k}</strong><br/>` +
                        `Silhouette: <strong>${d.silhouetteScore.toFixed(4)}</strong><br/>` +
                        `Kualitas: <span style="color:${zoneColor(d.silhouetteScore)}">${qual}</span>${ 
                        d.k === optimalPoint.k
                            ? `<br/><strong style="color:${zoneColor(d.silhouetteScore)}">★ K Optimal</strong>`
                            : ""}`
                );
            })
            .on("mousemove", (event) => {
                const container = containerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                ttip
                    .style("left", `${event.clientX - rect.left + 14}px`)
                    .style("top", `${event.clientY - rect.top - 36}px`);
            })
            .on("mouseleave", function (_, d) {
                d3.select(this)
                    .attr("r", d.k === optimalPoint.k ? 7 : 5)
                    .attr("stroke-width", 2);
                hideTip();
            });

        // Score label above each point
        g.selectAll("text.score-lbl")
            .data(sorted)
            .join("text")
            .attr("class", "score-lbl")
            .attr("x", (d) => xScale(d.k) ?? 0)
            .attr("y", (d) => yScale(d.silhouetteScore) - 10)
            .attr("text-anchor", "middle")
            .attr("font-size", (d) => (d.k === optimalPoint.k ? "11px" : "9px"))
            .attr("font-weight", (d) => (d.k === optimalPoint.k ? "700" : "400"))
            .attr("fill", (d) =>
                d.k === optimalPoint.k
                    ? zoneColor(d.silhouetteScore)
                    : "hsl(var(--muted-foreground))"
            )
            .attr("pointer-events", "none")
            .text((d) => d.silhouetteScore.toFixed(3));

        // Optimal K annotation
        const ox = xScale(optimalPoint.k) ?? 0;
        const oy = yScale(optimalPoint.silhouetteScore);
        g.append("text")
            .attr("x", ox)
            .attr("y", oy - 22)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "700")
            .attr("fill", zoneColor(optimalPoint.silhouetteScore))
            .text(`★ K = ${optimalPoint.k} (Optimal)`);

        // ── Title ─────────────────────────────────────────────────────────
        svg.append("text")
            .attr("x", margin.left + innerW / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "700")
            .attr("fill", "hsl(var(--foreground))")
            .text("Silhouette Score vs Jumlah Klaster K");

        svg.append("text")
            .attr("x", margin.left + innerW / 2)
            .attr("y", 36)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", "hsl(var(--muted-foreground))")
            .text("Nilai silhouette lebih tinggi menunjukkan struktur klaster yang lebih baik");
    }, [data, currentK, svgWidth, height]);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                Data silhouette per K tidak tersedia.
                <br />
                Jalankan analisis dengan pemilihan K otomatis untuk melihat grafik ini.
            </div>
        );
    }

    return (
        <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
            <svg ref={svgRef} />
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
                    lineHeight: "1.6",
                    boxShadow: "0 2px 10px rgba(0,0,0,.18)",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    transition: "opacity 0.1s",
                    zIndex: 50,
                }}
            />
            {/* Zone legend */}
            <div className="flex flex-wrap gap-3 justify-center mt-2 text-xs text-muted-foreground">
                {ZONES.map((z) => (
                    <span key={z.label} className="flex items-center gap-1">
                        <span
                            style={{
                                display: "inline-block",
                                width: 10,
                                height: 10,
                                borderRadius: 2,
                                background: z.color,
                                opacity: 0.7,
                            }}
                        />
                        {z.label}
                    </span>
                ))}
            </div>
        </div>
    );
};
