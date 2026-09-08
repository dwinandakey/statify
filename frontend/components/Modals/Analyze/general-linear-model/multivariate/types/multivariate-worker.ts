import type { MultivariateType } from "./multivariate";
import type { ResultJson } from "@/types/Table";

export type MultivariateAnalysisType = {
    configData: MultivariateType;
    dataVariables: any[];
    variables: any[];
};

export type MultivariateFinalResultType = {
    formattedResult: ResultJson;
};
