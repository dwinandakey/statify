/**
 * Konfigurasi langkah tour guide untuk Jarque-Bera Test of Normality
 *
 * Tour guide membantu pengguna memahami fitur modal Jarque-Bera Test
 * dengan menampilkan popup penjelasan pada setiap elemen penting.
 */

import type { TourStep } from "../types";
import { TABS } from "../types";

/**
 * Langkah-langkah tour untuk Jarque-Bera Test
 */
export const baseTourSteps: TourStep[] = [
    {
        title: "Available Variables",
        content: "This list shows all numeric (Scale) variables available in your dataset. The Jarque-Bera Test examines whether these variables follow a normal distribution based on their skewness and kurtosis.",
        targetId: "jarque-bera-available-variables",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "📊",
        requiredTab: TABS.VARIABLES,
    },
    {
        title: "Test Variable(s)",
        content: "Move numeric variables here to test their normality. The Jarque-Bera Test will calculate the JB statistic for each variable. You can select multiple variables to test at once.",
        targetId: "jarque-bera-test-variables",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "left",
        icon: "📋",
        requiredTab: TABS.VARIABLES,
    },
    {
        title: "Statistics Options",
        content: "Select 'Descriptive Statistics' to include summary statistics for each variable including mean, standard deviation, skewness, and kurtosis in the analysis results.",
        targetId: "statistics-section",
        defaultPosition: 'bottom',
        defaultHorizontalPosition: null,
        icon: "📈",
        requiredTab: TABS.OPTIONS,
        forceChangeTab: true,
    },
    {
        title: "Significance Level",
        content: "Set the significance level (α) for hypothesis testing. Common values are 0.05 (5%) or 0.01 (1%). If the p-value is less than α, the null hypothesis of normality is rejected.",
        targetId: "significance-level-section",
        defaultPosition: 'bottom',
        defaultHorizontalPosition: null,
        icon: "🎯",
        requiredTab: TABS.OPTIONS,
    },
    {
        title: "About Jarque-Bera Test",
        content: "The Jarque-Bera Test checks if data has skewness and kurtosis matching a normal distribution. Formula: JB = n[(S²/6) + ((K-3)²/24)]. A normal distribution has skewness=0 and kurtosis=3. The test is suitable for large samples (n > 30).",
        targetId: "about-section",
        defaultPosition: 'bottom',
        defaultHorizontalPosition: null,
        icon: "ℹ️",
        requiredTab: TABS.OPTIONS,
    }
];
