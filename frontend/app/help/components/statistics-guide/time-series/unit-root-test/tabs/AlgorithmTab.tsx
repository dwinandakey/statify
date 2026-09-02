import React from 'react';
import { Calculator, BookOpen } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AlgorithmTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Unit Root Test Algorithm in Statify" : "Algoritma Unit Root Test di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Statify implements DF and ADF tests using tau (τ) statistics, MacKinnon (1994) critical values, and p-values based on MacKinnon distribution approximation."
            : "Statify mengimplementasikan uji DF dan ADF menggunakan statistik tau (τ), nilai kritis MacKinnon (1994), dan probabilitas menggunakan tabel MacKinnon."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "1. Tau Test Statistic (τ)" : "1. Statistik Uji Tau (τ)"} icon={Calculator} variant="feature">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border font-mono text-sm">
            τ = γ / se(γ)
          </div>
          <ul className="text-sm text-slate-600 dark:text-slate-400 mt-2 space-y-1">
            <li>• γ = {isEn ? "Slope coefficient of yt-1 from regression" : "Koefisien slope yt-1 dari persamaan regresi"}</li>
            <li>• se(γ) = {isEn ? "Standard error of γ" : "Standard error koefisien γ"}</li>
            <li>• H₀: γ = 0 ({isEn ? "non-stationary / unit root present" : "tidak stasioner / ada unit root"})</li>
            <li>• H₁: γ &lt; 0 ({isEn ? "stationary" : "stasioner"})</li>
          </ul>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "2. MacKinnon Critical Values" : "4. Nilai Kritis MacKinnon"} icon={Calculator} variant="default">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border font-mono text-sm">
            C(α) = β₀ + (β₁/N) + (β₂/N²) + (β₃/N³)
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "References" : "Referensi"} icon={BookOpen} variant="default">
        <ul className="text-sm space-y-2 mt-2 text-slate-600 dark:text-slate-400">
          <li>• Enders, W. (2015). <em>Applied Econometric Time Series</em> (4th ed.). Wiley.</li>
          <li>• MacKinnon, J. G. (1994). <em>Journal of Business &amp; Economic Statistics</em>, 12(2), 167–176.</li>
        </ul>
      </HelpCard>
    </div>
  );
};
