/** @jest-environment jsdom */

/**
 * UT-OUT-11: prepareKMedoidsSaveVariables tidak membuat variabel apapun
 * kalau kedua opsi (ClusterMembership, DistanceClusterCenter) nonaktif.
 * Menguji k-medoids-cluster-save.ts.
 */

import { prepareKMedoidsSaveVariables } from "../services/k-medoids-cluster-save";

describe("UT-OUT-11: prepareKMedoidsSaveVariables tidak membuat variabel apapun kalau kedua opsi nonaktif", () => {
    it("ClusterMembership=false, DistanceClusterCenter=false -> tidak ada variabel dibuat", () => {
        const result = prepareKMedoidsSaveVariables(
            [0, 1],
            [0.5, 1.2],
            { ClusterMembership: false, DistanceClusterCenter: false },
            2
        );
        expect(result.variablesToCreate).toEqual([]);
        expect(result.variableData).toEqual({});
    });
});
