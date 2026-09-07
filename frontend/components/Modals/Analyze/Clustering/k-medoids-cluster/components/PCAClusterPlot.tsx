/**
 * K-Medoids PCA Cluster Plot
 *
 * Projects the full multi-dimensional feature matrix to 2D via PCA, then
 * renders a scatter plot where each point is coloured by its cluster label
 * and each medoid is highlighted with a star marker.
 *
 * ── PCA is computed entirely client-side (no external deps) ──────────────
 *   1. Centre the feature matrix by variable means.
 *   2. Build the (d × d) covariance matrix.
 *   3. Find the top 2 eigenvectors via power iteration with deflation.
 *   4. Project all points and medoids into the PC1 / PC2 plane.
 *
 * Public interface mirrors the user-supplied spec:
 *   points  : { features: number[], cluster: number, label?: string }[]
 *   medoids : { features: number[], cluster: number }[]
 */

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

// ─── Public types ────────────────────────────────────────────────────────────

export interface PCAPoint {
    features: number[];
    cluster: number;
    /** Optional human-readable label shown in the tooltip (e.g. "Case 12"). */
    label?: string;
}

export interface PCAMedoid {
    features: number[];
    cluster: number;
}

export interface PCAClusterPlotProps {
    points: PCAPoint[];
    medoids: PCAMedoid[];
    /** Variable names corresponding to feature indices, used in the tooltip. */
    variableNames?: string[];
    title?: string;
    width?: number;
    height?: number;
}

// ─── PCA implementation ──────────────────────────────────────────────────────

interface PCAResult {
    /** One [x, y] pair per input row (same order as input). */
    projected: [number, number][];
    /** Fraction of total variance captured by PC1. */
    varPC1: number;
    /** Fraction of total variance captured by PC2. */
    varPC2: number;
}

/**
 * Pure-TypeScript PCA – finds the top 2 principal components of a numeric
 * matrix using power iteration with deflation.  No external dependencies.
 *
 * @param rows  n × d matrix (each row = one observation).
 */
