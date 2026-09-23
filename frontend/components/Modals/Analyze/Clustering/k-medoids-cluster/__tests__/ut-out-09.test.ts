/** @jest-environment jsdom */

/**
 * UT-OUT-09: prepareKMedoidsSaveVariables membuat CLU_1 dengan label
 * 1-based (konvensi SPSS).
 * Menguji k-medoids-cluster-save.ts.
 */

import { prepareKMedoidsSaveVariables } from "../services/k-medoids-cluster-save";

describe("UT-OUT-09: prepareKMedoidsSaveVariables membuat CLU_1 dengan label 1-based (konvensi SPSS)", () => {
    it("ClusterMembership aktif -> CLU_1 dibuat, label 0-based dikonversi ke 1-based", () => {
        const result = prepareKMedoidsSaveVariables(
            [0, 1, 0, 2],
            undefined,
            { ClusterMembership: true, DistanceClusterCenter: false },
            3
        );
        expect(result.variablesToCreate.map(v => v.name)).toEqual(["CLU_1"]);
        expect(result.variableData["CLU_1"]).toEqual([1, 2, 1, 3]); // +1 dari label asli
    });
});
