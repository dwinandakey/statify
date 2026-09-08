import {
  OrdinalLocationParams,
  OrdinalOptions,
  OrdinalOptionsParams,
  OrdinalOutputParams,
  OrdinalPlumPayload,
  OrdinalScaleParams,
} from "../types/ordinal";
import {
  buildDefaultEstimationOptions,
  buildDefaultOutputOptions,
  inferModelType,
  inferScaleType,
  normalizeLinkFunction,
  normalizeOrderedCategories,
} from "./formatter_utils";

export interface BuildOrdinalPlumPayloadInput {
  options: OrdinalOptions;
  locationParams: OrdinalLocationParams;
  scaleParams: OrdinalScaleParams;
  optionParams: OrdinalOptionsParams;
  outputParams: OrdinalOutputParams;
  data: Array<Record<string, any>>;
}

export const buildOrdinalPlumPayload = (
  input: BuildOrdinalPlumPayloadInput
): OrdinalPlumPayload => {
  const { options, locationParams, scaleParams, optionParams, outputParams, data } = input;

  const responseVariable = options.dependent?.name ?? "";
  const responseColumnIndex = options.dependent?.columnIndex;
  const responseValues = Array.isArray(data) && typeof responseColumnIndex === "number"
    ? data.map((row) => row?.[responseColumnIndex])
    : [];

  const orderedCategories = normalizeOrderedCategories(responseValues);
  const categoryCount = orderedCategories.length;

  const locationVariables = locationParams.locationModel.length > 0
    ? locationParams.locationModel.map((v) => v.name)
    : [...options.factors, ...options.covariates].map((v) => v.name);

  const scaleVariables = scaleParams.scaleModel.map((v) => v.name);
  const scaleType = inferScaleType(scaleVariables);
  const modelType = inferModelType(scaleType);

  const parameterVector: Array<"theta" | "beta" | "tau"> = ["theta"];
  if (locationVariables.length > 0) {
    parameterVector.push("beta");
  }
  if (scaleType === "non_constant") {
    parameterVector.push("tau");
  }

  return {
    procedure: "PLUM",
    version: "plum-v1",
    dependent: options.dependent
      ? {
        name: options.dependent.name,
        columnIndex: options.dependent.columnIndex,
        type: options.dependent.type,
        label: options.dependent.label,
        valueLabels: options.dependent.values?.map((value) => ({
          value: value.value,
          label: value.label,
        })),
      }
      : null,
    factors: options.factors.map((factor) => ({
      name: factor.name,
      columnIndex: factor.columnIndex,
      type: factor.type,
      label: factor.label,
      valueLabels: factor.values?.map((value) => ({
        value: value.value,
        label: value.label,
      })),
    })),
    covariates: options.covariates.map((covariate) => ({
      name: covariate.name,
      columnIndex: covariate.columnIndex,
      type: covariate.type,
      label: covariate.label,
    })),
    response: {
      variable: responseVariable,
      orderedCategories,
      categoryCount,
    },
    model: {
      modelType,
      linkFunction: normalizeLinkFunction(optionParams.linkFunction),
      parameterVector,
    },
    location: {
      variables: locationVariables,
      parameterName: "beta",
      thresholdName: "theta",
    },
    scale: {
      scaleType,
      variables: scaleVariables,
      parameterName: "tau",
    },
    estimation: buildDefaultEstimationOptions(optionParams),
    output: buildDefaultOutputOptions(outputParams),
    frequencyWeightVariable: null,
  };
};
