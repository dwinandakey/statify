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
        title={isEn ? "What is the Error Correction Model (ECM)?" : "Apa itu Error Correction Model (ECM)?"}
        description={
          isEn
            ? "The Error Correction Model (ECM) is an econometric modeling method to analyze short-run dynamics alongside long-run equilibrium relationships between non-stationary cointegrated time series variables. Statify uses the two-stage Engle-Granger (1987) procedure."
            : "Error Correction Model (ECM) adalah metode pemodelan econometrics untuk menganalisis dinamika jangka pendek sekaligus hubungan keseimbangan jangka panjang antar variabel non-stasioner yang terkointegrasi. Statify menggunakan pendekatan dua tahap Engle-Granger (1987)."
        }
        variant="info"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use ECM" : "Kapan Menggunakan ECM",
            icon: HelpCircle,
            items: isEn
              ? [
                  "All variables are non-stationary at level I(0), but stationary at first difference I(1)",
                  "A long-run cointegration relationship exists (OLS residuals are stationary)",
                  "Measuring speed of adjustment back to equilibrium after short-term shocks",
                  "Analyzing both short-run and long-run impacts of independent variables",
                  "Classic econometric time series modeling",
                ]
              : [
                  "Semua variabel tidak stasioner pada level I(0), namun stasioner pada first difference I(1)",
                  "Terdapat hubungan kointegrasi jangka panjang antar variabel (residual regresi OLS stasioner)",
                  "Ingin mengukur kecepatan penyesuaian (speed of adjustment) ke titik keseimbangan",
                  "Menganalisis dampak jangka pendek dan jangka panjang variabel bebas",
                  "Model econometrics time series klasik",
                ],
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "Engle-Granger 2-stage procedure (Stage 1: Long-Run OLS, Stage 2: Short-Run ECM)",
                  "ADF cointegration test on long-run error terms",
                  "Role and interpretation of Error Correction Term / ECT(-1)",
                  "Diagnostic classical assumption tests on ECM residuals (Jarque-Bera, Breusch-Godfrey, Breusch-Pagan)",
                  "Differences between Engle-Granger ECM and ARDL-ECM",
                ]
              : [
                  "Prosedur 2 tahap Engle-Granger (Tahap 1: Long-Run OLS, Tahap 2: Short-Run ECM)",
                  "Uji kointegrasi ADF pada residual jangka panjang",
                  "Peran dan interpretasi Error Correction Term / ECT(-1)",
                  "Uji asumsi klasik pada residual ECM (Jarque-Bera, Breusch-Godfrey, Breusch-Pagan)",
                  "Perbedaan ECM Engle-Granger dan ARDL-ECM",
                ],
          },
        ]}
        columns={2}
      />

      <ConceptSection
        title={isEn ? "Engle-Granger Two Stages" : "Dua Tahap Engle-Granger"}
        icon={TrendingUp}
        concepts={[
          {
            title: isEn ? "Stage 1: Long-Run OLS Regression" : "Tahap 1: Regresi Jangka Panjang (Long-Run OLS)",
            formula: "Yₜ = β₀ + β₁X₁ₜ + β₂X₂ₜ + ... + βₖXₖₜ + uₜ",
            description: isEn
              ? "Estimates long-run equilibrium equation in levels. Residual uₜ represents deviations from equilibrium."
              : "Mengestimasi persamaan keseimbangan jangka panjang dalam bentuk level. Residual uₜ merepresentasikan deviasi dari keseimbangan.",
            color: "blue",
          },
          {
            title: isEn ? "ADF Cointegration Test" : "Uji Kointegrasi ADF",
            formula: "Δûₜ = γ ûₜ₋₁ + Σ δᵢ Δûₜ₋ᵢ + νₜ",
            description: isEn
              ? "Tests if residual ûₜ is stationary. If p-value < 0.05, variables are cointegrated and ECM proceeds."
              : "Menguji apakah residual ûₜ stasioner. Jika p-value < 0.05, variabel terkointegrasi dan ECM dapat dilanjutkan.",
            color: "purple",
          },
          {
            title: isEn ? "Stage 2: Short-Run Equation (ECM)" : "Tahap 2: Persamaan Jangka Pendek (ECM)",
            formula: "D(Yₜ) = α + δ ECT(-1) + Σ γⱼ D(Xⱼₜ) + εₜ",
            description: isEn
              ? "D(Yₜ) and D(Xⱼₜ) are first differences. ECT(-1) is lag-1 residual from Stage 1."
              : "D(Yₜ) dan D(Xⱼₜ) adalah first-difference. ECT(-1) adalah residual lag-1 dari Tahap 1.",
            color: "orange",
          },
          {
            title: isEn ? "Adjustment Coefficient (δ)" : "Koefisien Adjustmen (δ)",
            formula: "Speed of Adjustment = |δ| × 100%",
            description: isEn
              ? "Must be negative and statistically significant. Represents the percentage of disequilibrium corrected each period."
              : "Harus bernilai negatif dan signifikan secara statistik. Menunjukkan berapa persen ketidakseimbangan yang dikoreksi setiap periode.",
            color: "emerald",
          },
        ]}
      />

      <StepList
        title={isEn ? "Quick Start Guide" : "Panduan Cepat Memulai"}
        icon={Target}
        steps={
          isEn
            ? [
                { number: 1, title: "Ensure I(1) Stationarity", description: "Verify all series are I(1) via Unit Root Test (ADF)." },
                { number: 2, title: "Select Variables", description: "Choose dependent (Y) and independent (X) variables in Statify's ECM dialog." },
                { number: 3, title: "Set Options Parameters", description: "Set max lag for ADF cointegration test and max lag for short-run ECM equation." },
                { number: 4, title: "Evaluate & Interpret", description: "Verify cointegration significance and ensure ECT(-1) is negative and significant (p < 0.05)." },
              ]
            : [
                { number: 1, title: "Pastikan Stasioneritas I(1)", description: "Semua variabel harus terbukti I(1) melalui Unit Root Test (ADF)." },
                { number: 2, title: "Pilih Variabel", description: "Tentukan variabel terikat (Y) dan variabel bebas (X) di dialog ECM Statify." },
                { number: 3, title: "Atur Parameter Options", description: "Tentukan max lag untuk uji ADF kointegrasi dan max lag untuk persamaan ECM." },
                { number: 4, title: "Evaluasi & Interpretasi", description: "Periksa signifikansi kointegrasi, pastikan koefisien ECT(-1) negatif dan signifikan (p < 0.05)." },
              ]
        }
      />
    </div>
  );
};
