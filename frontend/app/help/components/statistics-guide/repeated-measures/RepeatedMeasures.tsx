import React from 'react';
import { HelpCircle, ListOrdered, Table, Layers, TrendingUp, Save, Repeat } from 'lucide-react';
import StandardizedGuideLayout from '../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { DefineTab } from './tabs/DefineTab';
import { VariablesTab } from './tabs/VariablesTab';
import { ModelContrastsTab } from './tabs/ModelContrastsTab';
import { EMMeansPostHocPlotsTab } from './tabs/EMMeansPostHocPlotsTab';
import { SaveOptionsTab } from './tabs/SaveOptionsTab';
import { SphericityEffectsTab } from './tabs/SphericityEffectsTab';

export const RepeatedMeasures: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: HelpCircle, component: OverviewTab },
    { id: 'define', label: 'Define', labelEn: 'Define', icon: ListOrdered, component: DefineTab },
    { id: 'variables', label: 'Variabel', labelEn: 'Variables', icon: Table, component: VariablesTab },
    { id: 'model', label: 'Model & Contrasts', labelEn: 'Model & Contrasts', icon: Layers, component: ModelContrastsTab },
    { id: 'emmeans', label: 'EM Means & Plots', labelEn: 'EM Means & Plots', icon: TrendingUp, component: EMMeansPostHocPlotsTab },
    { id: 'save', label: 'Save & Options', labelEn: 'Save & Options', icon: Save, component: SaveOptionsTab },
    { id: 'sphericity', label: 'Sphericity & Effects', labelEn: 'Sphericity & Effects', icon: Repeat, component: SphericityEffectsTab },
  ];

  return (
    <StandardizedGuideLayout
      title="GLM Repeated Measures"
      titleEn="GLM Repeated Measures"
      description="Mengatur dan menginterpretasikan analisis GLM Repeated Measures di Statify untuk data yang diukur berulang pada subjek yang sama."
      descriptionEn="Set up and interpret GLM Repeated Measures analysis in Statify for data measured repeatedly on the same subjects."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
