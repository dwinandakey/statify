import type { TourStep as BaseTourStep } from '@/types/tourTypes';

// Tabs constants
export const TABS = {
  VARIABLES: 'variables' as const,
  STATISTICS: 'statistics' as const,
  CRITERIA: 'criteria' as const,
  OPTIONS: 'options' as const,
  SAVE: 'save' as const,
};

export type TabType = 
  | typeof TABS.VARIABLES 
  | typeof TABS.STATISTICS 
  | typeof TABS.CRITERIA 
  | typeof TABS.OPTIONS 
  | typeof TABS.SAVE;

export type TourStep = BaseTourStep & {
  requiredTab?: TabType;
  forceChangeTab?: boolean;
};

export const baseTourSteps: TourStep[] = [
  {
    title: 'Model Tab',
    content: 'Select the dependent variable, factors (categorical predictors), and covariates (scale predictors) for the multinomial regression model.',
    targetId: 'multinomial-logistic-variables-tab-trigger',
    defaultPosition: 'bottom',
    defaultHorizontalPosition: null,
    icon: '📊',
    requiredTab: TABS.VARIABLES,
  },
  {
    title: 'Statistics Tab',
    content: 'Choose statistics to display, including goodness-of-fit, pseudo R-square, parameter estimates, and likelihood ratio tests.',
    targetId: 'multinomial-logistic-statistics-tab-trigger',
    defaultPosition: 'bottom',
    defaultHorizontalPosition: null,
    icon: '📈',
    requiredTab: TABS.VARIABLES,
    forceChangeTab: true,
  },
  {
    title: 'Criteria Tab',
    content: 'Configure optimization criteria such as maximum iterations, convergence tolerances, and delta values.',
    targetId: 'multinomial-logistic-criteria-tab-trigger',
    defaultPosition: 'bottom',
    defaultHorizontalPosition: null,
    icon: '⚙️',
    requiredTab: TABS.VARIABLES,
    forceChangeTab: true,
  },
  {
    title: 'Options Tab',
    content: 'Select the reference category for the dependent variable and configure stepwise/advanced estimation rules.',
    targetId: 'multinomial-logistic-options-tab-trigger',
    defaultPosition: 'bottom',
    defaultHorizontalPosition: null,
    icon: '🔧',
    requiredTab: TABS.VARIABLES,
    forceChangeTab: true,
  },
  {
    title: 'Save Tab',
    content: 'Choose which predicted group membership and response probabilities to save back into the active dataset.',
    targetId: 'multinomial-logistic-save-tab-trigger',
    defaultPosition: 'bottom',
    defaultHorizontalPosition: null,
    icon: '💾',
    requiredTab: TABS.VARIABLES,
    forceChangeTab: true,
  },
];
