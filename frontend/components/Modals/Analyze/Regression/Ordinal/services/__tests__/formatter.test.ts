import { formatOrdinalResult } from "../formatter";

describe("formatOrdinalResult", () => {
  it("should return empty sections if result is null or empty", () => {
    const res = formatOrdinalResult(null);
    expect(res.sections).toEqual([]);
  });

  it("should format all required tables correctly when present", () => {
    const mockResult = {
      summaryStatistics: {
        model: {
          minus2LogLikelihood: 123.4567,
          logLikelihood: -61.72835,
          converged: true,
          iterations: 5,
          method: "fisher_scoring"
        },
        interceptOnly: {
          minus2LogLikelihood: 200.1234,
          logLikelihood: -100.0617
        },
        modelChiSquare: {
          chiSquare: 76.6667,
          df: 3,
          sig: 0.0001
        },
        pseudoRSquare: {
          coxSnell: 0.4567,
          nagelkerke: 0.5678,
          mcfadden: 0.3456
        }
      },
      goodnessOfFit: {
        pearson: {
          chiSquare: 12.3456,
          df: 15,
          sig: 0.6521
        },
        deviance: {
          chiSquare: 11.2345,
          df: 15,
          sig: 0.7412
        }
      },
      parameterEstimates: [
        {
          group: "Threshold",
          variable: "[y = 1]",
          estimate: -1.2345,
          stdError: 0.3456,
          wald: 12.7654,
          sig: 0.0003,
          lower: -1.9118,
          upper: -0.5572
        },
        {
          group: "Location",
          variable: "x1",
          estimate: 0.8765,
          stdError: 0.2345,
          wald: 13.9682,
          sig: 0.0001,
          lower: 0.4168,
          upper: 1.3361
        }
      ],
      testOfParallelLines: {
        minus2LogLikelihoodParallel: 123.4567,
        minus2LogLikelihoodNonParallel: 120.1234,
        chiSquare: 3.3333,
        df: 2,
        sig: 0.1888,
        converged: true
      },
      iterationHistory: [
        {
          iteration: 1,
          logLikelihood: -80.1234,
          minus2LogLikelihood: 160.2468,
          step: 1.0,
          maxAbsGradient: 10.5,
          maxAbsDelta: 2.1,
          thresholdAdjustments: 0
        },
        {
          iteration: 2,
          logLikelihood: -61.7284,
          minus2LogLikelihood: 123.4568,
          step: 1.0,
          maxAbsGradient: 0.01,
          maxAbsDelta: 0.001,
          thresholdAdjustments: 0
        }
      ]
    };

    const formatted = formatOrdinalResult(mockResult);
    expect(formatted.sections).toHaveLength(6);

    // Verify Model Fitting Info
    const modelFitting = formatted.sections.find(s => s.id === "ordinal_model_fitting_information");
    expect(modelFitting).toBeDefined();
    expect(modelFitting?.data.rows[0].neg2ll).toBe("200.123");
    expect(modelFitting?.data.rows[1].neg2ll).toBe("123.457");
    expect(modelFitting?.data.rows[1].chiSquare).toBe("76.667");
    expect(modelFitting?.data.rows[1].df).toBe("3");
    expect(modelFitting?.data.rows[1].sig).toBe("< .001"); // 0.0001 is < 0.001, so formatted as "< .001"

    // Verify Goodness-of-Fit
    const gof = formatted.sections.find(s => s.id === "ordinal_goodness_of_fit");
    expect(gof).toBeDefined();
    expect(gof?.data.rows[0].chiSquare).toBe("12.346");
    expect(gof?.data.rows[0].df).toBe("15");
    expect(gof?.data.rows[0].sig).toBe("0.652");

    // Verify Pseudo R-Square
    const pseudo = formatted.sections.find(s => s.id === "ordinal_pseudo_r_square");
    expect(pseudo).toBeDefined();
    expect(pseudo?.data.rows[0].value).toBe("0.457");
    expect(pseudo?.data.rows[1].value).toBe("0.568");
    expect(pseudo?.data.rows[2].value).toBe("0.346");

    // Verify Parameter Estimates
    const params = formatted.sections.find(s => s.id === "ordinal_parameter_estimates");
    expect(params).toBeDefined();
    expect(params?.data.rows[0].estimate).toBe("-1.235");
    expect(params?.data.rows[1].estimate).toBe("0.877");

    // Verify Test of Parallel Lines
    const parallel = formatted.sections.find(s => s.id === "ordinal_test_of_parallel_lines");
    expect(parallel).toBeDefined();
    expect(parallel?.data.rows[0].neg2ll).toBe("123.457");
    expect(parallel?.data.rows[1].neg2ll).toBe("120.123");
    expect(parallel?.data.rows[1].chiSquare).toBe("3.333");
    expect(parallel?.data.rows[1].df).toBe("2");
    expect(parallel?.data.rows[1].sig).toBe("0.189");

    // Verify Iteration History
    const iterHistory = formatted.sections.find(s => s.id === "ordinal_iteration_history");
    expect(iterHistory).toBeDefined();
    expect(iterHistory?.data.rows[0].neg2ll).toBe("160.247");
    expect(iterHistory?.data.rows[1].neg2ll).toBe("123.457");
    expect(iterHistory?.data.rows[1].maxAbsGradient).toBe("0.010");
  });

  it("should render saved variables and parameter estimates when both are requested", () => {
    const formatted = formatOrdinalResult({
      outputOptions: { parameterEstimates: true },
      savedVariableOptions: { predictedResponseCategory: true },
      savedVariables: {
        columns: [
          { name: "PRE_1", label: "Predicted Response Category" },
          { name: "PCP_1", label: "Estimated Classification Probability" },
        ],
      },
      parameterEstimates: [
        { group: "Threshold", variable: "[y = 1]", estimate: -1.2 },
      ],
    });

    const saved = formatted.sections.find(s => s.id === "ordinal_saved_variables");
    const params = formatted.sections.find(s => s.id === "ordinal_parameter_estimates");

    expect(saved).toBeDefined();
    expect(saved?.data.rows).toHaveLength(2);
    expect(saved?.data.rows[0].status).toBe("Berhasil disimpan");
    expect(params).toBeDefined();
  });

  it("should render only saved variables when parameter estimates are not requested", () => {
    const formatted = formatOrdinalResult({
      outputOptions: { parameterEstimates: false },
      savedVariableOptions: { predictedResponseCategory: true },
      savedVariables: {
        columns: [
          { name: "PRE_1", label: "Predicted Response Category" },
        ],
      },
      parameterEstimates: [
        { group: "Threshold", variable: "[y = 1]", estimate: -1.2 },
      ],
    });

    expect(formatted.sections.find(s => s.id === "ordinal_saved_variables")).toBeDefined();
    expect(formatted.sections.find(s => s.id === "ordinal_parameter_estimates")).toBeUndefined();
  });

  it("should render parameter estimates when requested without saved variables", () => {
    const formatted = formatOrdinalResult({
      outputOptions: { parameterEstimates: true },
      savedVariableOptions: { predictedResponseCategory: false },
      parameterEstimates: [
        { group: "Threshold", variable: "[y = 1]", estimate: -1.2 },
      ],
    });

    expect(formatted.sections.find(s => s.id === "ordinal_saved_variables")).toBeUndefined();
    expect(formatted.sections.find(s => s.id === "ordinal_parameter_estimates")).toBeDefined();
  });

  it("should add selected link function notes to core ordinal tables", () => {
    const formatted = formatOrdinalResult({
      estimationOptions: { linkFunction: "Probit" },
      outputOptions: {
        goodnessOfFit: true,
        summaryStatistics: true,
        parameterEstimates: true,
      },
      summaryStatistics: {
        model: { minus2LogLikelihood: 12, logLikelihood: -6, converged: true, iterations: 1 },
        interceptOnly: { minus2LogLikelihood: 18, logLikelihood: -9 },
        modelChiSquare: { chiSquare: 6, df: 1, sig: 0.01 },
        pseudoRSquare: { coxSnell: 0.1, nagelkerke: 0.2, mcfadden: 0.3 },
      },
      goodnessOfFit: {
        pearson: { chiSquare: 1, df: 2, sig: 0.5 },
        deviance: { chiSquare: 1.5, df: 2, sig: 0.4 },
      },
      parameterEstimates: [
        { group: "Threshold", variable: "[y = 1]", estimate: -1.2 },
      ],
    });

    expect(formatted.sections.find(s => s.id === "ordinal_model_fitting_information")?.note).toBe("Link function: Probit.");
    expect(formatted.sections.find(s => s.id === "ordinal_goodness_of_fit")?.note).toBe("Link function: Probit.");
    expect(formatted.sections.find(s => s.id === "ordinal_pseudo_r_square")?.note).toBe("Link function: Probit.");
    expect(formatted.sections.find(s => s.id === "ordinal_parameter_estimates")?.note).toBe("Link function: Probit.");
  });

  it("should not render display sections when their output options are false", () => {
    const formatted = formatOrdinalResult({
      outputOptions: {
        goodnessOfFit: false,
        summaryStatistics: false,
        parameterEstimates: false,
        testOfParallelLines: false,
        iterationHistory: false,
      },
      summaryStatistics: {
        model: { minus2LogLikelihood: 12, logLikelihood: -6, converged: true, iterations: 1 },
        interceptOnly: { minus2LogLikelihood: 18, logLikelihood: -9 },
        modelChiSquare: { chiSquare: 6, df: 1, sig: 0.01 },
        pseudoRSquare: { coxSnell: 0.1, nagelkerke: 0.2, mcfadden: 0.3 },
      },
      goodnessOfFit: {
        pearson: { chiSquare: 1, df: 2, sig: 0.5 },
        deviance: { chiSquare: 1.5, df: 2, sig: 0.4 },
      },
      parameterEstimates: [
        { group: "Threshold", variable: "[y = 1]", estimate: -1.2 },
      ],
      testOfParallelLines: {
        minus2LogLikelihoodParallel: 12,
        minus2LogLikelihoodNonParallel: 10,
        chiSquare: 2,
        df: 1,
        sig: 0.15,
      },
      iterationHistory: [
        { iteration: 1, minus2LogLikelihood: 12, threshold: [], location: [], scale: [] },
      ],
    });

    expect(formatted.sections).toEqual([]);
  });

  it("should render GVIF collinearity diagnostics when requested", () => {
    const formatted = formatOrdinalResult({
      outputOptions: {
        test_of_multicolinearity: true,
      },
      collinearityDiagnostics: {
        rows: [
          {
            predictor: "Education",
            predictorType: "Factor",
            df: 3,
            gvif: 40.1,
            adjustedGvif: 1.85,
            interpretation: "Safe",
          },
          {
            predictor: "Income",
            predictorType: "Covariate",
            df: 1,
            gvif: 4.55,
            adjustedGvif: 2.1334,
            interpretation: "Attention",
          },
        ],
        warnings: ["Correlation matrix was near-singular; a small ridge regularization was applied."],
      },
    });

    const section = formatted.sections.find(s => s.id === "ordinal_collinearity_diagnostics");
    expect(section).toBeDefined();
    expect(section?.title).toBe("Collinearity Diagnostics");
    expect(section?.data.rows[0].df).toBe("3");
    expect(section?.data.rows[0].gvif).toBe("40.100");
    expect(section?.data.rows[1].adjustedGvif).toBe("2.133");
    expect(section?.note).toContain("GVIF is independent of the selected link function.");
    expect(section?.note).toContain("Warning: Correlation matrix was near-singular");
  });

  it("should include factor level counts in case processing summary", () => {
    const formatted = formatOrdinalResult({
      outputOptions: { summaryStatistics: true },
      summaryStatistics: {
        model: { minus2LogLikelihood: 12, logLikelihood: -6, converged: true, iterations: 1 },
        interceptOnly: { minus2LogLikelihood: 18, logLikelihood: -9 },
        modelChiSquare: { chiSquare: 6, df: 1, sig: 0.01 },
        pseudoRSquare: { coxSnell: 0.1, nagelkerke: 0.2, mcfadden: 0.3 },
      },
      metadata: {
        caseProcessingSummary: {
          variableLabel: "Satisfaction",
          categories: [
            { label: "Low", n: 30, percent: 0.3 },
            { label: "High", n: 70, percent: 0.7 },
          ],
          factors: [
            {
              variableLabel: "Residence Type",
              levels: [
                { value: "1", label: "Tower Block", n: 40, percent: 0.4 },
                { value: "2", label: "Apartment", n: 60, percent: 0.6 },
              ],
            },
          ],
          validN: 100,
          missingN: 0,
          totalN: 100,
        },
      },
    });

    const section = formatted.sections.find(s => s.id === "ordinal_case_processing_summary");
    expect(section).toBeDefined();
    expect(section?.data.columnHeaders[1].header).toBe("Marginal Percentage");
    expect(section?.data.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ rowHeader: ["Residence Type", "Tower Block"], n: 40, percent: "40.0%" }),
      expect.objectContaining({ rowHeader: ["Residence Type", "Apartment"], n: 60, percent: "60.0%" }),
    ]));
  });
});
