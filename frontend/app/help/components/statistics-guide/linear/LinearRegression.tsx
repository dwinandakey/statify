import React from 'react';
import { HelpCircle, Table, Calculator, BarChart3, SlidersHorizontal } from 'lucide-react';
import StandardizedGuideLayout from '../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { StatisticsTab } from './tabs/StatisticsTab';
import { PlotsTab } from './tabs/PlotsTab';
import { OptionsTab } from './tabs/OptionsTab';

export const LinearRegression: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: HelpCircle, component: OverviewTab },
    { id: 'variables', label: 'Variabel', labelEn: 'Variables', icon: Table, component: VariablesTab },
    { id: 'statistics', label: 'Statistik', labelEn: 'Statistics', icon: Calculator, component: StatisticsTab },
    { id: 'plots', label: 'Grafik', labelEn: 'Plots', icon: BarChart3, component: PlotsTab },
    { id: 'options', label: 'Opsi', labelEn: 'Options', icon: SlidersHorizontal, component: OptionsTab },
  ];

  return (
    <StandardizedGuideLayout
      title="Regresi Linear"
      titleEn="Linear Regression"
      description="Memodelkan hubungan antara variabel dependen kuantitatif dan satu atau lebih variabel independen menggunakan garis (atau hyper-plane) terbaik."
      descriptionEn="Model the relationship between a quantitative dependent variable and one or more independent variables using the best-fitting line (or hyper-plane)."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
