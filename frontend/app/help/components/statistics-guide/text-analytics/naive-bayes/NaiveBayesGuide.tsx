import React from 'react';
import { HelpCircle, ArrowRightLeft, SlidersHorizontal, ShieldCheck, FileText } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { OptionsTab } from './tabs/OptionsTab';
import { ValidationTab } from './tabs/ValidationTab';
import { OutputTab } from './tabs/OutputTab';

export const NaiveBayesGuide: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: HelpCircle, component: OverviewTab },
    { id: 'variables', label: 'Variabel & Teks', labelEn: 'Variables & Text', icon: ArrowRightLeft, component: VariablesTab },
    { id: 'options', label: 'Opsi', labelEn: 'Options', icon: SlidersHorizontal, component: OptionsTab },
    { id: 'validation', label: 'Validasi', labelEn: 'Validation', icon: ShieldCheck, component: ValidationTab },
    { id: 'output', label: 'Output', labelEn: 'Output', icon: FileText, component: OutputTab },
  ];

  return (
    <StandardizedGuideLayout
      title="Naive Bayes"
      titleEn="Naive Bayes"
      description="Melatih dan mengevaluasi model klasifikasi Naive Bayes dari fitur kategorik, numerik, dan teks, lalu mengekspor model untuk dipakai di Apply Model."
      descriptionEn="Train and evaluate a Naive Bayes classifier from categorical, numeric, and text features, then export the model for use in Apply Model."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
