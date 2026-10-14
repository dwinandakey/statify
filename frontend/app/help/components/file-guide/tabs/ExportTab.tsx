import React from 'react';
import { Download, FileSpreadsheet, Settings } from 'lucide-react';
import {
  IntroSection,
  FeatureGrid,
  ConceptSection
} from '../../statistics-guide/shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ExportTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "Export Data from Statify" : "Export Data dari Statify"}
        description={isEn
          ? "Save your analysis results and data in various formats to use in other applications or to share with colleagues."
          : "Simpan hasil analisis dan data Anda dalam berbagai format untuk digunakan di aplikasi lain atau untuk berbagi dengan kolega."}
        variant="success"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "Available Export Formats" : "Format Export yang Tersedia",
            icon: FileSpreadsheet,
            items: isEn
              ? [
                  "CSV - A universal format for data",
                  "Excel - With formatting and multiple sheets",
                  "PDF - For reports and presentations",
                  "PNG/SVG - For charts and visualizations",
                  "Print - Print directly to a printer"
                ]
              : [
                  "CSV - Format universal untuk data",
                  "Excel - Dengan formatting dan multiple sheets",
                  "PDF - Untuk laporan dan presentasi",
                  "PNG/SVG - Untuk grafik dan visualisasi",
                  "Print - Cetak langsung ke printer"
                ]
          },
          {
            title: isEn ? "Advanced Export Options" : "Opsi Export Lanjutan",
            icon: Settings,
            items: isEn
              ? [
                  "Choose the columns to export",
                  "Set the number and date formats",
                  "Include or omit the header",
                  "Choose the separator for CSV",
                  "Set the image quality and size"
                ]
              : [
                  "Pilih kolom yang akan diekspor",
                  "Atur format angka dan tanggal",
                  "Sertakan atau hilangkan header",
                  "Pilih separator untuk CSV",
                  "Atur kualitas dan ukuran gambar"
                ]
          }
        ]}
      />

      <ConceptSection
        title={isEn ? "Export Guide" : "Panduan Export"}
        icon={Download}
        concepts={[
          {
            title: isEn ? "Export to CSV" : "Export ke CSV",
            description: isEn
              ? "The best format for maximum compatibility. Click File → Export → CSV Data, then set the separator and number format as needed."
              : "Format terbaik untuk kompatibilitas maksimum. Klik File → Export → CSV Data, atur separator dan format angka sesuai kebutuhan."
          },
          {
            title: isEn ? "Export to Excel" : "Export ke Excel",
            description: isEn
              ? "Keeps formatting and supports multiple worksheets. Ideal for reports that need a good presentation."
              : "Mempertahankan formatting dan mendukung multiple worksheets. Ideal untuk laporan yang memerlukan presentasi yang baik."
          },
          {
            title: isEn ? "Export Charts" : "Export Grafik",
            description: isEn
              ? "Save visualizations as PNG or SVG. SVG is recommended for the best quality and scalability."
              : "Simpan visualisasi dalam format PNG atau SVG. SVG direkomendasikan untuk kualitas terbaik dan skalabilitas."
          },
          {
            title: "Print & PDF",
            description: isEn
              ? "Print directly or save as PDF for documentation and archiving. Adjust the layout and orientation as needed."
              : "Cetak langsung atau simpan sebagai PDF untuk dokumentasi dan arsip. Atur layout dan orientasi sesuai kebutuhan."
          }
        ]}
      />
    </div>
  );
};
