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
        title={isEn ? "What is the Box-Jenkins Model (ARIMA)?" : "Apa itu Box-Jenkins Model (ARIMA)?"}
        description={
          isEn
            ? "The ARIMA (Auto-Regressive Integrated Moving Average) model is a time series forecasting framework developed by Box and Jenkins (1976). It combines AR, differencing (I), and MA components to model patterns in stationary data."
            : "Model ARIMA (Auto-Regressive Integrated Moving Average) adalah kerangka pemodelan runtun waktu yang dikembangkan oleh Box dan Jenkins (1976). Model ini menggabungkan komponen AR, differencing (I), dan MA untuk memodelkan pola dalam data stasioner."
        }
        variant="info"
      />
      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use ARIMA" : "Kapan Menggunakan ARIMA",
            icon: HelpCircle,
            items: isEn
              ? [
                  "Univariate time series forecasting",
                  "Data that is stationary or rendered stationary via differencing",
                  "Identifying underlying AR and MA lag structures",
                  "Benchmark model for forecasting accuracy comparison",
                  "Economic, financial, and industrial time series",
                ]
              : [
                  "Peramalan (forecasting) data runtun waktu univariat",
                  "Data yang sudah atau dapat dibuat stasioner melalui differencing",
                  "Mengidentifikasi pola AR dan MA dalam data",
                  "Sebagai model benchmark dalam perbandingan model peramalan",
                  "Data ekonomi, keuangan, dan industri",
                ],
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "Determining order p (AR), d (differencing), and q (MA)",
                  "Interpretation of AR and MA coefficients",
                  "Selecting the best model using AIC, BIC, HQC",
                  "Performing forecasts and evaluating accuracy metrics",
                  "Diagnostic residual checking for model adequacy",
                ]
              : [
                  "Cara menentukan orde p (AR), d (differencing), q (MA)",
                  "Interpretasi koefisien AR dan MA",
                  "Pemilihan model terbaik menggunakan AIC, BIC, HQC",
                  "Cara melakukan forecasting dan evaluasi akurasi",
                  "Diagnosis residual untuk validasi model",
                ],
          },
        ]}
        columns={2}
      />
      <ConceptSection
        title={isEn ? "ARIMA(p,d,q) Model Components" : "Komponen Model ARIMA(p,d,q)"}
        icon={TrendingUp}
        concepts={[
          {
            title: isEn ? "AR (Autoregressive) — order p" : "AR (Autoregressive) — orde p",
            formula: "Yt = μ + Σ φi Yt-i + εt,  i=1..p",
            description: isEn
              ? "Regresses current values against past values. ACF decays gradually, PACF cuts off after lag p."
              : "Meregresikan nilai saat ini terhadap nilai masa lalu. ACF menurun bertahap, PACF cut-off setelah lag p.",
            color: "blue",
          },
          {
            title: isEn ? "I (Integrated) — order d" : "I (Integrated) — orde d",
            formula: "Δᵈ Yt = Yt - Yt-1  (for d=1)",
            description: isEn
              ? "Number of differencing operations required to make series stationary."
              : "Jumlah operasi differencing untuk membuat data stasioner. d=1 berarti first difference, d=2 second difference.",
            color: "purple",
          },
          {
            title: isEn ? "MA (Moving Average) — order q" : "MA (Moving Average) — orde q",
            formula: "Yt = μ - Σ θi εt-i + εt,  i=1..q",
            description: isEn
              ? "Regresses current values against past forecast residuals. ACF cuts off after lag q, PACF decays gradually."
              : "Meregresikan nilai saat ini terhadap residual masa lalu. ACF cut-off setelah lag q, PACF menurun bertahap.",
            color: "orange",
          },
        ]}
      />
      <StepList
        title={isEn ? "Quick Guide" : "Panduan Cepat"}
        icon={Target}
        steps={
          isEn
            ? [
                { number: 1, title: "Test Stationarity", description: "Run Unit Root Test (ADF). If non-stationary, determine differencing order d." },
                { number: 2, title: "Identify p & q", description: "Examine ACF and PACF plots to identify AR order (p) and MA order (q)." },
                { number: 3, title: "Estimate Model", description: "Enter variable and p, d, q orders in ARIMA dialog." },
                { number: 4, title: "Validate & Forecast", description: "Check AIC/BIC, coefficient sign, residual ACF. Generate forecasts." },
              ]
            : [
                { number: 1, title: "Uji Stasioneritas", description: "Jalankan Unit Root Test (ADF). Jika tidak stasioner, tentukan orde d (differencing)." },
                { number: 2, title: "Identifikasi p dan q", description: "Periksa grafik ACF dan PACF untuk menentukan orde AR (p) dan MA (q)." },
                { number: 3, title: "Estimasi Model", description: "Masukkan variabel dan orde p, d, q di dialog ARIMA. Klik OK untuk estimasi." },
                { number: 4, title: "Validasi & Forecast", description: "Cek AIC/BIC, uji koefisien, ACF residual. Jika valid, gunakan model untuk forecasting." },
              ]
        }
      />
    </div>
  );
};
