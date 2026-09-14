import React from 'react';
import { Calculator, SlidersHorizontal } from 'lucide-react';
import { HelpCard, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OptionsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Statistics and Plots" : "Opsi Statistik"} icon={Calculator} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Classification Plots & CI for Exp(B)"
            description={
              isEn
                ? "Show the classification plot and a confidence interval for the Odds Ratio (Exp(B)). The CI level (%) is configurable and helps assess the precision of each Odds Ratio estimate."
                : "Tampilkan plot klasifikasi dan interval kepercayaan untuk Odds Ratio (Exp(B)). Level CI (%) dapat diatur dan membantu menilai presisi estimasi Odds Ratio."
            }
          />
          <HelpStep
            number={2}
            title="Hosmer-Lemeshow Goodness of Fit"
            description={
              isEn
                ? "A goodness-of-fit test that compares observed and expected frequencies across risk deciles. A p-value above 0.05 indicates the model fits the data adequately."
                : "Uji kesesuaian model yang membandingkan frekuensi yang diamati dengan yang diharapkan pada tiap decile risiko. Nilai p > 0.05 menunjukkan model sesuai dengan data."
            }
          />
          <HelpStep
            number={3}
            title="Casewise Listing of Residuals"
            description={
              isEn
                ? "Lists cases the model predicts poorly. Choose Outliers outside N std. dev. to flag only extreme cases, or All cases to list every observation."
                : "Menampilkan kasus-kasus yang diprediksi kurang baik oleh model. Pilih Outliers outside N std. dev. untuk menandai hanya kasus ekstrem, atau All cases untuk menampilkan seluruh observasi."
            }
          />
          <HelpStep
            number={4}
            title={isEn ? "Correlations of Estimates & Iteration History" : "Korelasi Estimasi & Iteration History"}
            description={
              isEn
                ? "Correlations of estimates shows the correlation matrix between estimated coefficients. Iteration history displays the -2 log-likelihood value at each IRLS iteration until convergence."
                : "Correlations of estimates menampilkan matriks korelasi antar koefisien estimasi. Iteration history menampilkan nilai -2 log-likelihood pada setiap iterasi IRLS hingga konvergensi."
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Display" : "Display"} icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "At Each Step vs. At Last Step" : "At Each Step vs. At Last Step"}
            description={
              isEn
                ? "For stepwise methods (Forward/Backward), choose whether output is printed for every step of the procedure or only for the final model."
                : "Untuk metode stepwise (Forward/Backward), tentukan apakah output dicetak pada setiap langkah prosedur atau hanya untuk model akhir."
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Probability for Stepwise" : "Probabilitas untuk Stepwise"} icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Entry Probability"
            description={
              isEn
                ? "The minimum p-value for a variable to enter the model (default: 0.05). Variables with a p-value below this threshold are added."
                : "Nilai p minimum agar variabel dapat masuk ke model (default: 0.05). Variabel dengan p-value di bawah ambang ini akan dimasukkan."
            }
          />
          <HelpStep
            number={2}
            title="Removal Probability"
            description={
              isEn
                ? "The maximum p-value for a variable to remain in the model (default: 0.10). Variables with a p-value above this threshold are removed."
                : "Nilai p maksimum agar variabel tetap dalam model (default: 0.10). Variabel dengan p-value di atas ambang ini akan dihapus."
            }
          />
          <HelpStep
            number={3}
            title="Classification Cutoff"
            description={
              isEn
                ? "The probability threshold used for classification (default: 0.5). Cases with a predicted probability at or above the cutoff are classified into category 1."
                : "Ambang batas probabilitas untuk klasifikasi (default: 0.5). Kasus dengan probabilitas prediksi ≥ cutoff diklasifikasikan ke kategori 1."
            }
          />
          <HelpStep
            number={4}
            title="Maximum Iterations"
            description={
              isEn
                ? "The maximum number of IRLS iterations allowed before the algorithm stops, even if it has not fully converged (default: 20)."
                : "Jumlah iterasi maksimum algoritma IRLS sebelum proses dihentikan, meskipun belum mencapai konvergensi penuh (default: 20)."
            }
          />
          <HelpStep
            number={5}
            title={isEn ? "Include Constant in Model" : "Include Constant in Model"}
            description={
              isEn
                ? "Determines whether the intercept (B0) is estimated. Unchecking it forces the regression line through the origin of the logit scale — rarely appropriate outside specific theoretical models."
                : "Menentukan apakah intersep (B0) diestimasi. Menghilangkan centang ini memaksa garis regresi melalui titik nol pada skala logit — jarang tepat kecuali untuk model teoretis tertentu."
            }
          />
        </div>
      </HelpCard>
    </div>
  );
};
