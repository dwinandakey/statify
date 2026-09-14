import React from 'react';
import { BookOpen, PlayCircle, Calculator } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { UsageTab } from './tabs/UsageTab';
import { AlgorithmTab } from './tabs/AlgorithmTab';

export const HeteroscedasticityTest: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: BookOpen, component: OverviewTab },
    { id: 'usage', label: 'Penggunaan', labelEn: 'Usage', icon: PlayCircle, component: UsageTab },
    { id: 'algorithm', label: 'Algoritma', labelEn: 'Algorithm', icon: Calculator, component: AlgorithmTab },
  ];
  return (
    <StandardizedGuideLayout
      title="Heteroscedasticity Models (ARCH/GARCH)"
      titleEn="Heteroscedasticity Models (ARCH/GARCH)"
      description="Pemodelan volatilitas data runtun waktu menggunakan model ARCH, GARCH, EGARCH, TGARCH, dan IGARCH untuk menangkap klasterisasi volatilitas."
      descriptionEn="Volatility modeling for time series data using ARCH, GARCH, EGARCH, TGARCH, and IGARCH models to capture volatility clustering."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
