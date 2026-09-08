import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { KMedoidsClusterDialog } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/dialogs/dialog";
import { KMedoidsClusterDefault } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/constants/k-medoids-cluster-default";
import type { Variable } from "@/types/Variable";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), info: jest.fn() } }));
jest.mock("@/stores/useDataStore", () => ({
    useDataStore: (selector: (state: { data: unknown[][] }) => unknown) =>
        selector({ data: [] }),
}));
jest.mock("@/hooks/useMobile", () => ({
    useMobile: () => ({ isMobile: false, isPortrait: false }),
}));

const makeVar = (name: string, columnIndex: number): Variable =>
    ({ name, columnIndex, type: "NUMERIC", measure: "scale" } as unknown as Variable);

const globalVariables = [
    makeVar("feature_1", 0),
    makeVar("feature_2", 1),
    makeVar("feature_3", 2),
];

describe("K-Medoids variable selection", () => {
    it("moves several variables at once with ctrl/shift click", () => {
        const updateFormData = jest.fn();
        render(
            <KMedoidsClusterDialog
                updateFormData={updateFormData}
                data={{ ...KMedoidsClusterDefault.main }}
                globalVariables={globalVariables}
            />
        );

        fireEvent.click(screen.getByTestId("variable-item-available-feature_1"));
        fireEvent.click(screen.getByTestId("variable-item-available-feature_3"), {
            shiftKey: true,
        });

        expect(screen.getByTestId("kmedoids-multiselect-help")).toHaveTextContent(
            "3 variabel terpilih"
        );

        fireEvent.click(screen.getByTestId("arrow-move-button-TargetVar"));

        expect(updateFormData).toHaveBeenCalledWith("TargetVar", [
            "feature_1",
            "feature_2",
            "feature_3",
        ]);
        expect(screen.getByTestId("variable-item-TargetVar-feature_2")).toBeInTheDocument();
    });

    it("moves a selection back to the available list", () => {
        const updateFormData = jest.fn();
        render(
            <KMedoidsClusterDialog
                updateFormData={updateFormData}
                data={{
                    ...KMedoidsClusterDefault.main,
                    TargetVar: ["feature_1", "feature_2", "feature_3"],
                }}
                globalVariables={globalVariables}
            />
        );

        fireEvent.click(screen.getByTestId("select-all-TargetVar"));
        fireEvent.click(screen.getByTestId("arrow-move-button-back-to-available"));

        expect(updateFormData).toHaveBeenCalledWith("TargetVar", []);
        expect(screen.getByTestId("variable-item-available-feature_1")).toBeInTheDocument();
    });
});
