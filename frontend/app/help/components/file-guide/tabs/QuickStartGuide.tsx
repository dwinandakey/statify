import React from 'react';
import { Upload, Database, Download, ListOrdered, FileText, Settings } from 'lucide-react';
import { HelpGuideTemplate } from '../../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpStep } from '../../../ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const QuickStartGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'how-to-import',
      title: isEn ? 'How to Import Data' : 'Cara Mengimpor Data',
      description: isEn ? 'A step-by-step guide to importing data into Statify' : 'Panduan langkah demi langkah untuk mengimpor data ke Statify',
      icon: ListOrdered,
      content: (
        <div className="space-y-4">
          <HelpStep number={1} title={isEn ? "Choose the Import Format" : "Pilih Format Import"}>
            <p className="text-sm">
              {isEn ? "Choose the file format that matches your data:" : "Pilih format file yang sesuai dengan data Anda:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li><strong>CSV</strong>: A universal format, compatible with every application</li>
                  <li><strong>Excel</strong>: Keeps formatting and multiple sheets</li>
                  <li><strong>SPSS (.sav)</strong>: Imports with complete metadata and labels</li>
                  <li><strong>Clipboard</strong>: Copy-paste data from another application</li>
                </>
              ) : (
                <>
                  <li><strong>CSV</strong>: Format universal, kompatibel dengan semua aplikasi</li>
                  <li><strong>Excel</strong>: Mempertahankan formatting dan multiple sheets</li>
                  <li><strong>SPSS (.sav)</strong>: Import dengan metadata dan label lengkap</li>
                  <li><strong>Clipboard</strong>: Copy-paste data dari aplikasi lain</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={2} title="Import Data">
            <p className="text-sm">
              {isEn ? "Follow the import steps for your format:" : "Ikuti langkah import sesuai format:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Click <strong>File → Import Data</strong></li>
                  <li>Choose the file type (CSV, Excel, SPSS, etc.)</li>
                  <li>Browse and select the file from your computer</li>
                  <li>Adjust the import settings (header, delimiter, etc.)</li>
                  <li>Preview the data to make sure the format is correct</li>
                  <li>Click <strong>Import</strong> to continue</li>
                </>
              ) : (
                <>
                  <li>Klik <strong>File → Import Data</strong></li>
                  <li>Pilih jenis file (CSV, Excel, SPSS, dll)</li>
                  <li>Browse dan pilih file dari komputer</li>
                  <li>Atur pengaturan import (header, delimiter, dll)</li>
                  <li>Preview data untuk memastikan format benar</li>
                  <li>Klik <strong>Import</strong> untuk melanjutkan</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={3} title={isEn ? "Validate the Data" : "Validasi Data"}>
            <p className="text-sm">
              {isEn ? "Check the imported data:" : "Periksa data yang telah diimpor:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Check the variable names and types in Variable View</li>
                  <li>Look for missing values and anomalous data</li>
                  <li>Validate the date and numeric formats</li>
                  <li>Set the appropriate measurement level</li>
                </>
              ) : (
                <>
                  <li>Periksa nama dan tipe variabel di Variable View</li>
                  <li>Cek missing values dan data anomali</li>
                  <li>Validasi format tanggal dan numerik</li>
                  <li>Atur measurement level yang sesuai</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={4} title={isEn ? "Ready to Analyze" : "Siap Analisis"}>
            <p className="text-sm">
              {isEn ? "The data is ready for statistical analysis:" : "Data siap untuk analisis statistik:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Open the <strong>Analyze</strong> menu to run analyses</li>
                  <li>Use the <strong>Data</strong> menu for transformations</li>
                  <li>Export results to share or back up</li>
                </>
              ) : (
                <>
                  <li>Akses menu <strong>Analyze</strong> untuk analisis</li>
                  <li>Gunakan <strong>Data</strong> menu untuk transformasi</li>
                  <li>Export hasil untuk berbagi atau backup</li>
                </>
              )}
            </ul>
          </HelpStep>
        </div>
      )
    },
    {
      id: 'file-formats',
      title: isEn ? 'Supported File Formats' : 'Format File yang Didukung',
      description: isEn ? 'The data formats that can be imported and exported' : 'Berbagai format data yang dapat diimpor dan diekspor',
      icon: Upload,
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <HelpCard title="Import Formats" icon={Upload} variant="feature">
            <ul className="text-sm space-y-1">
              <li>• CSV (.csv) - Comma Separated Values</li>
              <li>• Excel (.xlsx, .xls) - Microsoft Excel</li>
              <li>• SPSS (.sav) - SPSS Data Files</li>
              <li>• {isEn ? "Clipboard - Copy from another application" : "Clipboard - Copy dari aplikasi lain"}</li>
            </ul>
          </HelpCard>

          <HelpCard title="Export Formats" icon={Download} variant="feature">
            <ul className="text-sm space-y-1">
              <li>• {isEn ? "CSV - Universal format" : "CSV - Format universal"}</li>
              <li>• {isEn ? "Excel - With formatting" : "Excel - Dengan formatting"}</li>
              <li>• {isEn ? "PDF - For reports" : "PDF - Untuk laporan"}</li>
              <li>• {isEn ? "Print - Print directly" : "Print - Cetak langsung"}</li>
            </ul>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'best-practices',
      title: isEn ? 'File Management Tips' : 'Tips Manajemen File',
      description: isEn ? 'Best practices for working with data files' : 'Praktik terbaik untuk bekerja dengan file data',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="info" title={isEn ? "Data Preparation" : "Persiapan Data"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Make sure the data is in the correct format before importing. Clean the data of special characters and make sure the formats are consistent."
                : "Pastikan data sudah dalam format yang benar sebelum import. Bersihkan data dari karakter khusus dan pastikan konsistensi format."}
            </p>
          </HelpAlert>

          <div className="grid gap-4 md:grid-cols-2">
            <HelpCard title={isEn ? "Regular Backups" : "Backup Rutin"} icon={Database} variant="step">
              <p className="text-sm">
                {isEn ? "Export your data regularly for backup and documentation" : "Export data secara berkala untuk backup dan dokumentasi"}
              </p>
            </HelpCard>

            <HelpCard title="Naming Convention" icon={FileText} variant="step">
              <p className="text-sm">
                {isEn
                  ? "Use descriptive file names with dates to track versions"
                  : "Gunakan nama file yang deskriptif dengan tanggal untuk tracking versi"}
              </p>
            </HelpCard>

            <HelpCard title={isEn ? "Consistent Formats" : "Format Konsisten"} icon={Settings} variant="step">
              <p className="text-sm">
                {isEn
                  ? "Keep date, number, and text formats consistent within the dataset"
                  : "Pastikan format tanggal, angka, dan teks konsisten dalam dataset"}
              </p>
            </HelpCard>

            <HelpCard title={isEn ? "Documentation" : "Dokumentasi"} icon={FileText} variant="step">
              <p className="text-sm">
                {isEn
                  ? "Document the data sources and the transformations applied"
                  : "Dokumentasikan sumber data dan transformasi yang dilakukan"}
              </p>
            </HelpCard>
          </div>
        </div>
      )
    }
  ];

  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Preview Before Importing' : 'Preview Sebelum Import',
      content: isEn
        ? 'Always use the preview to make sure the data is interpreted correctly before the final import.'
        : 'Selalu gunakan fitur preview untuk memastikan data diinterpretasi dengan benar sebelum import final.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'File Encoding' : 'Encoding File',
      content: isEn
        ? 'For files with special characters, use UTF-8 encoding to avoid character problems.'
        : 'Untuk file dengan karakter khusus, pastikan encoding UTF-8 untuk menghindari masalah karakter.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'File Size' : 'Ukuran File',
      content: isEn
        ? 'Very large files may take longer to process. Consider sampling for the initial exploration.'
        : 'File yang sangat besar mungkin memerlukan waktu lebih lama untuk diproses. Pertimbangkan sampling untuk eksplorasi awal.'
    },
    {
      type: 'tip' as const,
      title: isEn ? 'Back Up the Original Data' : 'Backup Data Asli',
      content: isEn
        ? 'Always keep a backup of the original file before transforming or manipulating data in Statify.'
        : 'Selalu simpan backup file asli sebelum melakukan transformasi atau manipulasi data di Statify.'
    }
  ];

  const relatedTopics = [
    { title: 'Import CSV', href: '/help/file-guide/import-csv' },
    { title: 'Import Excel', href: '/help/file-guide/import-excel' },
    { title: 'Import SPSS', href: '/help/file-guide/import-sav' },
    { title: 'Export Data', href: '/help/file-guide/export-csv' },
    { title: 'Data Management', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Quick Start - File Management" : "Quick Start - Manajemen File"}
      description={isEn
        ? "A quick guide to importing, managing, and exporting data files in Statify"
        : "Panduan cepat untuk mengimpor, mengelola, dan mengekspor file data di Statify"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};
