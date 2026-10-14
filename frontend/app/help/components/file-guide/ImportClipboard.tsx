/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpStep } from '../../ui/HelpLayout';
import { Clipboard, Copy, Zap } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ImportClipboard = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'import-steps',
      title: isEn ? 'How to Import from the Clipboard' : 'Cara Impor dari Clipboard',
      description: isEn
        ? 'A step-by-step guide to importing data directly from your clipboard'
        : 'Panduan langkah demi langkah untuk mengimpor data langsung dari clipboard Anda',
      icon: Clipboard,
      content: (
        <div className="space-y-4">
          <HelpStep
            number={1}
            title={isEn ? "Copy Your Data" : "Salin Data Anda"}
            description={isEn
              ? "Copy data from any source (Excel, Google Sheets, etc.) using that application's Copy feature."
              : "Salin data dari sumber mana pun (Excel, Google Sheets, dll.) menggunakan fitur Salin pada aplikasi tersebut."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Open the File Menu" : "Buka Menu File"}
            description={isEn ? "Go to the 'File' menu in Statify." : "Pergi ke menu 'File' di Statify."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose Import Data → From Clipboard" : "Pilih Import Data → From Clipboard"}
            description={isEn ? "Click File → Import Data → From Clipboard." : "Klik File → Import Data → From Clipboard."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Load Your Data" : "Muat Data Anda"}
            description={isEn ? "Your data will be loaded into the data editor automatically." : "Data Anda akan secara otomatis dimuat ke editor data."}
          />
        </div>
      )
    },
    {
      id: 'features',
      title: isEn ? 'Features & Benefits' : 'Fitur & Manfaat',
      description: isEn ? 'The advantages of importing from the clipboard' : 'Keuntungan menggunakan impor clipboard',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="info" title={isEn ? "Quick Import" : "Impor Cepat"}>
            <p className="text-sm mt-2">
              {isEn
                ? "This is the fastest way to get data into Statify. Just copy from any spreadsheet and paste it straight in."
                : "Ini adalah cara tercepat untuk memasukkan data ke Statify. Cukup salin dari spreadsheet mana pun dan tempel langsung."}
            </p>
          </HelpAlert>

          <HelpCard title={isEn ? "Universal Support" : "Dukungan Universal"} icon={Copy} variant="feature">
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Works with data from Excel, Google Sheets, LibreOffice Calc, and other spreadsheet applications."
                : "Bekerja dengan data dari Excel, Google Sheets, LibreOffice Calc, dan aplikasi spreadsheet lainnya."}
            </p>
          </HelpCard>
        </div>
      )
    }
  ];

  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Data Format' : 'Format Data',
      content: isEn
        ? 'Make sure your data has a header in the first row for an optimal import.'
        : 'Pastikan data Anda memiliki header di baris pertama untuk hasil impor yang optimal.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Automatic Detection' : 'Deteksi Otomatis',
      content: isEn
        ? 'Statify automatically detects the data format and column types when importing from the clipboard.'
        : 'Statify secara otomatis mendeteksi format data dan jenis kolom saat mengimpor dari clipboard.'
    },
    {
      type: 'success' as const,
      title: isEn ? 'Import Speed' : 'Kecepatan Impor',
      content: isEn
        ? 'The fastest way to bring data from other spreadsheet applications into Statify.'
        : 'Metode tercepat untuk memasukkan data dari aplikasi spreadsheet lain ke Statify.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Import CSV Files' : 'Impor File CSV', href: '/help/file-guide/import-csv' },
    { title: isEn ? 'Import Excel Files' : 'Impor File Excel', href: '/help/file-guide/import-excel' },
    { title: isEn ? 'Import SPSS Files' : 'Impor File SPSS', href: '/help/file-guide/import-sav' },
    { title: isEn ? 'Example Datasets' : 'Dataset Contoh', href: '/help/file-guide/example-data' },
    { title: isEn ? 'Data Management Guide' : 'Panduan Manajemen Data', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Import from the Clipboard" : "Impor dari Clipboard"}
      description={isEn
        ? "A complete guide to importing data directly from your clipboard into Statify"
        : "Panduan lengkap untuk mengimpor data langsung dari clipboard Anda ke Statify"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};
