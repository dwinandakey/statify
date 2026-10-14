import React from 'react';
import { Database, Folder, Shield } from 'lucide-react';
import {
  IntroSection,
  FeatureGrid,
  ExampleGrid
} from '../../statistics-guide/shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const DataTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "Manage Data Efficiently" : "Kelola Data dengan Efisien"}
        description={isEn
          ? "Learn how to manage, organize, and maintain your data in Statify for optimal analysis."
          : "Pelajari cara mengelola, mengorganisir, dan memelihara data Anda dalam Statify untuk analisis yang optimal."}
        variant="tip"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "Data Organization" : "Organisasi Data",
            icon: Folder,
            items: isEn
              ? [
                  "Use descriptive variable names",
                  "Group related variables together",
                  "Back up your data regularly",
                  "Document the sources and methodology",
                  "Keep metadata for reference"
                ]
              : [
                  "Gunakan nama variabel yang deskriptif",
                  "Kelompokkan variabel terkait",
                  "Buat backup data secara berkala",
                  "Dokumentasikan sumber dan metodologi",
                  "Simpan metadata untuk referensi"
                ]
          },
          {
            title: isEn ? "Data Quality" : "Kualitas Data",
            icon: Shield,
            items: isEn
              ? [
                  "Check for missing values regularly",
                  "Validate data consistency",
                  "Identify and handle outliers",
                  "Standardize data formats",
                  "Verify the accuracy of data entry"
                ]
              : [
                  "Periksa missing values secara rutin",
                  "Validasi konsistensi data",
                  "Identifikasi dan tangani outliers",
                  "Standardisasi format data",
                  "Verifikasi akurasi input data"
                ]
          }
        ]}
      />

      <ExampleGrid
        title={isEn ? "Example Datasets" : "Dataset Contoh"}
        icon={Database}
        examples={[
          {
            title: isEn ? "Customer Satisfaction Survey" : "Survey Kepuasan Pelanggan",
            description: isEn
              ? "Survey data with Likert scales, demographics, and open-ended feedback for satisfaction analysis."
              : "Data survei dengan skala Likert, demografi, dan feedback terbuka untuk analisis kepuasan."
          },
          {
            title: isEn ? "Retail Sales Data" : "Data Penjualan Retail",
            description: isEn
              ? "Daily sales transactions with product categories, locations, and performance metrics."
              : "Transaksi penjualan harian dengan kategori produk, lokasi, dan metrik performa."
          },
          {
            title: isEn ? "Scientific Experiment Results" : "Hasil Eksperimen Ilmiah",
            description: isEn
              ? "Controlled experiment data with independent and dependent variables for statistical analysis."
              : "Data eksperimen terkontrol dengan variabel independen dan dependen untuk analisis statistik."
          },
          {
            title: isEn ? "Financial Data" : "Data Finansial",
            description: isEn
              ? "Financial time series data with economic indicators and investment performance metrics."
              : "Time series data keuangan dengan indikator ekonomi dan metrik performa investasi."
          }
        ]}
        columns={2}
      />
    </div>
  );
};
