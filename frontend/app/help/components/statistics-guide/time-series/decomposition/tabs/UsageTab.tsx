import React from 'react';
import { Settings, BarChart2, Lightbulb } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const UsageTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "How to Use Decomposition in Statify" : "Cara Menggunakan Decomposition di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Access via Analyze → Time Series → Decomposition. Select variable, model type, and seasonal period."
            : "Akses melalui Analyze → Time Series → Decomposition. Pilih variabel, model, dan periode musiman."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Step-by-Step Instructions" : "Langkah-Langkah Penggunaan"} icon={Settings} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep number={1} title={isEn ? "Open Dialog" : "Buka Dialog"} description={isEn ? "Click Analyze → Time Series → Decomposition." : "Klik Analyze → Time Series → Decomposition."} />
          <HelpStep number={2} title={isEn ? "Select Variable" : "Pilih Variabel (Tab Variables)"} description={isEn ? "Move one time series variable to analysis box." : "Seret satu variabel runtun waktu ke kotak analisis."} />
          <HelpStep number={3} title={isEn ? "Choose Model" : "Pilih Model (Tab Options)"} description={isEn ? "Select Additive or Multiplicative." : "Pilih Additive atau Multiplicative."} />
        </div>
      </HelpCard>
    </div>
  );
};
