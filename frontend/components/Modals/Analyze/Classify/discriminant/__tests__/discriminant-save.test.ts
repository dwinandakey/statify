/**
 * Checks the per-case classification the Save service recomputes, using a model
 * simple enough to verify by hand.
 *
 * The fixture has one predictor `x`, one discriminant function whose
 * unstandardized coefficient is 1 with a constant of 0 (so a case's score *is*
 * its x), and two group centroids at -2 and +2. With equal priors, classifying
 * a case reduces to "which centroid is nearer", and the posterior probability
 * is softmax(-d^2 / 2) — both worked out below.
 */

import type { Variable } from "@/types/Variable";
import { DiscriminantDefault } from "@/components/Modals/Analyze/Classify/discriminant/constants/discriminant-default";
import type { DiscriminantType } from "@/components/Modals/Analyze/Classify/discriminant/types/discriminant";
import {
    computeDiscriminantCaseResults,
    prepareDiscriminantSaveVariables,
    type DiscriminantModelInfo,
} from "@/components/Modals/Analyze/Classify/discriminant/services/discriminant-save";

const variables = [
    { name: "grp", columnIndex: 0 },
    { name: "x", columnIndex: 1 },
] as Variable[];

const model: DiscriminantModelInfo = {
    canonical_functions: {
        coefficients: [
            { variable: "x", values: [1] },
            { variable: "(Constant)", values: [0] },
        ],
        function_at_centroids: [
            { group: "1", values: [-2] },
            { group: "2", values: [2] },
        ],
    },
};

function makeConfig(overrides: Partial<DiscriminantType> = {}): DiscriminantType {
    return {
        ...DiscriminantDefault,
        ...overrides,
        main: {
            ...DiscriminantDefault.main,
            GroupingVariable: "grp",
            IndependentVariables: ["x"],
            ...(overrides.main ?? {}),
        },
        defineRange: { minRange: 1, maxRange: 2, ...(overrides.defineRange ?? {}) },
        classify: { ...DiscriminantDefault.classify, ...(overrides.classify ?? {}) },
        save: { ...DiscriminantDefault.save, ...(overrides.save ?? {}) },
    };
}

describe("computeDiscriminantCaseResults", () => {
    it("assigns each case to the nearer centroid", () => {
        const rows = [
            ["1", "-3"],
            ["1", "-1"],
            ["2", "1"],
            ["2", "3"],
        ];

        const result = computeDiscriminantCaseResults(rows, variables, model, makeConfig());

        expect(result).not.toBeNull();
        expect(result!.groupLabels).toEqual(["1", "2"]);
        expect(result!.numFunctions).toBe(1);
        expect(result!.rows.map((r) => r?.predictedGroup)).toEqual(["1", "1", "2", "2"]);
        // The score is just x, since the coefficient is 1 and the constant 0.
        expect(result!.rows.map((r) => r?.scores[0])).toEqual([-3, -1, 1, 3]);
    });

    it("produces posterior probabilities that match softmax(-d^2 / 2)", () => {
        const result = computeDiscriminantCaseResults(
            [["2", "1"]],
            variables,
            model,
            makeConfig(),
        );

        // x = 1: distance to centroid -2 is 3 (d^2 = 9), to centroid +2 is 1 (d^2 = 1).
        // log-odds in favour of group 2 = (-0.5 * 1) - (-0.5 * 9) = 4.
        const expectedP2 = 1 / (1 + Math.exp(-4));
        const probs = result!.rows[0]!.probabilities;

        expect(probs[0]).toBeCloseTo(1 - expectedP2, 12);
        expect(probs[1]).toBeCloseTo(expectedP2, 12);
        expect(probs[0] + probs[1]).toBeCloseTo(1, 12);
    });

    it("breaks an exact tie towards the first group, as the Rust engine does", () => {
        const result = computeDiscriminantCaseResults(
            [["1", "0"]],
            variables,
            model,
            makeConfig(),
        );

        expect(result!.rows[0]!.predictedGroup).toBe("1");
        expect(result!.rows[0]!.probabilities[0]).toBeCloseTo(0.5, 12);
    });

    it("leaves out rows outside the range, with a missing predictor, or with an unknown group", () => {
        const rows = [
            ["1", "-3"], // kept
            ["3", "1"], // grouping value above maxRange
            ["1", ""], // predictor missing
            ["1", "abc"], // predictor not numeric
            ["", "2"], // grouping value missing
        ];

        const result = computeDiscriminantCaseResults(rows, variables, model, makeConfig());

        expect(result!.rows.map((r) => (r ? r.predictedGroup : null))).toEqual([
            "1",
            null,
            null,
            null,
            null,
        ]);
    });

    it("uses group-size priors when the user does not assume equal priors", () => {
        // Four cases are coded group 1 (the three at x = -2 plus the x = 0 row
        // itself) against one in group 2, so the priors are 0.8 / 0.2. At x = 0
        // both squared distances are 4, so the priors alone decide.
        const rows = [
            ["1", "-2"],
            ["1", "-2"],
            ["1", "-2"],
            ["2", "2"],
            ["1", "0"],
        ];

        const result = computeDiscriminantCaseResults(
            rows,
            variables,
            model,
            makeConfig({
                classify: { ...DiscriminantDefault.classify, AllGroupEqual: false, GroupSize: true },
            }),
        );

        const tied = result!.rows[4]!;
        expect(tied.predictedGroup).toBe("1");
        expect(tied.probabilities[0]).toBeCloseTo(0.8, 12);
        expect(tied.probabilities[1]).toBeCloseTo(0.2, 12);
    });
});

