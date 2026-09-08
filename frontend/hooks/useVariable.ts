import { Variable } from "@/types/Variable";

type VariableType = {
    dataVariables: string[][];
    variables: Variable[];
    selectedVariables: string[] | string | null;
};

function normalizeSelectedVariables(
    selectedVariables: string[] | string | null
): string[] {
    if (!selectedVariables) return [];
    return Array.isArray(selectedVariables)
        ? selectedVariables
        : [selectedVariables];
}

function buildColumnIndexMap(variables: Variable[]): Map<string, number> {
    return new Map(variables.map((variable) => [variable.name, variable.columnIndex]));
}

function parseCellValue(rawValue: unknown): string | number | null {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
        return null;
    }

    const stringValue = String(rawValue);
    const normalizedValue = stringValue.replace(",", ".");
    const parsedValue = Number.parseFloat(normalizedValue);

    return Number.isNaN(parsedValue) ? stringValue : parsedValue;
}

export function getMaxIndex({
    dataVariables,
    variables,
    selectedVariables,
}: VariableType) {
    const names = normalizeSelectedVariables(selectedVariables);
    if (names.length === 0 || dataVariables.length === 0) return 0;

    const columnIndexMap = buildColumnIndexMap(variables);
    let maxIndex = -1;

    dataVariables.forEach((row, rowIndex) => {
        if (!row) return;

        let hasData = false;

        for (const varName of names) {
            const columnIndex = columnIndexMap.get(varName);
            if (columnIndex === undefined || columnIndex < 0) continue;

            const rawValue = row[columnIndex];

            if (
                rawValue !== undefined &&
                rawValue !== null &&
                rawValue !== ""
            ) {
                hasData = true;
                break;
            }
        }

        if (hasData) maxIndex = rowIndex;
    });

    if (maxIndex < 0) maxIndex = 0;
    return maxIndex;
}

export function getSlicedData({
    dataVariables,
    variables,
    selectedVariables,
}: VariableType) {
    const names = normalizeSelectedVariables(selectedVariables);
    if (names.length === 0 || dataVariables.length === 0) return [];

    const columnIndexMap = buildColumnIndexMap(variables);
    const warnedMissingVariables = new Set<string>();

    const maxIndex = getMaxIndex({
        dataVariables,
        variables,
        selectedVariables: names,
    });

    const newSlicedData: Record<string, string | number | null>[][] = [];

    names.forEach((varName) => {
        const slicedDataForVar: Record<string, string | number | null>[] = [];
        const columnIndex = columnIndexMap.get(varName);

        if (columnIndex === undefined && !warnedMissingVariables.has(varName)) {
            console.warn(
                `[getSlicedData] Variable "${varName}" not found in variables array!`
            );
            warnedMissingVariables.add(varName);
        }

        for (let i = 0; i <= maxIndex; i++) {
            const row = dataVariables[i];
            const rowObj: Record<string, string | number | null> = {};

            const rawValue =
                columnIndex === undefined || !row ? null : row[columnIndex];
            rowObj[varName] = parseCellValue(rawValue);

            slicedDataForVar.push(rowObj);
        }

        newSlicedData.push(slicedDataForVar);
    });

    return newSlicedData;
}

export function getVarDefs(
    variables: Variable[],
    selectedVariables: string[] | string | null
) {
    if (!selectedVariables) return [];

    const names = Array.isArray(selectedVariables)
        ? selectedVariables
        : [selectedVariables];
    const newVarDefs: any[][] = [];

    names.forEach((varName) => {
        const varDef = variables.find((v) => v.name === varName);

        const normalizedValueLabels = Array.isArray(varDef?.values)
            ? varDef.values.map((valueLabel) => ({
                  id: valueLabel?.id,
                  variable_name: varDef?.name ?? varName,
                  value: valueLabel?.value ?? null,
                  label:
                      valueLabel?.label ??
                      String(valueLabel?.value ?? ""),
              }))
            : [];

        const varDefObj = {
            // Coerce numeric fields to Number so string-typed values (e.g.
            // "0") from the store don't cause Rust i32/usize deserialisation
            // failures when serde_wasm_bindgen processes the varDefs payload.
            id: varDef?.id != null ? Number(varDef.id) : undefined,
            columnIndex: Number(varDef?.columnIndex ?? 0),
            name: varDef?.name ?? "",
            type: varDef?.type ?? "STRING",
            width: Number(varDef?.width ?? 0),
            decimals: Number(varDef?.decimals ?? 0),
            label: varDef?.label ?? "",
            values: normalizedValueLabels,
            // Rust GLM schema expects `missing` as an array of values.
            missing: [],
            columns: Number(varDef?.columns ?? 0),
            align: varDef?.align ?? "left",
            measure: varDef?.measure ?? "unknown",
            role: varDef?.role ?? "none",
        };

        newVarDefs.push([varDefObj]);
    });

    return newVarDefs;
}
