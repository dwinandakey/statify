import { renderHook, act } from "@testing-library/react";
import { useTimeSeriesSplit } from "../useTimeSeriesSplit";
import { useVariableStore } from "@/stores/useVariableStore";

describe("useTimeSeriesSplit hook", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("initializes with default values", () => {
        const { result } = renderHook(() => useTimeSeriesSplit(0.8));

        expect(result.current.splitEnabled).toBe(false);
        expect(result.current.splitMode).toBe("holdout");
        expect(result.current.rollingType).toBe("expanding");
        expect(result.current.trainRatio).toBe(0.8);
        expect(result.current.saveSplitVariable).toBe(false);
        expect(result.current.savePredictions).toBe(false);
    });

    it("calculates split counts correctly", () => {
        const { result } = renderHook(() => useTimeSeriesSplit(0.8));

        const counts = result.current.calculateSplitCounts(100);
        expect(counts.trainSize).toBe(80);
        expect(counts.testSize).toBe(20);
        expect(counts.splitIndex).toBe(80);

        const edgeCounts = result.current.calculateSplitCounts(0);
        expect(edgeCounts.trainSize).toBe(0);
        expect(edgeCounts.testSize).toBe(0);
    });

    it("resets split state cleanly", () => {
        const { result } = renderHook(() => useTimeSeriesSplit(0.8));

        act(() => {
            result.current.setSplitEnabled(true);
            result.current.setSplitMode("rolling");
            result.current.setRollingType("fixed");
            result.current.setTrainRatio(0.7);
            result.current.setSaveSplitVariable(true);
            result.current.setSavePredictions(true);
        });

        expect(result.current.splitEnabled).toBe(true);
        expect(result.current.splitMode).toBe("rolling");

        act(() => {
            result.current.resetSplit();
        });

        expect(result.current.splitEnabled).toBe(false);
        expect(result.current.splitMode).toBe("holdout");
        expect(result.current.rollingType).toBe("expanding");
        expect(result.current.trainRatio).toBe(0.8);
        expect(result.current.saveSplitVariable).toBe(false);
        expect(result.current.savePredictions).toBe(false);
    });

    it("saves split indicator and predictions to VariableStore and DataStore", async () => {
        const mockAddVariables = jest.fn().mockResolvedValue(undefined);
        jest.spyOn(useVariableStore, "getState").mockReturnValue({
            variables: [{ name: "VAR1", columnIndex: 0 }],
            addVariables: mockAddVariables,
        } as any);

        const { result } = renderHook(() => useTimeSeriesSplit(0.8));

        act(() => {
            result.current.setSaveSplitVariable(true);
            result.current.setSavePredictions(true);
        });

        await act(async () => {
            await result.current.saveSplitToDataView({
                totalRows: 10,
                splitIndex: 8,
                testPredictions: [1.23, 1.45],
                modelLabel: "GARCH"
            });
        });

        expect(mockAddVariables).toHaveBeenCalledTimes(1);
        const [addedVars, updates] = mockAddVariables.mock.calls[0];

        // Should add SPLIT_1 and PRED_TEST_1
        expect(addedVars.length).toBe(2);
        expect(addedVars[0].name).toBe("SPLIT_1");
        expect(addedVars[1].name).toBe("PRED_TEST_1");

        // First 8 rows are TRAIN, last 2 are TEST
        const splitUpdates = updates.filter((u: any) => u.col === addedVars[0].columnIndex);
        expect(splitUpdates.length).toBe(10);
        expect(splitUpdates[0].value).toBe("TRAIN");
        expect(splitUpdates[7].value).toBe("TRAIN");
        expect(splitUpdates[8].value).toBe("TEST");
        expect(splitUpdates[9].value).toBe("TEST");

        // Predictions on row 8 and 9
        const predUpdates = updates.filter((u: any) => u.col === addedVars[1].columnIndex);
        expect(predUpdates.length).toBe(2);
        expect(predUpdates[0].value).toBe(1.23);
        expect(predUpdates[1].value).toBe(1.45);
    });
});
