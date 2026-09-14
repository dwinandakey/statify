"use client";

import React, { useMemo } from "react";
import GeneralChartContainer from "@/components/Output/Chart/GeneralChartContainer";

interface ScreePlotData {
  component_numbers: number[];
  eigenvalues: number[];
}

interface ScreePlotProps {
  data: ScreePlotData | string;
}

export function ScreePlot({ data }: ScreePlotProps) {
  // Parse data if it's a JSON string
  let parsedData: ScreePlotData;
  
  try {
    if (typeof data === "string") {
      parsedData = JSON.parse(data);
    } else {
      parsedData = data;
    }
  } catch (error) {
    console.error("Failed to parse ScreePlot data:", error);
    return <p className="text-destructive">Invalid scree plot data: Failed to parse JSON</p>;
  }

  if (
    !parsedData ||
    !Array.isArray(parsedData.component_numbers) ||
    !Array.isArray(parsedData.eigenvalues)
  ) {
    console.error("Invalid ScreePlot data structure:", parsedData);
    return <p className="text-destructive">Invalid scree plot data: Missing component_numbers or eigenvalues</p>;
  }

  // Transform data to Line Chart format: { category: string, value: number }[]
  const chartData = parsedData.component_numbers.map((c, i) => ({
    category: String(c),
    value: parsedData.eigenvalues[i] ?? 0,
  }));

  const chartJSON = {
    charts: [{
      chartType: "Line Chart",
      chartData,
      chartConfig: {
        width: 800,
        height: 400,
        useAxis: true,
        axisLabels: {
          x: "Component Number",
          y: "Eigenvalue",
        },
      },
      chartMetadata: {
        title: "Scree Plot",
        subtitle: "Eigenvalues vs Component Number",
        description: "Scree Plot showing eigenvalues for each component",
        axisInfo: {
          category: "Component Number",
          value: "Eigenvalue",
        },
      },
    }],
  };

  return (
    <div className="w-full h-[400px]">
      <GeneralChartContainer data={chartJSON} />
    </div>
  );
}

