import type { TourStep } from "@/types/tourTypes";

export const multivariateTourSteps: TourStep[] = [
    {
        title: "Available Variables",
        content:
            "This list contains all the variables available for the analysis.",
        targetId: "multivariate-available-variables",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "right",
        icon: "📊",
    },
    {
        title: "Dependent Variables",
        content:
            "Select two or more dependent variables for the multivariate analysis. Unlike univariate GLM, multiple dependent variables are analysed simultaneously.",
        targetId: "multivariate-dependent-variables",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "left",
        icon: "🎯",
    },
    {
        title: "Fixed Factor(s)",
        content: "Select one or more fixed factors for the analysis.",
        targetId: "multivariate-fixed-factors",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "left",
        icon: "🧱",
    },
    {
        title: "Covariate(s)",
        content: "Select one or more covariates for the analysis.",
        targetId: "multivariate-covariates",
        defaultPosition: "top",
        defaultHorizontalPosition: "left",
        icon: "📈",
    },
    {
        title: "WLS Weight",
        content:
            "Select a variable to use for Weighted Least Squares (WLS) analysis.",
        targetId: "multivariate-wls-weight",
        defaultPosition: "top",
        defaultHorizontalPosition: "left",
        icon: "⚖️",
    },
    {
        title: "Run Analysis",
        content:
            "Click OK to run the multivariate analysis with your selected variables and settings.",
        targetId: "multivariate-ok-button",
        defaultPosition: "top",
        defaultHorizontalPosition: "right",
        icon: "▶️",
    },
];

