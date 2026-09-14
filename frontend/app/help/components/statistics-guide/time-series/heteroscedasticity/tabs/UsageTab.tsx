import React from 'react';
import { Settings, BarChart2, Lightbulb } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const UsageTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "How to Use Heteroscedasticity Models in Statify" : "Cara Menggunakan Heteroscedasticity Models di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Access via Analyze → Time Series → Heteroscedasticity Models. Select variables, model specification (ARCH/GARCH/EGARCH/TGARCH/IGARCH), and lag orders q (ARCH) and p (GARCH)."
            : "Akses melalui Analyze → Time Series → Heteroscedasticity Models. Pilih variabel, tipe model (ARCH/GARCH/EGARCH/TGARCH/IGARCH), dan orde q (ARCH) dan p (GARCH)."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Step-by-Step Instructions" : "Langkah-Langkah Penggunaan"} icon={Settings} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Open Dialog" : "Buka Dialog"}
            description={isEn ? "Click Analyze → Time Series → Heteroscedasticity Models." : "Klik Analyze → Time Series → Heteroscedasticity Models."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Select Variables (Variables Tab)" : "Pilih Variabel (Tab Variables)"}
            description={isEn ? "Select a time series variable (typically return or log-return series of financial assets)." : "Pilih satu variabel runtun waktu (biasanya return atau log-return data keuangan)."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Set Time Settings (Time Tab)" : "Atur Waktu (Tab Time)"}
            description={isEn ? "Optional: set the period range for the estimation." : "Opsional: tentukan rentang periode waktu analisis."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Choose Model Specification (Model Tab)" : "Pilih Model (Tab Model)"}
            description={isEn ? "Choose model type: GARCH (Standard), EGARCH (Exponential), TGARCH (Threshold), IGARCH (Integrated), or ARCH. Set ARCH order (q) and GARCH order (p)." : "Pilih tipe model: GARCH (standar), EGARCH (eksponensial), TGARCH (threshold), IGARCH (integrated), atau ARCH. Tentukan orde ARCH (q) dan GARCH (p)."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Click Estimate" : "Klik Estimate"}
            description={isEn ? "The output includes Mean Equation and Variance Equation tables, alongside AIC, BIC, Log Likelihood, and Durbin-Watson statistics." : "Hasil mencakup dua tabel: Mean Equation dan Variance Equation, beserta statistik AIC, BIC, Log Likelihood, dan Durbin-Watson."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Interpreting Output" : "Membaca Output"} icon={BarChart2} variant="default">
        <div className="space-y-3 mt-2 text-sm">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <p className="font-medium mb-2">{isEn ? "Mean Equation:" : "Mean Equation:"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>C (constant):</strong> {isEn ? "Process mean (μ)" : "Rata-rata proses (μ)"}</p>
            <p className="text-slate-600 dark:text-slate-400">• {isEn ? "Coefficient is statistically significant if Prob < 0.05" : "Koefisien signifikan jika Prob < 0.05"}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <p className="font-medium mb-2">{isEn ? "Variance Equation:" : "Variance Equation:"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>C (ω):</strong> {isEn ? "Variance constant — must be positive" : "Konstanta variansi — harus positif"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>RESID(-i)² (α):</strong> {isEn ? "ARCH coefficient at lag i" : "Koefisien ARCH lag ke-i"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>GARCH(-j) (β):</strong> {isEn ? "GARCH coefficient at lag j" : "Koefisien GARCH lag ke-j"}</p>
            <p className="text-slate-600 dark:text-slate-400">• {isEn ? "Σα + Σβ < 1 → process is stationary" : "Σα + Σβ < 1 → model stasioner"}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <p className="font-medium mb-2">EGARCH / TGARCH:</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>{isEn ? "γ coefficient significant & negative (EGARCH):" : "Koefisien γ signifikan dan negatif (EGARCH):"}</strong> {isEn ? "Leverage effect is present" : "Ada leverage effect"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>{isEn ? "γ coefficient significant & positive (TGARCH):" : "Koefisien γ signifikan dan positif (TGARCH):"}</strong> {isEn ? "Bad news increases volatility more than good news" : "Bad news meningkatkan volatilitas lebih besar"}</p>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Tips & Recommendations" : "Tips & Rekomendasi"} icon={Lightbulb} variant="step">
        <div className="space-y-2 mt-2 text-sm text-slate-700 dark:text-slate-300">
          <p>• <strong>{isEn ? "Start with GARCH(1,1):" : "Mulai dengan GARCH(1,1):"}</strong> {isEn ? "Captures most volatility dynamics in financial data." : "Mencakup sebagian besar dinamika volatilitas pada data keuangan."}</p>
          <p>• <strong>{isEn ? "Use returns, not prices:" : "Gunakan return, bukan harga:"}</strong> {isEn ? "Transform asset price data to log returns before GARCH analysis." : "Transformasikan data harga ke log-return sebelum analisis GARCH."}</p>
          <p>• <strong>{isEn ? "Validate with ARCH-LM:" : "Validasi dengan ARCH-LM:"}</strong> {isEn ? "Post-estimation, run ARCH-LM test on standardized residuals to confirm no remaining ARCH effects." : "Setelah estimasi, jalankan ARCH-LM pada residual standarisasi untuk memastikan tidak ada efek ARCH yang tersisa."}</p>
        </div>
      </HelpCard>
    </div>
  );
};
