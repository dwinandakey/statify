import React from 'react';
import { Calculator, BookOpen } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AlgorithmTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "ARCH/GARCH Algorithm in Statify" : "Algoritma ARCH/GARCH di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "All models are estimated by maximizing the conditional log-likelihood function (assuming Normal distribution) via L-BFGS optimization."
            : "Semua model diestimasi dengan memaksimalkan fungsi log-likelihood kondisional (distribusi normal) menggunakan optimasi L-BFGS."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Mean Equation (all models)" : "Mean Equation (semua model)"} icon={Calculator} variant="feature">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border font-mono text-sm">yₜ = μ + εₜ</div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">εₜ ~ N(0, σₜ²)</p>
        </div>
      </HelpCard>

      <HelpCard title="1. ARCH(q)" icon={Calculator} variant="default">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">σₜ² = ω + Σ αᵢ εₜ₋ᵢ²,  i=1..q</div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {isEn ? "Stationarity requirement: Σαᵢ < 1. All αᵢ ≥ 0, ω > 0." : "Syarat stasioneritas: Σαᵢ < 1. Semua αᵢ ≥ 0, ω > 0."}
          </p>
        </div>
      </HelpCard>

      <HelpCard title="2. GARCH(p,q)" icon={Calculator} variant="default">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">σₜ² = ω + Σ αᵢ εₜ₋ᵢ² + Σ βⱼ σₜ₋ⱼ²</div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {isEn ? "Stationarity requirement: Σαᵢ + Σβⱼ < 1. p = GARCH order, q = ARCH order." : "Syarat stasioner: Σαᵢ + Σβⱼ < 1. p = orde GARCH, q = orde ARCH."}
          </p>
        </div>
      </HelpCard>

      <HelpCard title="3. EGARCH(p,q)" icon={Calculator} variant="default">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm whitespace-pre-line">
{`ln(σₜ²) = ω + Σ [αᵢ |εₜ₋ᵢ/σₜ₋ᵢ| + γᵢ (εₜ₋ᵢ/σₜ₋ᵢ)] + Σ βⱼ ln(σₜ₋ⱼ²)`}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {isEn
              ? "γᵢ < 0 → leverage effect. No non-negativity parameters constraint required (Nelson, 1991)."
              : "γᵢ < 0 → leverage effect. Tidak perlu kendala non-negatif (Nelson, 1991)."}
          </p>
        </div>
      </HelpCard>

      <HelpCard title="4. TGARCH / GJR-GARCH(p,q)" icon={Calculator} variant="default">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm whitespace-pre-line">
{`σₜ² = ω + Σ [αᵢ εₜ₋ᵢ² + γᵢ εₜ₋ᵢ² · I(εₜ₋ᵢ < 0)] + Σ βⱼ σₜ₋ⱼ²`}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {isEn
              ? "I(εₜ₋ᵢ < 0) = bad news indicator. γᵢ > 0 → negative shocks increase volatility more."
              : "I(εₜ₋ᵢ < 0) = indikator bad news. γᵢ > 0 → guncangan negatif meningkatkan volatilitas lebih besar."}
          </p>
        </div>
      </HelpCard>

      <HelpCard title="5. IGARCH(p,q)" icon={Calculator} variant="default">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm">σₜ² = ω + Σ αᵢ εₜ₋ᵢ² + Σ βⱼ σₜ₋ⱼ²</div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {isEn
              ? "With constraint: Σαᵢ + Σβⱼ = 1. Volatility is perfectly persistent — shocks never die out."
              : "Dengan kendala: Σαᵢ + Σβⱼ = 1. Volatilitas persisten sempurna — shock tidak pernah hilang."}
          </p>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "6. Log-Likelihood & Optimization" : "6. Log-Likelihood & Optimasi"} icon={Calculator} variant="default">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border mt-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded border font-mono text-sm whitespace-pre-line">
{`ln L = Σ [−½ ln(2π) − ½ ln(σₜ²) − εₜ²/(2σₜ²)]`}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {isEn
              ? "Optimized using L-BFGS (Limited-memory BFGS). Model selection: AIC = −2 ln L + 2k, BIC = −2 ln L + k ln(n)."
              : "Dioptimalkan menggunakan L-BFGS (Limited-memory BFGS). Ukuran evaluasi: AIC = −2 ln L + 2k, BIC = −2 ln L + k ln(n)."}
          </p>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "References" : "Referensi"} icon={BookOpen} variant="default">
        <ul className="text-sm space-y-2 mt-2 text-slate-600 dark:text-slate-400">
          <li>• Engle, R. F. (1982). Econometrica, 50(4), 987–1007.</li>
          <li>• Bollerslev, T. (1986). Journal of Econometrics, 31(3), 307–327.</li>
          <li>• Nelson, D. B. (1991). Econometrica, 59(2), 347–370.</li>
          <li>• Glosten, L. R., Jagannathan, R., &amp; Runkle, D. E. (1993). Journal of Finance, 48(5), 1779–1801.</li>
          <li>• Tsay, R. S. (2010). <em>Analysis of Financial Time Series</em> (3rd ed.). Wiley.</li>
        </ul>
      </HelpCard>
    </div>
  );
};
