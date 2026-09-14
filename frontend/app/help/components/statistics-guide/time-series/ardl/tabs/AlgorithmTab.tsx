import React from 'react';
import { Calculator, BookOpen } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AlgorithmTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "ARDL Algorithm in Statify" : "Algoritma ARDL di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Statify implements two-stage ARDL: (1) OLS for long-run, (2) ADF on residuals for cointegration test, (3) OLS for short-run ECM equation."
            : "Statify mengimplementasikan ARDL dua tahap: (1) OLS untuk jangka panjang, (2) ADF pada residual untuk uji kointegrasi, (3) OLS untuk persamaan ECM jangka pendek."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "1. ARDL(p, q₁,...,qₖ) Model Specification" : "1. Spesifikasi Model ARDL(p, q₁,...,qₖ)"} icon={Calculator} variant="feature">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm whitespace-pre-line">
{`Yₜ = α + Σ(i=1..p) φᵢ Yₜ₋ᵢ + Σ(j=1..k) Σ(l=0..qⱼ) βⱼₗ Xⱼₜ₋ₗ + εₜ`}
          </div>
          <ul className="text-sm text-slate-600 dark:text-slate-400 mt-2 space-y-1">
            <li>• p = {isEn ? "AR order (lag of dependent variable Y)" : "Orde AR (lag variabel dependen Y)"}</li>
            <li>• qⱼ = {isEn ? "DL order (lag of j-th independent variable)" : "Orde DL (lag variabel independen ke-j)"}</li>
            <li>• k = {isEn ? "Number of independent variables" : "Jumlah variabel independen"}</li>
          </ul>
        </div>
      </HelpCard>

      <HelpCard title="2. Long-Run Equation (OLS)" icon={Calculator} variant="default">
        <div className="space-y-3 mt-2">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">Yₜ = β₀ + Σ βⱼ Xⱼₜ + uₜ</div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
            <p className="text-sm font-medium mb-2">{isEn ? "OLS Estimation:" : "Estimasi OLS:"}</p>
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">β̂ = (X'X)⁻¹ X'Y</div>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "3. Cointegration Test (ADF on Residuals)" : "3. Uji Kointegrasi (ADF pada Residual)"} icon={Calculator} variant="default">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">Δûₜ = γ ûₜ₋₁ + Σ δᵢ Δûₜ₋ᵢ + νₜ</div>
          <ul className="text-sm text-slate-600 dark:text-slate-400 mt-2 space-y-1">
            <li>• ûₜ = {isEn ? "Long-run residuals" : "Residual persamaan jangka panjang"}</li>
            <li>• H₀: γ = 0 ({isEn ? "non-stationary → no cointegration" : "tidak stasioner → tidak kointegrasi"})</li>
            <li>• H₁: γ &lt; 0 ({isEn ? "stationary → cointegrated" : "stasioner → kointegrasi"})</li>
          </ul>
        </div>
      </HelpCard>

      <HelpCard title="4. Short-Run ARDL-ECM" icon={Calculator} variant="default">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm whitespace-pre-line">
{`D(Yₜ) = α + δ ECT(-1)
       + Σ(i=1..p) φᵢ D(Yₜ₋ᵢ)
       + Σ(j=1..k) Σ(l=0..qⱼ) γⱼₗ D(Xⱼₜ₋ₗ) + εₜ`}
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "References" : "Referensi"} icon={BookOpen} variant="default">
        <ul className="text-sm space-y-2 mt-2 text-slate-600 dark:text-slate-400">
          <li>• Pesaran, M. H., Shin, Y., &amp; Smith, R. J. (2001). Journal of Applied Econometrics, 16(3), 289–326.</li>
          <li>• Engle, R. F., &amp; Granger, C. W. J. (1987). Econometrica, 55(2), 251–276.</li>
        </ul>
      </HelpCard>
    </div>
  );
};
