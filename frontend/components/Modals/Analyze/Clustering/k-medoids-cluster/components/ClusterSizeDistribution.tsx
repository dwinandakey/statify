/**
 * ClusterSizeDistribution
 * D3-based donut chart showing count and percentage of cases per cluster.
 */

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ClusterProfile } from "../types/output";

interface ClusterSizeDistributionProps {
    profiles: ClusterProfile[];
    width?: number;
    height?: number;
}

function clusterColor(idx: number, total: number): string {
    if (total <= 10) {
        const palette = [
            "#4e9af1", "#f1714e", "#4ef19a", "#f1d44e",
            "#a44ef1", "#f14e9a", "#4ef1e0", "#f1a44e",
            "#9af14e", "#4e6af1",
        ];
        if (idx < palette.length) return palette[idx];
    }
    return `hsl(${(idx * 360) / total}, 65%, 55%)`;
}

export const ClusterSizeDistribution: React.FC<ClusterSizeDistributionProps> = ({
    profiles,
    width = 480,
    height = 400,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !profiles || profiles.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // Layout constants
        const legendItemH = 22;
        const legendRows = profiles.length;
        const legendH = legendRows * legendItemH + 8;
        const chartAreaH = height - legendH;
        const radius = Math.min(width, chartAreaH) / 2 - 20;
        const innerRadius = radius * 0.52; // donut hole

        // Resolved CSS colours
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

        // --- PIE / ARC generators ---
        const pie = d3.pie<ClusterProfile>()
            .value(d => d.size)
            .sort(null)
            .padAngle(0.018);

        const arc = d3.arc<d3.PieArcDatum<ClusterProfile>>()
            .innerRadius(innerRadius)
            .outerRadius(radius);

        const arcHover = d3.arc<d3.PieArcDatum<ClusterProfile>>()
            .innerRadius(innerRadius)
            .outerRadius(radius + 10);

        const arcLabel = d3.arc<d3.PieArcDatum<ClusterProfile>>()
            .innerRadius(radius * 0.72)
            .outerRadius(radius * 0.72);

        const total = d3.sum(profiles, d => d.size);

        // --- Root group centred in chart area ---
        const cx = width / 2;
        const cy = chartAreaH / 2;
        const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

        // Tooltip element
        const tooltip = d3.select(svgRef.current.parentElement)
            .selectAll<HTMLDivElement, unknown>(".csd-tooltip")
            .data([null])
            .join("div")
            .attr("class", "csd-tooltip")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("opacity", "0")
            .style("background", bgColor)
            .style("border", `1px solid ${mutedColor}`)
            .style("border-radius", "6px")
            .style("padding", "7px 11px")
            .style("font-size", "12px")
            .style("line-height", "1.5")
            .style("color", fgColor)
            .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)")
            .style("z-index", "50");

        // --- Arcs ---
        const arcs = g.selectAll(".arc")
            .data(pie(profiles))
            .join("g")
            .attr("class", "arc");

        arcs.append("path")
            .attr("d", d => arc(d) as string)
            .attr("fill", (_, i) => clusterColor(i, profiles.length))
            .attr("stroke", bgColor)
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", function (event: MouseEvent, d: d3.PieArcDatum<ClusterProfile>) {
                d3.select(this as SVGPathElement)
                    .transition().duration(120)
                    .attr("d", arcHover(d) as string);
                tooltip
                    .style("opacity", "1")
                    .html(
                        `<strong>Cluster ${d.data.clusterLabel}</strong><br/>` +
                        `Count: <strong>${d.data.size}</strong> objects<br/>` +
                        `Share: <strong>${(d.data.percentage ?? (d.data.size / total) * 100).toFixed(1)}%</strong>`
                    );
            })
            .on("mousemove", function (event: MouseEvent) {
                const parent = svgRef.current?.parentElement;
                if (!parent) return;
                const [mx, my] = d3.pointer(event, parent as HTMLElement);
                tooltip
                    .style("left", `${mx + 14}px`)
                    .style("top", `${my - 10}px`);
            })
            .on("mouseleave", function (_event: MouseEvent, d: d3.PieArcDatum<ClusterProfile>) {
                d3.select(this as SVGPathElement)
                    .transition().duration(120)
                    .attr("d", arc(d) as string);
                tooltip.style("opacity", "0");
            });

        // --- Percentage labels inside slices (only if slice is wide enough) ---
        arcs.filter(d => (d.endAngle - d.startAngle) > 0.35)
            .append("text")
            .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "12")
            .attr("font-weight", "600")
            .attr("fill", "#fff")
            .attr("pointer-events", "none")
            .text(d => {
                const pct = d.data.percentage ?? (d.data.size / total) * 100;
                return `${pct.toFixed(1)}%`;
            });

        // --- Centre label ---
        g.append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("dy", "-0.6em")
            .attr("font-size", "22")
            .attr("font-weight", "700")
            .attr("fill", fgColor)
            .text(total);

        g.append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("dy", "1.1em")
            .attr("font-size", "11")
            .attr("fill", mutedColor)
            .text("total objects");

        // --- Legend ---
        const legendG = svg.append("g")
            .attr("transform", `translate(${16},${chartAreaH + 4})`);

        const cols = profiles.length > 6 ? 2 : 1;
        const colW = width / cols;

        profiles.forEach((p, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const lx = col * colW;
            const ly = row * legendItemH;
            const color = clusterColor(i, profiles.length);

            legendG.append("rect")
                .attr("x", lx)
                .attr("y", ly + 4)
                .attr("width", 13)
                .attr("height", 13)
                .attr("rx", 3)
                .attr("fill", color);

            const pct = (p.percentage ?? (p.size / total) * 100).toFixed(1);

            legendG.append("text")
                .attr("x", lx + 19)
                .attr("y", ly + 14)
                .attr("font-size", "12")
                .attr("fill", mutedColor)
                .text(`Cluster ${p.clusterLabel}:  ${p.size} (${pct}%)`);
        });

    }, [profiles, width, height]);

    if (!profiles || profiles.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                Data tidak tersedia
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
