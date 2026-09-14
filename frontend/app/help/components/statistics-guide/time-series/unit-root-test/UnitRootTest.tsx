import React from 'react';
import { BookOpen, PlayCircle, Calculator } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { UsageTab } from './tabs/UsageTab';
import { AlgorithmTab } from './tabs/AlgorithmTab';

export const UnitRootTest: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', icon: BookOpen, component: OverviewTab },
    { id: 'usage', label: 'Penggunaan', icon: PlayCircle, component: UsageTab },
    { id: 'algorithm', label: 'Algoritma', icon: Calculator, component: AlgorithmTab },
  ];
  return (
    <StandardizedGuideLayout
      title="Unit Root Test (ADF)"
      description="Uji stasioneritas data runtun waktu menggunakan Augmented Dickey-Fuller (ADF) dan Dickey-Fuller (DF) sebelum pemodelan lebih lanjut."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};