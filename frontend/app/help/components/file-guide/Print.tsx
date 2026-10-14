/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpStep } from '../../ui/HelpLayout';
import { Printer, FileText, Settings, Image } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const Print = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'print-steps',
      title: isEn ? 'How to Print Your Data' : 'Cara Mencetak Data Anda',
      description: isEn ? 'A step-by-step guide to printing data and analysis results' : 'Panduan langkah demi langkah untuk mencetak data dan hasil analisis',
      icon: Printer,
      content: (
        <div className="space-y-4">
          <HelpStep
            number={1}
            title={isEn ? "Open the File Menu" : "Buka Menu File"}
            description={isEn ? "Go to the 'File' menu in the main toolbar." : "Pergi ke menu 'File' di toolbar utama."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose Print" : "Pilih Cetak"}
            description={isEn ? "Click File → Print..." : "Klik File → Print..."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose the Content" : "Pilih Konten"}
            description={isEn
              ? "Choose what you want to print (the data view, analysis results, or charts)."
              : "Pilih apa yang ingin Anda cetak (tampilan data, hasil analisis, atau grafik)."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Adjust the Print Settings" : "Atur Pengaturan Cetak"}
            description={isEn
              ? "Adjust the print settings such as the orientation and page size."
              : "Sesuaikan pengaturan cetak seperti orientasi dan ukuran halaman."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Print or Save" : "Cetak atau Simpan"}
            description={isEn
              ? "Click 'Print' to send it to your printer or save it as a PDF."
              : "Klik 'Cetak' untuk mengirim ke printer Anda atau simpan sebagai PDF."}
          />
        </div>
      )
    },
    {
      id: 'print-options',
      title: isEn ? 'Print Options' : 'Opsi Cetak',
      description: isEn ? 'The kinds of content you can print' : 'Berbagai jenis konten yang dapat Anda cetak',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Data Tables" : "Tabel Data"} icon={FileText} variant="feature">
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Print data tables in a format optimized for easy reading."
                : "Cetak tabel data dengan format yang optimal untuk kemudahan membaca."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Statistical Output" : "Output Statistik"} icon={FileText} variant="feature">
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Print statistical analysis results in a professional format."
                : "Cetak hasil analisis statistik dalam format profesional."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Graphs & Charts" : "Grafik & Chart"} icon={Image} variant="feature">
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Print graphs and charts in high resolution for presentations."
                : "Cetak grafik dan chart dalam resolusi tinggi untuk presentasi."}
            </p>
          </HelpCard>
        </div>
      )
    }
  ];

  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Optimal Orientation' : 'Orientasi Optimal',
      content: isEn
        ? 'Use landscape orientation for wide data tables so they are easier to read and print well.'
        : 'Gunakan orientasi landscape untuk tabel data yang lebar agar lebih mudah dibaca dan tercetak dengan baik.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'PDF Export' : 'Ekspor PDF',
      content: isEn
        ? 'Save as PDF to share analysis results with colleagues or for documentation archives.'
        : 'Simpan sebagai PDF untuk berbagi hasil analisis dengan kolega atau untuk keperluan arsip dokumentasi.'
    },
    {
      type: 'success' as const,
      title: isEn ? 'High Quality' : 'Kualitas Tinggi',
      content: isEn
        ? 'Graphs and charts are printed in a high resolution suitable for professional presentations.'
        : 'Grafik dan chart dicetak dalam resolusi tinggi yang cocok untuk presentasi profesional.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Export to Excel' : 'Ekspor ke Excel', href: '/help/file-guide/export-excel' },
    { title: isEn ? 'Export to CSV' : 'Ekspor ke CSV', href: '/help/file-guide/export-csv' },
    { title: isEn ? 'File Management Guide' : 'Panduan Manajemen File', href: '/help/file-guide' },
    { title: isEn ? 'Data Management Guide' : 'Panduan Manajemen Data', href: '/help/data-guide' },
    { title: isEn ? 'Visualization Guide' : 'Panduan Visualisasi', href: '/help/chart-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Printing Your Data" : "Mencetak Data Anda"}
      description={isEn
        ? "A complete guide to printing data and analysis results from Statify"
        : "Panduan lengkap untuk mencetak data dan hasil analisis dari Statify"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};
