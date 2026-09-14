// Re-export the pure transform function from the existing formatter.
// The actual transform logic lives in discriminant-analysis-formatter.ts.
// This file is the clean entry point for services/formatter.ts pattern.
export { transformDiscriminantResult } from "./discriminant-analysis-formatter";