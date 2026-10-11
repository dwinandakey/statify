import React from 'react';
import { HelpCircle, ClipboardList } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "What is Multinomial Logistic Regression?" : "Apa itu Regresi Logistik Multinomial?"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Multinomial Logistic Regression extends binary logistic regression to a dependent variable with more than two categories (polytomous), without an intrinsic order (nominal). It compares several categories simultaneously against one chosen reference (baseline) category."
            : "Regresi Logistik Multinomial (Multinomial Logistic Regression) adalah perluasan dari regresi logistik biner yang digunakan ketika variabel dependen (outcome) bertipe kategorikal dengan lebih dari dua kategori (polikotomus), tanpa urutan intrinsik tertentu (nominal). Metode ini membandingkan beberapa kategori secara simultan dengan memilih satu kategori referensi (baseline)."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "When to Use Multinomial Logistic Regression?" : "Kapan Menggunakan Regresi Logistik Multinomial?"} icon={HelpCircle} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>The dependent variable (outcome) is nominal with 3 or more categories (e.g. Transport Choice: Bus, Train, Private Car)</li>
              <li>Predictors can be continuous (covariates) and/or categorical (factors)</li>
              <li>Predicting the probability of group (category) membership from predictor values</li>
              <li>Assessing the strength of the relationship between predictors and a given dependent category versus the reference (baseline) category</li>
            </>
          ) : (
            <>
              <li>Variabel dependen (outcome) bersifat kategorikal nominal dengan 3 kategori atau lebih (contoh: Pilihan Transportasi: Bus, Kereta, Mobil Pribadi)</li>
              <li>Variabel prediktor (independen) berupa variabel kontinu (kovariat) dan/atau kategorikal (faktor)</li>
              <li>Memprediksi peluang keanggotaan kelompok (kategori) berdasarkan nilai prediktor</li>
              <li>Menilai kekuatan hubungan antara prediktor dengan kategori dependen tertentu dibandingkan dengan kategori dasar (referensi)</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpCard title={isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari"} icon={ClipboardList} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>Setting the Dependent Variable, Factors (categorical), and Covariates (continuous)</li>
              <li>Setting the Reference Category for group comparisons</li>
              <li>Selecting model-fit statistics, parameter estimates, likelihood-ratio tests, and classification</li>
              <li>Configuring estimation iteration criteria and stepwise model options</li>
              <li>Saving predicted probabilities and predicted categories back to the dataset</li>
            </>
          ) : (
            <>
              <li>Menentukan Variabel Dependen, Faktor (kategorikal), dan Kovariat (kontinu)</li>
              <li>Menentukan Kategori Referensi untuk perbandingan kelompok</li>
              <li>Memilih statistik uji model, estimasi parameter, uji rasio kecocokan model, dan klasifikasi</li>
              <li>Mengatur kriteria iterasi estimasi dan opsi model stepwise</li>
              <li>Menyimpan nilai peluang prediksi dan kategori hasil prediksi ke dataset</li>
            </>
          )}
        </ul>
      </HelpCard>
    </div>
  );
};
