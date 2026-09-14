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
        title={isEn ? "What are Heteroscedasticity Models?" : "Apa itu Heteroscedasticity Models?"}
        description={
          isEn
            ? "Heteroscedasticity models are used to model time series data with time-varying variance — a phenomenon known as volatility clustering. ARCH/GARCH family models are standard approaches for capturing this behavior, especially in financial data."
            : "Model heteroskedastisitas digunakan untuk memodelkan data runtun waktu yang memiliki variansi bervariasi sepanjang waktu — fenomena yang disebut volatility clustering. Model keluarga ARCH/GARCH adalah pendekatan standar untuk menangkap pola ini, terutama pada data keuangan."
        }
        variant="info"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use These Models" : "Kapan Menggunakan Model Ini",
            icon: HelpCircle,
            items: isEn
              ? [
                  "Data exhibits clustered periods of high and low volatility",
                  "ARCH-LM test shows significant ARCH effects in residuals",
                  "Asset return series, exchange rates, or stock market indices",
                  "Residuals from ARIMA models exhibit heteroscedasticity",
                  "Need to estimate conditional variance over time",
                ]
              : [
                  "Data memiliki periode volatilitas tinggi dan rendah yang berklaster",
                  "Uji ARCH-LM menunjukkan efek ARCH signifikan",
                  "Data return harga aset, nilai tukar, atau indeks saham",
                  "Residual dari model ARIMA menunjukkan heteroskedastisitas",
                  "Perlu mengestimasi variansi kondisional dari waktu ke waktu",
                ],
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "Differences between ARCH, GARCH, EGARCH, TGARCH, and IGARCH",
                  "How to select GARCH (p) and ARCH (q) lag orders",
                  "Interpretation of Mean Equation and Variance Equation",
                  "Reading coefficient outputs and model evaluation metrics",
                  "When to use asymmetric models (EGARCH / TGARCH)",
                ]
              : [
                  "Perbedaan model ARCH, GARCH, EGARCH, TGARCH, IGARCH",
                  "Cara memilih orde p (GARCH) dan q (ARCH)",
                  "Interpretasi Mean Equation dan Variance Equation",
                  "Membaca output koefisien dan statistik evaluasi",
                  "Kapan menggunakan model asimetris (EGARCH/TGARCH)",
                ],
          },
        ]}
        columns={2}
      />

      <ConceptSection
        title={isEn ? "Available Specifications" : "Model yang Tersedia"}
        icon={BarChart2}
        concepts={[
          {
            title: "ARCH(q)",
            formula: "σₜ² = ω + Σ αi εₜ₋ᵢ²,  i=1..q",
            description: isEn
              ? "Base model introduced by Engle (1982). Conditional variance depends on lagged squared residuals. Suitable for short-term volatility."
              : "Model dasar oleh Engle (1982). Variansi kondisional bergantung pada kuadrat residual masa lalu. Cocok untuk volatilitas jangka pendek.",
            color: "blue",
          },
          {
            title: "GARCH(p,q)",
            formula: "σₜ² = ω + Σ αi εₜ₋ᵢ² + Σ βj σₜ₋ⱼ²",
            description: isEn
              ? "Generalized ARCH by Bollerslev (1986). Adds lags of conditional variance itself. Parsimonious representation; GARCH(1,1) is widely used."
              : "Generalisasi ARCH oleh Bollerslev (1986). Menambahkan lag variansi kondisional itu sendiri. Lebih parsimonious. GARCH(1,1) paling umum digunakan.",
            color: "purple",
          },
          {
            title: "EGARCH (Exponential GARCH)",
            formula: "ln(σₜ²) = ω + Σ αi|εt-i/σt-i| + Σ γi(εt-i/σt-i) + Σ βj ln(σt-j²)",
            description: isEn
              ? "Nelson (1991). Captures leverage effects where negative shocks impact volatility differently than positive shocks. No non-negativity constraints required."
              : "Nelson (1991). Menangkap leverage effect — guncangan negatif memiliki dampak berbeda dari guncangan positif. Tidak perlu kendala non-negatif.",
            color: "orange",
          },
          {
            title: "TGARCH / GJR-GARCH",
            formula: "σₜ² = ω + Σ [αi εt-i² + γi εt-i² I(εt-i<0)] + Σ βj σt-j²",
            description: isEn
              ? "Captures asymmetry with an indicator for negative residuals. γ > 0 indicates bad news increases volatility more than good news."
              : "Menangkap asimetri dengan indikator residual negatif. γ > 0 → bad news meningkatkan volatilitas lebih besar dari good news.",
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
                { number: 1, title: "Test ARCH Effects First", description: "Run Homoscedasticity Test (ARCH-LM) on residuals. If p-value < 0.05, proceed to GARCH modeling." },
                { number: 2, title: "Choose Model Type", description: "Start with GARCH(1,1). If volatility asymmetry is suspected, try EGARCH or TGARCH." },
                { number: 3, title: "Estimate & Evaluate", description: "Compare AIC/BIC across model specifications. Select the specification with lowest AIC." },
                { number: 4, title: "Model Validation", description: "Check Q-statistics on standardized squared residuals to verify no remaining ARCH effects." },
              ]
            : [
                { number: 1, title: "Cek Efek ARCH Dulu", description: "Jalankan Homoscedasticity Test (ARCH-LM) pada residual. Jika p-value < 0.05, lanjutkan ke model GARCH." },
                { number: 2, title: "Pilih Model", description: "GARCH(1,1) sebagai titik awal. Jika ada asimetri volatilitas, coba EGARCH atau TGARCH." },
                { number: 3, title: "Estimasi & Evaluasi", description: "Bandingkan AIC/BIC antar spesifikasi. Pilih model dengan AIC terkecil." },
                { number: 4, title: "Validasi", description: "Cek Q-statistic pada squared residuals standarisasi. Harusnya tidak ada ARCH effect yang tersisa." },
              ]
        }
      />
    </div>
  );
};