describe("prepareDiscriminantSaveVariables", () => {
    const results = computeDiscriminantCaseResults(
        [
            ["1", "-3"],
            ["3", "9"], // excluded from the analysis
            ["2", "3"],
        ],
        variables,
        model,
        makeConfig(),
    )!;

    it("names the columns the way SPSS does", () => {
        const prepared = prepareDiscriminantSaveVariables(
            results,
            { Predicted: true, Discriminant: true, Probabilities: true, ExportXml: false, XmlFile: null },
            new Set<string>(),
        );

        expect(prepared.map((p) => p.definition.name)).toEqual([
            "Dis_1", // predicted group
            "Dis1_1", // scores, function 1
            "Dis1_2", // probabilities, group 1
            "Dis2_2", // probabilities, group 2
        ]);
        expect(prepared[0].definition.label).toBe("Predicted Group for Analysis 1");
        expect(prepared[1].definition.label).toBe(
            "Discriminant Scores from Function 1 for Analysis 1",
        );
        expect(prepared[3].definition.label).toBe(
            "Probabilities of Group 2 Membership for Analysis 1",
        );
    });

    it("keeps values on their own dataset row and blanks excluded cases", () => {
        const prepared = prepareDiscriminantSaveVariables(
            results,
            { Predicted: true, Discriminant: true, Probabilities: false, ExportXml: false, XmlFile: null },
            new Set<string>(),
        );

        expect(prepared[0].values).toEqual([1, null, 2]);
        expect(prepared[1].values).toEqual([-3, null, 3]);
    });

    it("moves to the next suffix when the SPSS names are already taken", () => {
        const prepared = prepareDiscriminantSaveVariables(
            results,
            { Predicted: true, Discriminant: false, Probabilities: false, ExportXml: false, XmlFile: null },
            new Set<string>(["Dis_1"]),
        );

        expect(prepared.map((p) => p.definition.name)).toEqual(["Dis_2"]);
        expect(prepared[0].definition.label).toBe("Predicted Group for Analysis 2");
    });

    it("numbers probabilities from the first suffix when scores are not saved", () => {
        const prepared = prepareDiscriminantSaveVariables(
            results,
            { Predicted: false, Discriminant: false, Probabilities: true, ExportXml: false, XmlFile: null },
            new Set<string>(),
        );

        expect(prepared.map((p) => p.definition.name)).toEqual(["Dis1_1", "Dis2_1"]);
    });
});
