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
            description={isEn ? "Save predicted values and residuals to the dataset as new variables, useful for further checking." : "Simpan nilai prediksi dan residual ke dataset sebagai variabel baru, berguna untuk pemeriksaan lebih lanjut."}
          />
        </div>
      </HelpCard>

      <HelpCard title="Options" icon={Save} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Display Options"
            description={isEn ? "Check any extra tables you want shown: descriptive statistics, effect-size estimates, and observed power." : "Centang tabel tambahan yang ingin ditampilkan: descriptive statistics, estimates of effect size, dan observed power."}
          />
          <HelpStep
            number={2}
            title="Significance Level"
            description={isEn ? "Set the significance level (α) used across every test and confidence interval, default 0.05." : "Tentukan tingkat signifikansi (α) yang digunakan pada seluruh uji dan confidence interval, default 0.05."}
          />
        </div>
      </HelpCard>
    </div>
  );
};
