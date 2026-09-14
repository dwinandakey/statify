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
        title={isEn ? "What is the Homoscedasticity Test (ARCH-LM)?" : "Apa itu Homoscedasticity Test (ARCH-LM)?"}
        description={
          isEn
            ? "The ARCH-LM (Lagrange Multiplier) test is used to detect the presence of ARCH (Autoregressive Conditional Heteroscedasticity) effects in the residuals of a time series model. If ARCH effects are found, GARCH modeling is recommended."
            : "Uji ARCH-LM (Lagrange Multiplier) digunakan untuk mendeteksi ada tidaknya efek ARCH (Autoregressive Conditional Heteroscedasticity) pada residual suatu model runtun waktu. Jika efek ARCH ditemukan, model GARCH perlu digunakan."
        }
        variant="info"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use This Test" : "Kapan Menggunakan Uji Ini",
            icon: HelpCircle,
            items: isEn
              ? [
                  "Post-estimation of ARIMA models, before concluding residual adequacy",
                  "To verify residual homoscedasticity assumption",
                  "As a diagnostic prerequisite before opting for GARCH modeling",
                  "Residual validation for any univariate time series model",
                  "Formally detecting volatility clustering in error terms",
                ]
              : [
                  "Setelah estimasi ARIMA, sebelum menyimpulkan model sudah cukup",
                  "Untuk memastikan residual bersifat homoskedastik",
                  "Sebagai prasyarat sebelum memutuskan menggunakan GARCH",
                  "Validasi asumsi residual pada model runtun waktu apapun",
                  "Mendeteksi klasterisasi volatilitas secara formal",
                ],
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "ARCH-LM test hypotheses and decision rules",
                  "How to select appropriate lag order for auxiliary regression",
                  "Interpretation of F-statistic and Chi-Square (Obs×R²) test statistics",
                  "Distinction between homoscedastic and heteroscedastic residuals",
                  "Next steps when ARCH effects are detected",
                ]
              : [
                  "Hipotesis uji ARCH-LM dan keputusannya",
                  "Cara memilih jumlah lag yang tepat",
                  "Interpretasi statistik F dan Chi-Square (Obs×R²)",
                  "Perbedaan homoskedastik dan heteroskedastik",
                  "Tindak lanjut jika efek ARCH ditemukan",
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
            title: isEn ? "Test Hypotheses" : "Hipotesis Uji",
            formula: isEn
              ? "H₀: No ARCH effects (residuals are homoscedastic)\nH₁: ARCH effects present (residuals are heteroscedastic)"
              : "H₀: Tidak ada efek ARCH (residual homoskedastik)\nH₁: Ada efek ARCH (residual heteroskedastik)",
            description: isEn
              ? "If H₀ is rejected (p-value < 0.05), residuals possess time-varying conditional variance → use GARCH models."
              : "Jika H₀ ditolak (p-value < 0.05), residual memiliki volatilitas kondisional yang berubah sepanjang waktu → gunakan model GARCH.",
            color: "blue",
          },
          {
            title: isEn ? "F-Statistic" : "Statistik F",
            formula: "F = (R²/m) / ((1−R²)/(n−2m−1))",
            description: isEn
              ? "F-test from auxiliary regression of squared residuals on lagged values. Follows F(m, n−2m−1)."
              : "Uji F dari regresi bantu residual kuadrat terhadap lag-lagnya. Distribusi F(m, n−2m−1).",
            color: "purple",
          },
          {
            title: isEn ? "LM Statistic (Obs×R²)" : "Statistik LM (Obs×R²)",
            formula: "LM = n × R²  ~  χ²(m)",
            description: isEn
              ? "Lagrange Multiplier test statistic. Distributed as chi-square with degrees of freedom equal to lag order (m)."
              : "Statistik Lagrange Multiplier. Distribusi chi-square dengan derajat kebebasan = jumlah lag (m).",
            color: "orange",
          },
          {
            title: isEn ? "Decision Rule" : "Keputusan Uji",
            formula: isEn ? "Reject H₀ if p-value < 0.05" : "Tolak H₀ jika p-value < 0.05",
            description: isEn
              ? "p-value < 0.05: ARCH effect present → use GARCH. p-value ≥ 0.05: Residuals are homoscedastic → model is adequate."
              : "p-value < 0.05: Ada efek ARCH → gunakan GARCH. p-value ≥ 0.05: Residual homoskedastik → model sudah cukup.",
            color: "emerald",
          },
        ]}
      />

      <StepList
        title={isEn ? "Quick Start Guide" : "Panduan Cepat"}
        icon={Target}
        steps={
          isEn
            ? [
                { number: 1, title: "Save Model Residuals", description: "Ensure you have saved model residuals from ARIMA or regression to a new variable (e.g. RES_1)." },
                { number: 2, title: "Open ARCH-LM Dialog", description: "Click Analyze → Time Series → Homoscedasticity Test." },
                { number: 3, title: "Select Residuals & Lags", description: "Select the saved residual variable. Set lag order (default: 1–4)." },
                { number: 4, title: "Interpret Results", description: "If F or LM statistic p-value < 0.05, proceed to GARCH modeling." },
              ]
            : [
                { number: 1, title: "Simpan Residual Model", description: "Pastikan Anda sudah menyimpan residual dari model ARIMA atau regresi ke variabel baru (misal RES_1)." },
                { number: 2, title: "Buka Dialog ARCH-LM", description: "Klik Analyze → Time Series → Homoscedasticity Test." },
                { number: 3, title: "Pilih Residual & Lag", description: "Pilih variabel residual yang tersimpan. Atur jumlah lag (default: 1–4)." },
                { number: 4, title: "Interpretasi", description: "Jika p-value statistik F atau LM < 0.05, lanjutkan ke model GARCH untuk memodelkan volatilitas." },
              ]
        }
      />
    </div>
  );
};
