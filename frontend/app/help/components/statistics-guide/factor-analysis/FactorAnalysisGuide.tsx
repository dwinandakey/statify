import React from 'react';
import { BookOpen, Database, Calculator, RotateCcw, Sigma } from 'lucide-react';
import StandardizedGuideLayout from '../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { ExtractionTab } from './tabs/ExtractionTab';
import { RotationTab } from './tabs/RotationTab';
import { ScoresTab } from './tabs/ScoresTab';

export const FactorAnalysisGuide: React.FC = () => {
  const tabs = [
    {
      id: 'overview',
      label: 'Ringkasan',
      icon: BookOpen,
      component: OverviewTab,
    },
    {
      id: 'variables',
      label: 'Variabel',
      icon: Database,
      component: VariablesTab,
    },
    {
      id: 'extraction',
      label: 'Ekstraksi',
      icon: Calculator,
      component: ExtractionTab,
    },
    {
      id: 'rotation',
      label: 'Rotasi',
      icon: RotateCcw,
      component: RotationTab,
    },
    {
      id: 'scores',
      label: 'Skor Faktor',
      icon: Sigma,
      component: ScoresTab,
    },
  ];

  return (
    <StandardizedGuideLayout
      title="Panduan Analisis Faktor"
      description="Pelajari cara menyiapkan, menjalankan, dan menafsirkan analisis faktor untuk mereduksi variabel menjadi struktur laten yang lebih sederhana"
      tabs={tabs}
      defaultTab="overview"
    />
  );
};

export default FactorAnalysisGuide;