export const multivariateBootstrapTourSteps: TourStep[] = [
    {
        title: "Perform Bootstrapping",
        content:
            "Enable this to perform bootstrapping. This will resample the dataset to estimate the sampling distribution of a statistic.",
        targetId: "multivariate-bootstrap-perform",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "🔄",
    },
    {
        title: "Confidence Intervals",
        content:
            "Set the confidence level and choose the method for calculating confidence intervals.",
        targetId: "multivariate-bootstrap-confidence-intervals",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "🎯",
    },
    {
        title: "Sampling",
        content:
            "Choose between simple and stratified sampling methods. If using stratified sampling, you must select at least one strata variable.",
        targetId: "multivariate-bootstrap-sampling",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "⚖️",
    },
    {
        title: "Continue",
        content: "Click to save these settings and return to the main dialog.",
        targetId: "multivariate-bootstrap-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const multivariateContrastTourSteps: TourStep[] = [
    {
        title: "Factors",
        content:
            "This list shows the factors available for contrast analysis. The formatting indicates the current contrast settings for each factor.",
        targetId: "multivariate-contrast-factors",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "📊",
    },
    {
        title: "Change Contrast",
        content:
            "Select a factor from the list, choose a contrast method, and click 'Change' to apply the new contrast setting.",
        targetId: "multivariate-contrast-change-contrast",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "🔧",
    },
    {
        title: "Continue",
        content: "Click to save these settings and return to the main dialog.",
        targetId: "multivariate-contrast-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const multivariateEmmeansTourSteps: TourStep[] = [
    {
        title: "Factors and Interactions",
        content:
            "This list contains all the factors and interactions available for estimating marginal means.",
        targetId: "multivariate-emmeans-factors-interactions",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "right",
        icon: "📊",
    },
    {
        title: "Display Means For",
        content:
            "Select the factors and interactions for which you want to display the estimated marginal means.",
        targetId: "multivariate-emmeans-display-means-for",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "left",
        icon: "📋",
    },
    {
        title: "Compare Main Effects",
        content:
            "Enable this to compare the main effects of the factors. You can then choose a confidence interval adjustment method.",
        targetId: "multivariate-emmeans-compare-main-effects",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "⚖️",
    },
    {
        title: "Continue",
        content: "Click to save these settings and return to the main dialog.",
        targetId: "multivariate-emmeans-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const multivariatePlotsTourSteps: TourStep[] = [
    {
        title: "Factors",
        content:
            "This list contains the factors that can be used to create profile plots.",
        targetId: "multivariate-plots-factors",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "right",
        icon: "📊",
    },
    {
        title: "Plot Specification",
        content:
            "Select variables for the horizontal axis, separate lines, and separate plots to define a plot.",
        targetId: "multivariate-plots-specification",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "left",
        icon: "🎨",
    },
    {
        title: "Plots",
        content:
            "Add, change, or remove plots from this list. The plots will be generated based on your specifications.",
        targetId: "multivariate-plots-plots-list",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "📈",
    },
    {
        title: "Chart Type and Options",
        content: "Select the chart type and other display options for the plots.",
        targetId: "multivariate-plots-chart-options",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "🔧",
    },
    {
        title: "Continue",
        content: "Click to save these settings and return to the main dialog.",
        targetId: "multivariate-plots-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const multivariateOptionsTourSteps: TourStep[] = [
    {
        title: "Display Options",
        content:
            "Select various statistics to display in the output, such as descriptive statistics, SSCP matrices, estimates of effect size, and more.",
        targetId: "multivariate-options-display",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "📊",
    },
    {
        title: "Significance Level",
        content:
            "Set the significance level for confidence intervals and significance tests.",
        targetId: "multivariate-options-sig-level",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "🎯",
    },
    {
        title: "Continue",
        content: "Click to save these settings and return to the main dialog.",
        targetId: "multivariate-options-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const multivariateSaveTourSteps: TourStep[] = [
    {
        title: "Save Variables",
        content:
            "Select predicted values, residuals, or diagnostics to save as new variables in your dataset.",
        targetId: "multivariate-save-variables",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "💾",
    },
    {
        title: "Continue",
        content: "Click to save your selections and return to the main dialog.",
        targetId: "multivariate-save-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const multivariatePosthocTourSteps: TourStep[] = [
    {
        title: "Factors for Post Hoc Tests",
        content:
            "Select the factors for which you want to perform post hoc tests. These tests compare specific pairs of means across the dependent variables.",
        targetId: "multivariate-posthoc-factors",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "📊",
    },
    {
        title: "Equal Variances Assumed",
        content:
            "Choose one or more post hoc tests that assume equal variances across groups.",
        targetId: "multivariate-posthoc-equal-variances-assumed",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "⚖️",
    },
    {
        title: "Equal Variances Not Assumed",
        content:
            "If the assumption of equal variances is violated, select one of these tests.",
        targetId: "multivariate-posthoc-equal-variances-not-assumed",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "🛡️",
    },
    {
        title: "Continue",
        content: "Click to save your selections and return to the main dialog.",
        targetId: "multivariate-posthoc-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const multivariateModelTourSteps: TourStep[] = [
    {
        title: "Specify Model",
        content:
            "Choose how to specify the model. 'Full Factorial' includes all factor main effects and interactions. 'Build Terms' lets you add specific terms.",
        targetId: "multivariate-model-specify-model",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "🔧",
    },
    {
        title: "Factors & Covariates",
        content:
            "This list contains all the factors and covariates available for building the model.",
        targetId: "multivariate-model-factors-covariates",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "right",
        icon: "📊",
    },
    {
        title: "Build Term(s)",
        content:
            "When in 'Build Terms' mode, select a type of term and add selected factors/covariates to the model.",
        targetId: "multivariate-model-build-terms",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "left",
        icon: "🧱",
    },
    {
        title: "Model Terms",
        content:
            "The terms included in your custom model are displayed here.",
        targetId: "multivariate-model-terms",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "left",
        icon: "📈",
    },
    {
        title: "Sum of Squares",
        content:
            "Select the method for calculating the sum of squares (Type I, II, III, or IV).",
        targetId: "multivariate-model-sum-of-squares",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "⚖️",
    },
    {
        title: "Continue",
        content:
            "Click to save the model specification and return to the main dialog.",
        targetId: "multivariate-model-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];
