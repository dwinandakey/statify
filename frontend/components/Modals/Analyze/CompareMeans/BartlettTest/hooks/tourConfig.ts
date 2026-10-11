/**
 * Konfigurasi langkah tour guide untuk Bartlett's Test of Homogeneity of Variances
 *
 * Tour guide membantu pengguna memahami fitur modal Bartlett Test
 * dengan menampilkan popup penjelasan pada setiap elemen penting.
 *
 * CATATAN: Bartlett Test ini adalah uji homogenitas varians (Bartlett's Test of
 * Homogeneity of Variances), berbeda dengan Bartlett's Test pada Dimension Reduction
 * yang digunakan untuk menguji sphericity dalam analisis faktor.
 */

import type { TourStep } from "../types";
import { TABS } from "../types";

/**
 * Langkah-langkah tour dasar untuk Bartlett's Test of Homogeneity
 *
 * Setiap langkah berisi:
 * - title: Judul popup
 * - content: Penjelasan fitur
 * - targetId: ID elemen HTML yang di-highlight
 * - defaultPosition: Posisi popup (top/bottom)
 * - defaultHorizontalPosition: Posisi horizontal (left/right/null)
 * - icon: Emoji untuk visual
 * - requiredTab: Tab yang harus aktif
 */
export const baseTourSteps: TourStep[] = [
    {
        title: "Available Variables",
        content: "This list shows all numeric variables available in your dataset. Variables with 'Scale' measurement can be selected as test variables, while categorical variables (Nominal/Ordinal) can be used as grouping variable.",
        targetId: "bartlett-test-available-variables",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "📊",
        requiredTab: TABS.VARIABLES,
    },
    {
        title: "Test Variable(s)",
        content: "Move numeric variables here to test their homogeneity of variances. Bartlett's Test will examine whether the variance of these variables is equal across all groups defined by the Grouping Variable. You can select multiple variables.",
        targetId: "bartlett-test-test-variables",
        defaultPosition: "bottom",
        defaultHorizontalPosition: "left",
        icon: "📋",
        requiredTab: TABS.VARIABLES,
    },
    {
        title: "Grouping Variable",
        content: "Select one categorical variable as the grouping variable. This variable determines how data is divided into groups. Bartlett's Test will examine whether the variances across all groups are equal (homogeneous).",
        targetId: "factor-variable-section",
        defaultPosition: "bottom",
        defaultHorizontalPosition: null,
        icon: "🔢",
        requiredTab: TABS.VARIABLES,
    },
    {
        title: "Statistics Options",
        content: "Select 'Descriptive Statistics' to include summary statistics for each group including sample size (N), variance, and pooled variance in the analysis results.",
        targetId: "statistics-section",
        defaultPosition: 'bottom',
        defaultHorizontalPosition: null,
        icon: "📈",
        requiredTab: TABS.OPTIONS,
        forceChangeTab: true,
    },
    {
        title: "About Homogeneity Test",
        content: "This section explains Bartlett's Test of Homogeneity of Variances. This test is different from Bartlett's Test of Sphericity used in factor analysis. This homogeneity test checks the equal variance assumption required before performing ANOVA.",
        targetId: "confidence-level-section",
        defaultPosition: 'bottom',
        defaultHorizontalPosition: null,
        icon: "ℹ️",
        requiredTab: TABS.OPTIONS,
    }
];
