import type React from "react";

export type VarianceMode = "Pooled" | "Welch";

export type PairedModeType = {
    /** Ordered list of variable name pairs. pairs[k] = [v1, v2] meaning
     *  the k-th difference column is computed as v1 − v2 row-wise. */
    pairs: [string, string][];
    /** Hypothesised vector of differences (δ₀). null = vektor nol. */
    delta0: number[] | null;
    /** Known covariance matrix Σd of the differences (Paired → "Population
     *  covariance matrix (Σ) known"); null/absent = unknown (T² only). */
    knownSigma?: number[][] | null;
} | null;

/** Known Σ of the two-population test (Test Values (δ₀) dialog):
 *  "common" = Σ₁ = Σ₂ = Σ, "separate" = Σ₁ and Σ₂ for the first and second
 *  factor level in output-table order. */
export type TwoSampleKnownSigmaType = {
    mode: "common" | "separate";
    sigma?: number[][] | null;
    sigma1?: number[][] | null;
    sigma2?: number[][] | null;
};

export type MultivariateMainType = {
    DepVar: string[] | null;
    FixFactor: string[] | null;
    Covar: string[] | null;
    WlsWeight: string | null;
    TestValues: number[] | null;
    VarianceMode: VarianceMode | null;
    /** When non-null, the analysis runs in paired Hotelling T² mode: the
     *  service synthesises difference columns d_k = v1_k − v2_k and feeds
     *  them through the existing Test Values pipeline with μ₀ = δ₀. */
    PairedMode: PairedModeType;
    /** Hypothesised difference δ₀ for the two-population test
     *  (H₀: μ₁ − μ₂ = δ₀, μ₁ = first level of the single Fixed Factor in
     *  output-table order). One entry per dependent variable; null = 0.
     *  Applied in the service by shifting the first level's data; never
     *  sent to Rust. */
    TwoSampleTestValues?: number[] | null;
    /** Known population covariance matrix Σ for the one-population test
     *  (Test Values → "Population covariance matrix (Σ) known"); null/absent
     *  = unknown. Sent to Rust only through get_known_covariance_test, never
     *  in the analysis config. */
    KnownSigma?: number[][] | null;
    /** Known Σ (or Σ₁, Σ₂) for the two-population test (Test Values (δ₀)).
     *  Dropped with δ₀ when the Fixed Factor changes. */
    TwoSampleKnownSigma?: TwoSampleKnownSigmaType | null;
};

export type MultivariateDialogProps = {
    isMainOpen: boolean;
    setIsMainOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsModelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsContrastOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsPlotsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsPostHocOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsEMMeansOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsSaveOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsOptionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsBootstrapOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsTestValuesOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsPairedOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsTwoSampleDeltaOpen: React.Dispatch<React.SetStateAction<boolean>>;
    updateFormData: (
        field: keyof MultivariateMainType,
        value: string[] | string | number[] | number[][] | PairedModeType | TwoSampleKnownSigmaType | null
    ) => void;
    data: MultivariateMainType;
    globalVariables: string[];
    onContinue: (mainState: MultivariateMainType) => void;
    onReset: () => void;
};

export type MultivariateModelType = {
    NonCust: boolean;
    Custom: boolean;
    BuildCustomTerm: boolean;
    FactorsVar: string[] | null;
    BuildTermMethod: string | null;
    FactorsModel: string[] | null;
    TermsVar: string | null;
    CovModel: string | null;
    RandomModel: string | null;
    TermText: string | null;
    SumOfSquareMethod: string | null;
    Intercept: boolean;
};

export type MultivariateModelProps = {
    isModelOpen: boolean;
    setIsModelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    updateFormData: (
        field: keyof MultivariateModelType,
        value: string[] | string | boolean | null
    ) => void;
    data: MultivariateModelType;
};

export type MultivariateContrastType = {
    FactorList: string[] | null;
    ContrastMethod: string | null;
    Last: boolean;
    First: boolean;
};

export type MultivariateContrastProps = {
    isContrastOpen: boolean;
    setIsContrastOpen: React.Dispatch<React.SetStateAction<boolean>>;
    updateFormData: (
        field: keyof MultivariateContrastType,
        value: string[] | string | boolean | null
    ) => void;
    data: MultivariateContrastType;
};

export type MultivariatePlotsType = {
    SrcList: string[] | null;
    AxisList: string | null;
    LineList: string | null;
    PlotList: string | null;
    FixFactorVars: string[] | null;
    RandFactorVars: string | null;
    LineChartType: boolean;
    BarChartType: boolean;
    IncludeErrorBars: boolean;
    ConfidenceInterval: boolean;
    StandardError: boolean;
    Multiplier: number | null;
    IncludeRefLineForGrandMean: boolean;
    YAxisStart0: boolean;
};

export type MultivariatePlotsProps = {
    isPlotsOpen: boolean;
    setIsPlotsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    updateFormData: (
        field: keyof MultivariatePlotsType,
        value: string[] | string | number | boolean | null
    ) => void;
    data: MultivariatePlotsType;
};

export type MultivariatePostHocType = {
    SrcList: string[] | null;
    FixFactorVars: string[] | null;
    Lsd: boolean;
    Bonfe: boolean;
    Sidak: boolean;
    Scheffe: boolean;
    Regwf: boolean;
    Regwq: boolean;
    Snk: boolean;
    Tu: boolean;
    Tub: boolean;
    Dun: boolean;
    Hoc: boolean;
    Gabriel: boolean;
    Waller: boolean;
    ErrorRatio: number | null;
    Dunnett: boolean;
    CategoryMethod: string | null;
    Twosided: boolean;
    LtControl: boolean;
    GtControl: boolean;
    Tam: boolean;
    Dunt: boolean;
    Games: boolean;
    Dunc: boolean;
};

