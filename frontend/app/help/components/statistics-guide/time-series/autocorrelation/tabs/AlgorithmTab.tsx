import React from 'react';
import { Calculator, BookOpen } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AlgorithmTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Autocorrelation Algorithm in Statify" : "Algoritma Autocorrelation di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Statify computes sample autocorrelation (ACF) and partial autocorrelation (PACF) using standard formulas, alongside Ljung-Box Q statistics."
            : "Statify menghitung autokorelasi (ACF) dan autokorelasi parsial (PACF) berdasarkan rumus standar statistik runtun waktu, serta menyertakan uji Ljung-Box untuk evaluasi signifikansi."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "1. Autocorrelation (ACF)" : "1. Autokorelasi (ACF)"} icon={Calculator} variant="feature">
        <div className="space-y-4 mt-2">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border">
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border font-mono text-sm">
              rk = Σ (Yt − Ȳ)(Yt+k − Ȳ) / Σ (Yt − Ȳ)²
            </div>
          </div>
        </div>
      </HelpCard>
    </div>
  );
};
