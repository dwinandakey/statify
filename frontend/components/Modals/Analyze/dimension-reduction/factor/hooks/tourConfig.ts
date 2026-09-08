import type { TourStep } from "@/types/tourTypes";

export const factorTourSteps: TourStep[] = [
    { title: "Variables", content: "Select the variables to include in the factor analysis. You can also choose a selection variable.", targetId: "factor-variables-tab", defaultPosition: "bottom", defaultHorizontalPosition: null, icon: null },
    { title: "Descriptive Statistics", content: "Choose descriptive statistics and diagnostics such as KMO, Bartlett's test, and the inverse correlation matrix.", targetId: "factor-descriptive-tab", defaultPosition: "bottom", defaultHorizontalPosition: null, icon: null },
    { title: "Extraction", content: "Select the extraction method, factor retention rule, and optional scree plot or unrotated solution.", targetId: "factor-extraction-tab", defaultPosition: "bottom", defaultHorizontalPosition: null, icon: null },
    { title: "Rotation, Scores, and Options", content: "Configure rotation, saved factor scores, and coefficient display options in the remaining tabs.", targetId: "factor-rotation-tab", defaultPosition: "bottom", defaultHorizontalPosition: null, icon: null },
    { title: "Run Analysis", content: "Click OK to save the settings and run the factor analysis.", targetId: "factor-ok-button", defaultPosition: "top", defaultHorizontalPosition: null, icon: null },
];