export type MultivariatePostHocProps = {
    isPostHocOpen: boolean;
    setIsPostHocOpen: React.Dispatch<React.SetStateAction<boolean>>;
    updateFormData: (
        field: keyof MultivariatePostHocType,
        value: string[] | string | number | boolean | null
    ) => void;
    data: MultivariatePostHocType;
};

export type MultivariateEMMeansType = {
    SrcList: string[] | null;
    TargetList: string[] | null;
    CompMainEffect: boolean;
    ConfiIntervalMethod: string | null;
};

export type MultivariateEMMeansProps = {
    isEMMeansOpen: boolean;
    setIsEMMeansOpen: React.Dispatch<React.SetStateAction<boolean>>;
    updateFormData: (
        field: keyof MultivariateEMMeansType,
        value: string[] | string | boolean | null
    ) => void;
    data: MultivariateEMMeansType;
};

export type MultivariateSaveType = {
    ResWeighted: boolean;
    PreWeighted: boolean;
    StdStatistics: boolean;
    CooksD: boolean;
    Leverage: boolean;
    UnstandardizedRes: boolean;
    WeightedRes: boolean;
    StandardizedRes: boolean;
    StudentizedRes: boolean;
    DeletedRes: boolean;
    CoeffStats: boolean;
    NewDataSet: boolean;
    DatasetName: string | null;
    WriteNewDataSet: boolean;
    FilePath: string | null;
};

export type MultivariateSaveProps = {
    isSaveOpen: boolean;
    setIsSaveOpen: React.Dispatch<React.SetStateAction<boolean>>;
    updateFormData: (
        field: keyof MultivariateSaveType,
        value: string | boolean | null
    ) => void;
    data: MultivariateSaveType;
};

export type MultivariateOptionsType = {
    DescStats: boolean;
    EstEffectSize: boolean;
    ObsPower: boolean;
    ParamEst: boolean;
    SscpMat: boolean;
    ResSscpMat: boolean;
    HomogenTest: boolean;
    SprVsLevel: boolean;
    ResPlot: boolean;
    LackOfFit: boolean;
    GeneralFun: boolean;
    SigLevel: number | null;
    CoefficientMatrix: boolean;
    TransformMat: boolean;
    /** Simultaneous confidence intervals (T² and Bonferroni) for the mean
     *  vector components (one-sample, paired, two-sample). Default off;
     *  sent to Rust only when checked. */
    SimultaneousCI?: boolean;
};

export type MultivariateOptionsProps = {
    isOptionsOpen: boolean;
    setIsOptionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    updateFormData: (
        field: keyof MultivariateOptionsType,
        value: number | boolean | null
    ) => void;
    data: MultivariateOptionsType;
};

export type MultivariateBootstrapType = {
    PerformBootStrapping: boolean;
    NumOfSamples: number | null;
    Seed: boolean;
    SeedValue: number | null;
    Level: number | null;
    Percentile: boolean;
    BCa: boolean;
    Simple: boolean;
    Stratified: boolean;
    Variables: string[] | null;
    StrataVariables: string[] | null;
};

export type MultivariateBootstrapProps = {
    isBootstrapOpen: boolean;
    setIsBootstrapOpen: React.Dispatch<React.SetStateAction<boolean>>;
    updateFormData: (
        field: keyof MultivariateBootstrapType,
        value: string[] | string | number | boolean | null
    ) => void;
    data: MultivariateBootstrapType;
};

export type MultivariateTestValuesProps = {
    isTestValuesOpen: boolean;
    setIsTestValuesOpen: React.Dispatch<React.SetStateAction<boolean>>;
    depVar: string[];
    testValues: number[] | null;
    onSave: (testValues: number[] | null) => void;
    knownSigma: number[][] | null;
    onSaveKnownSigma: (knownSigma: number[][] | null) => void;
};

export type MultivariateTwoSampleDeltaProps = {
    isTwoSampleDeltaOpen: boolean;
    setIsTwoSampleDeltaOpen: React.Dispatch<React.SetStateAction<boolean>>;
    depVar: string[];
    factor: string | null;
    delta0: number[] | null;
    onSave: (delta0: number[] | null) => void;
    knownSigma: TwoSampleKnownSigmaType | null;
    onSaveKnownSigma: (knownSigma: TwoSampleKnownSigmaType | null) => void;
};

export type MultivariatePairedProps = {
    isPairedOpen: boolean;
    setIsPairedOpen: React.Dispatch<React.SetStateAction<boolean>>;
    pairedMode: PairedModeType;
    onSave: (pairedMode: PairedModeType) => void;
};

export type MultivariateType = {
    main: MultivariateMainType;
    model: MultivariateModelType;
    contrast: MultivariateContrastType;
    plots: MultivariatePlotsType;
    posthoc: MultivariatePostHocType;
    emmeans: MultivariateEMMeansType;
    save: MultivariateSaveType;
    options: MultivariateOptionsType;
    bootstrap: MultivariateBootstrapType;
};

export type MultivariateContainerProps = {
    onClose: () => void;
};
