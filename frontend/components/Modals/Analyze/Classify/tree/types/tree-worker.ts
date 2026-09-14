import type {TreeType} from "./tree";

export type TreeAnalysisType = {
    configData: TreeType;
    dataVariables: any[];
    variables: any[];
};

export type TreeFinalResultType = Record<string, unknown>;
