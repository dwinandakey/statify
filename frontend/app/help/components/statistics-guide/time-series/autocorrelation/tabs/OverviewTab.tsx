import React from 'react';
import { HelpCircle, BarChart2, BookOpen, Target } from 'lucide-react';
import {
  IntroSection,
  FeatureGrid,
  ConceptSection,
  StepList,
} from '../../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "What is Autocorrelation (ACF & PACF)?" : "Apa itu Autocorrelation (ACF & PACF)?"}
        description={
          isEn
            ? "Autocorrelation measures the strength of relationship between a time series data and its own past values (lags). ACF and PACF are primary tools for identifying AR (p) and MA (q) orders in ARIMA modeling."
            : "Autokorelasi mengukur kekuatan hubungan antara sebuah data runtun waktu dengan nilai dirinya sendiri pada periode sebelumnya (lag). ACF dan PACF adalah alat utama untuk mengidentifikasi orde AR (p) dan MA (q) dalam pemodelan ARIMA."
        }
        variant="info"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use Autocorrelation" : "Kapan Menggunakan Autocorrelation",
            icon: HelpCircle,
            items: isEn
              ? [
                  "Identify AR (p) and MA (q) orders before ARIMA modeling",
                  "Check whether model residuals contain autocorrelation",
                  "Detect seasonal patterns in time series data",
                  "Validate data stationarity",
                  "Analyze temporal dependency structure across observations",
                ]
              : [
                  "Identifikasi orde AR (p) dan MA (q) sebelum pemodelan ARIMA",
                  "Memeriksa apakah residual model mengandung autokorelasi",
                  "Mendeteksi pola musiman dalam data runtun waktu",
                  "Memvalidasi stasioneritas data",
                  "Analisis pola dependensi temporal antar observasi",
                ],
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "How to calculate and interpret ACF plots (correlogram)",
                  "How to read PACF plots for AR order identification",
                  "Interpretation of Bartlett confidence bands",
                  "Using Ljung-Box test statistic for white noise checking",
                  "Differences between ACF and PACF",
                ]
              : [
                  "Cara menghitung dan membaca grafik ACF (correlogram)",
                  "Cara membaca PACF untuk identifikasi orde AR",
                  "Interpretasi batas Bartlett (confidence band)",
                  "Penggunaan statistik Ljung-Box untuk uji white noise",
                  "Perbedaan antara ACF dan PACF",
                ],
          },
        ]}
        columns={2}
      />

      <ConceptSection
        title={isEn ? "Core Concepts" : "Konsep Utama"}
        icon={BarChart2}
        concepts={[
          {
            title: isEn ? "Autocorrelation (ACF)" : "Autokorelasi (ACF)",
            formula: "rk = Σ(Yt - Ȳ)(Yt+k - Ȳ) / Σ(Yt - Ȳ)²",
            description: isEn
              ? "Measures correlation between data at period t and data at period t+k (lag k). Values range between -1 and 1."
              : "Mengukur korelasi antara data periode t dan data periode t+k (lag ke-k). Nilai rk berkisar antara -1 dan 1.",
            color: "blue",
          },
          {
            title: isEn ? "Partial Autocorrelation (PACF)" : "Autokorelasi Parsial (PACF)",
            formula: "ϕ̂kk = correlation between Yt and Yt-k controlling for Yt-1,...,Yt-k+1",
            description: isEn
              ? "Measures direct correlation between data and its lag, removing effects of intermediate lags. Useful for AR order identification."
              : "Mengukur korelasi langsung antara data dan lagnya, menghilangkan pengaruh lag perantara. Berguna untuk menentukan orde AR.",
            color: "purple",
          },
        ]}
      />

      <StepList
        title={isEn ? "Quick Start Guide" : "Panduan Cepat Memulai"}
        icon={Target}
        steps={
          isEn
            ? [
                { number: 1, title: "Select Variable", description: "Select one numeric time series variable." },
                { number: 2, title: "Set Lag Count", description: "Set max lag count (default: n/4)." },
                { number: 3, title: "Read ACF Plot", description: "Observe lags exceeding Bartlett bands." },
                { number: 4, title: "Read PACF Plot", description: "Check lag p where PACF cuts off." },
              ]
            : [
                { number: 1, title: "Pilih Variabel", description: "Pilih satu variabel runtun waktu numerik." },
                { number: 2, title: "Tentukan Jumlah Lag", description: "Atur jumlah lag maksimum (default n/4)." },
                { number: 3, title: "Baca Grafik ACF", description: "Perhatikan lag yang melewati batas Bartlett." },
                { number: 4, title: "Baca Grafik PACF", description: "PACF memotong tajam setelah lag ke-p." },
              ]
        }
      />
    </div>
  );
};
