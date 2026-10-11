import type {OptScaMCAType} from "./optimal-scaling-mca";

export type OptScaMCAAnalysisType = {
    configData: OptScaMCAType;
    dataVariables: any[];
    variables: any[];
};

export type OptScaMCAFinalResultType = Record<string, unknown>;
