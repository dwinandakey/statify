/** @jest-environment jsdom */

import React from "react";
import { act, render, screen } from "@testing-library/react";
import ResultOutput from "@/app/dashboard/result/components/ResultOutput";
import { useResultStore } from "@/stores/useResultStore";
import DataTableRenderer from "@/components/Output/Table/DataTableRenderer";

jest.mock("@/components/Output/Table/DataTableRenderer", () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="mock-table" />),
}));
jest.mock("@/components/Output/Editor/TiptapEditor", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-editor" />,
}));
jest.mock("@/components/Output/Chart/GeneralChartContainer", () => ({
  __esModule: true,
  default: () => <div />,
}));
jest.mock(
  "@/components/Modals/Analyze/Classify/nearest-neighbor/components/KNNKPredictorSelectionChart",
  () => ({ __esModule: true, default: () => <div /> }),
);

const tableOutput = (title: string) =>
  JSON.stringify({ tables: [{ title, columnHeaders: [], rows: [] }] });

function statistic(id: number) {
  return {
    id,
    analyticId: 1,
    title: `Table ${id}`,
    description: "",
    output_data: tableOutput(`Table ${id}`),
    components: `Table ${id}`,
  };
}

function setLogs(statistics: ReturnType<typeof statistic>[]) {
  useResultStore.setState({
    logs: [
      {
        id: 1,
        log: "Test",
        analytics: [{ id: 1, logId: 1, title: "Test Analysis", note: "", statistics }],
      },
    ] as never,
  });
}

describe("ResultOutput", () => {
  beforeEach(() => {
    useResultStore.setState({ loadResults: jest.fn().mockResolvedValue(undefined) });
    (DataTableRenderer as jest.Mock).mockClear();
  });

  it("renders each statistic's table and description", () => {
    setLogs([statistic(1), statistic(2)]);
    render(<ResultOutput />);

    expect(screen.getAllByTestId("mock-table")).toHaveLength(2);
    expect(screen.getByTestId("description-label-1")).toBeTruthy();
    expect(screen.getByTestId("description-label-2")).toBeTruthy();
  });

  it("does not re-render existing outputs when a statistic is added", () => {
    const first = statistic(1);
    setLogs([first]);
    render(<ResultOutput />);
    expect(DataTableRenderer).toHaveBeenCalledTimes(1);

    act(() => setLogs([first, statistic(2)]));

    // Only the new table renders; the first keeps its memoized output.
    expect(DataTableRenderer).toHaveBeenCalledTimes(2);
    expect(screen.getAllByTestId("mock-table")).toHaveLength(2);
  });
});
