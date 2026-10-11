import React from 'react';
import { HelpCircle, Table, Layers, GitCompare, TrendingUp, Save, ArrowLeftRight } from 'lucide-react';
import StandardizedGuideLayout from '../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { ModelTab } from './tabs/ModelTab';
import { ContrastsPostHocTab } from './tabs/ContrastsPostHocTab';
import { EMMeansPlotsTab } from './tabs/EMMeansPlotsTab';
import { SaveOptionsTab } from './tabs/SaveOptionsTab';
import { PairedT2Tab } from './tabs/PairedT2Tab';

export const Multivariate: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: HelpCircle, component: OverviewTab },
    { id: 'variables', label: 'Variabel', labelEn: 'Variables', icon: Table, component: VariablesTab },
    { id: 'model', label: 'Model', labelEn: 'Model', icon: Layers, component: ModelTab },
    { id: 'contrasts', label: 'Contrasts & Post Hoc', labelEn: 'Contrasts & Post Hoc', icon: GitCompare, component: ContrastsPostHocTab },
    { id: 'emmeans', label: 'EM Means & Plots', labelEn: 'EM Means & Plots', icon: TrendingUp, component: EMMeansPlotsTab },
    { id: 'save', label: 'Save & Options', labelEn: 'Save & Options', icon: Save, component: SaveOptionsTab },
    { id: 'paired', label: 'Paired T²', labelEn: 'Paired T²', icon: ArrowLeftRight, component: PairedT2Tab },
  ];

  return (
    <StandardizedGuideLayout
      title="GLM Multivariate"
      titleEn="GLM Multivariate"
      description="Mengatur dan menginterpretasikan analisis GLM Multivariate (MANOVA/MANCOVA) di Statify untuk menguji beberapa variabel dependen secara simultan."
      descriptionEn="Set up and interpret GLM Multivariate analysis (MANOVA/MANCOVA) in Statify to test several dependent variables simultaneously."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
