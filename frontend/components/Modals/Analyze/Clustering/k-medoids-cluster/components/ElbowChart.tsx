/**
 * ElbowChart
 * Dual-axis D3 line chart:
 *   – Left Y-axis  : Total Cost (WCSS)  — solid line
 *   – Right Y-axis : Silhouette Score   — dashed line
 * Optimal K is marked with a vertical annotation.
 * Current K (the chosen k) gets a distinct marker.
 */

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ElbowPoint } from "../types/output";

interface ElbowChartProps {
    data: ElbowPoint[];
    /** The K value that was ultimately chosen for the analysis. */
    currentK?: number;
    /** Method used to choose optimal k. */
    method?: "silhouette" | "elbow";
    /** Optional: K optimal from silhouette method (for manual mode display) */
    silhouetteOptimalK?: number;
    width?: number;
    height?: number;
}

export const ElbowChart: React.FC<ElbowChartProps> = ({
    data,
    currentK,
    method = "elbow",
    silhouetteOptimalK,
    width = 560,
    height = 420,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // ── Margins ──────────────────────────────────────────────────────────
        const margin = { top: 36, right: 64, bottom: 92, left: 64 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        // ── Resolved CSS tokens ───────────────────────────────────────────────
        const style = getComputedStyle(svgRef.current);
        const tok = (name: string, fallback: string) => {
            const v = style.getPropertyValue(name).trim();
            return v ? `hsl(${v})` : fallback;
        };
        const fgColor     = tok("--foreground",        "#374151");
        const mutedColor  = tok("--muted-foreground",  "#6b7280");
        const bgColor     = tok("--background",        "#ffffff");
        const borderColor = tok("--border",            "#e5e7eb");

        // ── Colours ───────────────────────────────────────────────────────────
        const wcssColor      = "#2563eb";   // blue  — WCSS line
        const silhColor      = "#16a34a";   // green — Silhouette line
        const optimalColor   = "#f59e0b";   // amber — optimal-K annotation
        const currentKColor  = "#8b5cf6";   // violet — chosen-K line

        // ── Find optimal K references ───────────────────────────────────────
        const hasSilhouette  = data.some(d => d.silhouetteScore !== 0);
        const hasWCSS        = data.some(d => d.totalCost !== 0);

        // Best K by silhouette (highest avg silhouette)
        let bestSilhouetteK: number | null = null;
        if (hasSilhouette) {
            const best = data.reduce((a, b) => b.silhouetteScore > a.silhouetteScore ? b : a);
            bestSilhouetteK = best.k;
        }
        // Elbow by second-derivative of WCSS (greatest "bend")
        let elbowK: number | null = null;
        if (hasWCSS && data.length >= 3) {
            let maxCurv = -Infinity;
            for (let i = 1; i < data.length - 1; i++) {
                const curv =
                    data[i - 1].totalCost -
                    2 * data[i].totalCost +
                    data[i + 1].totalCost;
                if (curv > maxCurv) { maxCurv = curv; elbowK = data[i].k; }
            }
        }

        // ── Scales ────────────────────────────────────────────────────────────
        const kValues = data.map(d => d.k);

        const xScale = d3.scalePoint<number>()
            .domain(kValues)
            .range([0, innerW])
            .padding(0.3);

        const wcssExtent = d3.extent(data, d => d.totalCost) as [number, number];
        const yWCSS = d3.scaleLinear()
            .domain([0, wcssExtent[1] * 1.08])
            .range([innerH, 0])
            .nice();

        const silhExtent = d3.extent(data, d => d.silhouetteScore) as [number, number];
        const silhPad = (silhExtent[1] - silhExtent[0]) * 0.15 || 0.05;
        const ySilh = d3.scaleLinear()
            .domain([Math.max(-0.25, silhExtent[0] - silhPad), Math.min(1.05, silhExtent[1] + silhPad)])
            .range([innerH, 0])
            .nice();

        // ── Root group ────────────────────────────────────────────────────────
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // ── Background ───────────────────────────────────────────────────────
        g.append("rect")
            .attr("width", innerW).attr("height", innerH)
            .attr("fill", "transparent");

        // ── Grid ─────────────────────────────────────────────────────────────
        g.append("g")
            .call(d3.axisLeft(yWCSS).ticks(6).tickSize(-innerW).tickFormat(() => ""))
            .call(ax => {
                ax.select(".domain").remove();
                ax.selectAll(".tick line")
                    .attr("stroke", borderColor)
                    .attr("stroke-opacity", 0.45);
            });

        const selectedOptimalK: number | null =
            (method === "elbow"
                ? (elbowK ?? currentK ?? bestSilhouetteK)
                : (bestSilhouetteK ?? elbowK ?? currentK)) ?? null;

        // ── Optimal-K vertical band ───────────────────────────────────────────
        if (selectedOptimalK !== null) {
            const ox = xScale(selectedOptimalK);
            if (ox !== undefined) {
                g.append("rect")
                    .attr("x", ox - 18).attr("y", 0)
                    .attr("width", 36).attr("height", innerH)
                    .attr("fill", optimalColor)
                    .attr("opacity", 0.08);
                g.append("line")
                    .attr("x1", ox).attr("x2", ox)
                    .attr("y1", 0).attr("y2", innerH)
                    .attr("stroke", optimalColor)
                    .attr("stroke-width", 1.5)
                    .attr("stroke-dasharray", "5,4");
                g.append("text")
                    .attr("x", ox).attr("y", -10)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "11")
                    .attr("font-weight", "600")
                    .attr("fill", optimalColor)
                    .text(`★ K optimal (${method}) = ${selectedOptimalK}`);
            }
        }

        // ── Elbow-K annotation (when different from optimal-K) ───────────────
        if (elbowK !== null && elbowK !== selectedOptimalK && hasWCSS) {
            const ex = xScale(elbowK);
            if (ex !== undefined) {
                g.append("line")
                    .attr("x1", ex).attr("x2", ex)
                    .attr("y1", 0).attr("y2", innerH)
                    .attr("stroke", wcssColor)
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "3,3")
                    .attr("opacity", 0.5);
            }
        }

        // ── Current-K vertical line ───────────────────────────────────────────
        if (currentK !== null && currentK !== undefined) {
            const cx2 = xScale(currentK);
            if (cx2 !== undefined) {
                g.append("line")
                    .attr("x1", cx2).attr("x2", cx2)
                    .attr("y1", 0).attr("y2", innerH)
                    .attr("stroke", currentKColor)
                    .attr("stroke-width", 2)
                    .attr("stroke-dasharray", "7,4");
                g.append("text")
                    .attr("x", cx2 + 5).attr("y", innerH - 8)
                    .attr("font-size", "10")
                    .attr("fill", currentKColor)
                    .text(`K terpilih = ${currentK}`);
            }
        }

        // ── Silhouette-Optimal-K annotation (for manual mode) ──────────────────
        if (silhouetteOptimalK !== null && silhouetteOptimalK !== undefined) {
            const sx = xScale(silhouetteOptimalK);
            if (sx !== undefined && silhouetteOptimalK !== selectedOptimalK) {
                g.append("line")
                    .attr("x1", sx).attr("x2", sx)
                    .attr("y1", 0).attr("y2", innerH)
                    .attr("stroke", silhColor)
                    .attr("stroke-width", 1.5)
                    .attr("stroke-dasharray", "4,3")
                    .attr("opacity", 0.7);
                g.append("text")
                    .attr("x", sx).attr("y", 12)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "10")
                    .attr("font-weight", "500")
                    .attr("fill", silhColor)
                    .text(`K optimal (silhouette) = ${silhouetteOptimalK}`);
            }
        }

        // ── Tooltip ───────────────────────────────────────────────────────────
        const parent = svgRef.current.parentElement;
        if (!parent) return;

        const tooltip = d3.select(parent)
            .selectAll<HTMLDivElement, unknown>(".ec-tooltip")
            .data([null])
            .join("div")
            .attr("class", "ec-tooltip")
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

        const showTooltip = (event: MouseEvent, d: ElbowPoint) => {
            const parent = svgRef.current?.parentElement;
            if (!parent) return;
            const [mx, my] = d3.pointer(event, parent);
            tooltip
                .style("opacity", "1")
                .style("left", `${mx + 14}px`)
                .style("top", `${my - 10}px`)
                .html(
                    `<strong>K = ${d.k}</strong>${d.k === selectedOptimalK ? " ★ Optimal" : ""}${d.k === currentK ? " ● Terpilih" : ""}<br/>${ 
                    hasWCSS ? `Total Cost: <strong>${d.totalCost.toFixed(2)}</strong><br/>` : "" 
                    }${hasSilhouette ? `Silhouette: <strong>${d.silhouetteScore.toFixed(4)}</strong>` : ""}`
                );
        };
        const hideTooltip = () => tooltip.style("opacity", "0");

        // ── WCSS line + dots ─────────────────────────────────────────────────
        if (hasWCSS) {
            const lineFn = d3.line<ElbowPoint>()
                .x(d => xScale(d.k) ?? 0)
                .y(d => yWCSS(d.totalCost))
                .curve(d3.curveMonotoneX);

            // Area fill under WCSS line
            const areaFn = d3.area<ElbowPoint>()
                .x(d => xScale(d.k) ?? 0)
                .y0(innerH)
                .y1(d => yWCSS(d.totalCost))
                .curve(d3.curveMonotoneX);

            g.append("path")
                .datum(data)
                .attr("d", areaFn)
                .attr("fill", wcssColor)
                .attr("opacity", 0.07);

            g.append("path")
                .datum(data)
                .attr("d", lineFn)
                .attr("fill", "none")
                .attr("stroke", wcssColor)
                .attr("stroke-width", 2.5);

            g.selectAll(".wcss-dot")
                .data(data)
                .join("circle")
                .attr("class", "wcss-dot")
                .attr("cx", d => xScale(d.k) ?? 0)
                .attr("cy", d => yWCSS(d.totalCost))
                .attr("r", d => d.k === elbowK ? 7 : 5)
                .attr("fill", d => d.k === elbowK ? wcssColor : bgColor)
                .attr("stroke", wcssColor)
                .attr("stroke-width", 2.5)
                .style("cursor", "pointer")
                .on("mouseover", (e, d) => showTooltip(e as MouseEvent, d))
                .on("mousemove", (e, d) => showTooltip(e as MouseEvent, d))
                .on("mouseleave", hideTooltip);
        }

        // ── Silhouette line + dots ────────────────────────────────────────────
        if (hasSilhouette) {
            const silhLine = d3.line<ElbowPoint>()
                .x(d => xScale(d.k) ?? 0)
                .y(d => ySilh(d.silhouetteScore))
                .curve(d3.curveMonotoneX);

            g.append("path")
                .datum(data)
                .attr("d", silhLine)
                .attr("fill", "none")
                .attr("stroke", silhColor)
                .attr("stroke-width", 2.5)
                .attr("stroke-dasharray", "7,4");

            g.selectAll(".silh-dot")
                .data(data)
                .join("circle")
                .attr("class", "silh-dot")
                .attr("cx", d => xScale(d.k) ?? 0)
                .attr("cy", d => ySilh(d.silhouetteScore))
                .attr("r", d => d.k === selectedOptimalK ? 7 : 5)
                .attr("fill", d => d.k === selectedOptimalK ? silhColor : bgColor)
                .attr("stroke", silhColor)
                .attr("stroke-width", 2.5)
                .style("cursor", "pointer")
                .on("mouseover", (e, d) => showTooltip(e as MouseEvent, d))
                .on("mousemove", (e, d) => showTooltip(e as MouseEvent, d))
                .on("mouseleave", hideTooltip);

            // Score labels above silhouette dots
            g.selectAll(".silh-label")
                .data(data)
                .join("text")
                .attr("class", "silh-label")
                .attr("x", d => xScale(d.k) ?? 0)
                .attr("y", d => ySilh(d.silhouetteScore) - 10)
                .attr("text-anchor", "middle")
                .attr("font-size", "10")
                .attr("fill", silhColor)
                .text(d => d.silhouetteScore.toFixed(3));
        }

        // ── Axes ──────────────────────────────────────────────────────────────
        // X
        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale).tickFormat(d => `K = ${d}`))
            .call(ax => {
                ax.select(".domain").attr("stroke", borderColor);
                ax.selectAll("text").attr("font-size", "12").attr("fill", fgColor);
            });

        // Left Y (WCSS)
        if (hasWCSS) {
            g.append("g")
                .call(d3.axisLeft(yWCSS).ticks(6).tickFormat(d => {
                    const v = +d;
                    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
                    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
                    return String(v);
                }))
                .call(ax => {
                    ax.select(".domain").attr("stroke", borderColor);
                    ax.selectAll("text").attr("font-size", "11").attr("fill", wcssColor);
                });

            g.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -innerH / 2).attr("y", -50)
                .attr("text-anchor", "middle")
                .attr("font-size", "12")
                .attr("fill", wcssColor)
                .text("Total Cost (WCSS)");
        }

        // Right Y (Silhouette)
        if (hasSilhouette) {
            g.append("g")
                .attr("transform", `translate(${innerW},0)`)
                .call(d3.axisRight(ySilh).ticks(6))
                .call(ax => {
                    ax.select(".domain").attr("stroke", borderColor);
                    ax.selectAll("text").attr("font-size", "11").attr("fill", silhColor);
                });

            g.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -innerH / 2).attr("y", innerW + 54)
                .attr("text-anchor", "middle")
                .attr("font-size", "12")
                .attr("fill", silhColor)
                .text("Silhouette Score");
        }

        // X axis label
        g.append("text")
            .attr("x", innerW / 2).attr("y", innerH + 46)
            .attr("text-anchor", "middle")
            .attr("font-size", "12")
            .attr("fill", mutedColor)
            .text("Jumlah Klaster (K)");

        // ── Legend ────────────────────────────────────────────────────────────
        const legendItems: { color: string; dash?: string; label: string }[] = [];
        if (hasWCSS)      legendItems.push({ color: wcssColor,     label: "Total Cost (WCSS)" });
        if (hasSilhouette) legendItems.push({ color: silhColor,    dash: "7,4", label: "Silhouette Score" });
        if (selectedOptimalK !== null) {
            legendItems.push({
                color: optimalColor,
                dash: "5,4",
                label: `Optimal K = ${selectedOptimalK}`,
            });
        }
        if (currentK)     legendItems.push({ color: currentKColor, dash: "7,4", label: `K terpilih = ${currentK}` });

        const legendG = svg.append("g")
            .attr("transform", `translate(${margin.left + 12},${height - 34})`);
        const maxLegendWidth = width - margin.left - margin.right - 24;
        const rowHeight = 18;
        const markerWidth = 20;
        const markerToTextGap = 6;
        const itemGap = 20;

        let lx = 0;
        let ly = 0;
        legendItems.forEach(({ color, dash, label }) => {
            // Measure actual text width so legend wraps cleanly on any viewport/font.
            const probe = legendG.append("text")
                .attr("font-size", "11")
                .attr("visibility", "hidden")
                .text(label);
            const textWidth = (probe.node() as SVGTextElement).getComputedTextLength();
            probe.remove();

            const itemWidth = markerWidth + markerToTextGap + textWidth + itemGap;
            if (lx > 0 && lx + itemWidth > maxLegendWidth) {
                lx = 0;
                ly += rowHeight;
            }

            legendG.append("line")
                .attr("x1", lx)
                .attr("x2", lx + markerWidth)
                .attr("y1", ly)
                .attr("y2", ly)
                .attr("stroke", color)
                .attr("stroke-width", 2.5)
                .attr("stroke-dasharray", dash ?? "none");

            legendG.append("text")
                .attr("x", lx + markerWidth + markerToTextGap)
                .attr("y", ly + 4)
                .attr("font-size", "11")
                .attr("fill", mutedColor)
                .text(label);

            lx += itemWidth;
        });

    }, [data, currentK, method, width, height, silhouetteOptimalK]);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                Data Elbow tidak tersedia (hanya muncul saat K otomatis digunakan)
            </div>
        );
    }

    return (
        <div className="relative w-full flex justify-center">
            <svg
                ref={svgRef}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={{ maxWidth: "100%", overflow: "visible" }}
            />
        </div>
    );
};
