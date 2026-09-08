import React from 'react';
import { Calculator, BookOpen } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AlgorithmTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "ARCH-LM Test Algorithm in Statify" : "Algoritma ARCH-LM Test di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "The ARCH-LM test operates by regressing squared residuals on their lagged values, then computing F and Chi-Square (Obs×R²) test statistics from the auxiliary regression."
            : "Uji ARCH-LM bekerja dengan meregresi residual kuadrat terhadap lag-lagnya, kemudian menghitung statistik F dan Chi-Square (Obs×R²) dari regresi bantu tersebut."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "1. Auxiliary Regression" : "1. Regresi Bantu (Auxiliary Regression)"} icon={Calculator} variant="feature">
        <div className="space-y-3 mt-2">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
            <p className="text-sm font-medium mb-2">{isEn ? "Compute squared residuals:" : "Hitung residual kuadrat:"}</p>
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">uₜ² = eₜ²</div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
            <p className="text-sm font-medium mb-2">{isEn ? "Auxiliary regression (m = lag order):" : "Regresi bantu (m = jumlah lag):"}</p>
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">
              uₜ² = γ₀ + γ₁uₜ₋₁² + γ₂uₜ₋₂² + ... + γₘuₜ₋ₘ² + νₜ
            </div>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "2. F-Statistic" : "2. Statistik Uji F"} icon={Calculator} variant="default">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">
            F = (R²/m) / ((1−R²)/(n−2m−1))
          </div>
          <ul className="text-sm text-slate-600 dark:text-slate-400 mt-2 space-y-1">
            <li>• R² = {isEn ? "R-squared of auxiliary regression" : "Koefisien determinasi regresi bantu"}</li>
            <li>• m = {isEn ? "Lag order" : "Jumlah lag"}</li>
            <li>• n = {isEn ? "Number of residual observations" : "Jumlah observasi residual"}</li>
            <li>• {isEn ? "Distribution: F(m, n−2m−1)" : "Distribusi: F(m, n−2m−1)"}</li>
            <li>• {isEn ? "p-value calculated from F-distribution" : "p-value dihitung dari distribusi F"}</li>
          </ul>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "3. LM Statistic (Obs×R²)" : "3. Statistik LM (Obs×R²)"} icon={Calculator} variant="default">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">LM = n × R²</div>
          <ul className="text-sm text-slate-600 dark:text-slate-400 mt-2 space-y-1">
            <li>• {isEn ? "Distribution: LM ~ χ²(m)" : "Distribusi: LM ~ χ²(m)"}</li>
            <li>• n = {isEn ? "Sample size" : "Jumlah observasi"}</li>
            <li>• m = {isEn ? "Lag order (degrees of freedom)" : "Jumlah lag (derajat kebebasan chi-square)"}</li>
          </ul>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "4. Residual Descriptive Statistics" : "4. Statistik Deskriptif Residual"} icon={Calculator} variant="default">
        <div className="space-y-2 mt-2">
          {[
            { name: 'Mean', formula: 'ē = (1/n) × Σ eₜ' },
            { name: 'Std. Dev.', formula: 's = √[(1/n) × Σ(eₜ − ē)²]' },
            { name: 'Min / Max', formula: 'min(eₜ), max(eₜ)' },
          ].map((item) => (
            <div key={item.name} className="p-2 bg-white dark:bg-slate-900 rounded-lg border flex gap-4 items-center">
              <span className="text-sm font-semibold w-20 shrink-0">{item.name}</span>
              <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm flex-1">{item.formula}</div>
            </div>
          ))}
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "References" : "Referensi"} icon={BookOpen} variant="default">
        <ul className="text-sm space-y-2 mt-2 text-slate-600 dark:text-slate-400">
          <li>• Engle, R. F. (1982). Econometrica, 50(4), 987–1007.</li>
          <li>• Tsay, R. S. (2010). <em>Analysis of Financial Time Series</em> (3rd ed.). Wiley.</li>
          <li>• Enders, W. (2015). <em>Applied Econometric Time Series</em> (4th ed.). Wiley.</li>
        </ul>
      </HelpCard>
    </div>
  );
};
