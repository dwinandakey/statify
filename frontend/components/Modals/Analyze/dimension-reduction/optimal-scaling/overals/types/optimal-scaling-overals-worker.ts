import type {OptScaOveralsType} from "./optimal-scaling-overals";

export type OptScaOveralsAnalysisType = {
    configData: OptScaOveralsType;
    dataVariables: any[];
    variables: any[];
};

export type OptScaOveralsFinalResultType = Record<string, unknown>;
