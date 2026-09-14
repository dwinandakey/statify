/**
 * Classification Plot Chart Utilities
 *
 * This module provides utilities for rendering the Classification Plot,
 * a stacked histogram visualization showing predicted probability distributions
 * for binary logistic regression.
 *
 * The chart displays:
 * - X-axis: Predicted probability bins (0 to 1)
 * - Y-axis: Frequency
 * - Two overlapping/stacked groups with different colors
 * - A vertical cutoff line at the classification threshold
 */

import * as d3 from "d3";
import { ChartTitleOptions, addChartTitle } from "./chartUtils";
import { calculateResponsiveMargin } from "../responsiveMarginUtils";
import {
  addAxisLabels,
  addLegend,
  calculateLegendPosition,
  createStandardSVG,
} from "../chartUtils";

export interface ClassificationPlotDataPoint {
  category: string;
  [key: string]: number | string; // Dynamic group keys
}

export interface AxisLabels {
  x?: string;
  y?: string;
}

export interface ClassificationPlotConfig {
  cutoff?: number;
  groups?: string[];
}

/**
 * Create Classification Plot (Stacked Histogram with Cutoff Line)
 *
 * @param data - Array of data points with category (bin label) and group counts
 * @param width - Chart width
 * @param height - Chart height
 * @param useAxis - Whether to show axes
 * @param titleOptions - Chart title and subtitle options
 * @param axisLabels - X and Y axis labels
 * @param chartColors - Colors for each group
 * @param config - Additional configuration (cutoff, groups)
 */
export const createClassificationPlot = (
  data: ClassificationPlotDataPoint[],
  width: number,
  height: number,
  useAxis: boolean = true,
  titleOptions?: ChartTitleOptions,
  axisLabels?: AxisLabels,
  chartColors?: string[],
  config?: ClassificationPlotConfig,
) => {
  // Validate data
  if (!data || data.length === 0) {
    console.error("No data available for classification plot");
    return null;
  }

  // Extract group names from first data point
  const groups =
    config?.groups || Object.keys(data[0]).filter((k) => k !== "category");
  const cutoff = config?.cutoff ?? 0.5;

  // Use provided colors or defaults
  // Updated: Red (#E74C3C) for group 0, Blue (#4A90D9) for group 1
  const colors =
    chartColors && chartColors.length >= groups.length
      ? chartColors
      : ["#E74C3C", "#4A90D9"];

  // Calculate canvas context for measurements
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = "10px sans-serif";

  // Calculate max Y value
  const maxY =
    d3.max(data, (d) => {
      return groups.reduce((sum, g) => sum + (Number(d[g]) || 0), 0);
    }) || 0;

  // Calculate margins
  const margin = calculateResponsiveMargin({
    width,
    height,
    useAxis,
    titleOptions,
    axisLabels,
    hasLegend: true,
    legendPosition: "right",
  });

  // ADJUSTED MARGIN: to bring components closer
  const extraBottomPadding = 5;
  margin.bottom += extraBottomPadding;

  // Create SVG
  const svg = createStandardSVG({
    width,
    height,
    marginTop: margin.top,
    marginRight: margin.right,
    marginBottom: margin.bottom,
    marginLeft: margin.left,
  });

  // Add title
  if (titleOptions) {
    addChartTitle(svg, {
      ...titleOptions,
      marginTop: margin.top,
      useResponsivePositioning: true,
    });
  }

  // Create scales
  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.category))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const yScale = d3
    .scaleLinear()
    .domain([0, maxY * 1.1]) // Add 10% padding
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Stack the data
  const stackGenerator = d3
    .stack<ClassificationPlotDataPoint>()
    .keys(groups)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);

  const stackedData = stackGenerator(data);

  // Draw stacked bars
  const layerGroups = svg
    .selectAll(".layer")
    .data(stackedData)
    .enter()
    .append("g")
    .attr("class", "layer")
    .attr("fill", (d, i) => colors[i % colors.length]);

  layerGroups
    .selectAll("rect")
    .data((d) => d)
    .enter()
    .append("rect")
    .attr("x", (d) => xScale(d.data.category as string) || 0)
    .attr("y", (d) => yScale(d[1]))
    .attr("height", (d) => yScale(d[0]) - yScale(d[1]))
    .attr("width", xScale.bandwidth())
    .attr("stroke", "white")
    .attr("stroke-width", 0.5);

  // Draw cutoff line
  const cutoffX = margin.left + cutoff * (width - margin.left - margin.right);

  svg
    .append("line")
    .attr("class", "cutoff-line")
    .attr("x1", cutoffX)
    .attr("x2", cutoffX)
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom)
    .attr("stroke", "#333")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5");

  // Add cutoff label
  svg
    .append("text")
    .attr("x", cutoffX)
    .attr("y", margin.top - 5)
    .attr("text-anchor", "middle")
    .attr("fill", "#333")
    .attr("font-size", "10px")
    .attr("font-weight", "bold")
    .text(`Cut = ${cutoff.toFixed(2)}`);

  // Draw X axis
  if (useAxis) {
    const xAxis = d3.axisBottom(xScale);

    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "hsl(var(--foreground))")
      .style("font-size", "10px");

    // Draw Y axis
    const yAxis = d3.axisLeft(yScale).ticks(5);

    svg
      .append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis)
      .selectAll("text")
      .attr("fill", "hsl(var(--foreground))")
      .style("font-size", "10px");

    // --- MANUAL AXIS LABEL POSITIONING ---
    // 1. Render Y Label (using helper)
    if (axisLabels?.y) {
      addAxisLabels({
        svg,
        width,
        height,
        marginTop: margin.top,
        marginRight: margin.right,
        marginBottom: margin.bottom, // Use full margin for Y centering
        marginLeft: margin.left,
        axisLabels: {
          y: axisLabels.y, // Only pass Y
        },
        chartType: "vertical",
      });
    }

    // 2. Render X Label MANUALLY
    // Position: Just below the axis ticks
    // Adjusted y offset to 30 (closer to ticks)
    if (axisLabels?.x) {
      // Strip newline chars if they exist from previous formatter
      const cleanXLabel = axisLabels.x.replace(/\n/g, "");

      svg
        .append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", margin.left + (width - margin.left - margin.right) / 2)
        .attr("y", height - margin.bottom + 30) // Adjusted: 30px below axis
        .attr("fill", "hsl(var(--foreground))")
        .attr("font-size", "12px")
        .attr("font-weight", "500")
        .text(cleanXLabel);
    }
  }

  // Add legend
  const legendPosition = calculateLegendPosition({
    width,
    height,
    marginLeft: margin.left,
    marginRight: margin.right,
    marginBottom: margin.bottom,
    marginTop: margin.top,
    legendPosition: "right",
    itemCount: groups.length,
  });

  const legendGroup = svg.append("g").attr("class", "legend");

  // Legend background
  const legendWidth = 80;
  const legendHeight = groups.length * 20 + 10;

  legendGroup
    .append("rect")
    .attr("x", legendPosition.x - 5)
    .attr("y", legendPosition.y - 5)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "white")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1)
    .attr("rx", 3);

  // Legend items
  groups.forEach((group, i) => {
    const itemY = legendPosition.y + i * 20;

    // Color box
    legendGroup
      .append("rect")
      .attr("x", legendPosition.x)
      .attr("y", itemY)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", colors[i % colors.length]);

    // Label
    legendGroup
      .append("text")
      .attr("x", legendPosition.x + 20)
      .attr("y", itemY + 11)
      .attr("font-size", "11px")
      .attr("fill", "hsl(var(--foreground))")
      .text(group);
  });

  // --- MANUAL NOTE POSITIONING ---
  // Position: At the ABSOLUTE BOTTOM of the chart container area
  // With margin.bottom reduced to 45px + base, this will sit closer to the X label
  if (config?.cutoff !== undefined) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 5) // Very close to bottom edge
      .attr("text-anchor", "middle")
      .attr("fill", "hsl(var(--muted-foreground))")
      .attr("font-size", "9px")
      .text(
        `Predicted Probability is of Membership for ${groups[1] || "TRUE"}. Each bar segment represents case counts.`,
      );
  }

  return svg.node();
};

