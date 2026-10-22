import React from 'react';
import { Calculator, HelpCircle, BookOpen, Target } from 'lucide-react';
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
        title={isEn ? "What Are Descriptive Statistics?" : "Apa itu Statistik Deskriptif?"}
        description={isEn
          ? "Descriptive statistics summarize your data with key measures such as the average, spread, and shape of the distribution. They give quick insight into the numeric characteristics of your data."
          : "Statistik deskriptif merangkum data Anda dengan ukuran-ukuran kunci seperti rata-rata, sebaran, dan bentuk distribusi. Mereka memberikan wawasan cepat tentang karakteristik numerik data Anda."}
        variant="info"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use Descriptive Analysis" : "Kapan Menggunakan Analisis Deskriptif",
            icon: HelpCircle,
            items: isEn
              ? [
                  "Initial exploration of a numeric dataset",
                  "Understanding the distribution and characteristics of variables",
                  "Detecting outliers and data patterns",
                  "Checking the normality of the distribution",
                  "Comparing statistics across variables",
                  "Preparation before inferential analysis",
                  "Validating the quality of numeric data"
                ]
              : [
                  "Eksplorasi awal dataset numerik",
                  "Memahami distribusi dan karakteristik variabel",
                  "Mendeteksi outlier dan pola data",
                  "Mengecek normalitas distribusi",
                  "Membandingkan statistik antar variabel",
                  "Persiapan sebelum analisis inferensial",
                  "Validasi kualitas data numerik"
                ]
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "How to choose numeric variables for the analysis",
                  "Central tendency and dispersion statistics",
                  "Interpreting skewness and kurtosis",
                  "Using confidence intervals",
                  "Strategies for handling missing values",
                  "Best practices for descriptive analysis"
                ]
              : [
                  "Cara memilih variabel numerik untuk analisis",
                  "Statistik central tendency dan dispersion",
                  "Interpretasi skewness dan kurtosis",
                  "Penggunaan confidence intervals",
                  "Strategi handling missing values",
                  "Best practices untuk descriptive analysis"
                ]
          }
        ]}
        columns={2}
      />

      <ConceptSection
        title={isEn ? "The Statistics Produced" : "Statistik yang Dihasilkan"}
        icon={Calculator}
        concepts={[
          {
            title: "Central Tendency",
            formula: isEn
              ? "Mean, Median, Sum - using a weighted calculation with weight W"
              : "Mean, Median, Sum - menggunakan weighted calculation dengan bobot W",
            description: isEn
              ? "Measures of the center of the distribution. The mean is sensitive to outliers, while the median is robust to them."
              : "Ukuran nilai pusat distribusi. Mean sensitif outlier, Median robust terhadap outlier.",
            color: "blue"
          },
          {
            title: "Dispersion",
            formula: "Std. deviation, Variance, Range, Min/Max, S.E. Mean",
            description: isEn
              ? "Measures the variability and spread of the data. The standard error measures the precision of the mean estimate."
              : "Mengukur variabilitas dan penyebaran data. Standard Error mengukur presisi estimasi mean.",
            color: "purple"
          },
          {
            title: "Distribution",
            formula: isEn
              ? "Skewness (asymmetry), Kurtosis (peakedness)"
              : "Skewness (kemencengan), Kurtosis (ketajaman puncak)",
            description: isEn
              ? "Describes the shape of the distribution: symmetry, long tails, and peakedness."
              : "Menggambarkan bentuk distribusi: simetri, ekor panjang, dan ketajaman puncak.",
            color: "orange"
          },
          {
            title: "Percentiles",
            formula: "25th Percentile (Q1), 75th Percentile (Q3), IQR",
            description: isEn
              ? "Splits the data into quartiles. IQR = Q3-Q1 is a robust measure of spread."
              : "Membagi data menjadi kuartil. IQR = Q3-Q1 robust measure of spread.",
            color: "emerald"
          }
        ]}
      />

      <StepList
        title={isEn ? "Quick Start Guide" : "Panduan Cepat Memulai"}
        icon={Target}
        steps={[
          {
            number: 1,
            title: isEn ? "Choose Numeric Variables" : "Pilih Variabel Numerik",
            description: isEn
              ? "Drag scale/numeric variables into the Variables list. Make sure the data is quantitative to get meaningful statistics."
              : "Drag variabel scale/numeric ke Variables list. Pastikan data bersifat kuantitatif untuk mendapatkan statistik yang bermakna."
          },
          {
            number: 2,
            title: isEn ? "Pick Statistics" : "Tentukan Statistik",
            description: isEn
              ? "In the Statistics tab, choose central tendency (mean, median), dispersion (std dev, variance), and distribution (skewness, kurtosis)."
              : "Di tab Statistics, pilih central tendency (mean, median), dispersion (std dev, variance), dan distribution (skewness, kurtosis)."
          },
          {
            number: 3,
            title: isEn ? "Set the Display Options" : "Atur Display Options",
            description: isEn
              ? "Choose the output format, missing value treatment, and confidence interval level to suit your analysis."
              : "Pilih format output, missing value treatment, dan confidence interval level sesuai kebutuhan analisis."
          },
          {
            number: 4,
            title: isEn ? "Interpret the Results" : "Interpretasi Hasil",
            description: isEn
              ? "Analyze the output to understand the characteristics of the data: normality, variability, and central tendency."
              : "Analisis output untuk memahami karakteristik data: normalitas, variabilitas, dan central tendency."
          }
        ]}
      />
    </div>
  );
};
