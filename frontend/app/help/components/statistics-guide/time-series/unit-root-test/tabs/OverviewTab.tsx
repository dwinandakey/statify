import React from 'react';
import { HelpCircle, BookOpen, TrendingDown, Target } from 'lucide-react';
import { IntroSection, FeatureGrid, ConceptSection, StepList } from '../../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "What is a Unit Root Test?" : "Apa itu Unit Root Test?"}
        description={
          isEn
            ? "The Unit Root Test checks the stationarity of time series data. Data must be stationary prior to ARIMA, ECM, or ARDL modeling. Statify implements Dickey-Fuller (DF) and Augmented Dickey-Fuller (ADF) tests."
            : "Uji Unit Root digunakan untuk memeriksa stasioneritas data runtun waktu. Data harus stasioner sebelum dilakukan pemodelan ARIMA, ECM, atau ARDL. Statify mengimplementasikan uji Dickey-Fuller (DF) dan Augmented Dickey-Fuller (ADF)."
        }
        variant="info"
      />
      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use Unit Root Test" : "Kapan Menggunakan Unit Root Test",
            icon: HelpCircle,
            items: isEn
              ? [
                  "Before ARIMA modeling to verify stationarity",
                  "Prerequisite check for cointegration analysis (ECM, ARDL)",
                  "Determining if differencing is needed",
                  "Choosing proper specification (none, drift, trend)",
                  "Re-testing stationarity after differencing",
                ]
              : [
                  "Sebelum pemodelan ARIMA untuk memastikan stasioneritas",
                  "Sebagai prasyarat analisis kointegrasi (ECM, ARDL)",
                  "Menentukan apakah data perlu di-differencing",
                  "Memilih bentuk persamaan yang tepat (tanpa konstanta, dengan konstanta, dengan tren)",
                  "Setelah differencing untuk memverifikasi stasioneritas",
                ],
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "Differences between DF and ADF and when to use each",
                  "Equation specification (none, drift, trend)",
                  "Interpretation of tau (τ) statistic and p-value",
                  "Determining optimal lag order in ADF",
                  "Follow-up actions if series is non-stationary",
                ]
              : [
                  "Perbedaan DF dan ADF serta kapan menggunakannya",
                  "Pemilihan bentuk persamaan (none, drift, trend)",
                  "Interpretasi statistik tau (τ) dan p-value",
                  "Penentuan jumlah lag optimal pada ADF",
                  "Langkah tindak lanjut jika data tidak stasioner",
                ],
          },
        ]}
        columns={2}
      />
      <ConceptSection
        title={isEn ? "Test Specifications" : "Bentuk Pengujian"}
        icon={TrendingDown}
        concepts={[
          {
            title: isEn ? "Equation Without Constant (None)" : "Persamaan Tanpa Konstanta (None)",
            formula: "Δyt = γ yt-1 + εt",
            description: isEn ? "Simplest form without intercept or trend." : "Paling sederhana, tanpa intercept dan trend. Jarang digunakan dalam praktik kecuali ada alasan teoritis kuat.",
            color: "blue",
          },
          {
            title: isEn ? "Equation With Constant (Drift)" : "Persamaan Dengan Konstanta (Drift)",
            formula: "Δyt = a₀ + γ yt-1 + εt",
            description: isEn ? "Most commonly used. Suitable for data fluctuating around a non-zero mean." : "Paling umum digunakan. Cocok untuk data yang berfluktuasi di sekitar suatu nilai rata-rata non-nol.",
            color: "purple",
          },
          {
            title: isEn ? "Equation With Time Trend (Trend)" : "Persamaan Dengan Tren Waktu (Trend)",
            formula: "Δyt = a₀ + γ yt-1 + a₂t + εt",
            description: isEn ? "Used if data exhibits a deterministic linear trend over time." : "Digunakan jika data menunjukkan tren deterministik (naik atau turun secara linear seiring waktu).",
            color: "orange",
          },
          {
            title: isEn ? "ADF: Additional Lagged Differences" : "ADF: Tambahan Lag Differencing",
            formula: "Δyt = a₀ + γ yt-1 + Σ βi Δyt-i + εt",
            description: isEn ? "ADF adds lags of Δyt to correct for residual autocorrelation." : "ADF menambahkan lag dari Δyt untuk mengoreksi autokorelasi residual. Jumlah lag (p) dipilih menggunakan AIC/BIC.",
            color: "emerald",
          },
        ]}
      />
      <StepList
        title={isEn ? "Quick Guide" : "Panduan Cepat"}
        icon={Target}
        steps={
          isEn
            ? [
                { number: 1, title: "Select Variable", description: "Select one numeric time series variable to test stationarity." },
                { number: 2, title: "Choose Equation Specification", description: "Select none, constant, or trend based on data behavior." },
                { number: 3, title: "Set Lag Order", description: "Set max lag order for ADF (default: 0 for DF, >0 for ADF)." },
                { number: 4, title: "Interpret Output", description: "Compare τ statistic with critical values or check p-value (< 0.05 → stationary)." },
              ]
            : [
                { number: 1, title: "Pilih Variabel", description: "Pilih satu variabel numerik runtun waktu untuk diuji stasioneritas-nya." },
                { number: 2, title: "Pilih Bentuk Persamaan", description: "Tentukan apakah persamaan menggunakan konstanta saja atau dengan tren waktu berdasarkan karakteristik data." },
                { number: 3, title: "Tentukan Jumlah Lag", description: "Untuk ADF, tentukan jumlah lag maksimum (default: 0 untuk DF biasa, >0 untuk ADF)." },
                { number: 4, title: "Interpretasi Hasil", description: "Bandingkan statistik τ dengan nilai kritis atau perhatikan p-value. p < 0.05 → stasioner (tolak H₀)." },
              ]
        }
      />
    </div>
  );
};
