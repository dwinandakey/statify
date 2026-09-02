import React from 'react';
import { Settings, BarChart2, Lightbulb } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const UsageTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "How to Use ARIMA in Statify" : "Cara Menggunakan ARIMA di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Access via Analyze → Time Series → Box-Jenkins Model. Set p, d, q orders and select forecast periods."
            : "Akses melalui Analyze → Time Series → Box-Jenkins Model. Tentukan orde p, d, q dan pilih periode yang akan di-forecast."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Step-by-Step Instructions" : "Langkah-Langkah Penggunaan"} icon={Settings} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep number={1} title={isEn ? "Open Dialog" : "Buka Dialog"} description={isEn ? "Click Analyze → Time Series → Box-Jenkins Model (ARIMA)." : "Klik Analyze → Time Series → Box-Jenkins Model (ARIMA)."} />
          <HelpStep number={2} title={isEn ? "Select Variable (Variables Tab)" : "Pilih Variabel (Tab Variables)"} description={isEn ? "Move one numeric time series variable to analysis box." : "Seret satu variabel runtun waktu numerik ke kotak analisis."} />
          <HelpStep number={3} title={isEn ? "Set Orders (Options Tab)" : "Tentukan Orde (Tab Options)"} description={isEn ? "Enter p (AR), d (differencing), q (MA) orders." : "Masukkan orde p (AR), d (differencing), dan q (MA). Gunakan hasil ACF/PACF sebagai panduan."} />
          <HelpStep number={4} title={isEn ? "Set Periods (Time Tab)" : "Atur Periode Waktu (Tab Time)"} description={isEn ? "Optional: set estimation range and forecast horizon." : "Opsional: tentukan rentang data dan jumlah periode forecasting ke depan."} />
          <HelpStep number={5} title={isEn ? "Click OK" : "Klik OK"} description={isEn ? "Output renders coefficients table, model statistics, and forecast plot." : "Hasil akan muncul di panel Output berupa tabel koefisien, statistik model, dan grafik forecasting."} />
        </div>
      </HelpCard>
    </div>
  );
};
