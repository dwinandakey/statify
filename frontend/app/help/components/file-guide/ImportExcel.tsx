/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpStep } from '../../ui/HelpLayout';
import { FileSpreadsheet, Upload, Lightbulb, Layers } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ImportExcel = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'import-steps',
      title: isEn ? 'How to Import an Excel File' : 'Cara Impor File Excel',
      description: isEn ? 'A step-by-step guide to importing your Excel data into Statify' : 'Panduan langkah demi langkah untuk mengimpor data Excel Anda ke Statify',
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
            title={isEn ? "Choose Import Data → Excel" : "Pilih Import Data → Excel"}
            description={isEn ? "Click File → Import Data → Excel." : "Klik File → Import Data → Excel."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose Your File" : "Pilih File Anda"}
            description={isEn
              ? "Browse your computer and select the Excel file (.xlsx or .xls) you want to use."
              : "Telusuri komputer Anda dan pilih file Excel (.xlsx atau .xls) yang ingin Anda gunakan."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Continue to Configuration" : "Lanjut ke Konfigurasi"}
            description={isEn ? "Click 'Continue' to open the import configuration." : "Klik 'Continue' untuk membuka konfigurasi impor."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Choose the Worksheet" : "Pilih Worksheet"}
            description={isEn ? "Choose the worksheet to import." : "Pilih worksheet yang akan diimpor."}
          />
          <HelpStep
            number={6}
            title={isEn ? "Set the Import Options" : "Atur Opsi Impor"}
            description={isEn
              ? "Adjust the options: First line contains variable names, Read hidden rows/columns, Range, and how empty cells are treated."
              : "Sesuaikan opsi: First line contains variable names, Read hidden rows/columns, Range, dan perlakuan sel kosong."}
          />
          <HelpStep
            number={7}
            title={isEn ? "Review the Data Preview" : "Tinjau Data Preview"}
            description={isEn
              ? "Check the data preview to make sure the settings are correct."
              : "Periksa pratinjau data untuk memastikan pengaturan sudah benar."}
          />
          <HelpStep
            number={8}
            title={isEn ? "Import" : "Impor"}
            description={isEn ? "Click the 'Import' button to finish the import." : "Klik tombol 'Import' untuk menyelesaikan proses impor."}
          />
        </div>
      )
    },
    {
      id: 'formats',
      title: isEn ? 'Supported Formats' : 'Format Yang Didukung',
      description: isEn ? 'The file types and features you can use' : 'Jenis file dan fitur yang dapat Anda gunakan',
      icon: FileSpreadsheet,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "File Types" : "Jenis File"} icon={FileSpreadsheet} variant="feature">
            <ul className="text-sm space-y-1 mt-2">
              <li>• {isEn ? ".xlsx (Excel 2007 and later)" : ".xlsx (Excel 2007 dan yang lebih baru)"}</li>
              <li>• .xls (Excel 97-2003)</li>
            </ul>
          </HelpCard>

          <HelpCard title={isEn ? "Multiple Worksheets" : "Multiple Worksheet"} icon={Layers} variant="feature">
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Statify can handle Excel files with multiple worksheets and lets you choose which sheet to import."
                : "Statify dapat menangani file Excel dengan beberapa worksheet dan memungkinkan Anda memilih sheet mana yang akan diimpor."}
            </p>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'features',
      title: isEn ? 'Features & Information' : 'Fitur & Informasi',
      description: isEn ? 'Important information about importing Excel files' : 'Informasi penting tentang impor file Excel',
      icon: Lightbulb,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="info" title={isEn ? "Did You Know?" : "Tahukah Anda?"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Statify works perfectly with the .xlsx (Excel 2007+) and .xls (Excel 97-2003) formats."
                : "Statify bekerja sempurna dengan format .xlsx (Excel 2007+) dan .xls (Excel 97-2003)."}
            </p>
          </HelpAlert>
        </div>
      )
    }
  ];



  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Column Headers' : 'Header Kolom',
      content: isEn
        ? 'Make sure the first row contains clear variable names for an optimal, easy-to-understand import.'
        : 'Pastikan baris pertama berisi nama variabel yang jelas untuk hasil impor yang optimal dan mudah dipahami.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Worksheet Selection' : 'Pemilihan Worksheet',
      content: isEn
        ? 'For files with multiple worksheets, you can choose which sheet to import into Statify.'
        : 'Untuk file dengan beberapa worksheet, Anda dapat memilih sheet mana yang akan diimpor ke Statify.'
    },
    {
      type: 'success' as const,
      title: isEn ? 'Flexible Formats' : 'Format Fleksibel',
      content: isEn
        ? 'Supports the .xlsx (Excel 2007+) and .xls (Excel 97-2003) formats with good metadata preservation.'
        : 'Mendukung format .xlsx (Excel 2007+) dan .xls (Excel 97-2003) dengan preservasi metadata yang baik.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Import CSV Files' : 'Impor File CSV', href: '/help/file-guide/import-csv' },
    { title: isEn ? 'Import SPSS Files' : 'Impor File SPSS', href: '/help/file-guide/import-sav' },
    { title: isEn ? 'Import from Clipboard' : 'Impor dari Clipboard', href: '/help/file-guide/import-clipboard' },
    { title: isEn ? 'Export to Excel' : 'Ekspor ke Excel', href: '/help/file-guide/export-excel' },
    { title: isEn ? 'Data Management Guide' : 'Panduan Manajemen Data', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Import Excel Files" : "Impor File Excel"}
      description={isEn ? "A complete guide to importing Excel data into Statify" : "Panduan lengkap untuk mengimpor data Excel ke Statify"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};
