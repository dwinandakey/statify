import React from 'react';
import { BookOpen, Database, Calculator, RotateCcw, Sigma, Settings2 } from 'lucide-react';
import StandardizedGuideLayout from '../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { ExtractionTab } from './tabs/ExtractionTab';
import { RotationTab } from './tabs/RotationTab';
import { ScoresTab } from './tabs/ScoresTab';
import { OptionsTab } from './tabs/OptionsTab';

export const FactorAnalysisGuide: React.FC = () => {
  const tabs = [
    {
      id: 'overview',
      label: 'Ringkasan',
      labelEn: 'Overview',
      icon: BookOpen,
      component: OverviewTab,
    },
    {
      id: 'variables',
      label: 'Variabel',
      labelEn: 'Variables',
      icon: Database,
      component: VariablesTab,
    },
    {
      id: 'extraction',
      label: 'Ekstraksi',
      labelEn: 'Extraction',
      icon: Calculator,
      component: ExtractionTab,
    },
    {
      id: 'rotation',
      label: 'Rotasi',
      labelEn: 'Rotation',
      icon: RotateCcw,
      component: RotationTab,
    },
    {
      id: 'scores',
      label: 'Skor Faktor',
      labelEn: 'Factor Scores',
      icon: Sigma,
      component: ScoresTab,
    },
    {
      id: 'options',
      label: 'Options',
      labelEn: 'Options',
      icon: Settings2,
      component: OptionsTab,
    },
  ];

  return (
    <StandardizedGuideLayout
      title="Analisis Faktor"
      titleEn="Factor Analysis"
      description="Pelajari cara menyiapkan, menjalankan, dan menafsirkan analisis faktor untuk mereduksi variabel menjadi struktur laten yang lebih sederhana"
      descriptionEn="Learn how to prepare, run, and interpret factor analysis to reduce variables into a simpler latent structure."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};

export default FactorAnalysisGuide;
