import React from 'react';
import { BarChart3, HelpCircle, BookOpen, Target } from 'lucide-react';
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
        title={isEn ? "What Is Frequencies Analysis?" : "Apa itu Analisis Frekuensi?"}
        description={isEn
          ? "Frequencies analysis counts how often each unique value appears in your data. It helps you understand the distribution of values and identify patterns in both categorical and numeric data."
          : "Analisis frekuensi menghitung seberapa sering setiap nilai unik muncul dalam data Anda. Ini membantu Anda memahami distribusi nilai dan mengidentifikasi pola dalam data kategorikal maupun numerik."}
        variant="info"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use Frequencies Analysis" : "Kapan Menggunakan Analisis Frekuensi",
            icon: HelpCircle,
            items: isEn
              ? [
                  "Understanding the distribution of categorical data",
                  "Identifying the most common values",
                  "Checking data quality and missing values",
                  "Preparing data for further analysis",
                  "Validating data entry and detecting anomalies",
                  "Initial exploration before complex analyses"
                ]
              : [
                  "Memahami distribusi data kategorikal",
                  "Mengidentifikasi nilai yang paling umum",
                  "Memeriksa kualitas data dan nilai yang hilang",
                  "Mempersiapkan data untuk analisis lebih lanjut",
                  "Validasi data entry dan deteksi anomali",
                  "Eksplorasi awal sebelum analisis kompleks"
                ]
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "How to choose variables for the analysis",
                  "The available statistics options",
                  "Chart and visualization customization options",
                  "How to interpret the results",
                  "Strategies for analyzing categorical data",
                  "Best practices for frequency analysis"
                ]
              : [
                  "Cara memilih variabel untuk analisis",
                  "Opsi statistik yang tersedia",
                  "Opsi kustomisasi grafik dan visualisasi",
                  "Cara menginterpretasi hasil",
                  "Strategi analisis data kategorikal",
                  "Best practices untuk frequency analysis"
                ]
          }
        ]}
        columns={2}
      />

      <ConceptSection
        title={isEn ? "Basic Concepts of Frequency Analysis" : "Konsep Dasar Frequency Analysis"}
        icon={BarChart3}
        concepts={[
          {
            title: "Frequency Count",
            formula: isEn ? "The number of occurrences of each value in the dataset" : "Jumlah kemunculan setiap nilai dalam dataset",
            description: isEn
              ? "The basic calculation that counts how many times each unique value appears in a variable."
              : "Perhitungan dasar yang menghitung berapa kali setiap nilai unik muncul dalam variabel.",
            color: "blue"
          },
          {
            title: "Valid Percent",
            formula: isEn ? "Percentage based on valid (non-missing) cases" : "Persentase berdasarkan kasus valid (non-missing)",
            description: isEn
              ? "A percentage that excludes missing values, giving a picture of the true distribution."
              : "Persentase yang mengeluarkan missing values, memberikan gambaran distribusi sebenarnya.",
            color: "emerald"
          },
          {
            title: "Cumulative Percent",
            formula: isEn ? "The accumulated percentage from the lowest to the highest value" : "Akumulasi persentase dari nilai terendah hingga tertinggi",
            description: isEn
              ? "Useful for understanding the cumulative distribution and percentile ranking."
              : "Berguna untuk memahami distribusi kumulatif dan percentile ranking.",
            color: "purple"
          }
        ]}
      />

      <StepList
        title={isEn ? "Quick Start Guide" : "Panduan Cepat Memulai"}
        icon={Target}
        steps={[
          {
            number: 1,
            title: isEn ? "Choose Variables" : "Pilih Variabel",
            description: isEn
              ? "Drag variables into the Variables list. Choose the categorical or numeric variables whose distribution you want to analyze."
              : "Drag variabel ke Variables list. Pilih variabel kategorikal atau numerik yang ingin dianalisis distribusinya."
          },
          {
            number: 2,
            title: isEn ? "Pick Statistics" : "Tentukan Statistik",
            description: isEn
              ? "In the Statistics tab, choose the measures of central tendency and dispersion you want, such as the mean, median, and standard deviation."
              : "Di tab Statistics, pilih ukuran tendensi sentral dan dispersi yang diinginkan seperti mean, median, dan standard deviation."
          },
          {
            number: 3,
            title: isEn ? "Set Up Visualization" : "Atur Visualisasi",
            description: isEn
              ? "In the Charts tab, choose a chart type (bar chart, pie chart, histogram) to visualize the frequency distribution."
              : "Di tab Charts, pilih jenis grafik (bar chart, pie chart, histogram) untuk memvisualisasikan distribusi frekuensi."
          },
          {
            number: 4,
            title: isEn ? "Run the Analysis" : "Jalankan Analisis",
            description: isEn
              ? "Click Run to get the complete frequency table with the selected statistics and visualizations."
              : "Klik Run untuk mendapatkan tabel frekuensi lengkap dengan statistik dan visualisasi yang dipilih."
          }
        ]}
      />
    </div>
  );
};
