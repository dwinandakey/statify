import type { TourStep } from "@/types/tourTypes";

/**
 * Tour for the Define phase (phase 1). Repeated Measures requires the user to
 * declare the within-subjects factor structure before the main dialog opens.
 */
export const repeatedMeasuresDefineTourSteps: TourStep[] = [
    {
        title: "Within-Subject Factor Name",
        content:
            "Name the within-subjects factor, such as \"time\". Every subject is measured at each level of this factor.",
        targetId: "repeated-measures-define-factor-name",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "🏷️",
    },
    {
        title: "Number of Levels",
        content:
            "Enter the number of levels of the factor, such as 3 for pre, post, and follow-up, then click Add.",
        targetId: "repeated-measures-define-factor-levels",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "🔢",
    },
    {
        title: "Measure Name",
        content:
            "Define the measure (dependent variable) name. Use more than one measure for a doubly-multivariate design.",
        targetId: "repeated-measures-define-measure-name",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "📐",
    },
    {
        title: "Define",
        content:
            "Click Define to confirm the factor structure and open the main Repeated Measures dialog.",
        targetId: "repeated-measures-define-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

/**
 * Tour for the main dialog (phase 2).
 */
export const repeatedMeasuresTourSteps: TourStep[] = [
    {
        title: "Available Variables",
        content:
            "This list contains all the variables available for the analysis.",
        targetId: "repeated-measures-available-variables",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "right",
        icon: "📊",
    },
    {
        title: "Within-Subjects Variables",
        content:
            "Assign one variable to each slot of the within-subjects design (one slot per level and measure), in the order of the factor levels.",
        targetId: "repeated-measures-within-subjects-variables",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "left",
        icon: "🎯",
    },
    {
        title: "Between-Subjects Factor(s)",
        content:
            "Optionally select one or more between-subjects factors (groups compared across subjects).",
        targetId: "repeated-measures-between-subjects-factors",
        defaultPosition: "top",
        defaultHorizontalPosition: "left",
        icon: "🧱",
    },
    {
        title: "Covariate(s)",
        content: "Optionally select one or more continuous covariates.",
        targetId: "repeated-measures-covariates",
        defaultPosition: "top",
        defaultHorizontalPosition: "left",
        icon: "📈",
    },
    {
        title: "Run Analysis",
        content:
            "Click OK to run the repeated measures analysis. The output highlights Mauchly's Test of Sphericity and the Tests of Within-Subjects Effects.",
        targetId: "repeated-measures-ok-button",
        defaultPosition: "top",
        defaultHorizontalPosition: "right",
        icon: "▶️",
    },
];

export const repeatedMeasuresModelTourSteps: TourStep[] = [
    {
        title: "Specify Model",
        content:
            "Choose 'Full Factorial' to include all main effects and interactions, or 'Build Terms' to add specific terms.",
        targetId: "repeated-measures-model-specify-model",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "🔧",
    },
    {
        title: "Within & Between Subjects Model",
        content:
            "Build the within-subjects and between-subjects model terms from the available factors and covariates.",
        targetId: "repeated-measures-model-terms",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "left",
        icon: "🧱",
    },
    {
        title: "Sum of Squares",
        content:
            "Select the method for calculating the sum of squares (Type I, II, III, or IV).",
        targetId: "repeated-measures-model-sum-of-squares",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "⚖️",
    },
    {
        title: "Continue",
        content:
            "Click to save the model specification and return to the main dialog.",
        targetId: "repeated-measures-model-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const repeatedMeasuresContrastTourSteps: TourStep[] = [
    {
        title: "Factors",
        content:
            "Choose a contrast type per factor (Polynomial, Helmert, Difference, Repeated, Simple, or Deviation). Polynomial is the default for trend analysis over ordered levels.",
        targetId: "repeated-measures-contrast-factors",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "📊",
    },
    {
        title: "Change Contrast",
        content:
            "Select a factor, pick a contrast method, and click 'Change' to apply it.",
        targetId: "repeated-measures-contrast-change-contrast",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "🔧",
    },
    {
        title: "Continue",
        content: "Click to save these settings and return to the main dialog.",
        targetId: "repeated-measures-contrast-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const repeatedMeasuresPlotsTourSteps: TourStep[] = [
    {
        title: "Factors",
        content:
            "This list contains the factors that can be used to create profile plots.",
        targetId: "repeated-measures-plots-factors",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "right",
        icon: "📊",
    },
    {
        title: "Plot Specification",
        content:
            "Select variables for the horizontal axis, separate lines, and separate plots.",
        targetId: "repeated-measures-plots-specification",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "left",
        icon: "🎨",
    },
    {
        title: "Chart Type and Options",
        content: "Select the chart type and other display options for the plots.",
        targetId: "repeated-measures-plots-chart-options",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "🔧",
    },
    {
        title: "Continue",
        content: "Click to save these settings and return to the main dialog.",
        targetId: "repeated-measures-plots-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const repeatedMeasuresPosthocTourSteps: TourStep[] = [
    {
        title: "Factors for Post Hoc Tests",
        content:
            "Select the between-subjects factors for which you want pairwise post hoc comparisons.",
        targetId: "repeated-measures-posthoc-factors",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "📊",
    },
    {
        title: "Equal Variances Assumed",
        content:
            "Choose one or more post hoc tests that assume equal variances across groups.",
        targetId: "repeated-measures-posthoc-equal-variances-assumed",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "⚖️",
    },
    {
        title: "Equal Variances Not Assumed",
        content:
            "If the assumption of equal variances is violated, select one of these tests.",
        targetId: "repeated-measures-posthoc-equal-variances-not-assumed",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "🛡️",
    },
    {
        title: "Continue",
        content: "Click to save your selections and return to the main dialog.",
        targetId: "repeated-measures-posthoc-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const repeatedMeasuresEmmeansTourSteps: TourStep[] = [
    {
        title: "Factors and Interactions",
        content:
            "This list contains all the factors and interactions available for estimating marginal means.",
        targetId: "repeated-measures-emmeans-factors-interactions",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "right",
        icon: "📊",
    },
    {
        title: "Display Means For",
        content:
            "Select the factors and interactions for which to display estimated marginal means.",
        targetId: "repeated-measures-emmeans-display-means-for",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "left",
        icon: "📋",
    },
    {
        title: "Compare Main Effects",
        content:
            "Enable this to compare main effects, then choose a confidence interval adjustment method.",
        targetId: "repeated-measures-emmeans-compare-main-effects",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "⚖️",
    },
    {
        title: "Continue",
        content: "Click to save these settings and return to the main dialog.",
        targetId: "repeated-measures-emmeans-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const repeatedMeasuresSaveTourSteps: TourStep[] = [
    {
        title: "Save Variables",
        content:
            "Select predicted values, residuals, or diagnostics to save as new variables in your dataset.",
        targetId: "repeated-measures-save-variables",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "💾",
    },
    {
        title: "Continue",
        content: "Click to save your selections and return to the main dialog.",
        targetId: "repeated-measures-save-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];

export const repeatedMeasuresOptionsTourSteps: TourStep[] = [
    {
        title: "Display Options",
        content:
            "Select statistics to display: descriptive statistics, estimates of effect size, observed power, SSCP matrices, homogeneity tests, and more.",
        targetId: "repeated-measures-options-display",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "📊",
    },
    {
        title: "Significance Level",
        content:
            "Set the significance level for confidence intervals and significance tests.",
        targetId: "repeated-measures-options-sig-level",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "🎯",
    },
    {
        title: "Continue",
        content: "Click to save these settings and return to the main dialog.",
        targetId: "repeated-measures-options-continue-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
    },
];
