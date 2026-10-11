import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { HelpCard, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OptionsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Iteration Algorithm & Parameter Settings" : "Pengaturan Algoritma Iterasi & Parameter"} icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Maximum Iterations"
            description={
              isEn
                ? "The maximum computation-repeat limit. Enter a non-negative integer. If set to 0, the system only shows the initial estimate."
                : "Batas maksimal komputasi berulang. Masukkan angka bulat non-negatif. Jika diisi 0, sistem hanya akan menampilkan estimasi awal."
            }
          />
          <HelpStep
            number={2}
            title="Maximum Step-halving"
            description={
              isEn
                ? "Controls how the algorithm adjusts its step size while searching for the optimum. Enter a positive integer."
                : "Mengontrol penyesuaian ukuran langkah algoritma saat mencari nilai optimum. Masukkan bilangan bulat positif."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Log-likelihood & Parameter Convergence" : "Konvergensi Log-likelihood & Parameter"}
            description={
              isEn
                ? "The stopping criterion for computation. The algorithm stops once the absolute/relative change in log-likelihood or in parameter estimates falls below the given threshold."
                : "Kriteria penghentian komputasi. Algoritma akan berhenti jika perubahan absolut/relatif log-likelihood atau estimasi parameter kurang dari nilai batas yang ditentukan."
            }
          />
          <HelpStep
            number={4}
            title="Confidence Interval"
            description={
              isEn
                ? "Set the confidence level for parameter estimates (e.g. 95%). Enter a value from 0 up to (but not including) 100."
                : "Tentukan tingkat kepercayaan untuk estimasi parameter (misalnya 95%). Masukkan nilai dari 0 hingga kurang dari 100."
            }
          />
          <HelpStep
            number={5}
            title="Delta Value"
            description={
              isEn
                ? "A small adjustment value added automatically when a cell frequency is zero (enter a non-negative number less than 1)."
                : "Nilai penyesuaian kecil yang ditambahkan otomatis jika terdapat frekuensi sel bernilai nol (masukkan angka non-negatif kurang dari 1)."
            }
          />
          <HelpStep
            number={6}
            title="Singularity Tolerance"
            description={
              isEn
                ? "Used by the system to detect extreme multicollinearity relationships (highly dependent predictors)."
                : "Digunakan oleh sistem untuk mendeteksi adanya hubungan multikolinearitas ekstrim (prediktor yang saling bergantung tinggi)."
            }
          />
        </div>
      </HelpCard>
    </div>
  );
};
