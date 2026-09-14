import React from 'react';
import { BookOpen, PlayCircle, Calculator } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { UsageTab } from './tabs/UsageTab';
import { AlgorithmTab } from './tabs/AlgorithmTab';

export const Decomposition: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', icon: BookOpen, component: OverviewTab },
    { id: 'usage', label: 'Penggunaan', icon: PlayCircle, component: UsageTab },
    { id: 'algorithm', label: 'Algoritma', icon: Calculator, component: AlgorithmTab },
  ];
  return (
    <StandardizedGuideLayout
      title="Decomposition Time Series"
      description="Dekomposisi data runtun waktu menjadi komponen Trend, Seasonality, dan Residual menggunakan model Additive atau Multiplicative."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};