function computePCA(rows: number[][]): PCAResult {
    const n = rows.length;
    const d = rows[0]?.length ?? 0;

    // ── edge-cases ────────────────────────────────────────────────────────
    if (n < 2 || d === 0) {
        return {
            projected: rows.map(() => [0, 0]),
            varPC1: 0.5,
            varPC2: 0.5,
        };
    }

    if (d === 1) {
        const col = rows.map(r => r[0]);
        const mu = col.reduce((s, v) => s + v, 0) / n;
        return {
            projected: col.map(v => [v - mu, 0]),
            varPC1: 1,
            varPC2: 0,
        };
    }

    // ── Step 1: centre & scale (standardise, matching R's scale.=TRUE) ────
    const means = Array.from({ length: d }, (_, j) =>
        rows.reduce((s, r) => s + (r[j] ?? 0), 0) / n
    );
    const stds = Array.from({ length: d }, (_, j) => {
        const variance = rows.reduce((s, r) => s + ((r[j] ?? 0) - means[j]) ** 2, 0) / (n - 1);
        return Math.sqrt(Math.max(variance, 1e-14));
    });
    const C = rows.map(r => r.map((v, j) => ((v ?? 0) - means[j]) / stds[j]));

    // ── Step 2: covariance matrix (d × d) ─────────────────────────────────
    const cov: number[][] = Array.from({ length: d }, () =>
        new Array<number>(d).fill(0)
    );
    for (let i = 0; i < d; i++) {
        for (let j = i; j < d; j++) {
            let s = 0;
            for (let k = 0; k < n; k++) s += C[k][i] * C[k][j];
            cov[i][j] = cov[j][i] = s / (n - 1);
        }
    }

    // total variance = trace(cov)
    const totalVar = cov.reduce((s, _, i) => s + cov[i][i], 0);

    // ── Step 3: helpers ───────────────────────────────────────────────────
    const norm2 = (v: number[]) =>
        Math.sqrt(v.reduce((s, x) => s + x * x, 0));

    const normalize = (v: number[]): number[] => {
        const len = norm2(v);
        return len < 1e-14 ? v.map(() => 0) : v.map(x => x / len);
    };

    const matVec = (M: number[][], v: number[]): number[] =>
        M.map(row => row.reduce((s, mij, j) => s + mij * v[j], 0));

    // Deterministic seed (avoids flickering on re-render)
    const seed = (i: number) => Math.sin(i * 127.1 + 311.7) * 43758.5453123;

    /** Power iteration; deflate against already-found eigenvectors. */
    const findEigenvec = (deflateVecs: number[][]): { vec: number[]; eigenval: number } => {
        let v = normalize(Array.from({ length: d }, (_, i) => seed(i)));

        for (let iter = 0; iter < 400; iter++) {
            let w = matVec(cov, v);
            // deflate
            for (const u of deflateVecs) {
                const dot = w.reduce((s, wi, i) => s + wi * u[i], 0);
                w = w.map((wi, i) => wi - dot * u[i]);
            }
            const wn = normalize(w);
            const diff = wn.reduce((s, wi, i) => s + (wi - v[i]) ** 2, 0);
            v = wn;
            if (diff < 1e-14) break;
        }

        // Rayleigh quotient → eigenvalue
        const mv = matVec(cov, v);
        const eigenval = Math.max(0, v.reduce((s, vi, i) => s + vi * mv[i], 0));
        return { vec: v, eigenval };
    };

    // ── Step 4: top 2 principal components ───────────────────────────────
    const { vec: pc1, eigenval: e1 } = findEigenvec([]);
    const { vec: pc2, eigenval: e2 } = findEigenvec([pc1]);

    // ── Step 5: project ───────────────────────────────────────────────────
    const project = (r: number[]): [number, number] => [
        r.reduce((s, v, i) => s + v * pc1[i], 0),
        r.reduce((s, v, i) => s + v * pc2[i], 0),
    ];
    const projected = C.map(project);

    const denom = Math.max(totalVar, e1 + e2, 1e-12);
    return {
        projected,
        varPC1: e1 / denom,
        varPC2: e2 / denom,
    };
}

// ─── Visual helpers ───────────────────────────────────────────────────────────

const CLUSTER_PALETTE = [
    "#4C9BE8", "#E8784C", "#4CE8A0", "#E84C6A",
    "#C04CE8", "#E8C44C", "#4CE8D8", "#E84CC0",
    "#8CE84C", "#4C60E8",
];

function clusterColor(idx: number, total: number): string {
    if (idx < CLUSTER_PALETTE.length) return CLUSTER_PALETTE[idx];
    const hue = (idx * 360) / Math.max(total, 1);
    return `hsl(${hue}, 65%, 52%)`;
}

/** SVG path for a 5-point star centred at (0,0). */
function starPath(R = 11, r = 4.8, n = 5): string {
    const step = Math.PI / n;
    const pts: [number, number][] = [];
    for (let i = 0; i < 2 * n; i++) {
        const rad = i % 2 === 0 ? R : r;
        const a = i * step - Math.PI / 2;
        pts.push([rad * Math.cos(a), rad * Math.sin(a)]);
    }
    return `M${  pts.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join("L")  }Z`;
}

const STAR_D = starPath();

// ─── Component ────────────────────────────────────────────────────────────────

