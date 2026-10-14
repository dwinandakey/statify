import React from 'react';
import { Database, FileText, Calendar, Settings, Users, BarChart, ListOrdered } from 'lucide-react';
import { HelpGuideTemplate } from '../../../ui/HelpGuideTemplate';
import { HelpAlert, HelpCard, HelpStep } from '../../../ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const DataManagementTab: React.FC = () => {
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
          <HelpStep number={1} title={isEn ? "Set Variable Properties" : "Atur Properti Variabel"}>
            <p className="text-sm">
              {isEn ? "Start by setting the basic variable definitions:" : "Mulai dengan mengatur definisi dasar variabel:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Open <strong>Data → Define Variable Properties</strong></li>
                  <li>Set descriptive, consistent variable names</li>
                  <li>Add informative labels for readability</li>
                  <li>Choose the right data type (numeric, string, date)</li>
                </>
              ) : (
                <>
                  <li>Buka <strong>Data → Define Variable Properties</strong></li>
                  <li>Atur nama variabel yang deskriptif dan konsisten</li>
                  <li>Tambahkan label yang informatif untuk keterbacaan</li>
                  <li>Pilih tipe data yang tepat (numeric, string, date)</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={2} title={isEn ? "Define Special Formats" : "Definisi Format Khusus"}>
            <p className="text-sm">
              {isEn ? "Set special formats for certain data types:" : "Atur format khusus untuk tipe data tertentu:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Use <strong>Data → Define Date and Time</strong> for time variables</li>
                  <li>Set the appropriate date/time format and components</li>
                  <li>Prepare the structure for time series and periodic reporting</li>
                </>
              ) : (
                <>
                  <li>Gunakan <strong>Data → Define Date and Time</strong> untuk variabel waktu</li>
                  <li>Set format dan komponen tanggal/waktu yang sesuai</li>
                  <li>Siapkan struktur untuk time series dan pelaporan periodik</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={3} title={isEn ? "Set the Measurement Level" : "Atur Tingkat Pengukuran"}>
            <p className="text-sm">
              {isEn ? "Determine the measurement scale for accurate analysis:" : "Tentukan skala pengukuran untuk analisis yang akurat:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Open <strong>Data → Set Measurement Level</strong></li>
                  <li>Choose the scale: nominal, ordinal, interval, or ratio</li>
                  <li>Make sure the selection matches the nature of the data</li>
                </>
              ) : (
                <>
                  <li>Buka <strong>Data → Set Measurement Level</strong></li>
                  <li>Pilih skala: nominal, ordinal, interval, atau rasio</li>
                  <li>Pastikan seleksi sesuai dengan nature data</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={4} title={isEn ? "Organization and Weighting" : "Organisasi dan Pembobotan"}>
            <p className="text-sm">
              {isEn ? "Set the data structure and weights as needed:" : "Atur struktur dan bobot data sesuai kebutuhan:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Use <strong>Data → Sort Variables</strong> to set the order</li>
                  <li>Use <strong>Data → Sort Cases</strong> to sort the rows</li>
                  <li>Apply <strong>Data → Weight Cases</strong> when representativeness is needed</li>
                </>
              ) : (
                <>
                  <li>Gunakan <strong>Data → Sort Variables</strong> untuk mengatur urutan</li>
                  <li>Gunakan <strong>Data → Sort Cases</strong> untuk mengurutkan baris</li>
                  <li>Terapkan <strong>Data → Weight Cases</strong> jika diperlukan representativitas</li>
                </>
              )}
            </ul>
          </HelpStep>
        </div>
      )
    },
    {
      id: 'data-features',
      title: isEn ? 'Data Management Features' : 'Fitur Manajemen Data',
      description: isEn ? 'The main tools for managing and optimizing datasets' : 'Tools utama untuk mengelola dan mengoptimalkan dataset',
      icon: Database,
      content: (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <HelpCard title={isEn ? "Variable Properties" : "Properti Variabel"} icon={Database} variant="feature">
            <p className="text-sm">
              <strong>Data → Define Variable Properties</strong><br />
              {isEn
                ? "Set variable names, labels, and data types for a clear structure"
                : "Atur nama variabel, label, dan tipe data untuk struktur yang jelas"}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Date & Time Definition" : "Definisi Tanggal & Waktu"} icon={Calendar} variant="feature">
            <p className="text-sm">
              <strong>Data → Define Date and Time</strong><br />
              {isEn
                ? "Set the date/time format and components for time series"
                : "Set format dan komponen tanggal/waktu untuk time series"}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Measurement Level" : "Tingkat Pengukuran"} icon={BarChart} variant="feature">
            <p className="text-sm">
              <strong>Data → Set Measurement Level</strong><br />
              {isEn
                ? "Determine the scale: nominal, ordinal, interval, ratio"
                : "Tentukan skala: nominal, ordinal, interval, rasio"}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Case Weights" : "Bobot Kasus"} icon={Users} variant="feature">
            <p className="text-sm">
              <strong>Data → Weight Cases</strong><br />
              {isEn
                ? "Apply weights for population representativeness"
                : "Terapkan bobot untuk representativitas populasi"}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Sort Variables" : "Urutkan Variabel"} icon={FileText} variant="feature">
            <p className="text-sm">
              <strong>Data → Sort Variables</strong><br />
              {isEn
                ? "Set the order of variables for easy navigation"
                : "Atur urutan variabel untuk navigasi yang mudah"}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Sort Cases" : "Urutkan Kasus"} icon={Settings} variant="feature">
            <p className="text-sm">
              <strong>Data → Sort Cases</strong><br />
              {isEn
                ? "Reorder rows based on key variables"
                : "Susun ulang baris berdasarkan variabel kunci"}
            </p>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'concepts',
      title: isEn ? 'Key Concepts' : 'Konsep Penting',
      description: isEn ? 'Fundamental principles of data management' : 'Prinsip-prinsip fundamental dalam manajemen data',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="info" title={isEn ? "Good Data Structure" : "Struktur Data yang Baik"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Well-structured data has clear variables, the right data types, and consistent formats. This makes analysis easier and reduces interpretation errors."
                : "Data yang terstruktur dengan baik memiliki variabel yang jelas, tipe data yang tepat, dan format yang konsisten. Ini memudahkan analisis dan mengurangi kesalahan interpretasi."}
            </p>
          </HelpAlert>

          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
            <HelpCard title={isEn ? "Data Structure" : "Struktur Data"} icon={Database} variant="step">
              <ul className="text-sm space-y-1">
                {isEn ? (
                  <>
                    <li>• Use descriptive variable names</li>
                    <li>• Make sure the data types are right</li>
                    <li>• Add informative labels</li>
                    <li>• Avoid special characters</li>
                  </>
                ) : (
                  <>
                    <li>• Gunakan nama variabel yang deskriptif</li>
                    <li>• Pastikan tipe data yang tepat</li>
                    <li>• Tambahkan label informatif</li>
                    <li>• Hindari karakter khusus</li>
                  </>
                )}
              </ul>
            </HelpCard>

            <HelpCard title={isEn ? "Metadata Management" : "Manajemen Metadata"} icon={FileText} variant="step">
              <ul className="text-sm space-y-1">
                {isEn ? (
                  <>
                    <li>• Provide clear labels</li>
                    <li>• Document the units of measurement</li>
                    <li>• Record the source and date</li>
                    <li>• Keep a data dictionary</li>
                  </>
                ) : (
                  <>
                    <li>• Berikan label yang jelas</li>
                    <li>• Dokumentasikan unit pengukuran</li>
                    <li>• Catat sumber dan tanggal</li>
                    <li>• Simpan kamus data</li>
                  </>
                )}
              </ul>
            </HelpCard>

            <HelpCard title={isEn ? "Dataset Organization" : "Organisasi Dataset"} icon={Settings} variant="step">
              <ul className="text-sm space-y-1">
                {isEn ? (
                  <>
                    <li>• Group related variables</li>
                    <li>• Put the ID first</li>
                    <li>• Sort cases logically</li>
                    <li>• Separate raw data from calculated data</li>
                  </>
                ) : (
                  <>
                    <li>• Kelompokkan variabel terkait</li>
                    <li>• Letakkan ID di awal</li>
                    <li>• Urutkan kasus secara logis</li>
                    <li>• Pisahkan data mentah vs calculated</li>
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
      title: isEn ? 'Consistent Naming' : 'Konsistensi Penamaan',
      content: isEn
        ? 'Use a consistent naming convention for variables. For example: age_years, income_monthly, or education_level.'
        : 'Gunakan konvensi penamaan yang konsisten untuk variabel. Misalnya: age_years, income_monthly, atau education_level.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Back Up Before Changes' : 'Backup Sebelum Perubahan',
      content: isEn
        ? 'Always keep a backup of the original file before making significant changes to the data structure.'
        : 'Selalu simpan backup file asli sebelum melakukan perubahan struktur data yang signifikan.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Validate Data Types' : 'Validasi Tipe Data',
      content: isEn
        ? 'Make sure the data type matches the nature of the variable. Wrong data types can lead to inaccurate analysis.'
        : 'Pastikan tipe data sesuai dengan nature variabel. Kesalahan tipe data dapat menyebabkan analisis yang tidak akurat.'
    },
    {
      type: 'tip' as const,
      title: isEn ? 'Complete Documentation' : 'Dokumentasi Lengkap',
      content: isEn
        ? 'Document every variable with a clear label, unit, and description to make results easier to interpret.'
        : 'Dokumentasikan setiap variabel dengan label, unit, dan deskripsi yang jelas untuk memudahkan interpretasi hasil.'
    }
  ];

  const relatedTopics = [
    { title: 'Define Variable Properties', href: '/help/data-guide/define-var-props' },
    { title: 'Define Date and Time', href: '/help/data-guide/date-time' },
    { title: 'Set Measurement Level', href: '/help/data-guide/measurement-level' },
    { title: 'Weight Cases', href: '/help/data-guide/weight-cases' },
    { title: 'Sort Variables', href: '/help/data-guide/sort-variables' },
    { title: 'Sort Cases', href: '/help/data-guide/sort-cases' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Data Management" : "Manajemen Data"}
      description={isEn
        ? "Data management features help you organize, manage, and optimize the structure of your dataset for more effective analysis"
        : "Fitur manajemen data membantu Anda mengatur, mengelola, dan mengoptimalkan struktur dataset untuk analisis yang lebih efektif"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default DataManagementTab;
