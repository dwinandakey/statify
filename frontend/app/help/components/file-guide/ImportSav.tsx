/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpStep } from '../../ui/HelpLayout';
import { Upload, Lightbulb, Database } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ImportSav = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'import-steps',
      title: isEn ? 'How to Import an SPSS File' : 'Cara Impor File SPSS',
      description: isEn ? 'A step-by-step guide to importing your SPSS data into Statify' : 'Panduan langkah demi langkah untuk mengimpor data SPSS Anda ke Statify',
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
            title={isEn ? "Choose Open SAV" : "Pilih Open SAV"}
            description={isEn ? "Click File → Open SAV." : "Klik File → Open SAV."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose Your File" : "Pilih File Anda"}
            description={isEn ? "Browse your computer and select the .sav file you want to use." : "Telusuri komputer Anda dan pilih file .sav yang ingin Anda gunakan."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Load Your Data" : "Muat Data Anda"}
            description={isEn ? "Click 'Open' to import your data into the Statify data editor." : "Klik 'Buka' untuk mengimpor data Anda ke editor data Statify."}
          />
        </div>
      )
    },
    {
      id: 'features',
      title: isEn ? 'Features & Information' : 'Fitur & Informasi',
      description: isEn ? 'Important information about importing SPSS files' : 'Informasi penting tentang impor file SPSS',
      icon: Lightbulb,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="info" title={isEn ? "Did You Know?" : "Tahukah Anda?"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Statify can handle large .sav files efficiently. For very large datasets, the import may take a moment."
                : "Statify dapat menangani file .sav yang besar dengan efisien. Untuk dataset yang sangat besar, proses impor mungkin membutuhkan beberapa saat."}
            </p>
          </HelpAlert>

          <HelpCard title={isEn ? "Supported Formats" : "Format Yang Didukung"} icon={Database} variant="feature">
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Statify supports SPSS (.sav) files from various versions, including files created with the latest SPSS."
                : "Statify mendukung file SPSS (.sav) dari berbagai versi, termasuk file yang dibuat dengan SPSS terbaru."}
            </p>
          </HelpCard>
        </div>
      )
    }
  ];

  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Large Files' : 'File Besar',
      content: isEn
        ? 'For large files (over 10MB), make sure your browser has enough memory available.'
        : 'Untuk file besar (lebih dari 10MB), pastikan browser Anda memiliki memori yang cukup tersedia.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Compatibility' : 'Kompatibilitas',
      content: isEn
        ? 'Some very specific SPSS features may not be fully supported.'
        : 'Beberapa fitur SPSS yang sangat spesifik mungkin tidak sepenuhnya didukung.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Metadata Preservation' : 'Preservasi Metadata',
      content: isEn
        ? 'SPSS files store metadata such as variable labels and formats, which are preserved on import.'
        : 'File SPSS menyimpan informasi metadata seperti label variabel dan format yang akan dipertahankan saat impor.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Import CSV Files' : 'Impor File CSV', href: '/help/file-guide/import-csv' },
    { title: isEn ? 'Import Excel Files' : 'Impor File Excel', href: '/help/file-guide/import-excel' },
    { title: isEn ? 'Example Datasets' : 'Dataset Contoh', href: '/help/file-guide/example-data' },
    { title: isEn ? 'Export Data' : 'Ekspor Data', href: '/help/file-guide/export-csv' },
    { title: isEn ? 'Data Management Guide' : 'Panduan Manajemen Data', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Import SPSS Files" : "Impor File SPSS"}
      description={isEn ? "A complete guide to importing SPSS (.sav) data into Statify" : "Panduan lengkap untuk mengimpor data SPSS (.sav) ke Statify"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};
