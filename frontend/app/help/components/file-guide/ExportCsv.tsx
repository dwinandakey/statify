/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpAlert, HelpStep } from '../../ui/HelpLayout';
import { Download, Settings } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ExportCsv = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'export-steps',
      title: isEn ? 'How to Export to CSV' : 'Cara Ekspor ke CSV',
      description: isEn ? 'A step-by-step guide to saving your data as a CSV file' : 'Panduan langkah demi langkah untuk menyimpan data Anda sebagai file CSV',
      icon: Download,
      content: (
        <div className="space-y-4">
          <HelpStep
            number={1}
            title={isEn ? "Check Your Data" : "Periksa Data Anda"}
            description={isEn ? "Make sure the data you want to export is loaded in the data editor." : "Pastikan data yang ingin diekspor sudah dimuat di editor data."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Open the File Menu" : "Buka Menu File"}
            description={isEn ? "Click File → Export → CSV Data." : "Klik File → Export → CSV Data."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose Your Settings" : "Pilih Pengaturan Anda"}
            description={isEn
              ? "A dialog appears where you can set options such as the delimiter and decimal symbol."
              : "Dialog akan muncul dimana Anda dapat mengatur opsi seperti pemisah dan simbol desimal."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Name Your File" : "Beri Nama File Anda"}
            description={isEn
              ? "Enter a file name and choose where to save it on your computer."
              : "Masukkan nama file dan pilih lokasi penyimpanan di komputer Anda."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Save Your Data" : "Simpan Data Anda"}
            description={isEn ? "Click 'Export' to save the file to your computer." : "Klik 'Export' untuk menyimpan file ke komputer Anda."}
          />
        </div>
      )
    },
    {
      id: 'options',
      title: isEn ? 'Options & Settings' : 'Opsi & Pengaturan',
      description: isEn ? 'Settings you can adjust when exporting a file' : 'Pengaturan yang dapat Anda sesuaikan saat mengekspor file',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="info" title={isEn ? "Data Delimiter" : "Pemisah Data"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Choose how your data columns are separated (comma, semicolon, or tab) based on what works best for you."
                : "Pilih cara memisahkan kolom data Anda (koma, titik koma, atau tab) berdasarkan apa yang terbaik untuk kebutuhan Anda."}
            </p>
          </HelpAlert>
          <HelpAlert variant="tip" title={isEn ? "Decimal Symbol" : "Simbol Desimal"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Set the decimal symbol (period or comma) to match your regional standard or the requirements of other software."
                : "Atur simbol desimal (titik atau koma) untuk menyesuaikan standar regional Anda atau persyaratan perangkat lunak lain."}
            </p>
          </HelpAlert>
        </div>
      )
    }
  ];

  const tips = [
    {
      type: 'warning' as const,
      title: isEn ? 'Format Limitations' : 'Keterbatasan Format',
      content: isEn
        ? 'CSV export only stores the raw data. Variable properties such as labels or measurement levels are not included.'
        : 'Ekspor CSV hanya menyimpan data mentah. Properti variabel seperti label atau tingkat pengukuran tidak disertakan.'
    },
    {
      type: 'tip' as const,
      title: isEn ? 'Universal Compatibility' : 'Kompatibilitas Universal',
      content: isEn
        ? 'CSV files work with almost every spreadsheet program and other statistical software.'
        : 'File CSV bekerja dengan hampir semua program spreadsheet dan perangkat lunak statistik lainnya.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'UTF-8 Encoding' : 'Encoding UTF-8',
      content: isEn
        ? 'CSV files are saved with UTF-8 encoding so special characters display correctly.'
        : 'File CSV disimpan dengan encoding UTF-8 untuk memastikan karakter khusus ditampilkan dengan benar.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Export to Excel' : 'Ekspor ke Excel', href: '/help/file-guide/export-excel' },
    { title: isEn ? 'Import CSV Files' : 'Impor File CSV', href: '/help/file-guide/import-csv' },
    { title: isEn ? 'Print Data' : 'Cetak Data', href: '/help/file-guide/print' },
    { title: isEn ? 'File Management Guide' : 'Panduan Manajemen File', href: '/help/file-guide' },
    { title: isEn ? 'Data Management Guide' : 'Panduan Manajemen Data', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Export to CSV" : "Ekspor ke CSV"}
      description={isEn
        ? "A complete guide to saving your data as Comma-Separated Values (.csv)"
        : "Panduan lengkap untuk menyimpan data Anda sebagai Comma-Separated Values (.csv)"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};
