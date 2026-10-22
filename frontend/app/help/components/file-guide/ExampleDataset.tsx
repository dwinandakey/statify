/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpStep } from '../../ui/HelpLayout';
import { Database, Lightbulb, FileText } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ExampleDataset = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'load-steps',
      title: isEn ? 'How to Load an Example Dataset' : 'Cara Memuat Dataset Contoh',
      description: isEn ? 'A step-by-step guide to loading an example dataset into Statify' : 'Panduan langkah demi langkah untuk memuat dataset contoh ke Statify',
      icon: Database,
      content: (
        <div className="space-y-4">
          <HelpStep
            number={1}
            title={isEn ? "Open the File Menu" : "Buka Menu File"}
            description={isEn ? "Click 'File' in the app's top menu bar." : "Klik 'File' di bilah menu atas aplikasi."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose Example Data" : "Pilih Example Data"}
            description={isEn
              ? "Click File → Example Data to see the list of available datasets (.sav)."
              : "Klik File → Example Data untuk melihat daftar dataset yang tersedia (.sav)."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose a Dataset" : "Pilih Dataset"}
            description={isEn
              ? "Choose the dataset (.sav) you want to use from the list. Each dataset has a short description of its contents."
              : "Pilih dataset (.sav) yang ingin Anda gunakan dari daftar yang tersedia. Setiap dataset memiliki deskripsi singkat tentang isinya."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Load the Dataset" : "Muat Dataset"}
            description={isEn
              ? "Click 'Load' to load the dataset into the Statify data editor."
              : "Klik 'Muat' untuk memuat dataset ke dalam editor data Statify."}
          />
        </div>
      )
    },
    {
      id: 'features',
      title: isEn ? 'Features & Benefits' : 'Fitur & Manfaat',
      description: isEn ? 'Important information about the available example datasets' : 'Informasi penting tentang dataset contoh yang tersedia',
      icon: Lightbulb,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Diverse Datasets" : "Dataset Beragam"} icon={FileText} variant="feature">
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Various kinds of datasets with different characteristics are available to demonstrate different statistical analysis techniques."
                : "Tersedia berbagai jenis dataset dengan karakteristik yang berbeda untuk mendemonstrasikan berbagai teknik analisis statistik."}
            </p>
          </HelpCard>

          <HelpAlert variant="info" title={isEn ? "No Internet Needed" : "Tidak Perlu Internet"}>
            <p className="text-sm mt-2">
              {isEn
                ? "All example datasets are bundled with the app, so you can access them even when offline."
                : "Semua dataset contoh disertakan dengan aplikasi, sehingga Anda dapat mengaksesnya bahkan ketika offline."}
            </p>
          </HelpAlert>

          <HelpAlert variant="tip" title={isEn ? "Explore the Features" : "Eksplorasi Fitur"}>
            <p className="text-sm mt-2">
              {isEn
                ? "The example datasets are designed specifically to help you explore the statistical analysis features in Statify."
                : "Dataset contoh dirancang khusus untuk membantu Anda menjelajahi berbagai fitur analisis statistik di Statify."}
            </p>
          </HelpAlert>
        </div>
      )
    }
  ];

  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Effective Learning' : 'Pembelajaran Efektif',
      content: isEn
        ? 'Use the example datasets to learn new features without having to prepare your own data first.'
        : 'Gunakan dataset contoh untuk mempelajari fitur baru tanpa perlu menyiapkan data Anda sendiri terlebih dahulu.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Data Variety' : 'Variasi Data',
      content: isEn
        ? 'Each example dataset has different characteristics to demonstrate different types of statistical analysis.'
        : 'Setiap dataset contoh memiliki karakteristik yang berbeda untuk mendemonstrasikan berbagai jenis analisis statistik.'
    },
    {
      type: 'success' as const,
      title: isEn ? 'Ready to Use' : 'Siap Pakai',
      content: isEn
        ? 'The datasets are already configured with the right variables and labels for immediate analysis.'
        : 'Dataset sudah dikonfigurasi dengan variabel dan label yang tepat untuk analisis langsung.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Import SPSS Files' : 'Impor File SPSS', href: '/help/file-guide/import-sav' },
    { title: isEn ? 'Import CSV Files' : 'Impor File CSV', href: '/help/file-guide/import-csv' },
    { title: isEn ? 'Import Excel Files' : 'Impor File Excel', href: '/help/file-guide/import-excel' },
    { title: isEn ? 'Getting Started Guide' : 'Panduan Memulai', href: '/help/getting-started' },
    { title: isEn ? 'Data Management Guide' : 'Panduan Manajemen Data', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Using Example Datasets" : "Menggunakan Dataset Contoh"}
      description={isEn
        ? "A complete guide to using the example datasets available in Statify for learning and exploring features"
        : "Panduan lengkap untuk menggunakan dataset contoh yang tersedia di Statify untuk pembelajaran dan eksplorasi fitur"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};
