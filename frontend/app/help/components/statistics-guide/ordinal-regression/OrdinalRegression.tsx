import React from 'react';
import { HelpCircle, ArrowRightLeft, SlidersHorizontal, FileText, Layers } from 'lucide-react';
import StandardizedGuideLayout from '../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { OptionsTab } from './tabs/OptionsTab';
import { OutputTab } from './tabs/OutputTab';
import { LocationTab } from './tabs/LocationTab';

export const OrdinalRegression: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: HelpCircle, component: OverviewTab },
    { id: 'variables', label: 'Variabel & Link', labelEn: 'Variables & Link', icon: ArrowRightLeft, component: VariablesTab },
    { id: 'options', label: 'Opsi', labelEn: 'Options', icon: SlidersHorizontal, component: OptionsTab },
    { id: 'output', label: 'Output', labelEn: 'Output', icon: FileText, component: OutputTab },
    { id: 'location', label: 'Model Lokasi', labelEn: 'Location Model', icon: Layers, component: LocationTab },
  ];

  return (
    <StandardizedGuideLayout
      title="Regresi Ordinal"
      titleEn="Ordinal Regression"
      description="Mengonfigurasi variabel, menentukan fungsi link, mengatur algoritma, dan menginterpretasikan output analisis regresi ordinal di Statify."
      descriptionEn="Configure variables, choose the link function, set the algorithm, and interpret ordinal regression output in Statify."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
