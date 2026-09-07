/**
 * K-Medoids Radar Chart
 * Visualizes cluster attribute profiles using a D3-based SVG radar chart.
 * Each cluster is drawn as a separate polygon over shared variable axes.
 * Values are min-max normalized per variable so different-scale attributes
 * are comparable on the same chart.
 */

"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { KMedoidsOutput } from "../types/output";

interface KMedoidsRadarChartProps {
    output: KMedoidsOutput;
    variables: { name: string; label?: string }[];
    width?: number;
    height?: number;
}

/** Generate a cluster color using the same HSL pattern used elsewhere in the module. */
function clusterColor(idx: number, total: number, alpha = 1): string {
    const hue = (idx * 360) / Math.max(total, 1);
    return alpha < 1
        ? `hsla(${hue}, 70%, 50%, ${alpha})`
        : `hsl(${hue}, 70%, 50%)`;
}

/** Truncate text to maxLen characters, appending "…" if needed. */
function truncate(text: string, maxLen = 14): string {
    return text.length > maxLen ? `${text.slice(0, maxLen - 1)  }…` : text;
}

export const KMedoidsRadarChart: React.FC<KMedoidsRadarChartProps> = ({
    output,
    variables,
    width = 520,
    height = 480,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const profiles = output?.clusterProfiles;
        if (!profiles?.length || variables.length < 2) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const margin = { top: 55, right: 110, bottom: 40, left: 55 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;
        const radius = Math.min(innerW, innerH) / 2;
        const cx = margin.left + innerW / 2;
        const cy = margin.top + innerH / 2;

        const varNames = variables.map((v) => v.name);
        const n = varNames.length;
        const numClusters = profiles.length;
        const levels = 5;

        // ── Per-variable min/max for normalization ──────────────────────────
        const varExtents: Record<string, [number, number]> = {};
        varNames.forEach((v) => {
            const vals = profiles
                .map((p) => p.meanAttributes?.[v] ?? 0)
                .filter((x) => isFinite(x));
            const lo = Math.min(...vals);
            const hi = Math.max(...vals);
            varExtents[v] = [lo, hi];
        });

        const normalize = (v: string, val: number): number => {
            const [lo, hi] = varExtents[v];
            if (hi === lo) return 0.5;
            // Map to [0.1, 1.0] so even the smallest value is visible
            return 0.1 + (0.9 * (val - lo)) / (hi - lo);
        };

        // ── Geometry helpers ────────────────────────────────────────────────
        const angleSlice = (2 * Math.PI) / n;
        const axisAngle = (i: number) => i * angleSlice - Math.PI / 2;

        const rScale = d3.scaleLinear().domain([0, 1]).range([0, radius]);

        const ptX = (normVal: number, i: number) =>
            cx + rScale(normVal) * Math.cos(axisAngle(i));
        const ptY = (normVal: number, i: number) =>
            cy + rScale(normVal) * Math.sin(axisAngle(i));

        const g = svg.append("g");

        // ── Grid circles ────────────────────────────────────────────────────
        for (let lvl = 1; lvl <= levels; lvl++) {
            const r = (radius / levels) * lvl;
            g.append("circle")
                .attr("cx", cx)
                .attr("cy", cy)
                .attr("r", r)
                .attr("fill", "none")
                .attr("stroke", "hsl(var(--border))")
                .attr("stroke-opacity", 0.8)
                .attr("stroke-width", lvl === levels ? 1.5 : 1)
                .attr("stroke-dasharray", "4,3");

            // Level label positioned just inside the top axis
            g.append("text")
                .attr("x", cx + 4)
                .attr("y", cy - r + 3)
                .attr("font-size", "8px")
                .attr("fill", "hsl(var(--muted-foreground))")
                .attr("text-anchor", "start")
                .text(`${((lvl / levels) * 100).toFixed(0)}%`);
        }

        // ── Grid polygon spokes ─────────────────────────────────────────────
        varNames.forEach((_, i) => {
            g.append("line")
                .attr("x1", cx)
                .attr("y1", cy)
                .attr("x2", ptX(1, i))
                .attr("y2", ptY(1, i))
                .attr("stroke", "hsl(var(--border))")
                .attr("stroke-opacity", 0.75)
                .attr("stroke-width", 1);
        });

        // ── Axis labels ─────────────────────────────────────────────────────
        const labelPad = 22;
        varNames.forEach((varName, i) => {
            const a = axisAngle(i);
            const lx = cx + (radius + labelPad) * Math.cos(a);
            const ly = cy + (radius + labelPad) * Math.sin(a);
            const label =
                variables.find((v) => v.name === varName)?.label ?? varName;

            // Wrap long labels into two lines
            const line1 = truncate(label, 14);
            const line2 =
                label.length > 14 ? truncate(label.slice(13), 14) : null;

            const anchor =
                Math.abs(Math.cos(a)) < 0.15
                    ? "middle"
                    : Math.cos(a) > 0
                    ? "start"
                    : "end";

            const textEl = g
                .append("text")
                .attr("x", lx)
                .attr("y", ly)
                .attr("text-anchor", anchor)
                .attr("font-size", "11px")
                .attr("font-weight", "600")
                .attr("fill", "hsl(var(--foreground))");

            if (line2) {
                textEl
                    .append("tspan")
                    .attr("x", lx)
                    .attr("dy", "-0.6em")
                    .text(line1);
                textEl
                    .append("tspan")
                    .attr("x", lx)
                    .attr("dy", "1.2em")
                    .text(line2);
            } else {
                textEl.attr("dy", "0.35em").text(line1);
            }
        });

        // ── Draw cluster polygons (back-to-front: fill first, then stroke) ──
        // Fill pass (semi-transparent)
        profiles.forEach((profile, idx) => {
            const fillColor = clusterColor(idx, numClusters, 0.18);
            const strokeColor = clusterColor(idx, numClusters, 1);

            const points: [number, number][] = varNames.map((v, i) => {
                const norm = normalize(v, profile.meanAttributes?.[v] ?? 0);
                return [ptX(norm, i), ptY(norm, i)];
            });

            const lineGen = d3
                .line<[number, number]>()
                .x((d) => d[0])
                .y((d) => d[1])
                .curve(d3.curveLinearClosed);

            g.append("path")
                .datum(points)
                .attr("d", lineGen)
                .attr("fill", fillColor)
                .attr("stroke", strokeColor)
                .attr("stroke-width", 2)
                .attr("stroke-linejoin", "round");
        });

        // Dot pass (on top of fills)
        profiles.forEach((profile, idx) => {
            const strokeColor = clusterColor(idx, numClusters, 1);

            varNames.forEach((v, i) => {
                const norm = normalize(v, profile.meanAttributes?.[v] ?? 0);
                const px = ptX(norm, i);
                const py = ptY(norm, i);
                const rawVal = profile.meanAttributes?.[v];
                const rawStr =
                    rawVal !== null && isFinite(rawVal)
                        ? rawVal.toFixed(2)
                        : "N/A";

                const dot = g
                    .append("circle")
                    .attr("cx", px)
                    .attr("cy", py)
                    .attr("r", 4)
                    .attr("fill", strokeColor)
                    .attr("stroke", "hsl(var(--background))")
                    .attr("stroke-width", 1.5)
                    .style("cursor", "pointer");

                // Simple title tooltip (shown by browser on hover)
                const varLabel =
                    variables.find((vv) => vv.name === v)?.label ?? v;
                dot.append("title").text(
                    `${varLabel}: ${rawStr}\nCluster ${profile.clusterLabel}`
                );
            });
        });

        // ── Legend ──────────────────────────────────────────────────────────
        const legendX = width - margin.right + 12;
        const legendStartY = margin.top + 10;

        g.append("text")
            .attr("x", legendX)
            .attr("y", legendStartY - 14)
            .attr("font-size", "11px")
            .attr("font-weight", "700")
            .attr("fill", "hsl(var(--foreground))")
            .text("Klaster");

        profiles.forEach((profile, idx) => {
            const color = clusterColor(idx, numClusters, 1);
            const gy = legendStartY + idx * 24;

            g.append("rect")
                .attr("x", legendX)
                .attr("y", gy)
                .attr("width", 14)
                .attr("height", 14)
                .attr("rx", 3)
                .attr("fill", color)
                .attr("opacity", 0.85);

            g.append("text")
                .attr("x", legendX + 19)
                .attr("y", gy + 11)
                .attr("font-size", "11px")
                .attr("fill", "hsl(var(--foreground))")
                .text(`Cluster ${profile.clusterLabel}`);
        });

        // ── Chart title ─────────────────────────────────────────────────────
        svg.append("text")
            .attr("x", cx)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "700")
            .attr("fill", "hsl(var(--foreground))")
            .text("Profil Atribut Klaster");

        svg.append("text")
            .attr("x", cx)
            .attr("y", 36)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", "hsl(var(--muted-foreground))")
            .text("Nilai dinormalisasi per variabel (min–max)");
    }, [output, variables, width, height]);

    return (
        <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ maxWidth: "100%", height: "auto" }}
        />
    );
};
