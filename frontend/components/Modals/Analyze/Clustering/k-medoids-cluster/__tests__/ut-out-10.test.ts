/** @jest-environment jsdom */

/**
 * UT-OUT-10: prepareKMedoidsSaveVariables membuat DIS_1 dengan nilai
 * jarak apa adanya.
 * Menguji k-medoids-cluster-save.ts.
 */

import { prepareKMedoidsSaveVariables } from "../services/k-medoids-cluster-save";

describe("UT-OUT-10: prepareKMedoidsSaveVariables membuat DIS_1 dengan nilai jarak apa adanya", () => {
    it("DistanceClusterCenter aktif + ada data jarak -> DIS_1 dibuat", () => {
        const result = prepareKMedoidsSaveVariables(
            [0, 1],
            [0.5, 1.2],
            { ClusterMembership: false, DistanceClusterCenter: true },
            2
        );
        expect(result.variablesToCreate.map(v => v.name)).toEqual(["DIS_1"]);
        expect(result.variableData["DIS_1"]).toEqual([0.5, 1.2]); // tidak diubah
    });
});
