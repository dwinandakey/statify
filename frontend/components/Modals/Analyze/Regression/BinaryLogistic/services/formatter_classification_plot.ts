/**
 * Format Classification Plot (Modern Visualization)
 *
 * This module generates data for the Classification Plot visualization,
 * which shows the distribution of predicted probabilities for each observed group.
 *
 * The Classification Plot is a stacked/overlapping histogram-like visualization where:
 * - X-axis: Predicted probability bins (0 to 1)
 * - Y-axis: Frequency
 * - Two groups are shown with different colors
 *
 * This replaces the old SPSS ASCII-art style classification plot with a modern chart.
 * * For stepwise methods (Forward/Backward), classification plots are generated per step.
 * The displayAtLastStep option controls whether to show all steps or only the last step.
 */

import type {
  LogisticResult,
  ClassificationPlotData,
  AnalysisSection} from "../types/binary-logistic";
import {
  StepDetail,
} from "../types/binary-logistic";

/**
 * Options for formatting classification plot
 */
export interface ClassificationPlotOptions {
  displayAtLastStep?: boolean;
}

// Number of bins for the histogram (SPSS uses 10 bins by default: 0-0.1, 0.1-0.2, etc.)
const NUM_BINS = 10;

/**
 * Interface for chart data point (for stacked/grouped histogram)
 */
interface ClassificationPlotChartData {
  bin: string; // Bin label (e.g., "0.0-0.1")
  binCenter: number; // Center of bin for positioning
  group0Count: number; // Count for observed group 0 (FALSE)
  group1Count: number; // Count for observed group 1 (TRUE)
  group0Label: string; // Label for group 0
  group1Label: string; // Label for group 1
}

/**
 * Generate bin labels for predicted probability histogram
 */
const generateBinLabels = (): string[] => {
  const labels: string[] = [];
  for (let i = 0; i < NUM_BINS; i++) {
    const start = (i / NUM_BINS).toFixed(1);
    const end = ((i + 1) / NUM_BINS).toFixed(1);
    labels.push(`${start}`);
  }
  return labels;
};

/**
 * Bin data points into histogram buckets
 */
const binDataPoints = (
  plotData: ClassificationPlotData,
): ClassificationPlotChartData[] => {
  const binWidth = 1.0 / NUM_BINS;
  const bins: ClassificationPlotChartData[] = [];
  const binLabels = generateBinLabels();

  // Initialize bins
  for (let i = 0; i < NUM_BINS; i++) {
    bins.push({
      bin: binLabels[i],
      binCenter: (i + 0.5) * binWidth,
      group0Count: 0,
      group1Count: 0,
      group0Label: plotData.label_0,
      group1Label: plotData.label_1,
    });
  }

  // Count data points in each bin
  plotData.data_points.forEach((point) => {
    // Determine which bin this probability falls into
    let binIndex = Math.floor(point.predicted_probability / binWidth);
    // Handle edge case where probability = 1.0
    if (binIndex >= NUM_BINS) binIndex = NUM_BINS - 1;
    if (binIndex < 0) binIndex = 0;

    if (point.observed_group === 0) {
      bins[binIndex].group0Count++;
    } else {
      bins[binIndex].group1Count++;
    }
  });

  return bins;
};

/**
 * Generate description based on classification plot data
 */
const generateDescription = (plotData: ClassificationPlotData): string => {
  const totalN = plotData.n_group_0 + plotData.n_group_1;
  const cutoffBin = Math.floor(plotData.cutoff * NUM_BINS);

  // Calculate correct classifications
  let correctGroup0 = 0;
  let correctGroup1 = 0;

  plotData.data_points.forEach((point) => {
    const predicted = point.predicted_probability >= plotData.cutoff ? 1 : 0;
    if (point.observed_group === 0 && predicted === 0) correctGroup0++;
    if (point.observed_group === 1 && predicted === 1) correctGroup1++;
  });

  const overallCorrect = correctGroup0 + correctGroup1;
  const overallPct = ((overallCorrect / totalN) * 100).toFixed(1);

  return (
    `Classification plot showing the distribution of predicted probabilities for ${totalN} cases. ` +
    `The vertical line at ${plotData.cutoff.toFixed(2)} represents the classification cutoff. ` +
    `Cases to the left are predicted as ${plotData.label_0}, cases to the right as ${plotData.label_1}. ` +
    `Overall correct classification: ${overallPct}%.`
  );
};

