import React from 'react';
import { HelpCircle, Table, Cpu, Calculator, ClipboardList, BarChart3, Save, SlidersHorizontal } from 'lucide-react';
import StandardizedGuideLayout from '../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { AlgorithmTab } from './tabs/AlgorithmTab';
import { FormulaTab } from './tabs/FormulaTab';
import { ResultsTab } from './tabs/ResultsTab';
import { EvaluationTab } from './tabs/EvaluationTab';
import { SaveTab } from './tabs/SaveTab';
import { OptionsTab } from './tabs/OptionsTab';

export const KMedoidsClustering: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: HelpCircle, component: OverviewTab },
    { id: 'variables', label: 'Variabel', labelEn: 'Variables', icon: Table, component: VariablesTab },
    { id: 'algorithm', label: 'Algoritma', labelEn: 'Algorithm', icon: Cpu, component: AlgorithmTab },
    { id: 'formula', label: 'Rumus', labelEn: 'Formula', icon: Calculator, component: FormulaTab },
    { id: 'results', label: 'Hasil', labelEn: 'Results', icon: ClipboardList, component: ResultsTab },
    { id: 'evaluation', label: 'Evaluasi', labelEn: 'Evaluation', icon: BarChart3, component: EvaluationTab },
    { id: 'save', label: 'Simpan', labelEn: 'Save', icon: Save, component: SaveTab },
    { id: 'options', label: 'Opsi', labelEn: 'Options', icon: SlidersHorizontal, component: OptionsTab },
  ];

  return (
    <StandardizedGuideLayout
      title="K-Medoids Clustering"
      titleEn="K-Medoids Clustering"
      description="Mengelompokkan objek ke dalam k cluster dengan pusat berupa medoid (kasus nyata), lebih tahan terhadap outlier dibandingkan K-Means."
      descriptionEn="Partition objects into k clusters whose centers are medoids (real cases), more resistant to outliers than K-Means."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
