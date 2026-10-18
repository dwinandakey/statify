import React from 'react';
import { BookOpen, BarChart3, TrendingUp, Calculator } from 'lucide-react';
import {
  IntroSection,
  FeatureGrid,
  ConceptSection
} from '../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const BasicGuideTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "Basic Guide to Statistical Analysis" : "Panduan Dasar Analisis Statistik"}
        description={isEn
          ? "Learn the fundamental concepts of statistical analysis and how to apply them in your research."
          : "Pelajari konsep-konsep fundamental dalam analisis statistik dan cara menerapkannya dalam penelitian Anda."}
        variant="info"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "Data and Variable Types" : "Tipe Data dan Variabel",
            icon: BarChart3,
            items: isEn
              ? [
                  "Nominal - Categories without order (gender, religion)",
                  "Ordinal - Ordered categories (education level)",
                  "Interval - Numeric with equal distances (temperature in Celsius)",
                  "Ratio - Numeric with an absolute zero (height, weight)",
                  "Discrete vs Continuous - Whole numbers vs decimals"
                ]
              : [
                  "Nominal - Kategori tanpa urutan (jenis kelamin, agama)",
                  "Ordinal - Kategori dengan urutan (tingkat pendidikan)",
                  "Interval - Numerik dengan jarak sama (suhu Celsius)",
                  "Rasio - Numerik dengan titik nol absolut (tinggi, berat)",
                  "Diskrit vs Kontinu - Bilangan bulat vs desimal"
                ]
          },
          {
            title: isEn ? "Descriptive Statistics" : "Statistik Deskriptif",
            icon: Calculator,
            items: isEn
              ? [
                  "Mean - The arithmetic average",
                  "Median - The middle value of sorted data",
                  "Mode - The most frequent value",
                  "Standard Deviation - A measure of data spread",
                  "Range - The difference between the maximum and minimum"
                ]
              : [
                  "Mean - Rata-rata aritmatika",
                  "Median - Nilai tengah data terurut",
                  "Modus - Nilai yang paling sering muncul",
                  "Standar Deviasi - Ukuran penyebaran data",
                  "Range - Selisih nilai maksimum dan minimum"
                ]
          }
        ]}
      />

      <ConceptSection
        title={isEn ? "Key Concepts in Statistics" : "Konsep Penting dalam Statistik"}
        icon={BookOpen}
        concepts={[
          {
            title: isEn ? "Population vs Sample" : "Populasi vs Sampel",
            description: isEn
              ? "The population is the entire set of research objects, while a sample is the part of the population selected for study. Sample statistics are used to estimate population parameters."
              : "Populasi adalah keseluruhan objek penelitian, sedangkan sampel adalah bagian dari populasi yang dipilih untuk diteliti. Statistik sampel digunakan untuk mengestimasi parameter populasi."
          },
          {
            title: isEn ? "Normal Distribution" : "Distribusi Normal",
            description: isEn
              ? "A bell-shaped, symmetric probability distribution with mean = median = mode. Many natural phenomena follow a normal distribution."
              : "Distribusi probabilitas yang berbentuk lonceng, simetris, dengan mean = median = modus. Banyak fenomena alam mengikuti distribusi normal."
          },
          {
            title: isEn ? "Statistical Hypotheses" : "Hipotesis Statistik",
            description: isEn
              ? "Statements about a population parameter to be tested. H0 (null hypothesis) vs H1 (alternative hypothesis). The decision is based on evidence from the sample data."
              : "Pernyataan tentang parameter populasi yang akan diuji. H0 (hipotesis nol) vs H1 (hipotesis alternatif). Keputusan berdasarkan bukti dari data sampel."
          },
          {
            title: isEn ? "Significance Level" : "Tingkat Signifikansi",
            description: isEn
              ? "The probability of rejecting H0 when H0 is true (Type I error). Usually set at 0.05 (5%). A p-value below alpha indicates a significant result."
              : "Probabilitas menolak H0 ketika H0 benar (Type I error). Umumnya ditetapkan 0.05 (5%). Nilai p kurang dari alpha menunjukkan hasil signifikan."
          },
          {
            title: "Confidence Interval",
            description: isEn
              ? "A range of values likely to contain the true population parameter. A 95% CI means we are 95% confident the parameter lies within that range."
              : "Rentang nilai yang kemungkinan besar mengandung parameter populasi yang sebenarnya. CI 95% berarti 95% yakin parameter berada dalam rentang tersebut."
          },
          {
            title: "Effect Size",
            description: isEn
              ? "A measure of the size of the effect or difference found. It gives practical information about the importance of the result, not just its statistical significance."
              : "Ukuran besarnya efek atau perbedaan yang ditemukan. Memberikan informasi praktis tentang signifikansi hasil, tidak hanya signifikansi statistik."
          }
        ]}
      />

      <div className="bg-muted/50 p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {isEn ? "Statistical Analysis Steps" : "Langkah-langkah Analisis Statistik"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium">{isEn ? "Data Preparation:" : "Persiapan Data:"}</h4>
            <ul className="space-y-1 text-muted-foreground">
              {isEn ? (
                <>
                  <li>1. Define the research goal</li>
                  <li>2. Determine the variables to analyze</li>
                  <li>3. Check data quality and completeness</li>
                  <li>4. Identify missing values and outliers</li>
                </>
              ) : (
                <>
                  <li>1. Definisikan tujuan penelitian</li>
                  <li>2. Tentukan variabel yang akan dianalisis</li>
                  <li>3. Periksa kualitas dan kelengkapan data</li>
                  <li>4. Identifikasi missing values dan outliers</li>
                </>
              )}
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">{isEn ? "Running the Analysis:" : "Eksekusi Analisis:"}</h4>
            <ul className="space-y-1 text-muted-foreground">
              {isEn ? (
                <>
                  <li>5. Choose the right analysis method</li>
                  <li>6. Check the statistical assumptions</li>
                  <li>7. Run the analysis and interpret the results</li>
                  <li>8. Validate and document the findings</li>
                </>
              ) : (
                <>
                  <li>5. Pilih metode analisis yang tepat</li>
                  <li>6. Periksa asumsi statistik</li>
                  <li>7. Jalankan analisis dan interpretasi hasil</li>
                  <li>8. Validasi dan dokumentasi temuan</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