/**
 * Create Classification Plot as overlapping histograms (alternative style)
 * This style shows the two distributions as overlapping rather than stacked.
 */
export const createOverlappingClassificationPlot = (
  data: ClassificationPlotDataPoint[],
  width: number,
  height: number,
  useAxis: boolean = true,
  titleOptions?: ChartTitleOptions,
  axisLabels?: AxisLabels,
  chartColors?: string[],
  config?: ClassificationPlotConfig,
) => {
  // Validate data
  if (!data || data.length === 0) {
    console.error("No data available for classification plot");
    return null;
  }

  // Extract group names
  const groups =
    config?.groups || Object.keys(data[0]).filter((k) => k !== "category");
  const cutoff = config?.cutoff ?? 0.5;

  // Use provided colors or defaults with opacity
  // Updated: Red (#E74C3C) for group 0, Blue (#4A90D9) for group 1
  const colors =
    chartColors && chartColors.length >= groups.length
      ? chartColors
      : ["#E74C3C", "#4A90D9"];

  // Calculate canvas context for measurements
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = "10px sans-serif";

  // Calculate max Y value (individual, not stacked)
  const maxY =
    d3.max(data, (d) => {
      return d3.max(groups, (g) => Number(d[g]) || 0);
    }) || 0;

  // Calculate margins
  const margin = calculateResponsiveMargin({
    width,
    height,
    useAxis,
    titleOptions,
    axisLabels,
    hasLegend: true,
    legendPosition: "right",
  });

  // ADJUSTED MARGIN: Reduced from 80 to 45
  const extraBottomPadding = 45;
  margin.bottom += extraBottomPadding;

  // Create SVG
  const svg = createStandardSVG({
    width,
    height,
    marginTop: margin.top,
    marginRight: margin.right,
    marginBottom: margin.bottom,
    marginLeft: margin.left,
  });

  // Add title
  if (titleOptions) {
    addChartTitle(svg, {
      ...titleOptions,
      marginTop: margin.top,
      useResponsivePositioning: true,
    });
  }

  // Create scales
  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.category))
    .range([margin.left, width - margin.right])
    .padding(0.05);

  const yScale = d3
    .scaleLinear()
    .domain([0, maxY * 1.1])
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Draw overlapping bars for each group
  const barWidth = xScale.bandwidth() / 2;

  groups.forEach((group, groupIndex) => {
    svg
      .selectAll(`.bar-${groupIndex}`)
      .data(data)
      .enter()
      .append("rect")
      .attr("class", `bar-${groupIndex}`)
      .attr("x", (d) => (xScale(d.category) || 0) + groupIndex * barWidth)
      .attr("y", (d) => yScale(Number(d[group]) || 0))
      .attr("width", barWidth - 2)
      .attr(
        "height",
        (d) => height - margin.bottom - yScale(Number(d[group]) || 0),
      )
      .attr("fill", colors[groupIndex % colors.length])
      .attr("opacity", 0.8)
      .attr("stroke", colors[groupIndex % colors.length])
      .attr("stroke-width", 1);
  });

  // Draw cutoff line
  const cutoffX = margin.left + cutoff * (width - margin.left - margin.right);

  svg
    .append("line")
    .attr("class", "cutoff-line")
    .attr("x1", cutoffX)
    .attr("x2", cutoffX)
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom)
    .attr("stroke", "#333")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5");

  // Add cutoff label
  svg
    .append("text")
    .attr("x", cutoffX)
    .attr("y", margin.top - 5)
    .attr("text-anchor", "middle")
    .attr("fill", "#333")
    .attr("font-size", "10px")
    .attr("font-weight", "bold")
    .text(`Cut = ${cutoff.toFixed(2)}`);

  // Draw axes
  if (useAxis) {
    const xAxis = d3.axisBottom(xScale);

    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "hsl(var(--foreground))")
      .style("font-size", "10px");

    const yAxis = d3.axisLeft(yScale).ticks(5);

    svg
      .append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis)
      .selectAll("text")
      .attr("fill", "hsl(var(--foreground))")
      .style("font-size", "10px");

    // --- MANUAL AXIS LABEL POSITIONING ---
    if (axisLabels?.y) {
      addAxisLabels({
        svg,
        width,
        height,
        marginTop: margin.top,
        marginRight: margin.right,
        marginBottom: margin.bottom,
        marginLeft: margin.left,
        axisLabels: { y: axisLabels.y },
        chartType: "vertical",
      });
    }

    if (axisLabels?.x) {
      const cleanXLabel = axisLabels.x.replace(/\n/g, "");
      svg
        .append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", margin.left + (width - margin.left - margin.right) / 2)
        .attr("y", height - margin.bottom + 30) // Adjusted: 30px
        .attr("fill", "hsl(var(--foreground))")
        .attr("font-size", "12px")
        .attr("font-weight", "500")
        .text(cleanXLabel);
    }
  }

  // Add legend
  const legendPosition = calculateLegendPosition({
    width,
    height,
    marginLeft: margin.left,
    marginRight: margin.right,
    marginBottom: margin.bottom,
    marginTop: margin.top,
    legendPosition: "right",
    itemCount: groups.length,
  });

  const legendGroup = svg.append("g").attr("class", "legend");

  const legendWidth = 80;
  const legendHeight = groups.length * 20 + 10;

  legendGroup
    .append("rect")
    .attr("x", legendPosition.x - 5)
    .attr("y", legendPosition.y - 5)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "white")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1)
    .attr("rx", 3);

  groups.forEach((group, i) => {
    const itemY = legendPosition.y + i * 20;

    legendGroup
      .append("rect")
      .attr("x", legendPosition.x)
      .attr("y", itemY)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", colors[i % colors.length])
      .attr("opacity", 0.8);

    legendGroup
      .append("text")
      .attr("x", legendPosition.x + 20)
      .attr("y", itemY + 11)
      .attr("font-size", "11px")
      .attr("fill", "hsl(var(--foreground))")
      .text(group);
  });

  // Note: Position absolute bottom
  if (config?.cutoff !== undefined) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 5) // Very close to bottom edge
      .attr("text-anchor", "middle")
      .attr("fill", "hsl(var(--muted-foreground))")
      .attr("font-size", "9px")
      .text(
        `Predicted Probability is of Membership for ${groups[1] || "TRUE"}. Each bar segment represents case counts.`,
      );
  }

  return svg.node();
};

export default {
  createClassificationPlot,
  createOverlappingClassificationPlot,
};