/**
 * Format Classification Plot for visualization
 *
 * Returns chart data in format compatible with GeneralChartContainer
 * * For Enter method: Uses result.classification_plot_data
 * For Stepwise methods: Uses classification_plot_data from each step in steps_detail
 */
export const formatClassificationPlot = (
  result: LogisticResult,
  dependentName: string,
  options?: ClassificationPlotOptions,
): { sections: AnalysisSection[]; chartData: any } => {
  const sections: AnalysisSection[] = [];
  const allCharts: any[] = [];
  const displayAtLastStep = options?.displayAtLastStep ?? false;

  // Get model info for label mapping
  const modelInfo = (result as any).model_info || {};
  const yMap = modelInfo.y_encoding || {};
  const labelLookup: Record<number, string> = Object.entries(yMap).reduce(
    (acc, [key, val]) => {
      acc[val as number] = key;
      return acc;
    },
    {} as Record<number, string>,
  );

  const method = result.method_used || "Enter";
  const isStepwise =
    method.toLowerCase().includes("forward") ||
    method.toLowerCase().includes("backward");
  const isBackward = method.toLowerCase().includes("backward");

  // ======================================================================
  // CASE 1: Enter Method or result.classification_plot_data exists (single plot)
  // ======================================================================
  if (!isStepwise && result.classification_plot_data) {
    const { section, chart } = formatSingleClassificationPlot(
      result.classification_plot_data,
      labelLookup,
      undefined, // No step number for Enter
      method,
    );
    if (section) sections.push(section);
    if (chart) allCharts.push(chart);
  }

  // ======================================================================
  // CASE 2: Stepwise Methods - iterate through steps_detail
  // ======================================================================
  if (isStepwise && result.steps_detail && result.steps_detail.length > 0) {
    // Filter steps that have classification_plot_data
    let stepsWithPlot = result.steps_detail.filter(
      (step) =>
        step.classification_plot_data?.data_points &&
        step.classification_plot_data.data_points.length > 0,
    );

    // Apply displayAtLastStep filter
    if (displayAtLastStep && stepsWithPlot.length > 0) {
      if (isBackward) {
        // For Backward: show Step 1 and last step (SPSS behavior)
        const firstStep = stepsWithPlot.find((s) => s.step === 1);
        const lastStep = stepsWithPlot[stepsWithPlot.length - 1];

        if (firstStep && lastStep && firstStep.step !== lastStep.step) {
          stepsWithPlot = [firstStep, lastStep];
        } else if (lastStep) {
          stepsWithPlot = [lastStep];
        }
      } else {
        // For Forward: only show the last step
        stepsWithPlot = [stepsWithPlot[stepsWithPlot.length - 1]];
      }
    }

    // Generate chart for each step
    stepsWithPlot.forEach((stepDetail) => {
      if (stepDetail.classification_plot_data) {
        const { section, chart } = formatSingleClassificationPlot(
          stepDetail.classification_plot_data,
          labelLookup,
          stepDetail.step,
          method,
        );
        if (section) sections.push(section);
        if (chart) allCharts.push(chart);
      }
    });
  }

  // If no plots were generated, return empty
  if (sections.length === 0 || allCharts.length === 0) {
    return { sections: [], chartData: null };
  }

  // Combine all charts into chartData
  const chartData = {
    charts: allCharts,
  };

  return { sections, chartData };
};

/**
 * Format a single classification plot (used for both Enter and per-step)
 */
