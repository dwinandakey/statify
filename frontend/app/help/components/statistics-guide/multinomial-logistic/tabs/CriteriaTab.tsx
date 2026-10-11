import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { HelpCard, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const CriteriaTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Estimation Criteria & Stepwise" : "Kriteria Estimasi & Stepwise"} icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Estimation Method (Maximum Likelihood)" : "Metode Estimasi (Maximum Likelihood)"}
            description={
              isEn
                ? "Sets the maximum iteration limit (default: 100) and the step-halving limit. Convergence is reached when the change in log-likelihood or parameter estimates becomes very small."
                : "Mengatur batas iterasi maksimum (default: 100) dan batas penyusutan langkah (step-halving). Konvergensi tercapai ketika perubahan nilai log-likelihood atau estimasi parameter sangat kecil."
            }
          />
          <HelpStep
            number={2}
            title={isEn ? "Stepwise Selection Method (Advanced)" : "Metode Seleksi Stepwise (Opsi Lanjutan)"}
            description={
              isEn
                ? "When using a stepwise model, set the significance level for entering (Entry Probability, default: 0.05) and removing (Removal Probability, default: 0.10) effects. You can choose the Likelihood-Ratio test or the Score test."
                : "Jika menggunakan model stepwise, tentukan tingkat signifikansi untuk memasukkan efek (Entry Probability, default: 0.05) dan menghapus efek (Removal Probability, default: 0.10). Anda dapat memilih metode uji rasio Likelihood atau uji Score."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Hierarchy Constraints" : "Kendala Hierarki (Hierarchy Constraints)"}
            description={
              isEn
                ? "Determines how hierarchical effects enter the model, whether covariates are treated like factors or only factorial effects are considered."
                : "Menentukan bagaimana efek hierarkis dimasukkan ke dalam model, baik memperlakukan kovariat seperti faktor atau hanya mempertimbangkan efek faktorial saja."
            }
          />
        </div>
      </HelpCard>
    </div>
  );
};
