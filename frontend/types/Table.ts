import { Chart } from "./Chart";

export interface ResultJson {
    tables: Table[];
    charts?: Chart[];
    analysisStatus?: AnalysisStatus;
}

export interface AnalysisStatus {
    isConverged: boolean;
    extractedFactors: number;
    terminatedEarly: boolean;
    terminationReason?: string | null;
    hasHeywoodCase?: boolean;
}

export interface Table {
    key: string;
    title: string;
    columnHeaders: ColumnHeader[];
    rows: Row[];
    note?: string;
    interpretation?: string;
}

export interface ColumnHeader {
    header: string;
    key?: string;
    children?: ColumnHeader[];
    width?: string | number;
}

export interface Row {
    rowHeader: (string | null)[];
    [key: string]:
        | string
        | number
        | null
        | undefined
        | Row[]
        | (string | null)[];
    children?: Row[];
}
