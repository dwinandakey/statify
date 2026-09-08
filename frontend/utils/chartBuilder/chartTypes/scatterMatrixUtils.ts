import * as d3 from "d3";
import {
    addChartTitle,
    type ChartTitleOptions,
} from "./chartUtils";

/**
 * A 3x3 (or n×n) scatter plot matrix as used by SPSS GLM Multivariate's
 * "Observed * Predicted * Std. Residual" residual diagnostic panel.
 *
 * The matrix is symmetric: cells on the diagonal are blank with a centered
 * label (variable name), while every off-diagonal cell (i, j) shows a
 * scatter of dimension[i] (Y-axis) against dimension[j] (X-axis). For a
 * 3-variable matrix that yields 6 scatter sub-plots — exactly what SPSS
 * draws.
 *
 * Information-theoretic note: the lower and upper triangles show the same
 * pairs of variables with axes swapped. The full matrix is purely a visual
 * ergonomic convention (Tukey/Cleveland-style SPLOM) — it does not add
 * statistical information over a triangular layout.
 */
export interface ScatterMatrixDimension {
    /** Key used to look up the value on each data row. */
    key: string;
    /** Human-readable label shown on the diagonal and outer axes. */
    label: string;
}

export interface ScatterMatrixDatum {
    [key: string]: number;
}

export const createScatterPlotMatrix = (
    data: ScatterMatrixDatum[],
    dimensions: ScatterMatrixDimension[],
    width: number,
    height: number,
    titleOptions?: ChartTitleOptions
): SVGSVGElement | null => {
    const n = dimensions.length;
    if (n < 2 || data.length === 0) return null;

    // ── Layout constants ────────────────────────────────────────────────
    // SPSS-style padding: room for the title at top, row labels at left,
    // and column labels at the bottom of the matrix.
    const margin = {
        top: titleOptions ? 60 : 20,
        right: 20,
        bottom: 50,
        left: 60,
    };
    const matrixWidth = width - margin.left - margin.right;
    const matrixHeight = height - margin.top - margin.bottom;
    const cellSize = Math.min(matrixWidth, matrixHeight) / n;

    // ── Root SVG ────────────────────────────────────────────────────────
    const svg = d3
        .create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .style("font-family", "sans-serif")
        .style("font-size", "10px") as d3.Selection<SVGSVGElement, unknown, null, undefined>;

    if (titleOptions) {
        addChartTitle(svg, titleOptions);
    }

    // ── Compute domains per dimension once (shared across the row/col) ──
    const domains: Record<string, [number, number]> = {};
    dimensions.forEach((dim) => {
        const vals = data
            .map((d) => d[dim.key])
            .filter((v) => typeof v === "number" && Number.isFinite(v));
        if (vals.length === 0) {
            domains[dim.key] = [0, 1];
            return;
        }
        const min = d3.min(vals) as number;
        const max = d3.max(vals) as number;
        const pad = (max - min) * 0.05 || 1;
        domains[dim.key] = [min - pad, max + pad];
    });

    // ── Matrix container ────────────────────────────────────────────────
    const matrixGroup = svg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Outer border around the entire grid.
    matrixGroup
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", cellSize * n)
        .attr("height", cellSize * n)
        .attr("fill", "none")
        .attr("stroke", "currentColor")
        .attr("stroke-width", 1);

    // ── Cells ───────────────────────────────────────────────────────────
    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            const cell = matrixGroup
                .append("g")
                .attr("transform", `translate(${col * cellSize}, ${row * cellSize})`);

            // Inner cell border.
            cell
                .append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", cellSize)
                .attr("height", cellSize)
                .attr("fill", "none")
                .attr("stroke", "currentColor")
                .attr("stroke-width", 0.5)
                .attr("opacity", 0.4);

            if (row === col) {
                // Diagonal cell: centered label (matches SPSS, e.g.
                // "Observed", "Predicted", "Std. Residual").
                cell
                    .append("text")
                    .attr("x", cellSize / 2)
                    .attr("y", cellSize / 2)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .attr("font-size", Math.min(14, cellSize * 0.12))
                    .attr("font-weight", 500)
                    .attr("fill", "currentColor")
                    .text(dimensions[row].label);
                continue;
            }

            // Off-diagonal cell — scatter plot of row variable (Y) vs
            // column variable (X). The shared per-dimension domain means
            // rows align horizontally and columns align vertically across
            // the entire matrix, just like SPSS.
            const yDim = dimensions[row];
            const xDim = dimensions[col];
            const cellPad = 6;
            const xScale = d3
                .scaleLinear()
                .domain(domains[xDim.key])
                .range([cellPad, cellSize - cellPad]);
            const yScale = d3
                .scaleLinear()
                .domain(domains[yDim.key])
                .range([cellSize - cellPad, cellPad]);

            const clip = `clip-${row}-${col}-${Math.random().toString(36).slice(2, 7)}`;
            cell
                .append("defs")
                .append("clipPath")
                .attr("id", clip)
                .append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", cellSize)
                .attr("height", cellSize);

            cell
                .append("g")
                .attr("clip-path", `url(#${clip})`)
                .selectAll("circle")
                .data(
                    data.filter(
                        (d) =>
                            typeof d[xDim.key] === "number" &&
                            typeof d[yDim.key] === "number" &&
                            Number.isFinite(d[xDim.key]) &&
                            Number.isFinite(d[yDim.key])
                    )
                )
                .enter()
                .append("circle")
                .attr("cx", (d) => xScale(d[xDim.key]))
                .attr("cy", (d) => yScale(d[yDim.key]))
                .attr("r", Math.max(2, Math.min(3.5, cellSize * 0.02)))
                .attr("fill", "hsl(210, 70%, 55%)")
                .attr("stroke", "hsl(210, 80%, 35%)")
                .attr("stroke-width", 0.5)
                .attr("opacity", 0.8);
        }
    }

    // ── Outer axis labels (bottom column labels and left row labels) ────
    // SPSS prints variable names twice — once on the diagonal and again
    // outside the grid as axis labels. The latter are the canonical
    // X/Y-axis identifiers for the column/row.
    for (let i = 0; i < n; i++) {
        // Column label below grid
        matrixGroup
            .append("text")
            .attr("x", i * cellSize + cellSize / 2)
            .attr("y", cellSize * n + 20)
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .attr("fill", "currentColor")
            .text(dimensions[i].label);

        // Row label to left of grid (rotated 90° CCW)
        matrixGroup
            .append("text")
            .attr(
                "transform",
                `translate(-20, ${i * cellSize + cellSize / 2}) rotate(-90)`
            )
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .attr("fill", "currentColor")
            .text(dimensions[i].label);
    }

    return svg.node();
};
