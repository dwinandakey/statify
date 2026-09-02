import React from 'react';
import { Settings, BarChart2, Lightbulb } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const UsageTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "How to Use Unit Root Test in Statify" : "Cara Menggunakan Unit Root Test di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Access via Analyze → Time Series → Unit Root Test. Select DF (lag=0) or ADF (lag > 0), and pick one of the three equation specifications."
            : "Akses melalui Analyze → Time Series → Unit Root Test. Tersedia pilihan model DF (lag=0) dan ADF (lag > 0), serta tiga bentuk persamaan."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Step-by-Step Instructions" : "Langkah-Langkah Penggunaan"} icon={Settings} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep number={1} title={isEn ? "Open Dialog" : "Buka Dialog"} description={isEn ? "Click Analyze → Time Series → Unit Root Test." : "Klik Analyze → Time Series → Unit Root Test."} />
          <HelpStep number={2} title={isEn ? "Select Variable (Variables Tab)" : "Pilih Variabel (Tab Variables)"} description={isEn ? "Drag one time series variable to the analysis box." : "Seret variabel runtun waktu ke kotak analisis. Hanya satu variabel yang dapat dipilih sekaligus."} />
          <HelpStep number={3} title={isEn ? "Choose Equation Specification (Options Tab)" : "Pilih Bentuk Persamaan (Tab Options)"} description={isEn ? "Choose: None, With Constant, or With Trend. With Constant is standard." : "Pilih salah satu: None (tanpa konstanta), With Constant, atau With Trend. Pilihan paling umum adalah With Constant."} />
          <HelpStep number={4} title={isEn ? "Set Lag Order" : "Tentukan Jumlah Lag"} description={isEn ? "Lag=0 for standard DF, lag>0 for ADF." : "Atur jumlah lag p. Lag=0 untuk DF biasa, lag>0 untuk ADF. Gunakan AIC/BIC untuk memilih lag optimal jika tidak yakin."} />
          <HelpStep number={5} title={isEn ? "Click OK and Interpret" : "Klik OK dan Interpretasi"} description={isEn ? "Check τ-statistic and Prob. If Prob &lt; 0.05, series is stationary." : "Perhatikan kolom τ-statistic dan Prob. Jika Prob &lt; 0.05, data stasioner."} />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Interpreting Output" : "Interpretasi Output"} icon={BarChart2} variant="default">
        <div className="space-y-3 mt-2 text-sm text-slate-700 dark:text-slate-300">
          <p>• <strong>τ-statistic (tau):</strong> {isEn ? "More negative values indicate stronger evidence of stationarity." : "Semakin negatif nilainya, semakin kuat bukti stasioner."}</p>
          <p>• <strong>p-value:</strong> {isEn ? "p < 0.05 → Reject H₀ → Series is stationary ✓" : "p < 0.05: Tolak H₀ → Data stasioner ✓"}</p>
          <p>• <strong>p-value ≥ 0.05:</strong> {isEn ? "Fail to reject H₀ → Series is non-stationary → perform differencing" : "p-value ≥ 0.05: Gagal tolak H₀ → Data tidak stasioner → lakukan differencing"}</p>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Tips & Next Steps" : "Tips & Tindak Lanjut"} icon={Lightbulb} variant="step">
        <div className="space-y-2 mt-2 text-sm text-slate-700 dark:text-slate-300">
          <p>• <strong>{isEn ? "Non-stationary series:" : "Data tidak stasioner:"}</strong> {isEn ? "Apply first differencing (I(1)) and test again." : "Lakukan first differencing (I(1)) dan uji ulang."}</p>
        </div>
      </HelpCard>
    </div>
  );
};
