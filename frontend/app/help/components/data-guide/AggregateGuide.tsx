/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpStep, HelpSection } from '../../ui/HelpLayout';
import { Database, Settings, Calculator } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const AggregateGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'overview',
      title: isEn ? 'How to Use Data Aggregation' : 'Cara Menggunakan Agregasi Data',
      description: isEn ? 'A step-by-step guide to aggregating data in Statify' : 'Panduan langkah demi langkah untuk mengagregasi data dalam Statify',
      icon: Database,
      content: (
        <div className="space-y-4">
          <HelpStep
            number={1}
            title={isEn ? "Open the Data Menu" : "Buka Menu Data"}
            description={isEn ? "Click 'Data' in the app's top menu bar." : "Klik 'Data' di bilah menu atas aplikasi."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose Aggregate" : "Pilih Aggregate"}
            description={isEn ? "Click Data → Aggregate to open the data aggregation dialog." : "Klik Data → Aggregate untuk membuka dialog agregasi data."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose the Break Variables" : "Pilih Variabel Break"}
            description={isEn
              ? "Drag the variables used to group the data into the 'Break Variable(s)' list."
              : "Seret variabel yang akan digunakan untuk mengelompokkan data ke daftar 'Break Variable(s)'."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Choose the Variables to Aggregate" : "Pilih Variabel untuk Diagregasi"}
            description={isEn
              ? "Drag the variables to summarize into the 'Aggregated Variables' list."
              : "Seret variabel yang akan diringkas ke daftar 'Aggregated Variables'."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Set the Aggregate Function" : "Tentukan Fungsi Agregasi"}
            description={isEn
              ? "Select a variable in the aggregated list and click 'Function...' to choose the statistic (Mean, Sum, Max, etc.)."
              : "Pilih variabel dalam daftar agregasi dan klik 'Function...' untuk memilih jenis statistik (Mean, Sum, Max, dll.)."}
          />
          <HelpStep
            number={6}
            title={isEn ? "Run the Aggregation" : "Jalankan Agregasi"}
            description={isEn
              ? "Click 'OK' to process the aggregation and create a new dataset."
              : "Klik 'OK' untuk memproses agregasi dan membuat dataset baru."}
          />
        </div>
      )
    },
    {
      id: 'features',
      title: isEn ? 'Features & Concepts' : 'Fitur & Konsep',
      description: isEn ? 'Understanding the basic concepts and benefits of data aggregation' : 'Memahami konsep dasar dan manfaat agregasi data',
      icon: Calculator,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "What Is Data Aggregation" : "Apa itu Agregasi Data"} variant="feature">
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Data aggregation lets you create summary statistics for certain variables within groups defined by the break variables."
                : "Agregasi data memungkinkan Anda membuat statistik ringkasan untuk variabel tertentu dalam kelompok yang didefinisikan oleh variabel break."}
            </p>
          </HelpCard>

          <HelpAlert variant="tip" title={isEn ? "When to Use Aggregation" : "Kapan Menggunakan Agregasi"}>
            {isEn ? "Use data aggregation when you want to:" : "Gunakan agregasi data ketika Anda ingin:"}
            <ul className="list-disc list-inside mt-2 space-y-1">
              {isEn ? (
                <>
                  <li>Calculate statistics per group (mean, sum, etc.)</li>
                  <li>Summarize a large dataset into information that is easier to understand</li>
                  <li>Create summary reports based on certain categories</li>
                </>
              ) : (
                <>
                  <li>Menghitung statistik per kelompok (rata-rata, jumlah, dll.)</li>
                  <li>Meringkas dataset besar menjadi informasi yang lebih mudah dipahami</li>
                  <li>Membuat laporan ringkasan berdasarkan kategori tertentu</li>
                </>
              )}
            </ul>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'configuration',
      title: isEn ? 'Variable Configuration' : 'Konfigurasi Variabel',
      description: isEn ? 'How to set up variables for effective aggregation' : 'Cara mengatur variabel untuk agregasi yang efektif',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpSection title={isEn ? "Choose the Break Variables" : "Pilih Variabel Break"}>
            <p className="text-sm mb-3">
              {isEn
                ? "These variables define the groups for aggregation. Each unique combination of values in the break variables creates a group."
                : "Variabel ini mendefinisikan kelompok untuk agregasi. Setiap kombinasi unik dari nilai dalam variabel break akan membuat sebuah kelompok."}
            </p>

            <HelpCard title={isEn ? "Practical Example" : "Contoh Praktis"} variant="step">
              <p className="text-sm">
                {isEn
                  ? "If \"Gender\" and \"Region\" are the break variables, the data is aggregated separately for each Gender-Region combination (Male-Jakarta, Female-Jakarta, Male-Surabaya, etc.)."
                  : "Jika \"Jenis Kelamin\" dan \"Wilayah\" adalah variabel break, data akan diagregasi secara terpisah untuk setiap kombinasi Jenis Kelamin-Wilayah (Laki-laki-Jakarta, Perempuan-Jakarta, Laki-laki-Surabaya, dll.)."}
              </p>
            </HelpCard>
          </HelpSection>

          <HelpSection title={isEn ? "Choose the Variables to Aggregate" : "Pilih Variabel yang Diagregasi"}>
            <p className="text-sm">
              {isEn
                ? "These are the variables that will be summarized. For each selected variable, you can apply an aggregate function to calculate a statistic for every group defined by the break variables."
                : "Ini adalah variabel yang akan diringkas. Untuk setiap variabel yang dipilih, Anda dapat menerapkan fungsi agregasi untuk menghitung statistik untuk setiap kelompok yang didefinisikan oleh variabel break."}
            </p>
          </HelpSection>
        </div>
      )
    },
    {
      id: 'ui-variables',
      title: isEn ? 'Tab: Variables' : 'Tab: Variabel (Variables)',
      description: isEn ? 'The main controls in the Variables tab for configuring aggregation' : 'Kontrol utama dalam tab Variables untuk konfigurasi agregasi',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpSection title={isEn ? "Break Variable(s)" : "Variabel Pemisah (Break Variable(s))"}>
            <div className="text-sm space-y-2">
              {isEn ? (
                <>
                  <p>Drag variables from the Available list to the <strong>Break Variable(s)</strong> list to define the groups.</p>
                  <p>Order the break variables by grouping priority.</p>
                </>
              ) : (
                <>
                  <p>Seret variabel dari daftar Available ke daftar <strong>Break Variable(s)</strong> untuk mendefinisikan kelompok.</p>
                  <p>Gunakan urutan variabel break sesuai prioritas pengelompokan.</p>
                </>
              )}
            </div>
          </HelpSection>

          <HelpSection title={isEn ? "Aggregated Variables" : "Variabel yang Diagregasi (Aggregated Variables)"}>
            <div className="text-sm space-y-2">
              {isEn ? (
                <>
                  <p>Drag variables from Available to <strong>Aggregated Variables</strong>.</p>
                  <p>Select one item in this list to enable the buttons:</p>
                  <ul className="list-disc list-inside ml-4">
                    <li><strong>Function...</strong> — choose the aggregate function (Mean, Sum, Max, etc.).</li>
                    <li><strong>Name & Label...</strong> — set the name/label of the resulting variable.</li>
                  </ul>
                </>
              ) : (
                <>
                  <p>Seret variabel dari Available ke <strong>Aggregated Variables</strong>.</p>
                  <p>Pilih satu item di daftar ini untuk mengaktifkan tombol:</p>
                  <ul className="list-disc list-inside ml-4">
                    <li><strong>Function...</strong> — memilih fungsi agregasi (Mean, Sum, Max, dsb.).</li>
                    <li><strong>Name & Label...</strong> — mengatur nama/label variabel hasil.</li>
                  </ul>
                </>
              )}
            </div>
          </HelpSection>

          <HelpSection title={isEn ? "Number of Cases" : "Jumlah Kasus (Number of cases)"}>
            <div className="text-sm space-y-1">
              {isEn ? (
                <>
                  <p>Check <strong>Number of cases</strong> to create a variable that counts the cases per group.</p>
                  <p>Fill in <strong>Name:</strong> for the output variable name.</p>
                </>
              ) : (
                <>
                  <p>Centang <strong>Number of cases</strong> untuk membuat variabel hitung kasus per kelompok.</p>
                  <p>Isikan <strong>Name:</strong> untuk nama variabel output.</p>
                </>
              )}
            </div>
          </HelpSection>
        </div>
      )
    },
    {
      id: 'functions',
      title: isEn ? 'Aggregate Functions' : 'Fungsi Agregasi',
      description: isEn ? 'The different aggregate functions available' : 'Berbagai jenis fungsi agregasi yang tersedia',
      icon: Calculator,
      content: (
        <div className="space-y-6">
          <p>
            {isEn ? "This feature provides several categories of aggregate functions:" : "Fitur ini menyediakan beberapa kategori fungsi agregasi:"}
          </p>

          <HelpCard title={isEn ? "Summary Statistics" : "Statistik Ringkasan"} variant="feature">
            <ul className="space-y-2">
              {isEn ? (
                <>
                  <li><strong>Mean</strong>: Calculates the average value of the cases in each group</li>
                  <li><strong>Median</strong>: Finds the middle value in each group when the values are sorted</li>
                  <li><strong>Sum</strong>: Calculates the total of all values in each group</li>
                  <li><strong>Standard Deviation</strong>: Measures the amount of variation in each group</li>
                </>
              ) : (
                <>
                  <li><strong>Rata-rata</strong>: Menghitung nilai rata-rata pada kasus dalam setiap kelompok</li>
                  <li><strong>Median</strong>: Menemukan nilai tengah dalam setiap kelompok ketika nilai diurutkan</li>
                  <li><strong>Jumlah</strong>: Menghitung total dari semua nilai dalam setiap kelompok</li>
                  <li><strong>Deviasi Standar</strong>: Mengukur jumlah variasi dalam setiap kelompok</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title={isEn ? "Specific Values" : "Nilai Spesifik"} variant="feature">
            <ul className="space-y-2">
              {isEn ? (
                <>
                  <li><strong>Maximum</strong>: Finds the highest value in each group</li>
                  <li><strong>Minimum</strong>: Finds the lowest value in each group</li>
                  <li><strong>First</strong>: Takes the first value that appears in each group</li>
                  <li><strong>Last</strong>: Takes the last value that appears in each group</li>
                </>
              ) : (
                <>
                  <li><strong>Maksimum</strong>: Menemukan nilai tertinggi dalam setiap kelompok</li>
                  <li><strong>Minimum</strong>: Menemukan nilai terendah dalam setiap kelompok</li>
                  <li><strong>Pertama</strong>: Mengambil nilai pertama yang muncul dalam setiap kelompok</li>
                  <li><strong>Terakhir</strong>: Mengambil nilai terakhir yang muncul dalam setiap kelompok</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title={isEn ? "Number of Cases" : "Jumlah Kasus"} variant="feature">
            <HelpAlert variant="info" title={isEn ? "Understanding the Counts" : "Memahami Penghitungan"}>
              {isEn
                ? "These counting options help you understand how many cases are in each group: - Use N to count valid responses - Use NMISS to count missing responses - NU gives the total count including missing values"
                : "Opsi penghitungan ini membantu Anda memahami berapa banyak kasus dalam setiap kelompok: - Gunakan N untuk menghitung respons yang valid - Gunakan NMISS untuk menghitung respons yang hilang - NU memberikan total hitungan termasuk nilai yang hilang"}
            </HelpAlert>

            <ul className="space-y-2 mt-4">
              {isEn ? (
                <>
                  <li><strong>Weighted (N)</strong>: Counts the number of cases in each group with non-missing values</li>
                  <li><strong>Weighted Missing (NMISS)</strong>: Counts the number of cases with missing values</li>
                  <li><strong>Unweighted (NU)</strong>: Counts the total number of cases in each group</li>
                </>
              ) : (
                <>
                  <li><strong>Berbobot (N)</strong>: Menghitung jumlah kasus dalam setiap kelompok dengan nilai non-missing</li>
                  <li><strong>Berbobot Hilang (NMISS)</strong>: Menghitung jumlah kasus dengan nilai yang hilang</li>
                  <li><strong>Tidak Berbobot (NU)</strong>: Menghitung total jumlah kasus dalam setiap kelompok</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title={isEn ? "Percentages, Fractions, Counts" : "Persentase, Fraksi, Hitungan"} variant="feature">
            <div className="space-y-4">
              <div>
                <h5 className="font-semibold mb-2">{isEn ? "Percentages" : "Persentase"}</h5>
                <p className="text-sm text-muted-foreground mb-2">
                  {isEn
                    ? "Calculates the percentage of cases that meet certain criteria:"
                    : "Menghitung persentase kasus yang memenuhi kriteria tertentu:"}
                </p>
                <ul className="space-y-1 text-sm ml-4">
                  {isEn ? (
                    <>
                      <li><strong>Above</strong>: Percentage of cases above a specified value</li>
                      <li><strong>Below</strong>: Percentage of cases below a specified value</li>
                      <li><strong>Inside</strong>: Percentage of cases between two specified values</li>
                      <li><strong>Outside</strong>: Percentage of cases outside a specified range of values</li>
                    </>
                  ) : (
                    <>
                      <li><strong>Di Atas</strong>: Persentase kasus di atas nilai yang ditentukan</li>
                      <li><strong>Di Bawah</strong>: Persentase kasus di bawah nilai yang ditentukan</li>
                      <li><strong>Di Antara</strong>: Persentase kasus di antara dua nilai yang ditentukan</li>
                      <li><strong>Di Luar</strong>: Persentase kasus di luar rentang nilai yang ditentukan</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="space-y-2">
                {isEn ? (
                  <>
                    <p><strong>Fractions</strong>: Similar to percentages but expressed as a proportion (0-1 instead of 0-100)</p>
                    <p><strong>Counts</strong>: A simple count of the cases that meet the criteria</p>
                  </>
                ) : (
                  <>
                    <p><strong>Fraksi</strong>: Mirip dengan persentase tetapi dinyatakan sebagai proporsi (0-1 bukan 0-100)</p>
                    <p><strong>Hitungan</strong>: Penghitungan sederhana dari kasus yang memenuhi kriteria</p>
                  </>
                )}
              </div>
            </div>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'ui-options',
      title: isEn ? 'Tab: Options' : 'Tab: Opsi (Options)',
      description: isEn ? 'Performance options for large datasets' : 'Opsi performa untuk dataset besar',
      icon: Settings,
      content: (
        <div className="space-y-3 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>File is already sorted on break variable(s)</strong></li>
            <li><strong>Sort file before aggregating</strong></li>
          </ul>
          <HelpAlert variant="info" title={isEn ? "Note" : "Catatan"}>
            {isEn
              ? "These options are available in the UI to document the workflow. They currently do not change the aggregation process behind the scenes."
              : "Opsi ini tersedia di UI untuk dokumentasi workflow. Saat ini tidak mengubah proses agregasi di belakang layar."}
          </HelpAlert>
        </div>
      )
    },
  ];

  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Start Simple' : 'Mulai Sederhana',
      content: isEn
        ? 'Start with just one break variable to understand how aggregation works before adding more complex groupings.'
        : 'Mulai dengan hanya satu variabel break untuk memahami cara kerja agregasi sebelum menambahkan pengelompokan yang lebih kompleks.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Validate the Results' : 'Validasi Hasil',
      content: isEn
        ? 'Always review the aggregation results to make sure they make sense and fit the goal of your analysis.'
        : 'Selalu tinjau hasil agregasi untuk memastikan hasilnya masuk akal dan sesuai dengan tujuan analisis Anda.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Back Up Data' : 'Backup Data',
      content: isEn
        ? 'Save the original dataset before running the aggregation so you can return to the raw data if needed.'
        : 'Simpan dataset asli sebelum menjalankan agregasi sehingga Anda dapat kembali ke data mentah jika diperlukan.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Sort Cases' : 'Urutkan Kasus', href: '/help/data-guide/sort-cases' },
    { title: isEn ? 'Select Cases' : 'Pilih Kasus', href: '/help/data-guide/select-cases' },
    { title: isEn ? 'Define Variable Properties' : 'Definisi Properti Variabel', href: '/help/data-guide/define-var-props' },
    { title: isEn ? 'Descriptive Statistics' : 'Statistik Deskriptif', href: '/help/statistics-guide/descriptive' },
    { title: isEn ? 'Data Management Guide' : 'Panduan Manajemen Data', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Data Aggregation" : "Agregasi Data"}
      description={isEn
        ? "A complete guide to aggregating data into group-based summary statistics in Statify"
        : "Panduan lengkap untuk mengagregasi data menjadi statistik ringkasan berdasarkan kelompok dalam Statify"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default AggregateGuide;
