import React from 'react';
import { HelpCircle, ClipboardList } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "What is Linear Regression?" : "Apa itu Regresi Linear?"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Linear regression fits a line (or hyper-plane) that best describes the relationship between a dependent variable and one or more independent variables. It is useful for prediction, assessing relationships, and understanding effect sizes."
            : "Regresi linear mencari garis (atau hyper-plane) yang paling menggambarkan hubungan antara variabel dependen dan satu atau lebih variabel independen. Metode ini berguna untuk prediksi, menilai hubungan antar variabel, dan memahami besarnya pengaruh (effect size)."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "When to Use Linear Regression" : "Kapan Menggunakan Regresi Linear"} icon={HelpCircle} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>Predicting a quantitative outcome from one or more predictors</li>
              <li>Assessing how strongly variables are related</li>
              <li>Testing hypotheses about coefficients (t-tests)</li>
              <li>Exploring model fit (R², ANOVA, residual analysis)</li>
            </>
          ) : (
            <>
              <li>Memprediksi outcome kuantitatif berdasarkan satu atau lebih prediktor</li>
              <li>Menilai seberapa kuat hubungan antar variabel</li>
              <li>Menguji hipotesis tentang koefisien (uji t)</li>
              <li>Mengeksplorasi kesesuaian model (R², ANOVA, analisis residual)</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpCard title={isEn ? "What You'll Learn" : "Yang Akan Anda Pelajari"} icon={ClipboardList} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>Selecting variables for the analysis</li>
              <li>Available statistics &amp; diagnostics</li>
              <li>Plot and save options</li>
              <li>Interpreting key output tables</li>
            </>
          ) : (
            <>
              <li>Memilih variabel untuk analisis</li>
              <li>Statistik &amp; diagnostik yang tersedia</li>
              <li>Opsi plot dan penyimpanan</li>
              <li>Menginterpretasikan tabel output utama</li>
            </>
          )}
        </ul>
      </HelpCard>
    </div>
  );
};
