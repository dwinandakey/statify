import React from 'react';
import { Settings, BarChart2, Lightbulb } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const UsageTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "How to Use Smoothing in Statify" : "Cara Menggunakan Smoothing di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Access via Analyze → Time Series → Smoothing. Choose method and parameters matching data characteristics."
            : "Akses melalui Analyze → Time Series → Smoothing. Pilih metode dan parameter yang sesuai dengan karakteristik data Anda."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Step-by-Step Instructions" : "Langkah-Langkah Penggunaan"} icon={Settings} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep number={1} title={isEn ? "Open Dialog" : "Buka Dialog"} description={isEn ? "Click Analyze → Time Series → Smoothing." : "Klik Analyze → Time Series → Smoothing."} />
          <HelpStep number={2} title={isEn ? "Select Variable" : "Pilih Variabel (Tab Variables)"} description={isEn ? "Move one numeric time series variable to analysis box." : "Seret satu variabel runtun waktu numerik ke kotak analisis."} />
        </div>
      </HelpCard>
    </div>
  );
};
