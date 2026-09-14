import React from 'react';
import { Settings, BarChart2, Lightbulb } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const UsageTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "How to Use Homoscedasticity Test in Statify" : "Cara Menggunakan Homoscedasticity Test di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Access via Analyze → Time Series → Homoscedasticity Test. Inputs are saved residual variables from previous estimations."
            : "Akses melalui Analyze → Time Series → Homoscedasticity Test. Input berupa variabel residual yang sudah tersimpan dari analisis sebelumnya."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Step-by-Step Instructions" : "Langkah-Langkah Penggunaan"} icon={Settings} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Prepare Residuals" : "Siapkan Residual"}
            description={isEn ? "Ensure you have estimated an ARIMA or regression model and saved residuals as a new variable (e.g. RES_1) in the dataset." : "Pastikan Anda sudah mengestimasi model ARIMA atau regresi dan menyimpan residual sebagai variabel baru (mis. RES_1) di dataset."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Open Dialog" : "Buka Dialog"}
            description={isEn ? "Click Analyze → Time Series → Homoscedasticity Test." : "Klik Analyze → Time Series → Homoscedasticity Test."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Select Residual Variable (Variables Tab)" : "Pilih Variabel Residual (Tab Variables)"}
            description={isEn ? "Move the saved residual variable into the analysis box." : "Seret variabel residual yang tersimpan ke kotak analisis."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Set Lag Order (Options Tab)" : "Tentukan Jumlah Lag (Tab Options)"}
            description={isEn ? "Set lag order for auxiliary regression. Typically 1–4 lags. Higher lags provide comprehensive testing but consume sample size." : "Atur jumlah lag untuk regresi bantu. Umumnya gunakan 1–4 lag. Lag lebih banyak = uji lebih komprehensif tapi memerlukan lebih banyak data."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Click OK and Interpret" : "Klik OK dan Interpretasi"}
            description={isEn ? "Output displays residual descriptive statistics, F-statistic with p-value, and Chi-Square (Obs×R²) statistic with p-value." : "Output menampilkan statistik deskriptif residual, statistik F dengan p-value, dan statistik Chi-Square (Obs×R²) dengan p-value."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Interpreting Output" : "Membaca Output"} icon={BarChart2} variant="default">
        <div className="space-y-3 mt-2 text-sm">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <p className="font-medium mb-2">{isEn ? "Residual Descriptive Statistics:" : "Statistik Deskriptif Residual:"}</p>
            <p className="text-slate-600 dark:text-slate-400">• Count (N), Mean, Std. Deviation, Min, Max</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <p className="font-medium mb-2">{isEn ? "ARCH-LM Test Results:" : "Hasil Uji ARCH-LM:"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>F-statistic:</strong> {isEn ? "F-test statistic of auxiliary regression. Distributed as F(m, n−2m−1)" : "Statistik F regresi bantu. Distribusi F(m, n−2m−1)"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>Prob. F:</strong> {isEn ? "F-test p-value" : "p-value uji F"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>Obs×R²:</strong> {isEn ? "LM statistic = n × R². Distributed as χ²(m)" : "Statistik LM = n × R². Distribusi χ²(m)"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>Prob. Chi-Square:</strong> {isEn ? "LM test p-value" : "p-value uji LM"}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <p className="font-medium mb-2">{isEn ? "Decision:" : "Keputusan:"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>p-value ≥ 0.05:</strong> {isEn ? "Fail to reject H₀ → Residuals are homoscedastic ✓" : "Gagal tolak H₀ → Residual homoskedastik ✓"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>p-value &lt; 0.05:</strong> {isEn ? "Reject H₀ → ARCH effect present → consider GARCH ✗" : "Tolak H₀ → Ada efek ARCH → pertimbangkan model GARCH ✗"}</p>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Tips & Next Steps" : "Tips & Tindak Lanjut"} icon={Lightbulb} variant="step">
        <div className="space-y-2 mt-2 text-sm text-slate-700 dark:text-slate-300">
          <p>• <strong>{isEn ? "If ARCH effect is present:" : "Jika ada efek ARCH:"}</strong> {isEn ? "Proceed to Heteroscedasticity Models (GARCH) to model volatility." : "Lanjutkan ke Heteroscedasticity Models (GARCH) untuk memodelkan volatilitas."}</p>
          <p>• <strong>{isEn ? "Lag selection:" : "Pilihan lag:"}</strong> {isEn ? "Monthly data: 1–4 lags; Quarterly data: 1–2 lags; Daily data: 5–10 lags." : "Untuk data bulanan gunakan lag 1–4, data kuartalan lag 1–2, data harian lag 5–10."}</p>
          <p>• <strong>{isEn ? "Stationary residuals:" : "Residual harus stasioner:"}</strong> {isEn ? "Ensure residuals tested come from a stationary model." : "Pastikan residual yang diuji berasal dari model yang sudah stasioner."}</p>
        </div>
      </HelpCard>
    </div>
  );
};
