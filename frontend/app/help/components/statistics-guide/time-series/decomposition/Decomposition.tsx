import React from 'react';
import { BookOpen, PlayCircle, Calculator } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { UsageTab } from './tabs/UsageTab';
import { AlgorithmTab } from './tabs/AlgorithmTab';

export const Decomposition: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: BookOpen, component: OverviewTab },
    { id: 'usage', label: 'Penggunaan', labelEn: 'Usage', icon: PlayCircle, component: UsageTab },
    { id: 'algorithm', label: 'Algoritma', labelEn: 'Algorithm', icon: Calculator, component: AlgorithmTab },
  ];
  return (
    <StandardizedGuideLayout
      title="Decomposition Time Series"
      titleEn="Time Series Decomposition"
      description="Dekomposisi data runtun waktu menjadi komponen Trend, Seasonality, dan Residual menggunakan model Additive atau Multiplicative."
      descriptionEn="Decompose time series data into Trend, Seasonality, and Residual components using an Additive or Multiplicative model."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};