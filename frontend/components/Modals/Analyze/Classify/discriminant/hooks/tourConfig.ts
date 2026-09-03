import type { TourStep as BaseTourStep } from "@/types/tourTypes";

// Tabs of the Discriminant modal. Method and Bootstrap are rendered
// conditionally, so the tour never points at their triggers.
export const TABS = {
    VARIABLES: "variables" as const,
    STATISTICS: "statistics" as const,
    CLASSIFY: "classify" as const,
    SAVE: "save" as const,
    ASSUMPTIONS: "assumptions" as const,
};

export type TabType =
    | typeof TABS.VARIABLES
    | typeof TABS.STATISTICS
    | typeof TABS.CLASSIFY
    | typeof TABS.SAVE
    | typeof TABS.ASSUMPTIONS;

export type TourStep = BaseTourStep & {
    requiredTab?: TabType;
    forceChangeTab?: boolean;
};

export const dialogTourSteps: TourStep[] = [
    {
        title: "Method",
        content:
            "Choose how predictors enter the model. Enter independents together fits every variable at once; Use stepwise method selects them one at a time and reveals the Method tab.",
        targetId: "discriminant-method-group",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "⚙️",
        requiredTab: TABS.VARIABLES,
    },
    {
        title: "Grouping Variable",
        content:
            "Drop the categorical variable whose groups you want to separate, then click Define Range to set the lowest and highest group code to analyse.",
        targetId: "discriminant-grouping-variable",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "📊",
        requiredTab: TABS.VARIABLES,
    },
    {
        title: "Independent Variables",
        content:
            "Pick the numeric predictors. Ctrl+click selects several, Shift+click selects a range, and the arrow button moves the whole selection at once. Click a variable here to drop it, or Remove All to clear the box.",
        targetId: "discriminant-independent-variables",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "📋",
        requiredTab: TABS.VARIABLES,
    },
    {
        title: "Selection Variable",
        content:
            "Optional. Pick a variable and click Value to fit the functions on just those cases, while every other case is still classified.",
        targetId: "discriminant-selection-variable",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "🔍",
        requiredTab: TABS.VARIABLES,
    },
    {
        title: "Statistics",
        content:
            "Add the descriptive tables: group means, univariate ANOVAs, Box's M, function coefficients and the covariance matrices.",
        targetId: "discriminant-statistics-tab-trigger",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "📈",
        requiredTab: TABS.VARIABLES,
        forceChangeTab: true,
    },
    {
        title: "Classify",
        content:
            "Set prior probabilities and the covariance matrix used for classification, then choose the summary table, leave-one-out validation and the discriminant-space plots.",
        targetId: "discriminant-classify-tab-trigger",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "🎯",
        requiredTab: TABS.VARIABLES,
        forceChangeTab: true,
    },
    {
        title: "Save",
        content:
            "Write predicted group membership, discriminant scores and group probabilities back into the dataset as new variables.",
        targetId: "discriminant-save-tab-trigger",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "💾",
        requiredTab: TABS.VARIABLES,
        forceChangeTab: true,
    },
    {
        title: "Assumptions",
        content:
            "Check multicollinearity and normality before fitting. The results go straight to the Output Viewer without running the full analysis.",
        targetId: "discriminant-assumptions-tab-trigger",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "✅",
        requiredTab: TABS.VARIABLES,
        forceChangeTab: true,
    },
    {
        title: "Run Analysis",
        content:
            "Click OK to run the analysis. It stays disabled until a grouping variable and at least one independent variable are selected.",
        targetId: "discriminant-ok-button",
        defaultPosition: "top",
        defaultHorizontalPosition: null,
        icon: "▶️",
        requiredTab: TABS.VARIABLES,
    },
];
