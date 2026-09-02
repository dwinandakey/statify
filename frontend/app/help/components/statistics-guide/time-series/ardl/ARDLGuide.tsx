import React from 'react';
import { BookOpen, PlayCircle, Calculator } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { UsageTab } from './tabs/UsageTab';
import { AlgorithmTab } from './tabs/AlgorithmTab';

export const ARDLGuide: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: BookOpen, component: OverviewTab },
    { id: 'usage', label: 'Penggunaan', labelEn: 'Usage', icon: PlayCircle, component: UsageTab },
    { id: 'algorithm', label: 'Algoritma', labelEn: 'Algorithm', icon: Calculator, component: AlgorithmTab },
  ];
  return (
    <StandardizedGuideLayout
      title="ARDL (Auto-Regressive Distributed Lag)"
      titleEn="ARDL (Auto-Regressive Distributed Lag)"
      description="Pemodelan hubungan jangka panjang dan jangka pendek antar variabel runtun waktu menggunakan pendekatan ARDL-Bounds Testing dengan ECM."
      descriptionEn="Modeling long-run and short-run relationships between time series variables using ARDL-Bounds Testing with ECM."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
