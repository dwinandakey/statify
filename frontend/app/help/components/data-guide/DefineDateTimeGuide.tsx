/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpStep, HelpSection } from '../../ui/HelpLayout';
import { Calendar, Clock, Settings } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const DefineDateTimeGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'how-to-steps',
      title: isEn ? 'How to Define Dates and Times' : 'Cara Mendefinisikan Tanggal dan Waktu',
      description: isEn ? 'A step-by-step guide to setting up a date and time structure' : 'Panduan langkah demi langkah untuk mengatur struktur tanggal dan waktu',
      icon: Calendar,
      content: (
        <div className="space-y-4">
          <HelpStep
            number={1}
            title={isEn ? "Open the Data Menu" : "Buka Menu Data"}
            description={isEn ? "Click 'Data' in the app's top menu bar." : "Klik 'Data' di bilah menu atas aplikasi."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose Define Dates" : "Pilih Define Dates"}
            description={isEn ? "Click Data → Define Dates to open the date definition dialog." : "Klik Data → Define Dates untuk membuka dialog definisi tanggal."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose a Date Format" : "Pilih Format Tanggal"}
            description={isEn
              ? "Choose the date format that matches the structure of your data (for example: Year, Quarter, Month)."
              : "Pilih format tanggal yang sesuai dengan struktur data Anda (misalnya: Tahun, Kuartal, Bulan)."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Review the Preview" : "Tinjau Pratinjau"}
            description={isEn
              ? "Check the preview of the variables that will be created and the sample data shown."
              : "Periksa pratinjau variabel yang akan dibuat dan contoh data yang ditampilkan."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Apply the Definition" : "Terapkan Definisi"}
            description={isEn
              ? "Click 'OK' to create the new date variables in your dataset."
              : "Klik 'OK' untuk membuat variabel tanggal baru dalam dataset Anda."}
          />
        </div>
      )
    },
    {
      id: 'features',
      title: isEn ? 'Features & Benefits' : 'Fitur & Manfaat',
      description: isEn ? 'Understanding how the date definition feature works and its benefits' : 'Memahami cara kerja dan manfaat fitur definisi tanggal',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Automatic Variable Creation" : "Pembuatan Variabel Otomatis"} variant="feature">
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "The system automatically creates a new variable for each time component you need (such as YEAR_, QUARTER_, MONTH_)."
                : "Sistem secara otomatis membuat variabel baru untuk setiap komponen waktu yang Anda butuhkan (seperti YEAR_, QUARTER_, MONTH_)."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Formatted DATE_ Variable" : "Variabel DATE_ Terformat"} variant="feature">
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Builds a formatted date variable that shows the full date in an easy-to-read format."
                : "Membangun variabel tanggal yang diformat untuk menampilkan tanggal lengkap dalam format yang mudah dibaca."}
            </p>
          </HelpCard>

          <HelpAlert variant="info" title={isEn ? "Automatic Setup" : "Pengaturan Otomatis"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Once you choose a date format, the system automatically sets up your variables so that time series analysis works correctly with your data."
                : "Setelah Anda memilih format tanggal, sistem secara otomatis mengatur variabel Anda sehingga analisis deret waktu akan bekerja dengan benar dengan data Anda."}
            </p>
          </HelpAlert>

          <HelpSection title={isEn ? "Example: Years and Months" : "Contoh: Tahun dan Bulan"}>
            <HelpCard title={isEn ? "What You Will Get" : "Yang Akan Anda Dapatkan"} variant="feature">
              <ul className="list-disc list-inside space-y-1">
                {isEn ? (
                  <>
                    <li><strong>Your choice</strong>: Years, months</li>
                    <li><strong>Starting values</strong>: Year: 2022, Month: 11</li>
                    <li><strong>New variables created</strong>:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li><code>YEAR_</code> - shows the year (2022)</li>
                        <li><code>MONTH_</code> - shows the month (11)</li>
                        <li><code>DATE_</code> - shows the formatted date (2022-11)</li>
                      </ul>
                    </li>
                  </>
                ) : (
                  <>
                    <li><strong>Pilihan Anda</strong>: Tahun, bulan</li>
                    <li><strong>Nilai awal</strong>: Tahun: 2022, Bulan: 11</li>
                    <li><strong>Variabel baru yang dibuat</strong>:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li><code>YEAR_</code> - menampilkan tahun (2022)</li>
                        <li><code>MONTH_</code> - menampilkan bulan (11)</li>
                        <li><code>DATE_</code> - menampilkan tanggal terformat (2022-11)</li>
                      </ul>
                    </li>
                  </>
                )}
              </ul>
            </HelpCard>
          </HelpSection>

          <HelpSection title={isEn ? "Example: Weeks and Workdays" : "Contoh: Minggu dan Hari Kerja"}>
            <HelpCard title={isEn ? "What You Will Get" : "Yang Akan Anda Dapatkan"} variant="feature">
              <ul className="list-disc list-inside space-y-1">
                {isEn ? (
                  <>
                    <li><strong>Your choice</strong>: Weeks, workdays (5-day week)</li>
                    <li><strong>Starting values</strong>: Week: 51, Workday: 4</li>
                    <li><strong>New variables created</strong>:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li><code>WEEK_</code> - shows the week number (51)</li>
                        <li><code>WDAY_</code> - shows the workday (4)</li>
                        <li><code>DATE_</code> - shows the formatted date (51-4)</li>
                      </ul>
                    </li>
                  </>
                ) : (
                  <>
                    <li><strong>Pilihan Anda</strong>: Minggu, hari kerja (minggu 5 hari)</li>
                    <li><strong>Nilai awal</strong>: Minggu: 51, Hari kerja: 4</li>
                    <li><strong>Variabel baru yang dibuat</strong>:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li><code>WEEK_</code> - menampilkan nomor minggu (51)</li>
                        <li><code>WDAY_</code> - menampilkan hari kerja (4)</li>
                        <li><code>DATE_</code> - menampilkan tanggal terformat (51-4)</li>
                      </ul>
                    </li>
                  </>
                )}
              </ul>
            </HelpCard>
          </HelpSection>
        </div>
      )
    },
    {
      id: 'supported-formats',
      title: isEn ? 'Available Formats' : 'Format yang Tersedia',
      description: isEn ? 'Choose the right date format for your data' : 'Pilih format tanggal yang tepat untuk data Anda',
      icon: Clock,
      content: (
        <div className="space-y-4">
          <p>
            {isEn
              ? "Here are all the date formats you can choose from. Each option creates the right variables plus a formatted DATE_ variable for your needs."
              : "Berikut adalah semua format tanggal yang dapat Anda pilih. Setiap opsi membuat variabel yang tepat dan variabel DATE_ terformat untuk kebutuhan Anda."}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <HelpCard title={isEn ? "Basic Formats" : "Format Dasar"} variant="step">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {isEn ? (
                  <>
                    <li>Year only</li>
                    <li>Year, quarter</li>
                    <li>Year, month</li>
                    <li>Year, quarter, month</li>
                    <li>Day only</li>
                    <li>Week, day</li>
                  </>
                ) : (
                  <>
                    <li>Tahun saja</li>
                    <li>Tahun, kuartal</li>
                    <li>Tahun, bulan</li>
                    <li>Tahun, kuartal, bulan</li>
                    <li>Hari saja</li>
                    <li>Minggu, hari</li>
                  </>
                )}
              </ul>
            </HelpCard>

            <HelpCard title={isEn ? "Workday Formats" : "Format Hari Kerja"} variant="step">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {isEn ? (
                  <>
                    <li>Week, workday (5-day week)</li>
                    <li>Week, workday (6-day week)</li>
                    <li>Day, work hours (8-hour)</li>
                    <li>Week, workday, hour</li>
                  </>
                ) : (
                  <>
                    <li>Minggu, hari kerja (minggu 5 hari)</li>
                    <li>Minggu, hari kerja (minggu 6 hari)</li>
                    <li>Hari, jam kerja (8 jam)</li>
                    <li>Minggu, hari kerja, jam</li>
                  </>
                )}
              </ul>
            </HelpCard>

            <HelpCard title={isEn ? "Time Formats" : "Format Waktu"} variant="step">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {isEn ? (
                  <>
                    <li>Hour only</li>
                    <li>Day, hour</li>
                    <li>Week, day, hour</li>
                    <li>Minute only</li>
                    <li>Hour, minute</li>
                    <li>Day, hour, minute</li>
                  </>
                ) : (
                  <>
                    <li>Jam saja</li>
                    <li>Hari, jam</li>
                    <li>Minggu, hari, jam</li>
                    <li>Menit saja</li>
                    <li>Jam, menit</li>
                    <li>Hari, jam, menit</li>
                  </>
                )}
              </ul>
            </HelpCard>

            <HelpCard title={isEn ? "High Precision" : "Presisi Tinggi"} variant="step">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {isEn ? (
                  <>
                    <li>Second only</li>
                    <li>Minute, second</li>
                    <li>Hour, minute, second</li>
                    <li>Remove date (clears the existing date definition)</li>
                  </>
                ) : (
                  <>
                    <li>Detik saja</li>
                    <li>Menit, detik</li>
                    <li>Jam, menit, detik</li>
                    <li>Hapus tanggal (menghapus definisi tanggal yang ada)</li>
                  </>
                )}
              </ul>
            </HelpCard>
          </div>
        </div>
      )
    },
  ];



  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Plan the Format' : 'Perencanaan Format',
      content: isEn
        ? 'Think about the date structure you need before starting to ensure optimal time series analysis results.'
        : 'Pikirkan struktur tanggal yang dibutuhkan sebelum memulai untuk memastikan hasil analisis deret waktu yang optimal.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Preview the Results' : 'Pratinjau Hasil',
      content: isEn
        ? 'The system shows sample data so you can see exactly how the date structure will look once applied.'
        : 'Sistem menampilkan contoh data sehingga Anda dapat melihat persis bagaimana struktur tanggal akan terlihat setelah diterapkan.'
    },
    {
      type: 'success' as const,
      title: isEn ? 'Analysis Integration' : 'Integrasi Analisis',
      content: isEn
        ? 'The automatically created date variables are compatible with all time series analysis features in Statify.'
        : 'Variabel tanggal yang dibuat secara otomatis akan kompatibel dengan semua fitur analisis deret waktu di Statify.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Define Variable Properties' : 'Definisi Properti Variabel', href: '/help/data-guide/define-var-props' },
    { title: isEn ? 'Restructure Data' : 'Restrukturisasi Data', href: '/help/data-guide/restructure' },
    { title: isEn ? 'Sort Cases' : 'Urutkan Kasus', href: '/help/data-guide/sort-cases' },
    { title: isEn ? 'Statistical Analysis Guide' : 'Panduan Analisis Statistik', href: '/help/statistics-guide' },
    { title: isEn ? 'Data Management Guide' : 'Panduan Manajemen Data', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Define Dates and Times" : "Definisi Tanggal dan Waktu"}
      description={isEn
        ? "A complete guide to setting up a time-based structure in your Statify dataset"
        : "Panduan lengkap untuk mengatur struktur berbasis waktu dalam dataset Anda di Statify"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default DefineDateTimeGuide;
