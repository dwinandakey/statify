import React from 'react';
import { HelpCircle, Table, BarChart3, Layers, Target, Save, CheckCircle, TrendingUp } from 'lucide-react';
import StandardizedGuideLayout from '../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { StatisticsTab } from './tabs/StatisticsTab';
import { MethodTab } from './tabs/MethodTab';
import { ClassifyTab } from './tabs/ClassifyTab';
import { SaveBootstrapTab } from './tabs/SaveBootstrapTab';
import { AssumptionsTab } from './tabs/AssumptionsTab';
import { OutputTab } from './tabs/OutputTab';

export const DiscriminantAnalysis: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: HelpCircle, component: OverviewTab },
    { id: 'variables', label: 'Variabel', labelEn: 'Variables', icon: Table, component: VariablesTab },
    { id: 'statistics', label: 'Statistics', labelEn: 'Statistics', icon: BarChart3, component: StatisticsTab },
    { id: 'method', label: 'Method', labelEn: 'Method', icon: Layers, component: MethodTab },
    { id: 'classify', label: 'Classify', labelEn: 'Classify', icon: Target, component: ClassifyTab },
    { id: 'save', label: 'Save & Bootstrap', labelEn: 'Save & Bootstrap', icon: Save, component: SaveBootstrapTab },
    { id: 'assumptions', label: 'Assumptions', labelEn: 'Assumptions', icon: CheckCircle, component: AssumptionsTab },
    { id: 'output', label: 'Baca Output', labelEn: 'Reading Output', icon: TrendingUp, component: OutputTab },
  ];

  return (
    <StandardizedGuideLayout
      title="Analisis Diskriminan"
      titleEn="Discriminant Analysis"
      description="Mengatur dan menginterpretasikan Discriminant Analysis di Statify, mulai dari pemilihan variabel, metode stepwise, klasifikasi, hingga cara membaca setiap tabel keluarannya."
      descriptionEn="Set up and interpret Discriminant Analysis in Statify, from variable selection and stepwise methods to classification and reading every output table."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
