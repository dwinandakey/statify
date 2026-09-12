import React from 'react';
import { HelpCircle, BookOpen, Sigma } from 'lucide-react';
import { IntroSection, FeatureGrid, ConceptSection } from '../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "What is Binary Logistic Regression?" : "Apa itu Regresi Logistik Biner?"}
        description={
          isEn
            ? "Binary Logistic Regression predicts the probability of a binary outcome (yes/no, success/failure, 0/1) from one or more predictor variables. It models the relationship between a categorical dependent variable and independent variables using the logistic (sigmoid) function, estimated by Maximum Likelihood (IRLS)."
            : "Regresi Logistik Biner adalah metode statistik untuk memprediksi probabilitas suatu kejadian biner (ya/tidak, sukses/gagal, 0/1) berdasarkan satu atau lebih variabel prediktor. Metode ini memodelkan hubungan antara variabel dependen kategorikal dan variabel independen menggunakan fungsi logistik (sigmoid), yang diestimasi dengan Maximum Likelihood (algoritma IRLS)."
        }
        variant="info"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use It" : "Kapan Menggunakan Regresi Logistik Biner?",
            icon: HelpCircle,
            items: isEn
              ? [
                  "The dependent variable is binary — exactly 2 categories (e.g. Pass/Fail, Yes/No)",
                  "Predicting the probability of an event from predictors",
                  "Assessing the strength of the relationship between predictors and the outcome",
                  "Identifying risk or protective factors via the Odds Ratio",
                  "Building a classification model to group observations",
                ]
              : [
                  "Variabel dependen (outcome) bersifat biner — hanya memiliki 2 kategori (contoh: Lulus/Tidak Lulus, Ya/Tidak)",
                  "Memprediksi probabilitas suatu kejadian berdasarkan prediktor",
                  "Menilai kekuatan hubungan antara variabel prediktor dan outcome",
                  "Mengidentifikasi faktor risiko atau faktor protektif (Odds Ratio)",
                  "Membangun model klasifikasi untuk mengelompokkan observasi",
                ],
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "Choosing the dependent variable and covariates for analysis",
                  "Using the variable-selection methods (Enter, Forward, Backward)",
                  "Configuring categorical variables (contrasts and reference category)",
                  "Available statistics and diagnostic options",
                  "Assumption checks (multicollinearity, Box-Tidwell linearity of logit)",
                  "Saving predictions and residuals back to the dataset",
                  "Interpreting the main output tables",
                ]
              : [
                  "Memilih variabel dependen dan kovariat untuk analisis",
                  "Menggunakan berbagai metode seleksi variabel (Enter, Forward, Backward)",
                  "Pengaturan variabel kategorikal (kontras dan referensi)",
                  "Opsi statistik dan diagnostik yang tersedia",
                  "Uji asumsi (multikolinearitas, Box-Tidwell)",
                  "Menyimpan prediksi dan residual ke dataset",
                  "Menginterpretasikan tabel output utama",
                ],
          },
        ]}
        columns={2}
      />

      <ConceptSection
        title={isEn ? "Model Formula" : "Formula Model"}
        icon={Sigma}
        concepts={[
          {
            title: isEn ? "Logit (Log-Odds)" : "Logit (Log-Odds)",
            formula: "logit(p) = ln[p / (1 - p)] = B0 + B1X1 + B2X2 + ... + BkXk",
            description: isEn
              ? "The logit link transforms probability p (bounded between 0 and 1) into a linear combination of predictors that can range from -∞ to +∞."
              : "Fungsi logit mentransformasikan probabilitas p (yang terbatas antara 0 dan 1) menjadi kombinasi linear dari prediktor yang dapat bernilai dari -∞ hingga +∞.",
            color: 'blue',
          },
          {
            title: isEn ? "Predicted Probability (Sigmoid)" : "Probabilitas Prediksi (Sigmoid)",
            formula: "p = 1 / (1 + e^-(B0 + B1X1 + ... + BkXk))",
            description: isEn
              ? "The sigmoid function converts the linear predictor back into a probability between 0 and 1, which is then compared against the classification cutoff."
              : "Fungsi sigmoid mengonversi kembali nilai linear predictor menjadi probabilitas antara 0 dan 1, yang kemudian dibandingkan dengan classification cutoff.",
            color: 'purple',
          },
          {
            title: "Odds Ratio — Exp(B)",
            formula: "Exp(Bi) = perubahan odds untuk setiap kenaikan 1 unit Xi",
            description: isEn
              ? "Exp(B) greater than 1 indicates a predictor that increases the odds of the event; less than 1 indicates a predictor that decreases it."
              : "Exp(B) lebih besar dari 1 menunjukkan prediktor yang meningkatkan odds kejadian; kurang dari 1 menunjukkan prediktor yang menurunkannya.",
            color: 'emerald',
          },
        ]}
      />
    </div>
  );
};