export const PCAClusterPlot: React.FC<PCAClusterPlotProps> = ({
    points,
    medoids,
    variableNames,
    title = "PCA Projection of K-Medoids Clusters",
    width = 620,
    height = 460,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [svgWidth, setSvgWidth] = useState(width);

    // Responsive width via ResizeObserver
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver((entries) => {
            const cw = entries[0]?.contentRect.width;
            if (cw && cw > 0) setSvgWidth(Math.min(cw, width));
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [width]);

    // ── PCA computation (memoised) ────────────────────────────────────────
    const pcaResult = useMemo(() => {
        if (points.length === 0 && medoids.length === 0) return null;
        const allMatrix = [
            ...points.map(p => p.features),
            ...medoids.map(m => m.features),
        ];
        if (allMatrix.length < 2 || (allMatrix[0]?.length ?? 0) === 0) return null;

        const { projected: allProjected, varPC1, varPC2 } = computePCA(allMatrix);

        const ptProj = allProjected.slice(0, points.length);
        const mdProj = allProjected.slice(points.length);

        return { ptProj, mdProj, varPC1, varPC2 };
    }, [points, medoids]);

    // ── D3 render ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!svgRef.current || !pcaResult) return;

        const { ptProj, mdProj, varPC1, varPC2 } = pcaResult;

        const clusterIds = Array.from(
            new Set([...points.map(p => p.cluster), ...medoids.map(m => m.cluster)])
        ).sort((a, b) => a - b);
        const numClusters = clusterIds.length;

        const colorMap = new Map<number, string>(
            clusterIds.map((id, i) => [id, clusterColor(i, numClusters)])
        );

        // ── Layout ────────────────────────────────────────────────────────
        const LEGEND_W = 110;
        const margin = { top: 52, right: LEGEND_W + 20, bottom: 56, left: 60 };
        const chartW = svgWidth;
        const chartH = height;
        const innerW = chartW - margin.left - margin.right;
        const innerH = chartH - margin.top - margin.bottom;

        // ── Scales ────────────────────────────────────────────────────────
        const allX = [...ptProj.map(p => p[0]), ...mdProj.map(p => p[0])];
        const allY = [...ptProj.map(p => p[1]), ...mdProj.map(p => p[1])];
        const xMin = d3.min(allX) ?? 0;
        const xMax = d3.max(allX) ?? 1;
        const yMin = d3.min(allY) ?? 0;
        const yMax = d3.max(allY) ?? 1;
        const xPad = (xMax - xMin) * 0.08 || 1;
        const yPad = (yMax - yMin) * 0.08 || 1;

        const xScale = d3.scaleLinear()
            .domain([xMin - xPad, xMax + xPad])
            .nice().range([0, innerW]);
        const yScale = d3.scaleLinear()
            .domain([yMin - yPad, yMax + yPad])
            .nice().range([innerH, 0]);

        // ── SVG root ──────────────────────────────────────────────────────
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        svg.attr("width", chartW).attr("height", chartH)
            .attr("viewBox", `0 0 ${chartW} ${chartH}`)
            .attr("style", "max-width:100%;height:auto;");

        const clipId = "pca-clip";
        svg.append("defs").append("clipPath").attr("id", clipId)
            .append("rect").attr("width", innerW).attr("height", innerH);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // ── Grid ─────────────────────────────────────────────────────────
        const gridStyle = (sel: d3.Selection<SVGGElement, unknown, null, undefined>) => {
            sel.select(".domain").remove();
            sel.selectAll<SVGLineElement, unknown>("line")
                .attr("stroke", "hsl(var(--border))")
                .attr("stroke-opacity", 0.35)
                .attr("stroke-dasharray", "3,3");
        };

        g.append("g").attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale).tickSize(-innerH).tickFormat(() => ""))
            .call(gridStyle);
        g.append("g")
            .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(() => ""))
            .call(gridStyle);

        // ── Axes ─────────────────────────────────────────────────────────
        const fmt = (v: d3.NumberValue) => {
            const n = +v;
            if (Math.abs(n) >= 1e4) return d3.format(".2e")(n);
            return d3.format(".2f")(n);
        };
        const axisStyle = (sel: d3.Selection<SVGGElement, unknown, null, undefined>) => {
            sel.select(".domain").attr("stroke", "hsl(var(--border))");
            sel.selectAll<SVGTextElement, unknown>("text")
                .attr("fill", "hsl(var(--muted-foreground))")
                .attr("font-size", "10px");
            sel.selectAll<SVGLineElement, unknown>("line")
                .attr("stroke", "hsl(var(--border))");
        };

        g.append("g").attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale).ticks(6).tickFormat(fmt as (n: d3.NumberValue) => string))
            .call(axisStyle);
        g.append("g")
            .call(d3.axisLeft(yScale).ticks(6).tickFormat(fmt as (n: d3.NumberValue) => string))
            .call(axisStyle);

        // Axis labels (PC1 / PC2 with variance explained)
        const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
        g.append("text")
            .attr("text-anchor", "middle")
            .attr("x", innerW / 2).attr("y", innerH + 44)
            .attr("font-size", "11px").attr("fill", "hsl(var(--foreground))")
            .text(`PC1 (${pct(varPC1)} variance explained)`);
        g.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${-46},${innerH / 2}) rotate(-90)`)
            .attr("font-size", "11px").attr("fill", "hsl(var(--foreground))")
            .text(`PC2 (${pct(varPC2)} variance explained)`);

        // ── Tooltip helpers ────────────────────────────────────────────────
        const tooltipNode = tooltipRef.current;
        const containerNode = containerRef.current;
        if (!tooltipNode || !containerNode) return;
        const ttip = d3.select(tooltipNode);
        const showTip = (event: MouseEvent, html: string) => {
            ttip.style("opacity", "1").html(html);
            moveTip(event);
        };
        const moveTip = (event: MouseEvent) => {
            const rect = containerNode.getBoundingClientRect();
            ttip.style("left", `${event.clientX - rect.left + 12}px`)
                .style("top", `${event.clientY - rect.top - 32}px`);
        };
        const hideTip = () => ttip.style("opacity", "0");

        // ── Data points (clipped) ─────────────────────────────────────────
        const plotG = g.append("g").attr("clip-path", `url(#${clipId})`);

        plotG.selectAll<SVGCircleElement, { proj: [number, number]; src: PCAPoint }>("circle.pt")
            .data(ptProj.map((proj, i) => ({ proj, src: points[i] })))
            .join("circle")
            .attr("class", "pt")
            .attr("cx", d => xScale(d.proj[0]))
            .attr("cy", d => yScale(d.proj[1]))
            .attr("r", 5)
            .attr("fill", d => colorMap.get(d.src.cluster) ?? "#888")
            .attr("fill-opacity", 0.70)
            .attr("stroke", d => colorMap.get(d.src.cluster) ?? "#888")
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                d3.select(this).attr("r", 7).attr("fill-opacity", 1);
                const coords = d.src.features
                    .slice(0, 4)
                    .map((v, i) => `${variableNames?.[i] ?? `x${i + 1}`}: ${v.toFixed(3)}`)
                    .join("<br/>");
                showTip(event,
                    `<strong>${d.src.label ?? "Observation"}</strong><br/>` +
                    `Cluster: <strong>${d.src.cluster}</strong><br/>` +
                    `PC1: ${d.proj[0].toFixed(3)}, PC2: ${d.proj[1].toFixed(3)}<br/>${ 
                    d.src.features.length > 0 ? `<hr style="margin:3px 0"/>${coords}` : ""}`
                );
            })
            .on("mousemove", (event) => moveTip(event))
            .on("mouseleave", function () {
                d3.select(this).attr("r", 5).attr("fill-opacity", 0.70);
                hideTip();
            });

        // Medoid stars
        plotG.selectAll<SVGPathElement, { proj: [number, number]; src: PCAMedoid }>("path.medoid")
            .data(mdProj.map((proj, i) => ({ proj, src: medoids[i] })))
            .join("path")
            .attr("class", "medoid")
            .attr("d", STAR_D)
            .attr("transform", d =>
                `translate(${xScale(d.proj[0])},${yScale(d.proj[1])})`
            )
            .attr("fill", "#fbbf24")
            .attr("stroke", "#78350f")
            .attr("stroke-width", 1.8)
            .attr("filter", "drop-shadow(0 1px 3px rgba(0,0,0,.4))")
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                d3.select(this).attr("transform",
                    `translate(${xScale(d.proj[0])},${yScale(d.proj[1])}) scale(1.35)`
                );
                showTip(event,
                    `<strong>★ Medoid — Cluster ${d.src.cluster}</strong><br/>` +
                    `PC1: ${d.proj[0].toFixed(3)}, PC2: ${d.proj[1].toFixed(3)}`
                );
            })
            .on("mousemove", (event) => moveTip(event))
            .on("mouseleave", function (_, d) {
                d3.select(this).attr("transform",
                    `translate(${xScale(d.proj[0])},${yScale(d.proj[1])})`
                );
                hideTip();
            });

        // Medoid cluster labels (small text near the star)
        plotG.selectAll<SVGTextElement, { proj: [number, number]; src: PCAMedoid }>("text.medoid-label")
            .data(mdProj.map((proj, i) => ({ proj, src: medoids[i] })))
            .join("text")
            .attr("class", "medoid-label")
            .attr("x", d => xScale(d.proj[0]) + 14)
            .attr("y", d => yScale(d.proj[1]) + 4)
            .attr("font-size", "10px")
            .attr("font-weight", "700")
            .attr("fill", d => colorMap.get(d.src.cluster) ?? "#888")
            .attr("pointer-events", "none")
            .text(d => `C${d.src.cluster}`);

        // ── Legend ────────────────────────────────────────────────────────
        const lx = chartW - margin.right + 18;
        const lg = svg.append("g").attr("transform", `translate(${lx},${margin.top + 4})`);

        lg.append("text")
            .attr("x", 0).attr("y", 0)
            .attr("font-size", "11px").attr("font-weight", "700")
            .attr("fill", "hsl(var(--foreground))")
            .text("Klaster");

        clusterIds.forEach((id, i) => {
            const gy = 20 + i * 22;
            lg.append("circle")
                .attr("cx", 7).attr("cy", gy).attr("r", 6)
                .attr("fill", colorMap.get(id) ?? "#888").attr("fill-opacity", 0.85);
            lg.append("text")
                .attr("x", 18).attr("y", gy + 4)
                .attr("font-size", "11px").attr("fill", "hsl(var(--foreground))")
                .text(`Cluster ${id}`);
        });

        // Medoid legend entry
        const mly = 20 + clusterIds.length * 22 + 14;
        lg.append("line")
            .attr("x1", 0).attr("y1", mly - 10)
            .attr("x2", LEGEND_W - 8).attr("y2", mly - 10)
            .attr("stroke", "hsl(var(--border))")
            .attr("stroke-dasharray", "3,3");
        lg.append("path")
            .attr("d", STAR_D)
            .attr("transform", `translate(7,${mly + 4}) scale(0.85)`)
            .attr("fill", "#fbbf24")
            .attr("stroke", "#78350f")
            .attr("stroke-width", 1.4);
        lg.append("text")
            .attr("x", 18).attr("y", mly + 8)
            .attr("font-size", "11px").attr("fill", "hsl(var(--foreground))")
            .text("Medoid");

        // ── Title ─────────────────────────────────────────────────────────
        svg.append("text")
            .attr("x", margin.left + innerW / 2).attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px").attr("font-weight", "700")
            .attr("fill", "hsl(var(--foreground))")
            .text(title);

        svg.append("text")
            .attr("x", margin.left + innerW / 2).attr("y", 36)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", "hsl(var(--muted-foreground))")
            .text(`Dimensi direduksi ke 2D menggunakan PCA · ${points.length} observasi · ${numClusters} klaster`);

    }, [pcaResult, points, medoids, variableNames, title, svgWidth, height]);

    // ── Guard: insufficient data ───────────────────────────────────────────
    if (points.length + medoids.length < 2) {
        return (
            <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                PCA membutuhkan minimal 2 observasi.
            </div>
        );
    }
    if ((points[0]?.features.length ?? 0) === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                Tidak ada data fitur untuk diproyeksikan.
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
                    boxShadow: "0 2px 10px rgba(0,0,0,.2)",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    transition: "opacity 0.1s",
                    zIndex: 50,
                }}
            />
        </div>
    );
};
