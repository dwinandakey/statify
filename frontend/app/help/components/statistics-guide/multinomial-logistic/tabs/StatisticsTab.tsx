import React from 'react';
import { Calculator } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const StatisticsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Output Statistics Options" : "Pilihan Statistik Output"} icon={Calculator} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Model Fitting Information & Goodness-of-Fit"
            description={
              isEn
                ? "Model Fitting Information compares the final model against the intercept-only model to see whether predictors significantly improve the model. Goodness-of-Fit (Pearson and Deviance tests) assesses whether the model fits the data (p > 0.05 indicates a good fit)."
                : "Model Fitting Information membandingkan model final dengan model intersep saja untuk melihat apakah prediktor secara signifikan memperbaiki model. Goodness-of-Fit (uji Pearson dan Deviance) menilai apakah model sesuai dengan data (nilai p > 0.05 menunjukkan model fit)."
            }
          />
          <HelpStep
            number={2}
            title="Pseudo R-Square"
            description={
              isEn
                ? "Shows Cox and Snell, Nagelkerke, and McFadden R-Square, which approximate the proportion of variance in the dependent variable explained by the model."
                : "Menampilkan Cox and Snell, Nagelkerke, dan McFadden R-Square yang memperkirakan proporsi varians variabel dependen yang dijelaskan oleh model."
            }
          />
          <HelpStep
            number={3}
            title="Likelihood Ratio Tests & Parameter Estimates"
            description={
              isEn
                ? "Likelihood Ratio Tests assesses the significance of each predictor's contribution to the overall model. Parameter Estimates shows the B coefficient, standard error, Wald test, p-value, and Odds Ratio (Exp(B)) comparing each category to the reference."
                : "Likelihood Ratio Tests menilai signifikansi kontribusi masing-masing prediktor terhadap model secara keseluruhan. Parameter Estimates menampilkan koefisien B, standar error, uji Wald, nilai p, dan Odds Ratio (Exp(B)) untuk perbandingan setiap kategori terhadap referensi."
            }
          />
          <HelpStep
            number={4}
            title="Classification Table"
            description={
              isEn
                ? "A cross-tabulation of actual against predicted categories used to measure the model's overall classification accuracy."
                : "Tabel silang yang membandingkan kategori aktual dengan kategori hasil prediksi untuk mengukur akurasi klasifikasi model secara keseluruhan."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="info" title={isEn ? "Additional Statistics" : "Statistik Tambahan"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              You can also enable <strong>Asymptotic Covariances/Correlations</strong> to analyze relationships
              between parameter estimates, and <strong>Cell Probabilities</strong> to view observation
              probabilities by sub-population.
            </>
          ) : (
            <>
              Anda juga dapat mengaktifkan <strong>Asymptotic Covariances/Correlations</strong> untuk menganalisis
              hubungan antar estimasi parameter, serta opsi <strong>Cell Probabilities</strong> untuk melihat
              probabilitas observasi berdasarkan sub-sampel.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
