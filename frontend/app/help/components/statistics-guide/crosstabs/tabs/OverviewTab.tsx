import React from 'react';
import { Grid3x3, HelpCircle, BookOpen, Target } from 'lucide-react';
import {
  IntroSection,
  FeatureGrid,
  ConceptSection,
  StepList,
  ExampleGrid
} from '../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "About Crosstabs Analysis" : "Tentang Analisis Crosstabs"}
        description={isEn
          ? "Crosstabs (cross tabulation) analysis is used to test the relationship between two categorical variables by building a contingency table. It shows how frequencies are distributed across the categories and tests the statistical significance of that relationship."
          : "Analisis Crosstabs (tabulasi silang) digunakan untuk menguji hubungan antara dua variabel kategorikal dengan membuat tabel kontingensi. Analisis ini menunjukkan bagaimana frekuensi terdistribusi di antara kategori-kategori dan menguji signifikansi statistik hubungan tersebut."}
        variant="info"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "When to Use Crosstabs" : "Kapan Menggunakan Crosstabs",
            icon: HelpCircle,
            items: isEn
              ? [
                  "Testing the relationship between two categorical variables",
                  "Analyzing survey responses by demographic group",
                  "Comparing proportions across different categories",
                  "Identifying patterns in categorical data",
                  "Validating hypotheses about variable independence",
                  "Market analysis and consumer segmentation"
                ]
              : [
                  "Menguji hubungan antara dua variabel kategorikal",
                  "Menganalisis respons survei berdasarkan kelompok demografis",
                  "Membandingkan proporsi di antara kategori yang berbeda",
                  "Mengidentifikasi pola dalam data kategorikal",
                  "Memvalidasi hipotesis tentang independensi variabel",
                  "Analisis pasar dan segmentasi konsumen"
                ]
          },
          {
            title: isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari",
            icon: BookOpen,
            items: isEn
              ? [
                  "How to choose row and column variables",
                  "Cell settings: frequencies, percentages, residuals",
                  "Interpreting the Chi-Square test and measures of association",
                  "Strategies for analyzing contingency tables",
                  "Best practices for categorical data analysis",
                  "Understanding expected vs observed frequencies"
                ]
              : [
                  "Cara memilih variabel baris dan kolom",
                  "Pengaturan cells: frekuensi, persentase, residual",
                  "Interpretasi uji Chi-Square dan ukuran asosiasi",
                  "Strategi analisis tabel kontingensi",
                  "Best practices untuk categorical data analysis",
                  "Pemahaman expected vs observed frequencies"
                ]
          }
        ]}
        columns={2}
      />

      <ConceptSection
        title={isEn ? "Basic Crosstabs Concepts" : "Konsep Dasar Crosstabs"}
        icon={Grid3x3}
        concepts={[
          {
            title: isEn ? "Contingency Table" : "Tabel Kontingensi",
            formula: isEn
              ? "A matrix showing the joint frequencies of two categorical variables"
              : "Matriks yang menampilkan frekuensi gabungan dua variabel kategorikal",
            description: isEn
              ? "The row variable vs the column variable, where each intersection shows the number of observations for that combination of categories."
              : "Variabel baris vs variabel kolom dengan interseksi menunjukkan jumlah observasi untuk setiap kombinasi kategori.",
            color: "blue"
          },
          {
            title: isEn ? "Chi-Square Test" : "Uji Chi-Square",
            formula: "χ² = Σ((Observed - Expected)² / Expected)",
            description: isEn
              ? "Tests whether there is a significant relationship between two categorical variables."
              : "Menguji apakah ada hubungan signifikan antara dua variabel kategorikal.",
            color: "purple"
          },
          {
            title: isEn ? "Measures of Association" : "Ukuran Asosiasi",
            formula: "Cramer's V, Phi Coefficient, Contingency Coefficient",
            description: isEn
              ? "Measures the strength of the relationship between categorical variables (range 0-1)."
              : "Mengukur kekuatan hubungan antara variabel kategorikal (rentang 0-1).",
            color: "emerald"
          }
        ]}
      />

      <ExampleGrid
        title={isEn ? "Practical Application Examples" : "Contoh Aplikasi Praktis"}
        icon={Target}
        examples={[
          {
            title: isEn ? "Medical Research" : "Penelitian Medis",
            description: isEn
              ? "Testing the relationship between gender and the incidence of a particular disease"
              : "Menguji hubungan antara jenis kelamin dan kejadian penyakit tertentu",
            color: "blue"
          },
          {
            title: isEn ? "Consumer Surveys" : "Survei Konsumen",
            description: isEn
              ? "Analyzing product preferences by age group"
              : "Menganalisis preferensi produk berdasarkan kelompok usia",
            color: "blue"
          },
          {
            title: isEn ? "Education Research" : "Penelitian Pendidikan",
            description: isEn
              ? "The relationship between teaching methods and pass rates"
              : "Hubungan metode pembelajaran dengan tingkat kelulusan",
            color: "blue"
          },
          {
            title: isEn ? "Political Analysis" : "Analisis Politik",
            description: isEn
              ? "Voting preferences by geographic location"
              : "Preferensi voting berdasarkan lokasi geografis",
            color: "blue"
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
              ? "Make sure you have two categorical variables with clear, mutually exclusive categories."
              : "Pastikan ada dua variabel kategorikal dengan kategori yang jelas dan saling eksklusif."
          },
          {
            number: 2,
            title: isEn ? "Choose Variables" : "Pilih Variabel",
            description: isEn
              ? "Drag the outcome/dependent variable into Rows, and the predictor/independent variable into Columns."
              : "Drag variabel outcome/dependen ke Rows, dan variabel prediktor/independen ke Columns."
          },
          {
            number: 3,
            title: isEn ? "Configure Cells" : "Konfigurasi Cells",
            description: isEn
              ? "In the Cells tab, set the display of frequencies, row/column percentages, and residuals as needed."
              : "Di tab Cells, atur tampilan frekuensi, persentase baris/kolom, dan residual sesuai kebutuhan."
          },
          {
            number: 4,
            title: isEn ? "Pick Statistics" : "Pilih Statistik",
            description: isEn
              ? "In the Statistics tab, choose Chi-Square, Fisher's Exact test, and the relevant measures of association."
              : "Di tab Statistics, pilih Chi-Square, Fisher's Exact test, dan ukuran asosiasi yang relevan."
          },
          {
            number: 5,
            title: isEn ? "Interpret the Results" : "Interpretasi Hasil",
            description: isEn
              ? "Analyze the contingency table, the Chi-Square significance, and the strength of association to draw conclusions."
              : "Analisis tabel kontingensi, signifikansi Chi-Square, dan kekuatan asosiasi untuk menarik kesimpulan."
          }
        ]}
      />
    </div>
  );
};
