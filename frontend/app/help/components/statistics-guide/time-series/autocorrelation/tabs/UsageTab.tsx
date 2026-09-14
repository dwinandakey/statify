import React from 'react';
import { Settings, BarChart2, Lightbulb } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const UsageTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "How to Use Autocorrelation in Statify" : "Cara Menggunakan Autocorrelation di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Access via Analyze → Time Series → Autocorrelation. Generates ACF and PACF plots alongside Ljung-Box statistics for each lag."
            : "Analisis Autocorrelation dapat diakses melalui menu Analyze → Time Series → Autocorrelation. Fitur ini menghasilkan grafik ACF dan PACF beserta statistik Ljung-Box untuk setiap lag."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Step-by-Step Instructions" : "Langkah-Langkah Penggunaan"} icon={Settings} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Open Dialog" : "Buka Dialog Autocorrelation"}
            description={isEn ? "Click Analyze → Time Series → Autocorrelation." : "Klik menu Analyze → Time Series → Autocorrelation untuk membuka dialog analisis."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Select Variable (Variables Tab)" : "Pilih Variabel (Tab Variables)"}
            description={isEn ? "Move one numeric time series variable to analysis box." : "Seret satu variabel numerik dari daftar variabel tersedia ke kotak analisis."}
          />
        </div>
      </HelpCard>
    </div>
  );
};
