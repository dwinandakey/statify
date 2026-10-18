/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpStep } from '../../ui/HelpLayout';
import { FileSpreadsheet, Upload, Lightbulb } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ImportCsv = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'import-steps',
      title: isEn ? 'How to Import a CSV File' : 'Cara Impor File CSV',
      description: isEn ? 'A step-by-step guide to importing your CSV data into Statify' : 'Panduan langkah demi langkah untuk mengimpor data CSV Anda ke Statify',
      icon: Upload,
      content: (
        <div className="space-y-4">
          <HelpStep
            number={1}
            title={isEn ? "Open the File Menu" : "Buka Menu File"}
            description={isEn ? "Click 'File' in the app's top menu bar." : "Klik 'File' di bilah menu atas aplikasi."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose Import Data → CSV Data" : "Pilih Import Data → CSV Data"}
            description={isEn ? "Click File → Import Data → CSV Data." : "Klik File → Import Data → CSV Data."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose Your File" : "Pilih File Anda"}
            description={isEn ? "Browse your computer and select the CSV (.csv) file you want to use." : "Telusuri komputer Anda dan pilih file CSV (.csv) yang ingin Anda gunakan."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Continue to Configuration" : "Lanjut ke Konfigurasi"}
            description={isEn ? "Click 'Continue' to open the import configuration screen." : "Klik 'Continue' untuk membuka layar konfigurasi impor."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Set the Import Options" : "Atur Opsi Impor"}
            description={isEn
              ? "Adjust the options: First line contains variable names, Remove leading/trailing spaces, Delimiter, Decimal Symbol for Numerics, and Text Qualifier."
              : "Sesuaikan opsi: First line contains variable names, Remove leading/trailing spaces, Delimiter, Decimal Symbol for Numerics, dan Text Qualifier."}
          />
          <HelpStep
            number={6}
            title={isEn ? "Review the Data Preview" : "Tinjau Data Preview"}
            description={isEn
              ? "Check the data preview (max 100 rows) to make sure the settings are correct."
              : "Periksa pratinjau data (max 100 rows) untuk memastikan pengaturan sudah benar."}
          />
          <HelpStep
            number={7}
            title={isEn ? "Import" : "Impor"}
            description={isEn ? "Click the 'Import' button to finish the import." : "Klik tombol 'Import' untuk menyelesaikan proses impor."}
          />
        </div>
      )
    },
    {
      id: 'features',
      title: isEn ? 'Features & Information' : 'Fitur & Informasi',
      description: isEn ? 'Important information about the CSV format and how it works' : 'Informasi penting tentang format CSV dan cara kerjanya',
      icon: Lightbulb,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="info" title={isEn ? "Did You Know?" : "Tahukah Anda?"}>
            <p className="text-sm mt-2">
              {isEn
                ? "CSV files are simple text files that work with almost every spreadsheet program and statistical software."
                : "File CSV adalah file teks sederhana yang bekerja dengan hampir semua program spreadsheet dan perangkat lunak statistik."}
            </p>
          </HelpAlert>

          <HelpCard title={isEn ? "About the CSV Format" : "Tentang Format CSV"} icon={FileSpreadsheet} variant="feature">
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "CSV stands for Comma-Separated Values. It uses commas to separate your data columns and a new line for each data row."
                : "CSV singkatan dari Comma-Separated Values. Menggunakan koma untuk memisahkan kolom data Anda dan baris baru untuk setiap baris data."}
            </p>
          </HelpCard>
        </div>
      )
    }
  ];



  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'File Encoding' : 'Encoding File',
      content: isEn
        ? 'Use UTF-8 encoding for files with special characters or symbols so they display correctly.'
        : 'Gunakan encoding UTF-8 untuk file dengan karakter khusus atau simbol untuk memastikan tampilan yang benar.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Automatic Delimiter Detection' : 'Deteksi Pemisah Otomatis',
      content: isEn
        ? 'Statify automatically detects whether the file uses commas, semicolons, or tabs as the data delimiter.'
        : 'Statify secara otomatis mendeteksi apakah file menggunakan koma, titik koma, atau tab sebagai pemisah data.'
    },
    {
      type: 'success' as const,
      title: isEn ? 'Broad Compatibility' : 'Kompatibilitas Luas',
      content: isEn
        ? 'The CSV format is supported by almost every spreadsheet application and data analysis software.'
        : 'Format CSV didukung oleh hampir semua aplikasi spreadsheet dan perangkat lunak analisis data.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Import SPSS Files' : 'Impor File SPSS', href: '/help/file-guide/import-sav' },
    { title: isEn ? 'Import Excel Files' : 'Impor File Excel', href: '/help/file-guide/import-excel' },
    { title: isEn ? 'Import from Clipboard' : 'Impor dari Clipboard', href: '/help/file-guide/import-clipboard' },
    { title: isEn ? 'Export to CSV' : 'Ekspor ke CSV', href: '/help/file-guide/export-csv' },
    { title: isEn ? 'Data Management Guide' : 'Panduan Manajemen Data', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Import CSV Files" : "Impor File CSV"}
      description={isEn ? "A complete guide to importing CSV data into Statify" : "Panduan lengkap untuk mengimpor data CSV ke Statify"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};
