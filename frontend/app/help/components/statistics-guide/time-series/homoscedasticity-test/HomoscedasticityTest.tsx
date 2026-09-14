import React from 'react';
import { BookOpen, PlayCircle, Calculator } from 'lucide-react';
import StandardizedGuideLayout from '../../shared/StandardizedGuideLayout';
import { OverviewTab } from './tabs/OverviewTab';
import { UsageTab } from './tabs/UsageTab';
import { AlgorithmTab } from './tabs/AlgorithmTab';

export const HomoscedasticityTest: React.FC = () => {
  const tabs = [
    { id: 'overview', label: 'Ringkasan', labelEn: 'Overview', icon: BookOpen, component: OverviewTab },
    { id: 'usage', label: 'Penggunaan', labelEn: 'Usage', icon: PlayCircle, component: UsageTab },
    { id: 'algorithm', label: 'Algoritma', labelEn: 'Algorithm', icon: Calculator, component: AlgorithmTab },
  ];
  return (
    <StandardizedGuideLayout
      title="Homoscedasticity Test (ARCH-LM)"
      titleEn="Homoscedasticity Test (ARCH-LM)"
      description="Pengujian efek ARCH pada residual data runtun waktu menggunakan uji Lagrange Multiplier (ARCH-LM) untuk mendeteksi heteroskedastisitas kondisional."
      descriptionEn="Testing for ARCH effects in time series residuals using the Lagrange Multiplier (ARCH-LM) test to detect conditional heteroscedasticity."
      tabs={tabs}
      defaultTab="overview"
    />
  );
};
