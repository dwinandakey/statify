import React from 'react';
import { Upload, FileSpreadsheet, Database } from 'lucide-react';
import {
  IntroSection,
  FeatureGrid,
  ConceptSection
} from '../../statistics-guide/shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ImportTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "Import Data into Statify" : "Import Data ke Statify"}
        description={isEn
          ? "Statify supports a variety of file formats so you can easily import data from many sources. Choose the format that fits your needs."
          : "Statify mendukung berbagai format file untuk memudahkan Anda mengimpor data dari berbagai sumber. Pilih format yang sesuai dengan kebutuhan Anda."}
        variant="info"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "Supported File Formats" : "Format File yang Didukung",
            icon: FileSpreadsheet,
            items: isEn
              ? [
                  "CSV files (Comma Separated Values)",
                  "Excel files (.xlsx, .xls)",
                  "SPSS files (.sav)",
                  "Data from the clipboard",
                  "Built-in example datasets"
                ]
              : [
                  "File CSV (Comma Separated Values)",
                  "File Excel (.xlsx, .xls)",
                  "File SPSS (.sav)",
                  "Data dari Clipboard",
                  "Dataset contoh bawaan"
                ]
          },
          {
            title: isEn ? "Effective Import Tips" : "Tips Import yang Efektif",
            icon: Upload,
            items: isEn
              ? [
                  "Make sure the data has column headers",
                  "Check the date and number formats",
                  "Avoid special characters in variable names",
                  "Back up the original data before importing",
                  "Validate the data after importing"
                ]
              : [
                  "Pastikan data memiliki header kolom",
                  "Periksa format tanggal dan angka",
                  "Hindari karakter khusus dalam nama variabel",
                  "Backup data asli sebelum import",
                  "Validasi data setelah import"
                ]
          }
        ]}
      />

      <ConceptSection
        title={isEn ? "Import Steps" : "Langkah-langkah Import"}
        icon={Database}
        concepts={[
          {
            title: "CSV Files",
            description: isEn
              ? "The most common and compatible format. Click File → Import Data → CSV Data, then choose the file and adjust the settings."
              : "Format paling umum dan kompatibel. Klik File → Import Data → CSV Data, lalu pilih file dan atur pengaturan."
          },
          {
            title: "Excel Files",
            description: isEn
              ? "Import directly from an Excel spreadsheet. Click File → Import Data → Excel, then choose the worksheet you want."
              : "Import langsung dari spreadsheet Excel. Klik File → Import Data → Excel, lalu pilih worksheet yang diinginkan."
          },
          {
            title: "SPSS Files",
            description: isEn
              ? "Import SPSS data with complete metadata. Click File → Open SAV to keep labels and formats."
              : "Import data dari SPSS dengan metadata lengkap. Klik File → Open SAV untuk mempertahankan label dan format."
          },
          {
            title: "Clipboard Data",
            description: isEn
              ? "Copy data from another application and paste it straight into Statify via File → Import Data → From Clipboard."
              : "Copy data dari aplikasi lain dan paste langsung ke Statify melalui menu: File → Import Data → From Clipboard."
          }
        ]}
      />
    </div>
  );
};
