import React from 'react';
import { FileText } from 'lucide-react';
import { HelpCard, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OutputTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Analysis Results Display" : "Tampilan Hasil Analisis"} icon={FileText} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Goodness of Fit"
            description={
              isEn
                ? "Shows the Pearson Chi-square and Likelihood-ratio statistics to assess how well the model fits your data."
                : "Menampilkan statistik Chi-square Pearson dan Likelihood-ratio untuk menilai seberapa cocok model dengan data Anda."
            }
          />
          <HelpStep
            number={2}
            title="Summary Statistics"
            description={
              isEn
                ? "Shows the R-Square value to measure how much of Y's variation can be explained by the X variables."
                : "Menampilkan nilai R-Square untuk mengukur seberapa besar variasi Y dapat dijelaskan oleh variabel X."
            }
          />
          <HelpStep
            number={3}
            title="Parameter Estimates"
            description={
              isEn
                ? "Shows the regression coefficients, standard errors, and confidence intervals to see each predictor's direction and effect."
                : "Menampilkan koefisien regresi, standar eror, dan interval kepercayaan untuk melihat arah serta pengaruh masing-masing prediktor."
            }
          />
          <HelpStep
            number={4}
            title="Cell Information & Iteration History"
            description={
              isEn
                ? "Shows observed vs. expected frequency tables, Pearson residuals, and the estimation's convergence history."
                : "Menampilkan tabel frekuensi teramati vs ekspektasi, residual Pearson, serta riwayat proses konvergensi estimasi."
            }
          />
          <HelpStep
            number={5}
            title="Test of Parallel Lines"
            description={
              isEn
                ? "Tests whether the predictor relationship is consistent across every category level. If this test is significant (p < 0.05), the ordinal regression assumption may be violated."
                : "Menguji hipotesis apakah hubungan prediktor konsisten di semua tingkatan kategori. Jika uji ini signifikan (p < 0.05), asumsi regresi ordinal mungkin terlanggar."
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Saving New Variables" : "Menyimpan Variabel Baru (Saved Variables)"} icon={FileText} variant="feature">
        <p className="text-sm text-muted-foreground mb-3">
          {isEn
            ? "You can choose to save the model's computed results directly into the data worksheet:"
            : "Anda dapat memilih untuk menyimpan hasil perhitungan model langsung ke dalam lembar kerja data:"}
        </p>
        <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
          {isEn ? (
            <>
              <li><strong>Estimated response probabilities:</strong> the model's estimated probability for every response category.</li>
              <li><strong>Predicted category:</strong> the predicted category with the highest probability.</li>
              <li><strong>Predicted category probability:</strong> the probability value of that predicted category.</li>
              <li><strong>Actual category probability:</strong> the estimated probability for the actual/observed category.</li>
            </>
          ) : (
            <>
              <li><strong>Estimated response probabilities:</strong> Peluang estimasi model untuk setiap kategori respon.</li>
              <li><strong>Predicted category:</strong> Kategori hasil prediksi dengan nilai peluang terbesar.</li>
              <li><strong>Predicted category probability:</strong> Nilai peluang dari kategori yang diprediksi tersebut.</li>
              <li><strong>Actual category probability:</strong> Peluang estimasi pada kategori aktual/sebenarnya.</li>
            </>
          )}
        </ul>
      </HelpCard>
    </div>
  );
};
