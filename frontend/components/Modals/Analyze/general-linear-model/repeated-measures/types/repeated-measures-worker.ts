import type { RepeatedMeasuresType } from "./repeated-measures";
import type { ResultJson } from "@/types/Table";

export type RepeatedMeasuresAnalysisType = {
    configData: RepeatedMeasuresType;
    dataVariables: any[];
    variables: any[];
};

export type RepeatedMeasuresFinalResultType = {
    formattedResult: ResultJson;
};
