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
        title={isEn ? "What is ARDL?" : "Apa itu ARDL?"}
        description={
          isEn
            ? "The ARDL (Auto-Regressive Distributed Lag) model is an approach to analyze long-run and short-run relationships between time series variables. Statify implements a two-stage procedure: long-run OLS regression and short-run ARDL-ECM equation."
            : "Model ARDL (Auto-Regressive Distributed Lag) adalah pendekatan untuk menganalisis hubungan jangka panjang dan jangka pendek antara variabel runtun waktu. Statify mengimplementasikan dua tahap: regresi jangka panjang OLS dan persamaan jangka pendek ARDL-ECM."
        }
        variant="info"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use ARDL" : "Kapan Menggunakan ARDL",
            icon: HelpCircle,
            items: isEn
              ? [
                  "Variables have mixed integration orders I(0) and I(1)",
                  "Testing cointegration using the Bounds Testing approach",
                  "Analyzing both short-run and long-run effects of independent variables",
                  "Macroeconomic data modeling (GDP, inflation, exchange rates)",
                  "Relatively small sample sizes (ARDL performs better than VAR)",
                ]
              : [
                  "Data memiliki campuran integrasi I(0) dan I(1)",
                  "Ingin menguji kointegrasi dengan pendekatan Bounds Testing",
                  "Menganalisis dampak jangka pendek dan jangka panjang variabel bebas",
                  "Data ekonomi makro (GDP, inflasi, nilai tukar)",
                  "Ukuran sampel relatif kecil (ARDL lebih baik dari VAR)",
                ],
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "Selecting lag order p (dependent Y) and q (independent X)",
                  "Interpreting long-run elasticity coefficients from Long-Run Equation",
                  "Reading ADF cointegration test results on long-run residuals",
                  "Interpreting ECT(-1) and speed of adjustment",
                  "Diagnostic classical assumption tests on ECM residuals",
                ]
              : [
                  "Cara menentukan orde p (lag Y) dan q (lag X)",
                  "Interpretasi koefisien jangka panjang dari Long-Run Equation",
                  "Pembacaan hasil uji kointegrasi ADF pada residual",
                  "Interpretasi ECT(-1) dan speed of adjustment",
                  "Uji asumsi klasik pada residual ECM",
                ],
          },
        ]}
        columns={2}
      />

      <ConceptSection
        title={isEn ? "ARDL Analysis Stages" : "Tahapan Analisis ARDL"}
        icon={TrendingUp}
        concepts={[
          {
            title: isEn ? "Stage 1: Long-Run Equation (OLS)" : "Tahap 1: Long-Run Equation (OLS)",
            formula: "Yₜ = β₀ + β₁X₁ₜ + ... + βₖXₖₜ + uₜ",
            description: isEn
              ? "Estimates long-run equilibrium relationships using OLS. Coefficients indicate long-run elasticity."
              : "Estimasi hubungan keseimbangan jangka panjang menggunakan OLS. Koefisien menunjukkan elastisitas jangka panjang.",
            color: "blue",
          },
          {
            title: isEn ? "Stage 2: Cointegration Test" : "Tahap 2: Uji Kointegrasi",
            formula: isEn ? "ADF on residual uₜ — H₀: unit root present (no cointegration)" : "ADF pada residual uₜ — H₀: ada unit root (tidak kointegrasi)",
            description: isEn
              ? "If residual is stationary (p-value < 0.05), variables are cointegrated → valid long-run relationship exists."
              : "Jika residual stasioner (p-value < 0.05), variabel terkointegrasi → ada hubungan jangka panjang yang valid.",
            color: "purple",
          },
          {
            title: isEn ? "Stage 3: Short-Run ARDL-ECM" : "Tahap 3: ARDL-ECM Jangka Pendek",
            formula: "D(Yₜ) = α + δ ECT(-1) + Σ φᵢ D(Yₜ₋ᵢ) + Σ γⱼₗ D(Xⱼₜ₋ₗ) + εₜ",
            description: isEn
              ? "Estimates short-run adjustment dynamics. ECT(-1) is lag-1 long-run residual. δ must be negative and statistically significant."
              : "Estimasi dinamika penyesuaian jangka pendek. ECT(-1) = residual jangka panjang lag-1. δ harus negatif dan signifikan.",
            color: "orange",
          },
          {
            title: isEn ? "Speed of Adjustment (δ)" : "Kecepatan Penyesuaian (δ)",
            formula: "Speed of Adjustment = |δ| × 100%",
            description: isEn
              ? "If δ = -0.3: 30% of deviation from long-run equilibrium is corrected each period."
              : "Jika δ = -0.3: 30% deviasi dari keseimbangan jangka panjang terkoreksi setiap periode. Harus negatif dan signifikan.",
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
                { number: 1, title: "Unit Root Testing", description: "Run ADF on all variables. ARDL is suitable for I(0) and I(1) mixtures — no I(2) variables allowed." },
                { number: 2, title: "Input Variables & Orders", description: "Select Y (dependent), X (independent), set order p (lag Y) and q for each X." },
                { number: 3, title: "Check Cointegration", description: "Check ADF p-value on long-run residuals. p < 0.05 → cointegration exists → ECM is valid." },
                { number: 4, title: "Interpret ECT(-1)", description: "Ensure ECT(-1) coefficient is negative and statistically significant." },
              ]
            : [
                { number: 1, title: "Uji Unit Root", description: "Jalankan ADF pada semua variabel. ARDL cocok jika campuran I(0) dan I(1) — tidak boleh ada yang I(2)." },
                { number: 2, title: "Input Variabel & Orde", description: "Pilih Y (dependen), X (independen), tentukan orde p (lag Y) dan q tiap X." },
                { number: 3, title: "Periksa Kointegrasi", description: "Lihat p-value ADF pada residual jangka panjang. p < 0.05 → ada kointegrasi → ECM valid." },
                { number: 4, title: "Interpretasi ECT", description: "Pastikan koefisien ECT(-1) negatif dan signifikan. Ini adalah validasi utama ECM." },
              ]
        }
      />
    </div>
  );
};
