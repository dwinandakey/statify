import React from 'react';
import { BookOpen, PlayCircle, Calculator } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { UsageTab } from './tabs/UsageTab';
import { AlgorithmTab } from './tabs/AlgorithmTab';

export const Smoothing: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: BookOpen, component: OverviewTab },
    { id: 'usage', label: 'Penggunaan', labelEn: 'Usage', icon: PlayCircle, component: UsageTab },
    { id: 'algorithm', label: 'Algoritma', labelEn: 'Algorithm', icon: Calculator, component: AlgorithmTab },
  ];
  return (
    <StandardizedGuideLayout
      title="Smoothing (Pemulusan)"
      titleEn="Time Series Smoothing"
      description="Teknik pemulusan data runtun waktu menggunakan Moving Average, Exponential Smoothing, atau Holt-Winters untuk menghilangkan noise dan mengidentifikasi tren."
      descriptionEn="Time series smoothing techniques using Moving Average, Exponential Smoothing, or Holt-Winters to reduce noise and identify trend."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};