const formatSingleClassificationPlot = (
  plotData: ClassificationPlotData,
  labelLookup: Record<number, string>,
  stepNumber?: number,
  method?: string,
): { section: AnalysisSection | null; chart: any | null } => {
  if (!plotData?.data_points || plotData.data_points.length === 0) {
    return { section: null, chart: null };
  }

  // Override labels if we have actual encoding
  const actualLabel0 = labelLookup[0] || plotData.label_0;
  const actualLabel1 = labelLookup[1] || plotData.label_1;

  // Update plotData with actual labels
  const enhancedPlotData: ClassificationPlotData = {
    ...plotData,
    label_0: actualLabel0,
    label_1: actualLabel1,
  };

  // Bin the data points
  const binnedData = binDataPoints(enhancedPlotData);

  // Generate IDs and titles based on step number
  const stepSuffix = stepNumber !== undefined ? `_step_${stepNumber}` : "";
  const stepTitle = stepNumber !== undefined ? ` (Step ${stepNumber})` : "";

  // Generate chart data for GeneralChartContainer
  const chart = {
    chartType: "Classification Plot",
    chartData: binnedData.map((bin) => ({
      category: bin.bin,
      [actualLabel0]: bin.group0Count,
      [actualLabel1]: bin.group1Count,
    })),
    chartConfig: {
      width: 600,
      height: 400,
      useAxis: true,
      useLegend: true,
      axisLabels: {
        // Added newline \n to create spacing between axis label and subtitle/text below
        x: "Predicted Probability\n",
        y: "Frequency",
      },
      // Updated colors: Red (#E74C3C) for group 0 (False), Blue (#4A90D9) for group 1 (True)
      chartColor: ["#E74C3C", "#4A90D9"],
      cutoff: plotData.cutoff, // Pass cutoff for vertical line rendering
      groups: [actualLabel0, actualLabel1],
    },
    chartMetadata: {
      axisInfo: {
        category: "Predicted Probability",
        value: "Frequency",
        x: "Predicted Probability",
        y: "Frequency",
      },
      title: `Observed Groups and Predicted Probabilities${stepTitle}`,
      // Updated subtitle to include the full text and context
      subtitle: `Predicted Probability is of Membership for ${actualLabel1}. Each bar segment represents case counts.`,
      description: generateDescription(enhancedPlotData),
      notes: `The Cut Value is ${plotData.cutoff.toFixed(2)}. Symbols: ${actualLabel0.charAt(0)} - ${actualLabel0}, ${actualLabel1.charAt(0)} - ${actualLabel1}`,
    },
  };

  // Create section entry with chart data
  // Note digabungkan ke description (note di awal, interpretasi di akhir)
  // Gunakan <br><br> untuk memisahkan note dan interpretasi (HTML untuk TiptapEditor)
  const noteText = `Cut value is ${plotData.cutoff.toFixed(2)}. ${actualLabel0.charAt(0)} = ${actualLabel0}, ${actualLabel1.charAt(0)} = ${actualLabel1}. N = ${plotData.n_group_0 + plotData.n_group_1}.`;
  const interpretationText = generateDescription(enhancedPlotData);
  const mergedDescription = [noteText, interpretationText].filter(Boolean).join("<br><br>");

  const section: AnalysisSection = {
    id: `classification_plot${stepSuffix}`,
    title: `Classification Plot${stepTitle}`,
    description: mergedDescription,
    type: "chart",
    data: {
      columnHeaders: [],
      rows: [],
    },
    chartData: { charts: [chart] }, // Include chart data in section
  };

  return { section, chart };
};

/**
 * Check if result has classification plot data
 * Checks both result.classification_plot_data and steps_detail for stepwise methods
 */
export const hasClassificationPlot = (result: LogisticResult): boolean => {
  // Check direct classification_plot_data (Enter method)
  if (
    result.classification_plot_data !== undefined &&
    result.classification_plot_data !== null &&
    result.classification_plot_data.data_points.length > 0
  ) {
    return true;
  }

  // Check steps_detail for stepwise methods
  if (result.steps_detail && result.steps_detail.length > 0) {
    return result.steps_detail.some(
      (step) =>
        step.classification_plot_data !== undefined &&
        step.classification_plot_data !== null &&
        step.classification_plot_data.data_points &&
        step.classification_plot_data.data_points.length > 0,
    );
  }

  return false;
};
