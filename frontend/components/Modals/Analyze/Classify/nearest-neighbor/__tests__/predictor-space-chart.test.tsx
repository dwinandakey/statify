/** @jest-environment jsdom */

import React from "react";
import { render } from "@testing-library/react";
import KNNPredictorSpaceChart, {
  niceTickStep,
} from "@/components/Modals/Analyze/Classify/nearest-neighbor/components/KNNPredictorSpaceChart";

// The 2D chart never creates OrbitControls; the ESM module does not load in Jest.
jest.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: jest.fn(),
}));

const width = 900;
const height = 640;
const svgWidth = width - 220;
const svgHeight = height - 110;

function singlePredictorPayload() {
  const ages = [18, 25, 33, 41, 49, 60];
  return {
    charts: [
      {
        chartData: ages.map((age, index) => ({
          id: index + 1,
          x: age,
          y: 0,
          type: "Training",
          target: index % 2 === 0 ? "No" : "Yes",
          predictorValues: [age],
          focal: index === 0,
          neighbors: [{ id: 2, distance: 0.1 }],
        })),
        chartConfig: {
          width,
          height,
          axisLabels: { x: "Age" },
          axisInfo: { x: { name: "Age", measure: "scale" } },
          predictorSpace: {
            selectedK: 1,
            modelPredictors: 1,
            actualPredictors: 1,
            targetVariable: "Attrition",
            targetMeasure: "nominal",
            displayedDimensions: 1,
            availableAxes: [{ name: "Age", measure: "scale" }],
            instruction: "Select points to use as focal records",
          },
        },
      },
    ],
  };
}

describe("KNN predictor space chart", () => {
  it("keeps single-predictor points on one line inside the plot", () => {
    const { container } = render(
      <KNNPredictorSpaceChart data={singlePredictorPayload()} />,
    );
    const circles = Array.from(container.querySelectorAll("svg circle"));

    expect(circles).toHaveLength(6);
    const cxs = circles.map((circle) => Number(circle.getAttribute("cx")));
    const cys = circles.map((circle) => Number(circle.getAttribute("cy")));

    expect(new Set(cys).size).toBe(1);
    for (const cy of cys) {
      expect(cy).toBeGreaterThan(0);
      expect(cy).toBeLessThan(svgHeight);
    }
    for (const cx of cxs) {
      expect(cx).toBeGreaterThan(0);
      expect(cx).toBeLessThan(svgWidth);
    }
    // Larger ages are drawn further right.
    expect([...cxs].sort((a, b) => a - b)).toEqual(cxs);
  });

  it("rounds tick steps to the nearest nice value", () => {
    expect(niceTickStep(109 / 5)).toBe(20);
    expect(niceTickStep(42 / 5)).toBe(10);
    expect(niceTickStep(0.37)).toBe(0.5);
    expect(niceTickStep(1.2)).toBe(1);
  });
});
