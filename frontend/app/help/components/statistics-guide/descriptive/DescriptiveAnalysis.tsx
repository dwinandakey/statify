import React from 'react';
import { BookOpen, Database, Calculator } from 'lucide-react';
import StandardizedGuideLayout from '../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { StatisticsTab } from './tabs/StatisticsTab';

export const DescriptiveAnalysis = () => {
  const tabs = [
    {
      id: 'overview',
      label: 'Ringkasan',
      icon: BookOpen,
      component: OverviewTab
    },
    {
      id: 'variables',
      label: 'Variabel',
      icon: Database,
      component: VariablesTab
    },
    {
      id: 'statistics',
      label: 'Statistik',
      icon: Calculator,
      component: StatisticsTab
    }
  ];

  return (
    <StandardizedGuideLayout
      title="Panduan Analisis Deskriptif"
      titleEn="Descriptive Analysis Guide"
      description="Pelajari cara melakukan analisis statistik deskriptif untuk memahami karakteristik data Anda"
      descriptionEn="Learn how to run descriptive statistical analysis to understand the characteristics of your data"
      tabs={tabs}
      defaultTab="overview"
    >

    </StandardizedGuideLayout>
  );
};

export default DescriptiveAnalysis;
