import React from 'react';
import { BookOpen, PlayCircle, Calculator } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { UsageTab } from './tabs/UsageTab';
import { AlgorithmTab } from './tabs/AlgorithmTab';

export const BoxJenkinsModel: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: BookOpen, component: OverviewTab },
    { id: 'usage', label: 'Penggunaan', labelEn: 'Usage', icon: PlayCircle, component: UsageTab },
    { id: 'algorithm', label: 'Algoritma', labelEn: 'Algorithm', icon: Calculator, component: AlgorithmTab },
  ];
  return (
    <StandardizedGuideLayout
      title="Box-Jenkins Model (ARIMA)"
      titleEn="Box-Jenkins Model (ARIMA)"
      description="Pemodelan dan peramalan data runtun waktu stasioner menggunakan pendekatan ARIMA dengan estimasi parameter CSS dan optimasi L-BFGS."
      descriptionEn="Stationary time series modeling and forecasting using the ARIMA framework with CSS estimation and L-BFGS optimization."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};