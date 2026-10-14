import React from "react";
import { HelpGuideTemplate } from "../ui/HelpGuideTemplate";
import { HelpCard, HelpAlert, HelpStep } from "../ui/HelpLayout";
import {
  FileVideo,
  Database,
  BarChart,
  LayoutDashboard,
  Play,
  BookOpen,
  TrendingUp,
  ListOrdered
} from "lucide-react";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

export const GettingStarted = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'how-to-start',
      title: isEn ? 'How to Get Started with Statify' : 'Cara Memulai dengan Statify',
      description: isEn ? 'First steps to use Statify effectively' : 'Langkah-langkah awal untuk menggunakan Statify secara efektif',
      icon: ListOrdered,
      content: (
        <div className="space-y-4">
          <HelpStep number={1} title={isEn ? "Initial Preparation" : "Persiapan Awal"}>
            <p className="text-sm">
              {isEn
                ? "Make sure you have the data file you want to analyze. Statify supports formats such as SPSS (.sav), Excel (.xlsx), CSV, and clipboard data."
                : "Pastikan Anda memiliki file data yang ingin dianalisis. Statify mendukung berbagai format seperti SPSS (.sav), Excel (.xlsx), CSV, dan data clipboard."}
            </p>
          </HelpStep>

          <HelpStep number={2} title={isEn ? "Import Data" : "Impor Data"}>
            <p className="text-sm">
              {isEn ? (
                <>
                  Click the <strong>File → Import Data</strong> menu and choose the matching file format.
                  Follow the import guide to adjust settings such as the header row and data types.
                </>
              ) : (
                <>
                  Klik menu <strong>File → Import Data</strong> dan pilih format file yang sesuai.
                  Ikuti panduan impor untuk mengatur pengaturan seperti header dan tipe data.
                </>
              )}
            </p>
          </HelpStep>

          <HelpStep number={3} title={isEn ? "Explore Your Data" : "Eksplorasi Data"}>
            <p className="text-sm">
              {isEn
                ? "Once the data has been imported, explore its structure through:"
                : "Setelah data berhasil diimpor, jelajahi struktur data Anda melalui:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>The Variable panel to see the list of variables</li>
                  <li>The Data view to see the contents of the dataset</li>
                  <li>Basic statistics to understand the characteristics of the data</li>
                </>
              ) : (
                <>
                  <li>Panel Variabel untuk melihat daftar variabel</li>
                  <li>Tampilan Data untuk melihat isi dataset</li>
                  <li>Statistik dasar untuk memahami karakteristik data</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={4} title={isEn ? "Start Analyzing" : "Mulai Analisis"}>
            <p className="text-sm">
              {isEn ? (
                <>
                  Choose the appropriate analysis from the <strong>Analyze</strong> menu.
                  Start with descriptive statistics to get a general understanding of your data.
                </>
              ) : (
                <>
                  Pilih jenis analisis yang sesuai dari menu <strong>Analyze</strong>.
                  Mulai dengan statistik deskriptif untuk memahami data Anda secara umum.
                </>
              )}
            </p>
          </HelpStep>
        </div>
      )
    },
    {
      id: 'overview',
      title: isEn ? 'Welcome to Statify' : 'Selamat Datang di Statify',
      description: isEn ? 'A brief introduction to Statify' : 'Pengantar singkat tentang Statify',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <p>
            {isEn
              ? "Statify is a standalone statistical analysis tool that is fully compatible with SPSS. No account creation or online registration is required. Follow the steps below to start using Statify's advanced analytics."
              : "Statify adalah alat analisis statistik mandiri yang sepenuhnya kompatibel dengan SPSS. Tidak diperlukan pembuatan akun atau registrasi online. Ikuti langkah-langkah berikut untuk mulai menggunakan analitik lanjutan Statify."}
          </p>

          <HelpAlert variant="success" title={isEn ? "Statify Advantages" : "Keunggulan Statify"}>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {isEn ? (
                <>
                  <li>Supports the SPSS (.sav) format, although some advanced features are still limited</li>
                  <li>No internet connection required</li>
                  <li>An intuitive, easy-to-use interface</li>
                  <li>Comprehensive statistical analysis</li>
                </>
              ) : (
                <>
                  <li>Mendukung format SPSS (.sav), namun beberapa fitur lanjutan masih memiliki keterbatasan</li>
                  <li>Tidak memerlukan koneksi internet</li>
                  <li>Antarmuka yang intuitif dan mudah digunakan</li>
                  <li>Analisis statistik yang komprehensif</li>
                </>
              )}
            </ul>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'quick-start',
      title: isEn ? 'Quick Start Guide' : 'Panduan Memulai Cepat',
      description: isEn ? 'A step-by-step guide to get started' : 'Panduan langkah demi langkah untuk memulai',
      icon: Play,
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{isEn ? "1. Import Your Data" : "1. Impor Data Anda"}</h3>
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Start by importing an SPSS (.sav) file or another supported data format directly into Statify."
                : "Mulai dengan mengimpor file SPSS (.sav) atau format data lain yang didukung langsung ke Statify."}
            </p>

            <HelpCard title={isEn ? "Supported Formats" : "Format Yang Didukung"} variant="step">
              <ul className="text-sm space-y-1">
                <li>• {isEn ? "SPSS (.sav) - Primary format" : "SPSS (.sav) - Format utama"}</li>
                <li>• Excel (.xlsx, .xls)</li>
                <li>• CSV (.csv)</li>
                <li>• {isEn ? "Clipboard data" : "Data clipboard"}</li>
              </ul>
            </HelpCard>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{isEn ? "2. Explore the Dashboard" : "2. Jelajahi Dashboard"}</h3>
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "After importing data, get familiar with the interface and the main features available."
                : "Setelah mengimpor data, familiarisasi dengan antarmuka dan fitur utama yang tersedia."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <HelpCard title={isEn ? "Variable Panel" : "Panel Variabel"} icon={Database}>
                <p className="text-sm">
                  {isEn ? "View and manage all variables in your dataset" : "Lihat dan kelola semua variabel dalam dataset Anda"}
                </p>
              </HelpCard>

              <HelpCard title={isEn ? "Data View" : "Tampilan Data"} icon={LayoutDashboard}>
                <p className="text-sm">
                  {isEn ? "Display and edit data in a table format" : "Tampilkan dan edit data dalam format tabel"}
                </p>
              </HelpCard>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{isEn ? "3. Start Analyzing" : "3. Mulai Analisis"}</h3>
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Choose the type of analysis that fits your research needs."
                : "Pilih jenis analisis yang sesuai dengan kebutuhan penelitian Anda."}
            </p>

            <HelpCard title={isEn ? "Available Analyses" : "Analisis Yang Tersedia"} variant="feature">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <HelpCard title="Descriptive Statistics" icon={BarChart} variant="feature">
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Frequencies</li>
                    <li>• Descriptives</li>
                    <li>• Explore</li>
                    <li>• Crosstabs</li>
                  </ul>
                </HelpCard>
                <HelpCard title="Compare Means" icon={LayoutDashboard} variant="feature">
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• One-Sample T Test</li>
                    <li>• Independent-Samples T Test</li>
                    <li>• Paired-Samples T Test</li>
                    <li>• One-Way ANOVA</li>
                  </ul>
                </HelpCard>
                <HelpCard title="Regression & Correlate" icon={TrendingUp} variant="feature">
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Linear Regression</li>
                    <li>• Curve Estimation</li>
                    <li>• Correlate (Bivariate)</li>
                  </ul>
                </HelpCard>
                <HelpCard title="Graphs" icon={BarChart} variant="feature">
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Chart Builder</li>
                  </ul>
                </HelpCard>
              </div>
            </HelpCard>
          </div>
        </div>
      )
    },
    {
      id: 'key-features',
      title: isEn ? 'Key Features' : 'Fitur Utama',
      description: isEn ? 'Learn about the important features in Statify' : 'Pelajari tentang fitur-fitur penting di Statify',
      icon: TrendingUp,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HelpCard title={isEn ? "Data Import" : "Impor Data"} icon={FileVideo} variant="feature">
            <p className="text-sm">
              {isEn ? "Import a variety of data formats quickly and easily." : "Impor berbagai format data dengan mudah dan cepat."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Data Management" : "Manajemen Data"} icon={Database} variant="feature">
            <p className="text-sm">
              {isEn ? "Manage and transform data with comprehensive tools." : "Kelola dan transformasi data dengan alat yang komprehensif."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Statistical Analysis" : "Analisis Statistik"} icon={BarChart} variant="feature">
            <p className="text-sm">
              {isEn ? "Run many types of statistical analysis with ease." : "Lakukan berbagai jenis analisis statistik dengan mudah."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Visualization" : "Visualisasi"} icon={TrendingUp} variant="feature">
            <p className="text-sm">
              {isEn ? "Create informative and attractive graphs and charts." : "Buat grafik dan chart yang informatif dan menarik."}
            </p>
          </HelpCard>
        </div>
      )
    }
  ];



  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Start with a Small Dataset' : 'Mulai dengan Dataset Kecil',
      content: isEn
        ? 'Start with a small dataset to understand the Statify workflow before using larger or more complex datasets.'
        : 'Mulai dengan dataset kecil untuk memahami alur kerja Statify sebelum menggunakan dataset yang lebih besar atau kompleks.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Explore Step by Step' : 'Eksplorasi Bertahap',
      content: isEn
        ? 'Explore Statify features gradually. Start with importing data, then descriptive statistics, and only then move on to more complex analyses.'
        : 'Jelajahi fitur-fitur Statify secara bertahap. Mulai dari import data, kemudian statistik deskriptif, baru ke analisis yang lebih kompleks.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Back Up Your Original Data' : 'Backup Data Asli',
      content: isEn
        ? 'Always keep a backup of your original data before transforming or manipulating it in Statify.'
        : 'Selalu simpan backup data asli Anda sebelum melakukan transformasi atau manipulasi data di Statify.'
    },
    {
      type: 'tip' as const,
      title: isEn ? 'Use the Guides' : 'Manfaatkan Panduan',
      content: isEn
        ? 'Use the complete guide for each feature in the Help Center to get the most out of Statify.'
        : 'Gunakan panduan lengkap untuk setiap fitur yang tersedia di Help Center untuk memaksimalkan penggunaan Statify.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'File Guide' : 'Panduan File', href: '/help/file-guide' },
    { title: isEn ? 'Data Guide' : 'Panduan Data', href: '/help/data-guide' },
    { title: isEn ? 'Statistics Guide' : 'Panduan Statistik', href: '/help/statistics-guide' },
    { title: isEn ? 'FAQ - Frequently Asked Questions' : 'FAQ - Pertanyaan Umum', href: '/help/faq' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Getting Started with Statify" : "Memulai dengan Statify"}
      description={isEn
        ? "A complete guide to start using Statify - a statistical analysis tool compatible with SPSS"
        : "Panduan lengkap untuk mulai menggunakan Statify - alat analisis statistik yang kompatibel dengan SPSS"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};
