import React from 'react';
import { HelpCircle, Table, BarChart3, SlidersHorizontal, Shield, Save } from 'lucide-react';
import StandardizedGuideLayout from '../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { CategoricalTab } from './tabs/CategoricalTab';
import { OptionsTab } from './tabs/OptionsTab';
import { AssumptionTab } from './tabs/AssumptionTab';
import { SaveTab } from './tabs/SaveTab';

export const BinaryLogisticRegression: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: HelpCircle, component: OverviewTab },
    { id: 'variables', label: 'Variabel', labelEn: 'Variables', icon: Table, component: VariablesTab },
    { id: 'categorical', label: 'Kategorikal', labelEn: 'Categorical', icon: BarChart3, component: CategoricalTab },
    { id: 'save', label: 'Simpan', labelEn: 'Save', icon: Save, component: SaveTab },
    { id: 'options', label: 'Opsi', labelEn: 'Options', icon: SlidersHorizontal, component: OptionsTab },
    { id: 'assumption', label: 'Asumsi', labelEn: 'Assumptions', icon: Shield, component: AssumptionTab },
  ];

  return (
    <StandardizedGuideLayout
      title="Regresi Logistik Biner"
      titleEn="Binary Logistic Regression"
      description="Memprediksi probabilitas kejadian biner (ya/tidak) menggunakan satu atau lebih variabel prediktor, dengan estimasi Maximum Likelihood, uji asumsi, dan diagnostik model."
      descriptionEn="Predict the probability of a binary event (yes/no) from one or more predictor variables, with Maximum Likelihood estimation, assumption checks, and model diagnostics."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
