import React from 'react';
import { Database, Settings, Shield, BarChart3, ListOrdered, Filter } from 'lucide-react';
import { HelpGuideTemplate } from '../../../ui/HelpGuideTemplate';
import { HelpAlert, HelpCard, HelpStep } from '../../../ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const QuickStartGuide: React.FC = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'how-to-manage',
      title: isEn ? 'How to Manage Data' : 'Cara Mengelola Data',
      description: isEn ? 'A step-by-step guide to effective data management' : 'Panduan langkah demi langkah untuk manajemen data yang efektif',
      icon: ListOrdered,
      content: (
        <div className="space-y-4">
          <HelpStep number={1} title={isEn ? "Set Data Properties" : "Atur Properti Data"}>
            <p className="text-sm">
              {isEn
                ? "Start by setting appropriate variable names, labels, and data types:"
                : "Mulai dengan mengatur nama variabel, label, dan tipe data yang sesuai:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Open <strong>Data → Define Variable Properties</strong></li>
                  <li>Set descriptive variable names</li>
                  <li>Add informative labels</li>
                  <li>Choose the right data type (numeric, string, date)</li>
                </>
              ) : (
                <>
                  <li>Buka <strong>Data → Define Variable Properties</strong></li>
                  <li>Atur nama variabel yang deskriptif</li>
                  <li>Tambahkan label yang informatif</li>
                  <li>Pilih tipe data yang tepat (numeric, string, date)</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={2} title={isEn ? "Organize the Dataset" : "Organisasi Dataset"}>
            <p className="text-sm">
              {isEn
                ? "Arrange your data so it is easy to analyze and understand:"
                : "Susun data Anda agar mudah dianalisis dan dipahami:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Order variables logically with <strong>Sort Variables</strong></li>
                  <li>Sort cases if needed with <strong>Sort Cases</strong></li>
                  <li>Set the measurement level with <strong>Set Measurement Level</strong></li>
                  <li>Apply weighting, if any, with <strong>Weight Cases</strong></li>
                </>
              ) : (
                <>
                  <li>Urutkan variabel secara logis dengan <strong>Sort Variables</strong></li>
                  <li>Urutkan kasus jika diperlukan dengan <strong>Sort Cases</strong></li>
                  <li>Atur tingkat pengukuran dengan <strong>Set Measurement Level</strong></li>
                  <li>Terapkan pembobotan jika ada dengan <strong>Weight Cases</strong></li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={3} title={isEn ? "Check Data Quality" : "Periksa Kualitas Data"}>
            <p className="text-sm">
              {isEn
                ? "Make sure your data is high quality before analysis:"
                : "Pastikan data Anda berkualitas tinggi sebelum analisis:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Identify missing values and outliers</li>
                  <li>Check for duplicates with <strong>Identify Duplicate Cases</strong></li>
                  <li>Validate data consistency across variables</li>
                  <li>Document findings and corrective actions</li>
                </>
              ) : (
                <>
                  <li>Identifikasi missing values dan outliers</li>
                  <li>Cek duplikat dengan <strong>Identify Duplicate Cases</strong></li>
                  <li>Validasi konsistensi data antar variabel</li>
                  <li>Dokumentasikan temuan dan tindakan korektif</li>
                </>
              )}
            </ul>
          </HelpStep>
        </div>
      )
    },
    {
      id: 'common-tasks',
      title: isEn ? 'Common Data Management Tasks' : 'Tugas Umum Manajemen Data',
      description: isEn ? 'The most frequently used data management features' : 'Fitur-fitur yang paling sering digunakan dalam manajemen data',
      icon: Settings,
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <HelpCard title={isEn ? "Data Aggregation" : "Agregasi Data"} icon={BarChart3} variant="feature">
            <p className="text-sm">
              <strong>Data → Aggregate</strong><br />
              {isEn
                ? "Create summary statistics per group for summary analysis"
                : "Buat statistik ringkasan per kelompok untuk analisis summary"}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Filter Data" : "Filter Data"} icon={Filter} variant="feature">
            <p className="text-sm">
              <strong>Data → Select Cases</strong><br />
              {isEn
                ? "Select a subset of the data based on specific criteria for analysis"
                : "Pilih subset data berdasarkan kriteria tertentu untuk analisis"}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Restructuring" : "Restrukturisasi"} icon={Settings} variant="feature">
            <p className="text-sm">
              <strong>Data → Restructure</strong><br />
              {isEn
                ? "Change the data format from wide to long or vice versa"
                : "Ubah format data dari wide ke long atau sebaliknya"}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Date Definition" : "Definisi Tanggal"} icon={Database} variant="feature">
            <p className="text-sm">
              <strong>Data → Define Date and Time</strong><br />
              {isEn
                ? "Set up the time structure for time series analysis"
                : "Atur struktur waktu untuk analisis time series"}
            </p>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      description: isEn ? 'Best practices for effective data management' : 'Praktik terbaik untuk manajemen data yang efektif',
      icon: Shield,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="info" title={isEn ? "Data Preparation" : "Persiapan Data"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Quality data is the foundation of accurate analysis. Time invested in preparing data saves time in the analysis stage."
                : "Data yang berkualitas adalah foundation untuk analisis yang akurat. Investasi waktu dalam persiapan data akan menghemat waktu di tahap analisis."}
            </p>
          </HelpAlert>

          <div className="grid gap-4 md:grid-cols-3">
            <HelpCard title={isEn ? "Variable Naming" : "Penamaan Variabel"} icon={Database} variant="step">
              <ul className="text-sm space-y-1">
                {isEn ? (
                  <>
                    <li>• Use descriptive, consistent names</li>
                    <li>• Avoid spaces and special characters</li>
                    <li>• Use a clear naming convention</li>
                    <li>• Add prefixes for variable categories</li>
                  </>
                ) : (
                  <>
                    <li>• Gunakan nama deskriptif dan konsisten</li>
                    <li>• Hindari spasi dan karakter khusus</li>
                    <li>• Gunakan konvensi penamaan yang jelas</li>
                    <li>• Tambahkan prefix untuk kategori variabel</li>
                  </>
                )}
              </ul>
            </HelpCard>

            <HelpCard title={isEn ? "Data Documentation" : "Dokumentasi Data"} icon={Settings} variant="step">
              <ul className="text-sm space-y-1">
                {isEn ? (
                  <>
                    <li>• Provide informative labels</li>
                    <li>• Document the units of measurement</li>
                    <li>• Record the source and collection date</li>
                    <li>• Keep a data dictionary</li>
                  </>
                ) : (
                  <>
                    <li>• Berikan label yang informatif</li>
                    <li>• Dokumentasikan unit pengukuran</li>
                    <li>• Catat sumber dan tanggal pengumpulan</li>
                    <li>• Simpan kamus data (data dictionary)</li>
                  </>
                )}
              </ul>
            </HelpCard>

            <HelpCard title="Backup & Versioning" icon={Shield} variant="step">
              <ul className="text-sm space-y-1">
                {isEn ? (
                  <>
                    <li>• Keep a backup of the original data</li>
                    <li>• Use versioning to track changes</li>
                    <li>• Document every transformation</li>
                    <li>• Test on a subset of the data first</li>
                  </>
                ) : (
                  <>
                    <li>• Simpan backup data asli</li>
                    <li>• Gunakan versioning untuk track perubahan</li>
                    <li>• Dokumentasikan setiap transformasi</li>
                    <li>• Test pada subset data terlebih dahulu</li>
                  </>
                )}
              </ul>
            </HelpCard>
          </div>
        </div>
      )
    }
  ];

  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Start with Exploration' : 'Mulai dengan Eksplorasi',
      content: isEn
        ? 'Always start by exploring the data with descriptive statistics before running transformations or advanced analyses.'
        : 'Selalu mulai dengan mengeksplorasi data menggunakan statistik deskriptif sebelum melakukan transformasi atau analisis lanjutan.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Complete Documentation' : 'Dokumentasi Lengkap',
      content: isEn
        ? 'Document every data transformation step. This matters for reproducibility and the audit trail.'
        : 'Dokumentasikan setiap langkah transformasi data. Ini penting untuk reproducibility dan audit trail.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Back Up the Original Data' : 'Backup Data Asli',
      content: isEn
        ? 'Always keep a backup of the original data before transforming it. Use Save As to create different versions.'
        : 'Selalu simpan backup data asli sebelum melakukan transformasi. Gunakan Save As untuk membuat versi yang berbeda.'
    },
    {
      type: 'tip' as const,
      title: isEn ? 'Validate After Transforming' : 'Validasi Setelah Transformasi',
      content: isEn
        ? 'After each transformation, validate the result to make sure it matches your expectations before moving on.'
        : 'Setelah setiap transformasi, lakukan validasi untuk memastikan hasilnya sesuai ekspektasi sebelum melanjutkan.'
    }
  ];

  const relatedTopics = [
    { title: 'Define Variable Properties', href: '/help/data-guide/define-var-props' },
    { title: 'Sort Cases', href: '/help/data-guide/sort-cases' },
    { title: 'Select Cases', href: '/help/data-guide/select-cases' },
    { title: 'Aggregate Data', href: '/help/data-guide/aggregate' },
    { title: 'Set Measurement Level', href: '/help/data-guide/set-measurement-level' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Quick Start - Data Management" : "Quick Start - Manajemen Data"}
      description={isEn
        ? "A quick guide to managing, transforming, and ensuring the quality of data in Statify"
        : "Panduan cepat untuk mengelola, mentransformasi, dan memastikan kualitas data di Statify"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default QuickStartGuide;
