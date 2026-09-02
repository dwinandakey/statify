import React from 'react';
import { HelpCircle, BookOpen, BarChart2, Target } from 'lucide-react';
import { IntroSection, FeatureGrid, ConceptSection, StepList } from '../../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "What is Time Series Decomposition?" : "Apa itu Decomposition?"}
        description={
          isEn
            ? "Time series decomposition is a technique to separate data into three core components: Trend (T), Seasonal (S), and Residual/Irregular (e). It reveals underlying patterns prior to advanced modeling."
            : "Dekomposisi runtun waktu adalah teknik pemisahan data menjadi tiga komponen: Trend (T), Seasonal (S), dan Residual/Irregular (e). Teknik ini membantu memahami pola dasar yang tersembunyi dalam data sebelum pemodelan lebih lanjut."
        }
        variant="info"
      />
      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use Decomposition" : "Kapan Menggunakan Decomposition",
            icon: HelpCircle,
            items: isEn
              ? [
                  "Data has repeating seasonal patterns (monthly, quarterly, annual)",
                  "Isolating long-term trends from seasonal fluctuations",
                  "Seasonal adjustment before downstream statistical analysis",
                  "Identifying cyclical and irregular components",
                  "Initial visual data exploration",
                ]
              : [
                  "Data memiliki pola musiman yang berulang (bulanan, triwulanan, tahunan)",
                  "Ingin memisahkan tren jangka panjang dari fluktuasi musiman",
                  "Seasonal adjustment sebelum analisis lanjutan",
                  "Identifikasi komponen siklus dan irregular",
                  "Eksplorasi awal data runtun waktu",
                ],
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "Differences between Additive and Multiplicative models",
                  "How to interpret Trend, Seasonal, and Residual plots",
                  "Choosing appropriate model based on data behavior",
                  "Interpreting seasonal factor/indices",
                  "Using decomposition outputs for further forecasting",
                ]
              : [
                  "Perbedaan model Additive dan Multiplicative",
                  "Cara membaca komponen Trend, Seasonal, Residual",
                  "Pemilihan model yang tepat berdasarkan karakteristik data",
                  "Interpretasi seasonal factor/index",
                  "Cara menggunakan output dekomposisi untuk analisis lanjutan",
                ],
          },
        ]}
        columns={2}
      />
      <ConceptSection
        title={isEn ? "Decomposition Models" : "Model Dekomposisi"}
        icon={BarChart2}
        concepts={[
          {
            title: isEn ? "Additive Model" : "Model Additive",
            formula: "Yt = Tt + St + et",
            description: isEn ? "Suitable if seasonal variation amplitude remains constant over time." : "Cocok jika amplitudo variasi musiman konstan sepanjang waktu (tidak bergantung pada level data). Komponen dijumlahkan.",
            color: "blue",
          },
          {
            title: isEn ? "Multiplicative Model" : "Model Multiplicative",
            formula: "Yt = Tt × St × et",
            description: isEn ? "Suitable if seasonal variation scales proportionally with trend level." : "Cocok jika amplitudo variasi musiman meningkat seiring level data (proporsional terhadap tren). Komponen dikalikan.",
            color: "purple",
          },
        ]}
      />
    </div>
  );
};
