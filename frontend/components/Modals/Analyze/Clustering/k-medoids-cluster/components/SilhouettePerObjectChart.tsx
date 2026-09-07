/**
 * SilhouettePerObjectChart
 * Silhouette plot in the classic R style (cluster::silhouette / factoextra::fviz_silhouette):
 * objects are sorted descending inside each cluster and drawn as a solid band, with the
 * cluster size and mean silhouette annotated on the right and the overall mean as a
 * dashed reference line.
 *
 * The plot height is fixed, so the chart stays readable for any n: each cluster gets a band
 * proportional to its size and the objects inside it are binned down to one bar per pixel row.
 * There is no per-object interaction — hovering summarises a whole cluster instead.
 */

import React, { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import type { ObjectAssignment } from "../types/output";

interface SilhouettePerObjectChartProps {
    assignments: ObjectAssignment[];
    overall: number;
    width?: number;
    /** Total SVG height. Fixed — it does not grow with the number of objects. */
    height?: number;
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

interface ClusterGroup {
    label: number;
    /** Silhouette scores, sorted descending. */
    scores: number[];
    count: number;
    mean: number;
    min: number;
    max: number;
    negatives: number;
}

const GAP_BETWEEN_CLUSTERS = 6;
const MIN_BAND_H = 8;

export const SilhouettePerObjectChart: React.FC<SilhouettePerObjectChartProps> = ({
    assignments,
    overall,
    width = 700,
    height = 460,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    // ── Aggregate once per data change (n can be very large) ─────────────────
    const { groups, total, dataMin } = useMemo(() => {
        const byCluster = new Map<number, number[]>();
        let min = Infinity;
        let n = 0;

        for (const a of assignments) {
            const s = a.silhouetteScore;
            if (typeof s !== "number" || !isFinite(s)) continue;
            let arr = byCluster.get(a.clusterLabel);
            if (!arr) byCluster.set(a.clusterLabel, (arr = []));
            arr.push(s);
            if (s < min) min = s;
            n++;
        }

        const gs: ClusterGroup[] = Array.from(byCluster.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([label, scores]) => {
                scores.sort((a, b) => b - a);
                let sum = 0;
                let negatives = 0;
                for (const s of scores) {
                    sum += s;
                    if (s < 0) negatives++;
                }
                return {
                    label,
                    scores,
                    count: scores.length,
                    mean: sum / scores.length,
                    min: scores[scores.length - 1],
                    max: scores[0],
                    negatives,
                };
            });

        return { groups: gs, total: n, dataMin: isFinite(min) ? min : 0 };
    }, [assignments]);

    const numClusters = groups.length;

    useEffect(() => {
        if (!svgRef.current || total === 0) return;
        const svgEl = svgRef.current;

        const svg = d3.select(svgEl);
        svg.selectAll("*").remove();

        // ── CSS tokens ────────────────────────────────────────────────────────
        const style = getComputedStyle(svgEl);
        const tok = (name: string, fallback: string) => {
            const v = style.getPropertyValue(name).trim();
            return v ? `hsl(${v})` : fallback;
        };
        const fgColor     = tok("--foreground",       "#374151");
        const mutedColor  = tok("--muted-foreground", "#6b7280");
        const bgColor     = tok("--background",       "#ffffff");
        const borderColor = tok("--border",           "#e5e7eb");

        const margin = { top: 46, right: 132, bottom: 54, left: 74 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;
        if (innerW <= 0 || innerH <= 0) return;

        // ── X scale: R keeps 0..1 and lets negatives run left of zero ─────────
        const xScale = d3.scaleLinear()
            .domain([Math.min(0, dataMin), 1])
            .range([0, innerW]);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // ── Band heights: proportional to cluster size, with a floor ──────────
        const available = innerH - Math.max(0, numClusters - 1) * GAP_BETWEEN_CLUSTERS;
        const rawBands = groups.map(gr => (available * gr.count) / total);
        const pinned = rawBands.map(h => h < MIN_BAND_H);
        const pinnedTotal = pinned.reduce((acc, p) => acc + (p ? MIN_BAND_H : 0), 0);
        const flexibleRaw = rawBands.reduce((acc, h, i) => acc + (pinned[i] ? 0 : h), 0);
        const flexibleRoom = Math.max(0, available - pinnedTotal);
        const bands = rawBands.map((h, i) =>
            pinned[i] ? MIN_BAND_H : (flexibleRaw > 0 ? (flexibleRoom * h) / flexibleRaw : 0)
        );

        // ── Negative region tint ──────────────────────────────────────────────
        const x0 = xScale(0);
        if (x0 > 0) {
            g.append("rect")
                .attr("x", 0).attr("y", 0)
                .attr("width", x0).attr("height", innerH)
                .attr("fill", "#ef4444")
                .attr("opacity", 0.06);
        }

        // ── Grid ─────────────────────────────────────────────────────────────
        g.append("g")
            .call(d3.axisTop(xScale).ticks(6).tickSize(-innerH).tickFormat(() => ""))
            .call(ax => {
                ax.select(".domain").remove();
                ax.selectAll(".tick line")
                    .attr("stroke", borderColor)
                    .attr("stroke-opacity", 0.45);
            });

        // ── Bars: one rect per pixel row, never one per object ────────────────
        interface BarDatum { x: number; y: number; w: number; h: number; fill: string }
        const bars: BarDatum[] = [];
        const bandTops: number[] = [];

        let yOffset = 0;
        groups.forEach((gr, ci) => {
            bandTops.push(yOffset);
            const bandH = bands[ci];
            const color = clusterColor(ci, numClusters);

            // At most one bar per pixel row; fewer objects than rows means one bar each.
            const rows = Math.max(1, Math.min(gr.count, Math.floor(bandH)));
            const barH = bandH / rows;
            const inset = barH > 3 ? 1 : 0;

            for (let r = 0; r < rows; r++) {
                const start = Math.floor((r * gr.count) / rows);
                const end = Math.max(start + 1, Math.floor(((r + 1) * gr.count) / rows));
                let sum = 0;
                for (let i = start; i < end; i++) sum += gr.scores[i];
                const value = sum / (end - start);

                const xv = xScale(value);
                bars.push({
                    x: Math.min(x0, xv),
                    y: yOffset + r * barH,
                    w: Math.max(Math.abs(xv - x0), 0.8),
                    h: Math.max(barH - inset, 0.8),
                    fill: color,
                });
            }

            yOffset += bandH + GAP_BETWEEN_CLUSTERS;
        });

        g.append("g")
            .selectAll("rect")
            .data(bars)
            .join("rect")
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("width", d => d.w)
            .attr("height", d => d.h)
            .attr("fill", d => d.fill)
            .attr("shape-rendering", "crispEdges");

        // ── Zero line ─────────────────────────────────────────────────────────
        g.append("line")
            .attr("x1", x0).attr("x2", x0)
            .attr("y1", 0).attr("y2", innerH)
            .attr("stroke", borderColor)
            .attr("stroke-width", 1.5);

        // ── Overall mean line ─────────────────────────────────────────────────
        const xOverall = xScale(overall);
        g.append("line")
            .attr("x1", xOverall).attr("x2", xOverall)
            .attr("y1", -6).attr("y2", innerH)
            .attr("stroke", "#6366f1")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "6,4");

        // ── Cluster labels (left) and R-style annotation (right) ──────────────
        const annotationX = innerW + 12;
        g.append("text")
            .attr("x", annotationX)
            .attr("y", -14)
            .attr("font-size", "10")
            .attr("font-weight", "600")
            .attr("fill", mutedColor)
            .text("n | rata-rata sᵢ");

        groups.forEach((gr, ci) => {
            const midY = bandTops[ci] + bands[ci] / 2;
            const color = clusterColor(ci, numClusters);

            g.append("text")
                .attr("x", -10)
                .attr("y", midY)
                .attr("text-anchor", "end")
                .attr("dominant-baseline", "middle")
                .attr("font-size", "11")
                .attr("font-weight", "600")
                .attr("fill", color)
                .text(`Cluster ${gr.label}`);

            g.append("text")
                .attr("x", annotationX)
                .attr("y", midY)
                .attr("dominant-baseline", "middle")
                .attr("font-size", "11")
                .attr("fill", mutedColor)
                .text(`${gr.count} | ${gr.mean.toFixed(2)}`);
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
            .attr("y", innerH + 40)
            .attr("text-anchor", "middle")
            .attr("font-size", "12")
            .attr("fill", mutedColor)
            .text("Silhouette Score (sᵢ)");

        // ── Header ────────────────────────────────────────────────────────────
        svg.append("text")
            .attr("x", margin.left)
            .attr("y", 18)
            .attr("font-size", "12")
            .attr("font-weight", "600")
            .attr("fill", fgColor)
            .text(`n = ${total.toLocaleString("id-ID")} objek, ${numClusters} cluster`);

        svg.append("text")
            .attr("x", margin.left)
            .attr("y", 34)
            .attr("font-size", "11")
            .attr("fill", "#6366f1")
            .text(`Rata-rata silhouette keseluruhan: ${overall.toFixed(3)} (${qualityLabel(overall)})`);

        // ── Cluster-level hover (one overlay per cluster, not per object) ─────
        const parent = svgEl.parentElement;
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

        const moveTooltip = (event: MouseEvent) => {
            const [mx, my] = d3.pointer(event, parent);
            tooltip.style("left", `${mx + 14}px`).style("top", `${my - 10}px`);
        };

        g.append("g")
            .selectAll("rect")
            .data(groups.map((gr, ci) => ({ gr, ci })))
            .join("rect")
            .attr("x", 0)
            .attr("y", d => bandTops[d.ci])
            .attr("width", innerW)
            .attr("height", d => bands[d.ci])
            .attr("fill", "transparent")
            .style("cursor", "default")
            .on("mouseover", function (event, d) {
                const { gr } = d;
                const negPct = (gr.negatives / gr.count) * 100;
                tooltip
                    .style("opacity", "1")
                    .html(
                        `<strong>Cluster ${gr.label}</strong><br/>` +
                        `Jumlah objek: <strong>${gr.count.toLocaleString("id-ID")}</strong><br/>` +
                        `Rata-rata sᵢ: <strong style="color:${qualityColor(gr.mean)}">${gr.mean.toFixed(4)}</strong> (${qualityLabel(gr.mean)})<br/>` +
                        `Rentang: ${gr.min.toFixed(3)} – ${gr.max.toFixed(3)}<br/>` +
                        `sᵢ negatif: <strong>${gr.negatives.toLocaleString("id-ID")}</strong> (${negPct.toFixed(1)}%)`
                    );
                moveTooltip(event as MouseEvent);
            })
            .on("mousemove", (event) => moveTooltip(event as MouseEvent))
            .on("mouseleave", () => { tooltip.style("opacity", "0"); });

    }, [groups, total, dataMin, overall, width, height, numClusters]);

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                Data silhouette per objek tidak tersedia
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
                style={{ maxWidth: "100%" }}
            />
        </div>
    );
};
