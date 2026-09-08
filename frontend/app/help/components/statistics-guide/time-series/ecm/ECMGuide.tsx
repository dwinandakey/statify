import React from 'react';
import { BookOpen, PlayCircle, Calculator } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { UsageTab } from './tabs/UsageTab';
import { AlgorithmTab } from './tabs/AlgorithmTab';

export const ECMGuide: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: BookOpen, component: OverviewTab },
    { id: 'usage', label: 'Penggunaan', labelEn: 'Usage', icon: PlayCircle, component: UsageTab },
    { id: 'algorithm', label: 'Algoritma', labelEn: 'Algorithm', icon: Calculator, component: AlgorithmTab },
  ];
  return (
    <StandardizedGuideLayout
      title="ECM (Error Correction Model)"
      titleEn="ECM (Error Correction Model)"
      description="Analisis hubungan jangka panjang dan mekanisme koreksi kesalahan menggunakan prosedur dua tahap Engle-Granger untuk data runtun waktu terkointegrasi."
      descriptionEn="Analysis of long-run relationships and error correction mechanisms using the 2-stage Engle-Granger procedure for cointegrated time series data."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
