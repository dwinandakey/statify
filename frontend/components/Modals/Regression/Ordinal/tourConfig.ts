import { TourStep as BaseTourStep } from '@/types/tourTypes';

/* =========================
   Tabs constants
========================= */
export const TABS = {
  VARIABLES: 'variables',
  STATISTICS: 'statistics',
} as const;

export type TabType = typeof TABS[keyof typeof TABS];

/* =========================
   Extended TourStep
========================= */
export type TourStep = BaseTourStep & {
  requiredTab?: TabType;
  forceChangeTab?: boolean;
};

/* =========================
   Ordinal Regression Tour
========================= */
export const baseTourSteps: TourStep[] = [
  {
    title: 'Variables Tab',
    content: 'Select your dependent, factor, and covariate variables for ordinal regression analysis.',
    targetId: 'ordinal-variables-tab',
    defaultPosition: 'bottom',
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.VARIABLES,
  },
  {
    title: 'Statistics Tab',
    content: 'Configure the statistics you want to include in your ordinal regression analysis.',
    targetId: 'ordinal-statistics-tab',
    defaultPosition: 'bottom',
    defaultHorizontalPosition: null,
    icon: null,
    requiredTab: TABS.STATISTICS,
  },
  {
    title: 'Plots Tab',
    content: 'Set up visualization options for your ordinal regression results.',
    targetId: 'ordinal-plots-tab',
    defaultPosition: 'bottom',
    defaultHorizontalPosition: null,
    icon: null,
  },
  {
    title: 'Save Tab',
    content: 'Choose which variables to save to your dataset after analysis.',
    targetId: 'ordinal-save-tab',
    defaultPosition: 'bottom',
    defaultHorizontalPosition: null,
    icon: null,
  },
  {
    title: 'Options Tab',
    content: 'Configure advanced options for the ordinal regression algorithm.',
    targetId: 'ordinal-options-tab',
    defaultPosition: 'bottom',
    defaultHorizontalPosition: null,
    icon: null,
  },
  {
    title: 'Assumption Tab',
    content: 'Check assumptions for ordinal regression analysis.',
    targetId: 'ordinal-assumption-tab',
    defaultPosition: 'bottom',
    defaultHorizontalPosition: null,
    icon: null,
  },
  {
    title: 'Run Analysis',
    content: 'Click OK to run the ordinal regression analysis with your selected options.',
    targetId: 'ordinal-ok-button',
    defaultPosition: 'top',
    defaultHorizontalPosition: null,
    icon: null,
  }
];
