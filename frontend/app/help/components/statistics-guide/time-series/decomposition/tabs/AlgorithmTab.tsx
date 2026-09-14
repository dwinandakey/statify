import React from 'react';
import { Calculator, BookOpen } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AlgorithmTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Decomposition Algorithm in Statify" : "Algoritma Decomposition di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Statify uses classical decomposition with centered moving averages for trend estimation, followed by seasonal index calculation."
            : "Statify menggunakan metode dekomposisi klasik dengan centered moving average untuk mengestimasi trend, diikuti dengan perhitungan komponen musiman."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "1. Additive Model" : "1. Model Additive"} icon={Calculator} variant="feature">
        <div className="space-y-3 mt-2">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">Yt = Tt + St + et</div>
          </div>
        </div>
      </HelpCard>
    </div>
  );
};
