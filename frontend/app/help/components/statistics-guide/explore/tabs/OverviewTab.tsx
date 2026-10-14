import React from 'react';
import { Search, HelpCircle, BookOpen, Target } from 'lucide-react';
import {
  IntroSection,
  FeatureGrid,
  ConceptSection,
  StepList
} from '../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "What Is Explore Analysis?" : "Apa itu Analisis Explore?"}
        description={isEn
          ? "Explore analysis is a data exploration method that gives a comprehensive picture of the data distribution using a robust approach. Unlike ordinary descriptive statistics, it focuses on identifying characteristics of the data that are not affected by outliers."
          : "Analisis Explore adalah metode eksplorasi data yang memberikan gambaran komprehensif tentang distribusi data dengan pendekatan robust. Berbeda dari statistik deskriptif biasa, analisis ini fokus pada identifikasi karakteristik data yang tidak terpengaruh oleh outlier."}
        variant="info"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use Explore Analysis" : "Kapan Menggunakan Analisis Explore",
            icon: HelpCircle,
            items: isEn
              ? [
                  "Initial data exploration before further analysis",
                  "Identifying outliers and extreme values",
                  "Understanding data distributions that may not be normal",
                  "Comparing data characteristics across groups",
                  "Validating assumptions before statistical testing",
                  "Analyzing data that may contain many extreme values"
                ]
              : [
                  "Data exploration awal sebelum analisis lebih lanjut",
                  "Mengidentifikasi outlier dan extreme values",
                  "Memahami distribusi data yang mungkin tidak normal",
                  "Perbandingan karakteristik data antar kelompok",
                  "Validasi asumsi sebelum statistical testing",
                  "Analisis data dengan potensi nilai ekstrem tinggi"
                ]
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "How to choose dependent and factor variables",
                  "Setting up robust statistics and outlier detection",
                  "Interpreting boxplots and histograms",
                  "By-group analysis strategies",
                  "Best practices for exploratory data analysis",
                  "Understanding confidence intervals for robust measures"
                ]
              : [
                  "Cara memilih variabel dependent dan factor",
                  "Pengaturan robust statistics dan outlier detection",
                  "Interpretasi boxplots dan histogram",
                  "Strategi by-group analysis",
                  "Best practices untuk exploratory data analysis",
                  "Pemahaman confidence intervals untuk robust measures"
                ]
          }
        ]}
        columns={2}
      />

      <ConceptSection
        title={isEn ? "Basic Concepts You Will Learn" : "Konsep Dasar yang Akan Dipelajari"}
        icon={Search}
        concepts={[
          {
            title: "Robust Statistics",
            formula: isEn ? "Statistics that are resistant to outliers" : "Statistik yang tahan terhadap outlier",
            description: isEn
              ? "Calculation methods that give stable results even when the data contains extreme values."
              : "Metode perhitungan yang memberikan hasil yang stabil meskipun ada nilai ekstrem dalam data.",
            color: "blue"
          },
          {
            title: "Outlier Detection",
            formula: isEn ? "Systematic identification of extreme values" : "Identifikasi sistematis nilai ekstrem",
            description: isEn
              ? "Systematic identification of unusual or extreme values in the dataset."
              : "Identifikasi sistematis nilai-nilai yang tidak biasa atau ekstrem dalam dataset.",
            color: "purple"
          },
          {
            title: "By-Group Analysis",
            formula: isEn ? "Separate analysis for each category level" : "Analisis terpisah untuk setiap level kategori",
            description: isEn
              ? "A separate analysis for each category level, allowing comparisons between groups."
              : "Analisis terpisah untuk setiap level kategori, memungkinkan perbandingan antar kelompok.",
            color: "emerald"
          },
          {
            title: "Distribution Assessment",
            formula: isEn ? "Shape, spread, and center evaluation" : "Evaluasi bentuk, sebaran, dan pusat",
            description: isEn
              ? "A thorough evaluation of the shape, spread, and center of the data distribution."
              : "Evaluasi menyeluruh tentang bentuk, penyebaran, dan pusat distribusi data.",
            color: "orange"
          }
        ]}
      />

      <StepList
        title={isEn ? "Quick Start Guide" : "Panduan Cepat Memulai"}
        icon={Target}
        steps={[
          {
            number: 1,
            title: isEn ? "Prepare the Data" : "Persiapan Data",
            description: isEn
              ? "Make sure the data has at least one numeric variable. A factor variable is optional for by-group analysis."
              : "Pastikan data mengandung minimal satu variabel numerik. Factor variable bersifat opsional untuk analisis by-group."
          },
          {
            number: 2,
            title: isEn ? "Choose Variables" : "Pilih Variabel",
            description: isEn
              ? "Drag NUMERIC variables into the Dependent List. Add categorical variables to Factor for per-group analysis."
              : "Drag variabel NUMERIC ke Dependent List. Tambah variabel kategorikal ke Factor untuk analisis per kelompok."
          },
          {
            number: 3,
            title: isEn ? "Set Up Statistics" : "Atur Statistik",
            description: isEn
              ? "In the Statistics tab, check Descriptives + Outliers and set the Confidence Interval to 95% for a robust analysis."
              : "Di tab Statistics, centang Descriptives + Outliers, set Confidence Interval 95% untuk robust analysis."
          },
          {
            number: 4,
            title: isEn ? "Choose Visualizations" : "Pilih Visualisasi",
            description: isEn
              ? "In the Plots tab, choose Boxplot + Histogram to understand the distribution and identify outliers."
              : "Di tab Plots, pilih Boxplot + Histogram untuk memahami distribusi dan mengidentifikasi outlier."
          },
          {
            number: 5,
            title: isEn ? "Interpret the Results" : "Interpretasi Hasil",
            description: isEn
              ? "Analyze the robust statistics, identify outliers, and compare characteristics between groups if a factor is used."
              : "Analisis robust statistics, identifikasi outlier, dan bandingkan karakteristik antar kelompok jika ada factor."
          }
        ]}
      />
    </div>
  );
};
