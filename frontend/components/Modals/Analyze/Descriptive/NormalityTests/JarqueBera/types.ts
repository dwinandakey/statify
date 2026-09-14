import type { Variable } from "@/types/Variable";
import type { Dispatch, SetStateAction } from "react";
import type { TourStep as BaseTourStep } from '@/types/tourTypes';
import type { BaseModalProps } from "@/types/modalTypes";

// ---------------------------------
// Constants
// ---------------------------------

/**
 * Konstanta tab untuk Jarque-Bera Test
 */
export const TABS = {
    VARIABLES: 'variables' as const,
    OPTIONS: 'options' as const,
};

// ---------------------------------
// Types
// ---------------------------------

/**
 * Tipe tab untuk modal Jarque-Bera Test
 */
export type TabType = typeof TABS.VARIABLES | typeof TABS.OPTIONS;

/**
 * Tipe TourStep untuk Jarque-Bera Test
 * Extends BaseTourStep dengan properti tab yang diperlukan
 */
export type TourStep = BaseTourStep & {
    requiredTab?: TabType | string;
    forceChangeTab?: boolean;
};

/**
 * Tipe variabel yang di-highlight
 */
export type HighlightedVariable = {
    tempId: string;
    source: 'available' | 'test';
};

// ---------------------------------
// Options
// ---------------------------------

/**
 * Opsi Jarque-Bera Test
 */
export interface JarqueBeraTestOptions {
    significanceLevel: number; // misalnya 0.05 untuk 5% significance level
    includeDescriptives: boolean; // Tampilkan skewness, kurtosis, mean, std
}

// ---------------------------------
// Props
// ---------------------------------

/**
 * Props kontrol tab untuk navigasi
 */
export interface TabControlProps {
    setActiveTab: (tab: 'variables' | 'options') => void;
    currentActiveTab: TabType;
}

/**
 * Props untuk VariablesTab
 * Jarque-Bera tidak memerlukan factor variable, hanya test variables
 */
export interface VariablesTabProps {
    availableVariables: Variable[];
    testVariables: Variable[];
    highlightedVariable: HighlightedVariable | null;
    setHighlightedVariable: Dispatch<SetStateAction<HighlightedVariable | null>>;
    moveToAvailableVariables: (variable: Variable) => void;
    moveToTestVariables: (variable: Variable, targetIndex?: number) => void;
    reorderVariables: (source: 'available' | 'test', variables: Variable[]) => void;
}

/**
 * Props untuk OptionsTab
 */
export interface OptionsTabProps {
    options: JarqueBeraTestOptions;
    updateOption: <K extends keyof JarqueBeraTestOptions>(
        key: K,
        value: JarqueBeraTestOptions[K]
    ) => void;
}

/**
 * Props untuk useTestSettings
 */
export interface TestSettingsProps {
    initialOptions?: Partial<JarqueBeraTestOptions>;
}

/**
 * Props untuk useVariableSelection
 */
export interface VariableSelectionProps {
    initialVariables?: Variable[];
}

/**
 * Props untuk useJarqueBeraAnalysis
 */
export interface JarqueBeraAnalysisProps extends Pick<BaseModalProps, 'onClose'> {
    testVariables: Variable[];
    options: JarqueBeraTestOptions;
}

// ---------------------------------
// Results
// ---------------------------------

/**
 * Hasil hook useTourGuide
 */
export interface UseTourGuideResult {
    tourActive: boolean;
    currentStep: number;
    tourSteps: TourStep[];
    currentTargetElement: HTMLElement | null;
    startTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    endTour: () => void;
}

/**
 * Hasil Jarque-Bera Test untuk satu variabel
 *
 * RUMUS JARQUE-BERA:
 * JB = n × [(S²/6) + ((K-3)²/24)]
 *
 * Dimana:
 * - n = ukuran sampel
 * - S = skewness (koefisien kemiringan)
 * - K = kurtosis (koefisien keruncingan)
 *
 * Statistik JB mengikuti distribusi chi-square dengan df = 2
 *
 * INTERPRETASI:
 * - H₀: Data berdistribusi normal (skewness=0, kurtosis=3)
 * - H₁: Data tidak berdistribusi normal
 * - Jika p-value < α → Tolak H₀ (data tidak normal)
 * - Jika p-value ≥ α → Terima H₀ (data normal)
 */
export interface JarqueBeraTestResult {
    variable: Variable;
    statistic?: number;       // JB statistic
    df?: number;              // Always 2 for JB test
    pValue?: number;
    skewness?: number;        // S (sample skewness)
    kurtosis?: number;        // K (sample kurtosis, excess kurtosis + 3)
    excessKurtosis?: number;  // K - 3 (excess kurtosis)
    n?: number;               // Sample size
    mean?: number;            // Sample mean
    stdDev?: number;          // Sample standard deviation
    isNormal?: boolean;       // Interpretation: p-value >= significanceLevel
    error?: string;
    insufficientType?: string;
}

/**
 * Statistik deskriptif untuk variabel
 */
export interface VariableDescriptives {
    variableName: string;
    n: number;
    mean: number;
    stdDev: number;
    skewness: number;
    kurtosis: number;
}

// ---------------------------------
// Table Types
// ---------------------------------

/**
 * Header kolom tabel
 */
export interface TableColumnHeader {
    header: string;
    key: string;
    children?: TableColumnHeader[];
}

/**
 * Baris tabel
 */
export interface TableRow {
    [key: string]: any;
    rowHeader?: any[];
}

/**
 * Struktur tabel Jarque-Bera Test
 */
export interface JarqueBeraTestTable {
    title: string;
    subtitle?: string;
    columnHeaders: TableColumnHeader[];
    rows: TableRow[];
    footer?: string | string[];
}
