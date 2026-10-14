/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpAlert, HelpStep } from '../../ui/HelpLayout';
import { Download, Settings, Tags } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ExportExcel = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'export-steps',
      title: isEn ? 'How to Export to Excel' : 'Cara Ekspor ke Excel',
      description: isEn ? 'A step-by-step guide to saving your data as an Excel file' : 'Panduan langkah demi langkah untuk menyimpan data Anda sebagai file Excel',
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
            description={isEn ? "Click File → Export → Excel." : "Klik File → Export → Excel."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Set Up the Export" : "Atur Ekspor"}
            description={isEn ? "The export dialog appears. Give your file a name." : "Dialog ekspor akan muncul. Beri nama file Anda."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Choose Value Labels" : "Pilih Label Nilai"}
            description={isEn
              ? "You can choose to include the variables' value labels if you want."
              : "Anda dapat memilih untuk menyertakan label nilai variabel jika diinginkan."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Create Your File" : "Buat File Anda"}
            description={isEn ? "Click 'Export' to create and download your .xlsx file." : "Klik 'Export' untuk membuat dan mengunduh file .xlsx Anda."}
          />
        </div>
      )
    },
    {
      id: 'features',
      title: isEn ? 'Features & Benefits' : 'Fitur & Manfaat',
      description: isEn ? 'The advantages of exporting to the Excel format' : 'Keuntungan mengekspor ke format Excel',
      icon: Tags,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="success" title={isEn ? "Value Labels" : "Label Nilai"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Unlike CSV, Excel export lets you keep value labels. This means that if you have a variable with 1=\"Male\" and 2=\"Female\", the exported file can show \"Male\" and \"Female\" instead of 1 and 2."
                : "Tidak seperti CSV, ekspor Excel memungkinkan Anda menyimpan label nilai. Ini berarti jika Anda memiliki variabel dengan 1=\"Laki-laki\" dan 2=\"Perempuan\", file yang diekspor dapat menampilkan \"Laki-laki\" dan \"Perempuan\" alih-alih 1 dan 2."}
            </p>
          </HelpAlert>
          <HelpAlert variant="info" title={isEn ? "Format Preservation" : "Preservasi Format"}>
            <p className="text-sm mt-2">
              {isEn
                ? "The Excel format stores more metadata than CSV, including data types and formats."
                : "Format Excel menyimpan lebih banyak informasi metadata dibandingkan CSV, termasuk jenis data dan format."}
            </p>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'options',
      title: isEn ? 'Options & Settings' : 'Opsi & Pengaturan',
      description: isEn ? 'Settings you can adjust when exporting' : 'Pengaturan yang dapat Anda sesuaikan saat mengekspor',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="tip" title={isEn ? "Multiple Worksheets" : "Multiple Worksheet"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Excel files can contain multiple worksheets, allowing better organization for complex datasets."
                : "File Excel dapat berisi beberapa worksheet, memungkinkan organisasi yang lebih baik untuk dataset yang kompleks."}
            </p>
          </HelpAlert>
          <HelpAlert variant="info" title={isEn ? "Compatibility" : "Kompatibilitas"}>
            <p className="text-sm mt-2">
              {isEn
                ? ".xlsx files work with Microsoft Excel, LibreOffice Calc, Google Sheets, and other spreadsheet applications."
                : "File .xlsx bekerja dengan Microsoft Excel, LibreOffice Calc, Google Sheets, dan aplikasi spreadsheet lainnya."}
            </p>
          </HelpAlert>
        </div>
      )
    }
  ];

  const tips = [
    {
      type: 'success' as const,
      title: isEn ? 'Metadata Preservation' : 'Preservasi Metadata',
      content: isEn
        ? 'Excel export stores more metadata than other formats, including value labels and data formats.'
        : 'Ekspor Excel menyimpan lebih banyak informasi metadata daripada format lain, termasuk label nilai dan format data.'
    },
    {
      type: 'tip' as const,
      title: isEn ? 'File Size' : 'Ukuran File',
      content: isEn
        ? 'Excel files are generally larger than CSV, but they store more structural information and metadata.'
        : 'File Excel umumnya lebih besar daripada CSV, tetapi menyimpan lebih banyak informasi struktural dan metadata.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Cross-Platform Compatibility' : 'Kompatibilitas Lintas Platform',
      content: isEn
        ? 'The .xlsx format works across platforms and modern spreadsheet applications such as Excel, LibreOffice, and Google Sheets.'
        : 'Format .xlsx bekerja di berbagai platform dan aplikasi spreadsheet modern seperti Excel, LibreOffice, dan Google Sheets.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Export to CSV' : 'Ekspor ke CSV', href: '/help/file-guide/export-csv' },
    { title: isEn ? 'Import Excel Files' : 'Impor File Excel', href: '/help/file-guide/import-excel' },
    { title: isEn ? 'Print Data' : 'Cetak Data', href: '/help/file-guide/print' },
    { title: isEn ? 'File Management Guide' : 'Panduan Manajemen File', href: '/help/file-guide' },
    { title: isEn ? 'Data Management Guide' : 'Panduan Manajemen Data', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Export to Excel" : "Ekspor ke Excel"}
      description={isEn
        ? "A complete guide to saving your data as Microsoft Excel (.xlsx)"
        : "Panduan lengkap untuk menyimpan data Anda sebagai Microsoft Excel (.xlsx)"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};
