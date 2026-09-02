import React from 'react';
import { Calculator, BookOpen } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AlgorithmTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Error Correction Model (ECM) Algorithm in Statify" : "Algoritma Error Correction Model (ECM) di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Statify implements the two-stage Engle-Granger (1987) procedure using matrix OLS calculations, ADF cointegration test on residuals with MacKinnon critical values, and comprehensive diagnostic tests."
            : "Statify mengimplementasikan dua tahap Engle-Granger (1987) dengan kalkulasi OLS matriks, uji ADF pada residual dengan tabel MacKinnon, serta uji asumsi klasik komprehensif."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "1. Stage I: Long-Run OLS Regression" : "1. Tahap I: Persamaan Jangka Panjang (Long-Run OLS)"} icon={Calculator} variant="feature">
        <div className="space-y-3 mt-2">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
            <p className="text-sm font-medium mb-2">{isEn ? "Level OLS Regression Equation:" : "Persamaan Regresi OLS Level:"}</p>
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">Yₜ = β₀ + β₁X₁ₜ + β₂X₂ₜ + ... + βₖXₖₜ + uₜ</div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
            <p className="text-sm font-medium mb-2">{isEn ? "Matrix OLS Estimation:" : "Estimasi Parameter (Matriks):"}</p>
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">β̂ = (X'X)⁻¹ X'Y</div>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "2. Cointegration Test (ADF on Residuals)" : "2. Uji Kointegrasi ADF pada Residual (Engle-Granger)"} icon={Calculator} variant="default">
        <div className="space-y-3 mt-2">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
            <p className="text-sm font-medium mb-2">{isEn ? "Residual ADF Equation:" : "Persamaan ADF Residual:"}</p>
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">Δûₜ = γ ûₜ₋₁ + Σ(i=1..p) δᵢ Δûₜ₋ᵢ + νₜ</div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
            <p className="text-sm font-medium mb-2">{isEn ? "Tau Test Statistic (τ):" : "Statistik Uji Tau (τ):"}</p>
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">τ = γ̂ / se(γ̂)</div>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "3. Stage II: Short-Run ECM Equation" : "3. Tahap II: Persamaan Jangka Pendek (Short-Run ECM)"} icon={Calculator} variant="default">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm whitespace-pre-line">
{`D(Yₜ) = α + δ ECT(-1) + Σ(j=1..k) γⱼ D(Xⱼₜ) + Σ(i=1..p) λᵢ D(Yₜ₋ᵢ) + εₜ`}
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "References" : "Referensi"} icon={BookOpen} variant="default">
        <ul className="text-sm space-y-2 mt-2 text-slate-600 dark:text-slate-400">
          <li>• Engle, R. F., &amp; Granger, C. W. J. (1987). Econometrica, 55(2), 251–276.</li>
          <li>• Granger, C. W. J. (1981). Journal of Econometrics, 16(1), 121–130.</li>
        </ul>
      </HelpCard>
    </div>
  );
};
