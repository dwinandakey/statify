import React from 'react';
import { HelpCircle, BookOpen, TrendingUp, Target } from 'lucide-react';
import { IntroSection, FeatureGrid, ConceptSection, StepList } from '../../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "What is Time Series Smoothing?" : "Apa itu Smoothing?"}
        description={
          isEn
            ? "Smoothing is a technique to reduce noise and short-term fluctuations in time series data, highlighting underlying trends and seasonal patterns. Statify supports Simple Moving Average, Simple Exponential Smoothing (SES), Holt's Linear, and Holt-Winters."
            : "Pemulusan (smoothing) adalah teknik untuk mengurangi noise dan fluktuasi jangka pendek dalam data runtun waktu sehingga pola tren dan musiman lebih terlihat. Statify mendukung Simple Moving Average, Exponential Smoothing (SES), Double Exponential (Holt's), dan Triple Exponential (Holt-Winters)."
        }
        variant="info"
      />
      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use Smoothing" : "Kapan Menggunakan Smoothing",
            icon: HelpCircle,
            items: isEn
              ? [
                  "Reducing noise in historical data",
                  "Highlighting long-term trend behavior",
                  "Simple short-term forecasting",
                  "Data preparation prior to decomposition",
                  "Series lacking complex ARIMA lag structures",
                ]
              : [
                  "Mengurangi noise dari data historis",
                  "Memperjelas pola tren jangka panjang",
                  "Peramalan jangka pendek yang sederhana",
                  "Persiapan data sebelum dekomposisi",
                  "Data tidak memiliki pola musiman kompleks",
                ],
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "Differences among available smoothing methods",
                  "Selecting alpha, beta, gamma parameters",
                  "Interpreting smoothed curves and forecast plots",
                  "Evaluating accuracy using MSE, MAE, MAPE",
                  "When to use simple vs complex exponential models",
                ]
              : [
                  "Perbedaan metode smoothing yang tersedia",
                  "Cara memilih parameter alpha, beta, gamma",
                  "Interpretasi hasil pemulusan dan forecasting",
                  "Evaluasi akurasi menggunakan MSE, MAE, MAPE",
                  "Kapan menggunakan metode sederhana vs kompleks",
                ],
          },
        ]}
        columns={2}
      />
      <ConceptSection
        title={isEn ? "Smoothing Methods" : "Metode Smoothing"}
        icon={TrendingUp}
        concepts={[
          {
            title: "Simple Moving Average (SMA)",
            formula: "SMAt = (1/k) × Σ Yt-i,  i=0..k-1",
            description: isEn ? "Averaging last k periods. Equal weight assigned." : "Rata-rata dari k nilai terakhir. Sederhana namun reaktif terhadap perubahan. Cocok untuk data stasioner tanpa tren.",
            color: "blue",
          },
          {
            title: "Simple Exponential Smoothing (SES)",
            formula: "St = α Yt + (1-α) St-1,  0 < α ≤ 1",
            description: isEn ? "Assigns exponentially decreasing weights to older observations." : "Memberikan bobot lebih besar pada data terbaru. Parameter α mengontrol kecepatan pemulusan.",
            color: "purple",
          },
        ]}
      />
    </div>
  );
};
