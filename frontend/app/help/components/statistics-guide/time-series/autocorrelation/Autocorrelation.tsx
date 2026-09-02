import React from 'react';
import { BookOpen, PlayCircle, Calculator } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { UsageTab } from './tabs/UsageTab';
import { AlgorithmTab } from './tabs/AlgorithmTab';

export const Autocorrelation: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: BookOpen, component: OverviewTab },
    { id: 'usage', label: 'Penggunaan', labelEn: 'Usage', icon: PlayCircle, component: UsageTab },
    { id: 'algorithm', label: 'Algoritma', labelEn: 'Algorithm', icon: Calculator, component: AlgorithmTab },
  ];

  return (
    <StandardizedGuideLayout
      title="Autocorrelation (ACF & PACF)"
      titleEn="Autocorrelation (ACF & PACF)"
      description="Analisis autokorelasi dan autokorelasi parsial untuk mengidentifikasi orde AR dan MA pada data runtun waktu."
      descriptionEn="Autocorrelation and partial autocorrelation analysis to identify AR and MA lag orders in time series data."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};