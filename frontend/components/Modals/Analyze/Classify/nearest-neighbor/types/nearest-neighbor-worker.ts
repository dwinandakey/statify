import type {KNNType} from "./nearest-neighbor";
import type {ResultJson} from "@/types/Table";
import type {Variable} from "@/types/Variable";

export type KNNAnalysisType = {
    configData: KNNType;
    // The shared slicing helper still models rows as string-only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataVariables: any[];
    variables: Variable[];
};

export type KNNFinalResultType = {
    formattedResult: ResultJson;
    // Raw worker output is interpreted by the chart builders at runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawResult?: any;
    configData?: KNNType;
};
