import type React from 'react';

// Import statistics components
import LinearityTest from './LinearityTest';
import HomoscedasticityTest from './HomoscedasticityTest';
import MulticollinearityTest from './MulticollinearityTest';
import GarchAnalysis from './GarchAnalysis';
import EcmAnalysis from './EcmAnalysis';
import ArdlAnalysis from './ArdlAnalysis';
import CaseProcessingSummary from './CaseProcessingSummary';

// Import Factor Analysis chart components
import { ScreePlot } from '@/components/Modals/Analyze/dimension-reduction/factor/charts/ScreePlot';
import LoadingPlot from '@/components/Modals/Analyze/dimension-reduction/factor/charts/FactorLoadingChart';

// Define the StatisticsComponentsRegistry interface
interface StatisticsComponentsRegistry {
  [key: string]: React.ComponentType<any>;
}

// Create a registry of statistics components mapped by name
// Create a registry of statistics components mapped by name
export const StatisticsComponents: StatisticsComponentsRegistry = {
  // Add LinearityTest component
  LinearityTest,

  // Add HomoscedasticityTest component
  HomoscedasticityTest,

  // Add MulticollinearityTest component
  MulticollinearityTest,

  // Add GarchAnalysis component
  GarchAnalysis,

  // Add EcmAnalysis component
  EcmAnalysis,

  // Add ArdlAnalysis component
  ArdlAnalysis,

  // Dedicated renderer for multinomial output
  "Case Processing Summary": CaseProcessingSummary,

  // Add Factor Analysis ScreePlot component
  ScreePlot,

  // Add Factor Analysis LoadingPlot component
  LoadingPlot,
};

// Function to get a component by name
export const getStatisticsComponent = (name: string): React.ComponentType<any> | null => {
  return StatisticsComponents[name] || null;
};

// Default export for convenience
export default StatisticsComponents;