import React from 'react';
import { BookOpen, Database, Table, Calculator } from 'lucide-react';
import StandardizedGuideLayout from '../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { VariablesTab } from './tabs/VariablesTab';
import { CellsTab } from './tabs/CellsTab';
import { StatisticsTab } from './tabs/StatisticsTab';

export const Crosstabs: React.FC = () => {
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
      id: 'cells',
      label: 'Sel',
      labelEn: 'Cells',
      icon: Table,
      component: CellsTab
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
      title="Panduan Analisis Crosstabs"
      titleEn="Crosstabs Analysis Guide"
      description="Pelajari cara menganalisis hubungan antara variabel kategorikal menggunakan tabulasi silang"
      descriptionEn="Learn how to analyze relationships between categorical variables using cross tabulation"
      tabs={tabs}
      defaultTab="overview"
    >
      
    </StandardizedGuideLayout>
  );
};

