import React from 'react';
import { HelpCircle, Table, Calculator, SlidersHorizontal, Save } from 'lucide-react';
import StandardizedGuideLayout from '../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { StatisticsTab } from './tabs/StatisticsTab';
import { CriteriaTab } from './tabs/CriteriaTab';
import { SaveTab } from './tabs/SaveTab';

export const MultinomialLogisticRegression: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: HelpCircle, component: OverviewTab },
    { id: 'variables', label: 'Variabel', labelEn: 'Variables', icon: Table, component: VariablesTab },
    { id: 'statistics', label: 'Statistik', labelEn: 'Statistics', icon: Calculator, component: StatisticsTab },
    { id: 'criteria', label: 'Kriteria & Opsi', labelEn: 'Criteria & Options', icon: SlidersHorizontal, component: CriteriaTab },
    { id: 'save', label: 'Simpan', labelEn: 'Save', icon: Save, component: SaveTab },
  ];

  return (
    <StandardizedGuideLayout
      title="Regresi Logistik Multinomial"
      titleEn="Multinomial Logistic Regression"
      description="Memprediksi keanggotaan kelompok pada variabel dependen nominal dengan 3 kategori atau lebih, dibandingkan terhadap satu kategori referensi."
      descriptionEn="Predict group membership for a nominal dependent variable with 3 or more categories, compared against a single reference category."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
