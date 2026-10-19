import React from 'react';
import { HelpCircle, FileInput, ArrowRightLeft, Save, FileText, Sigma } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { ModelTab } from './tabs/ModelTab';
import { VariablesTab } from './tabs/VariablesTab';
import { SaveTab } from './tabs/SaveTab';
import { OutputTab } from './tabs/OutputTab';
import { CalculationTab } from './tabs/CalculationTab';

export const ApplyModelGuide: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: HelpCircle, component: OverviewTab },
    { id: 'model', label: 'Model', labelEn: 'Model', icon: FileInput, component: ModelTab },
    { id: 'variables', label: 'Variabel', labelEn: 'Variables', icon: ArrowRightLeft, component: VariablesTab },
    { id: 'save', label: 'Simpan', labelEn: 'Save', icon: Save, component: SaveTab },
    { id: 'output', label: 'Output', labelEn: 'Output', icon: FileText, component: OutputTab },
    { id: 'calculation', label: 'Perhitungan', labelEn: 'Calculation', icon: Sigma, component: CalculationTab },
  ];

  return (
    <StandardizedGuideLayout
      title="Apply Model"
      titleEn="Apply Model"
      description="Menerapkan model Naive Bayes yang sudah dilatih ke dataset aktif untuk memprediksi kelas setiap baris, lalu menulis hasilnya sebagai variabel baru."
      descriptionEn="Apply a trained Naive Bayes model to the active dataset to predict the class of every row, then write the results as new variables."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
