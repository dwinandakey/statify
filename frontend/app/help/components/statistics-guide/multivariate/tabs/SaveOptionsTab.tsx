import React from 'react';
import { Save } from 'lucide-react';
import { HelpCard, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const SaveOptionsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title="Save" icon={Save} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Predicted Values & Residuals"
            description={isEn ? "Save predicted values and residuals for every dependent variable as new variables in the dataset, useful for further checking." : "Simpan nilai prediksi dan residual untuk setiap dependent variable sebagai variabel baru di dataset, berguna untuk pemeriksaan lebih lanjut."}
          />
        </div>
      </HelpCard>

      <HelpCard title="Options" icon={Save} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Bootstrap"
            description={isEn ? "Enable Simple or Stratified Bootstrap, set the number of replications, and choose the confidence-interval type (Percentile or BCa / Bias-Corrected and accelerated). Useful for a more robust CI estimate when normality is doubtful." : "Aktifkan Simple atau Stratified Bootstrap, tentukan jumlah replikasi, dan pilih tipe confidence interval (Percentile atau BCa/Bias-Corrected and accelerated). Berguna untuk mendapatkan estimasi CI yang lebih robust ketika asumsi normalitas diragukan."}
          />
          <HelpStep
            number={2}
            title="Display Options"
            description={isEn ? "Check any extra tables you want shown: descriptive statistics, homogeneity tests (Box's M, Levene's, Bartlett's Sphericity), effect-size estimates, and observed power." : "Centang tabel tambahan yang ingin ditampilkan: descriptive statistics, homogeneity tests (Box's M, Levene's, Bartlett's Sphericity), estimates of effect size, dan observed power."}
          />
          <HelpStep
            number={3}
            title="Significance Level"
            description={isEn ? "Set the significance level (α) used across every test and confidence interval, default 0.05." : "Tentukan tingkat signifikansi (α) yang digunakan pada seluruh uji dan confidence interval, default 0.05."}
          />
        </div>
      </HelpCard>
    </div>
  );
};
