/**
 * ConvergenceChart
 * Dual-axis D3 line chart:
 *   – Left Y  : Total Cost              — solid blue line + area fill
 *   – Right Y : Improvement per step    — dashed orange line (bar-style)
 * Iteration where cost stops changing is annotated as "converged".
 */

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { IterationHistory } from "../types/output";

interface ConvergenceChartProps {
    data: IterationHistory[];
    converged?: boolean;
    width?: number;
    height?: number;
}

export const ConvergenceChart: React.FC<ConvergenceChartProps> = ({
    data,
    converged = false,
    width = 560,
    height = 420,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const chartHeight = Math.max(height, 460);

    useEffect(() => {
        if (!svgRef.current || !data || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // ── Margins ──────────────────────────────────────────────────────────
        const margin = { top: 36, right: 64, bottom: 92, left: 72 };
        const innerW = width - margin.left - margin.right;
        const innerH = chartHeight - margin.top - margin.bottom;

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

        const costColor  = "#2563eb";  // blue  — total cost
        const impColor   = "#f59e0b";  // amber — improvement
        const convColor  = "#16a34a";  // green — converged annotation

        // ── Scales ────────────────────────────────────────────────────────────
        const xExtent = d3.extent(data, d => d.iteration) as [number, number];
        const xScale = d3.scaleLinear()
            .domain([xExtent[0], xExtent[1]])
            .range([0, innerW])
            .nice();

        const costExtent = d3.extent(data, d => d.totalCost) as [number, number];
        const yCost = d3.scaleLinear()
            .domain([costExtent[0] * 0.97, costExtent[1] * 1.03])
            .range([innerH, 0])
            .nice();

        const impMax = d3.max(data, d => Math.abs(d.improvement)) ?? 1;
        const yImp = d3.scaleLinear()
            .domain([0, impMax * 1.15])
            .range([innerH, 0])
            .nice();

        // ── Root group ────────────────────────────────────────────────────────
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // ── Grid ─────────────────────────────────────────────────────────────
        g.append("g")
            .call(d3.axisLeft(yCost).ticks(6).tickSize(-innerW).tickFormat(() => ""))
            .call(ax => {
                ax.select(".domain").remove();
                ax.selectAll(".tick line")
                    .attr("stroke", borderColor)
                    .attr("stroke-opacity", 0.45);
            });

        // ── Tooltip ───────────────────────────────────────────────────────────
        const parent = svgRef.current.parentElement;
        if (!parent) return;

        const tooltip = d3.select(parent)
            .selectAll<HTMLDivElement, unknown>(".cc-tooltip")
            .data([null])
            .join("div")
            .attr("class", "cc-tooltip")
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

        const showTip = (event: MouseEvent, d: IterationHistory) => {
            const parent = svgRef.current?.parentElement;
            if (!parent) return;
            const [mx, my] = d3.pointer(event, parent as HTMLElement);
            tooltip
                .style("opacity", "1")
                .style("left", `${mx + 14}px`)
                .style("top", `${my - 10}px`)
                .html(
                    `<strong>Iterasi ${d.iteration}</strong><br/>` +
                    `Total Cost: <strong>${d.totalCost.toFixed(4)}</strong><br/>` +
                    `Improvement: <strong>${d.improvement.toFixed(4)}</strong><br/>` +
                    `Swaps made: <strong>${d.swapsMade}</strong>`
                );
        };
        const hideTip = () => tooltip.style("opacity", "0");

        // ── Improvement bars (drawn first, behind cost line) ─────────────────
        const barW = Math.max(2, (innerW / (data.length + 1)) * 0.6);
        g.selectAll(".imp-bar")
            .data(data)
            .join("rect")
            .attr("class", "imp-bar")
            .attr("x", d => xScale(d.iteration) - barW / 2)
            .attr("y", d => yImp(Math.abs(d.improvement)))
            .attr("width", barW)
            .attr("height", d => Math.max(0, innerH - yImp(Math.abs(d.improvement))))
            .attr("rx", 2)
            .attr("fill", impColor)
            .attr("opacity", 0.25);

        // ── Cost area fill ────────────────────────────────────────────────────
        const areaFn = d3.area<IterationHistory>()
            .x(d => xScale(d.iteration))
            .y0(innerH)
            .y1(d => yCost(d.totalCost))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(data)
            .attr("d", areaFn)
            .attr("fill", costColor)
            .attr("opacity", 0.08);

        // ── Cost line ─────────────────────────────────────────────────────────
        const lineFn = d3.line<IterationHistory>()
            .x(d => xScale(d.iteration))
            .y(d => yCost(d.totalCost))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(data)
            .attr("d", lineFn)
            .attr("fill", "none")
            .attr("stroke", costColor)
            .attr("stroke-width", 2.5);

        // ── Cost dots ─────────────────────────────────────────────────────────
        g.selectAll(".cost-dot")
            .data(data)
            .join("circle")
            .attr("class", "cost-dot")
            .attr("cx", d => xScale(d.iteration))
            .attr("cy", d => yCost(d.totalCost))
            .attr("r", 4)
            .attr("fill", bgColor)
            .attr("stroke", costColor)
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", (e: MouseEvent, d: IterationHistory) => showTip(e, d))
            .on("mousemove", (e: MouseEvent, d: IterationHistory) => showTip(e, d))
            .on("mouseleave", () => hideTip());

        // ── Improvement line (dashed) ─────────────────────────────────────────
        const impLineFn = d3.line<IterationHistory>()
            .x(d => xScale(d.iteration))
            .y(d => yImp(Math.abs(d.improvement)))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(data)
            .attr("d", impLineFn)
            .attr("fill", "none")
            .attr("stroke", impColor)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "7,4");

        // ── Improvement dots ──────────────────────────────────────────────────
        g.selectAll(".imp-dot")
            .data(data)
            .join("circle")
            .attr("class", "imp-dot")
            .attr("cx", d => xScale(d.iteration))
            .attr("cy", d => yImp(Math.abs(d.improvement)))
            .attr("r", 3.5)
            .attr("fill", bgColor)
            .attr("stroke", impColor)
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", (e: MouseEvent, d: IterationHistory) => showTip(e, d))
            .on("mousemove", (e: MouseEvent, d: IterationHistory) => showTip(e, d))
            .on("mouseleave", () => hideTip());

        // ── Converged annotation ──────────────────────────────────────────────
        if (converged && data.length > 0) {
            const last = data[data.length - 1];
            const cx2 = xScale(last.iteration);
            g.append("line")
                .attr("x1", cx2).attr("x2", cx2)
                .attr("y1", 0).attr("y2", innerH)
                .attr("stroke", convColor)
                .attr("stroke-width", 1.5)
                .attr("stroke-dasharray", "5,4");
            g.append("text")
                .attr("x", cx2 + 5).attr("y", 12)
                .attr("font-size", "10")
                .attr("font-weight", "600")
                .attr("fill", convColor)
                .text("✓ Converged");
        }

        // ── Cost labels (first + last + min) ─────────────────────────────────
        const labelPoints = [data[0], data[data.length - 1]];
        if (data.length > 2) {
            const minCost = data.reduce((a, b) => b.totalCost < a.totalCost ? b : a);
            if (!labelPoints.find(p => p.iteration === minCost.iteration)) {
                labelPoints.push(minCost);
            }
        }
        labelPoints.forEach(d => {
            g.append("text")
                .attr("x", xScale(d.iteration))
                .attr("y", yCost(d.totalCost) - 9)
                .attr("text-anchor", "middle")
                .attr("font-size", "10")
                .attr("font-weight", "600")
                .attr("fill", costColor)
                .text(d.totalCost >= 1e4
                    ? `${(d.totalCost / 1e3).toFixed(1)}K`
                    : d.totalCost.toFixed(2));
        });

        // ── Axes ──────────────────────────────────────────────────────────────
        // X
        const xTicks = data.length <= 12
            ? data.map(d => d.iteration)
            : d3.ticks(xExtent[0], xExtent[1], 8);

        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale).tickValues(xTicks).tickFormat(d => `${d}`))
            .call(ax => {
                ax.select(".domain").attr("stroke", borderColor);
                ax.selectAll("text").attr("font-size", "11").attr("fill", fgColor);
            });

        g.append("text")
            .attr("x", innerW / 2).attr("y", innerH + 46)
            .attr("text-anchor", "middle")
            .attr("font-size", "12").attr("fill", mutedColor)
            .text("Iterasi");

        // Left Y (Total Cost)
        g.append("g")
            .call(d3.axisLeft(yCost).ticks(6).tickFormat(d => {
                const v = +d;
                if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
                if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
                return String(v);
            }))
            .call(ax => {
                ax.select(".domain").attr("stroke", borderColor);
                ax.selectAll("text").attr("font-size", "11").attr("fill", costColor);
            });

        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerH / 2).attr("y", -56)
            .attr("text-anchor", "middle")
            .attr("font-size", "12").attr("fill", costColor)
            .text("Total Cost");

        // Right Y (Improvement)
        g.append("g")
            .attr("transform", `translate(${innerW},0)`)
            .call(d3.axisRight(yImp).ticks(5).tickFormat(d => {
                const v = +d;
                if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
                return v.toFixed(1);
            }))
            .call(ax => {
                ax.select(".domain").attr("stroke", borderColor);
                ax.selectAll("text").attr("font-size", "11").attr("fill", impColor);
            });

        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerH / 2).attr("y", innerW + 56)
            .attr("text-anchor", "middle")
            .attr("font-size", "12").attr("fill", impColor)
            .text("Improvement");

        // ── Legend ────────────────────────────────────────────────────────────
        const legendG = svg.append("g")
            .attr("transform", `translate(${margin.left + 8},${chartHeight - 28})`);

        const items = [
            { color: costColor, dash: "none", label: "Total Cost" },
            { color: impColor,  dash: "7,4",  label: "Improvement" },
            ...(converged ? [{ color: convColor, dash: "5,4", label: "Converged" }] : []),
        ];
        items.forEach(({ color, dash, label }, idx) => {
            const ly = idx * 18;
            legendG.append("line")
                .attr("x1", 0).attr("x2", 20)
                .attr("y1", ly).attr("y2", ly)
                .attr("stroke", color).attr("stroke-width", 2.5)
                .attr("stroke-dasharray", dash);
            legendG.append("text")
                .attr("x", 25).attr("y", ly + 4)
                .attr("font-size", "11").attr("fill", mutedColor)
                .text(label);
        });

    }, [data, converged, width, chartHeight]);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                Data konvergensi tidak tersedia
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
