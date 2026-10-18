/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpStep, HelpSection } from '../../ui/HelpLayout';
import { Settings, FileText } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const DefineVarPropsGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'how-to-steps',
      title: isEn ? 'How to Define Variable Properties' : 'Cara Mendefinisikan Properti Variabel',
      description: isEn ? 'A step-by-step guide to reviewing and setting variable properties' : 'Panduan langkah demi langkah untuk meninjau dan mengatur properti variabel',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpStep
            number={1}
            title={isEn ? "Open the Data Menu" : "Buka Menu Data"}
            description={isEn ? "Click 'Data' in the app's top menu bar." : "Klik 'Data' di bilah menu atas aplikasi."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose Define Variable Properties" : "Pilih Define Variable Properties"}
            description={isEn
              ? "Click Data → Define Variable Properties to open the wizard."
              : "Klik Data → Define Variable Properties untuk membuka wizard."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose the Variables to Review" : "Pilih Variabel untuk Ditinjau"}
            description={isEn
              ? "Drag variables from the 'Available' list to 'Variables to Review'."
              : "Seret variabel dari daftar 'Available' ke 'Variables to Review'."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Continue to the Next Step" : "Lanjutkan ke Langkah Berikutnya"}
            description={isEn
              ? "Click 'Continue' to move on to the property editing stage."
              : "Klik 'Continue' untuk masuk ke tahap edit properti."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Edit the Variable Properties" : "Edit Properti Variabel"}
            description={isEn
              ? "Adjust the name, label, type, and other properties in the editable grid."
              : "Sesuaikan nama, label, jenis, dan properti lainnya dalam grid yang dapat diedit."}
          />
          <HelpStep
            number={6}
            title={isEn ? "Apply the Changes" : "Terapkan Perubahan"}
            description={isEn
              ? "Click 'OK' to save all variable property changes."
              : "Klik 'OK' untuk menyimpan semua perubahan properti variabel."}
          />
        </div>
      )
    },
    {
      id: 'features',
      title: isEn ? 'Features & Process' : 'Fitur & Proses',
      description: isEn ? 'Understanding the two-step process for defining variable properties' : 'Memahami proses dua langkah untuk definisi properti variabel',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Two-Step Process" : "Proses Dua Langkah"} variant="feature">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              {isEn ? (
                <>
                  <li>
                    <strong>Review</strong>: Choose variables from your dataset and review their current properties and values.
                  </li>
                  <li>
                    <strong>Edit</strong>: Update variable names, labels, types, and other properties to get your data ready for analysis.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <strong>Tinjau</strong>: Pilih variabel dari dataset Anda dan tinjau properti dan nilai mereka saat ini.
                  </li>
                  <li>
                    <strong>Edit</strong>: Perbarui nama variabel, label, jenis, dan properti lainnya untuk membuat data Anda siap untuk analisis.
                  </li>
                </>
              )}
            </ol>
          </HelpCard>

          <HelpAlert variant="info" title={isEn ? "Main Purpose" : "Tujuan Utama"}>
            <p className="text-sm mt-2">
              {isEn
                ? "This feature helps make sure your data is labeled and organized correctly, which is important for accurate analysis."
                : "Fitur ini membantu memastikan data Anda diberi label dan diorganisir dengan benar, yang penting untuk analisis yang akurat."}
            </p>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'workflow',
      title: isEn ? 'Detailed Workflow' : 'Alur Kerja Detail',
      description: isEn ? 'A step-by-step process for using the feature' : 'Proses langkah demi langkah untuk menggunakan fitur',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <p>
            {isEn
              ? "This feature guides you through a simple two-step process to set up your variables."
              : "Fitur ini memandu Anda melalui proses dua langkah sederhana untuk mengatur variabel Anda."}
          </p>

          <HelpSection title={isEn ? "Step 1: Choose Variables" : "Langkah 1: Pilih Variabel"}>
            <ul className="list-disc list-inside text-sm space-y-1">
              {isEn ? (
                <>
                  <li>You will see two lists: "Available Variables" and "Variables to Review".</li>
                  <li>Move the variables you want to work on from "Available" to "Review".</li>
                  <li>
                    You can set limits on:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li>How many rows to review (useful for large datasets).</li>
                      <li>How many unique values are shown per variable.</li>
                    </ul>
                  </li>
                  <li>Click "Continue" to move to the next step.</li>
                </>
              ) : (
                <>
                  <li>Anda akan melihat dua daftar: "Variabel Tersedia" dan "Variabel untuk Ditinjau".</li>
                  <li>Pindahkan variabel yang ingin Anda kerjakan dari "Tersedia" ke "Tinjau".</li>
                  <li>
                    Anda dapat menetapkan batas pada:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li>Berapa banyak baris yang akan ditinjau (berguna untuk dataset besar).</li>
                      <li>Berapa banyak nilai unik yang ditampilkan per variabel.</li>
                    </ul>
                  </li>
                  <li>Klik "Lanjutkan" untuk pindah ke langkah berikutnya.</li>
                </>
              )}
            </ul>
          </HelpSection>

          <HelpSection title={isEn ? "Step 2: Edit Properties" : "Langkah 2: Edit Properti"}>
            <ul className="list-disc list-inside text-sm space-y-1">
              {isEn ? (
                <>
                  <li>
                    <strong>Variable Grid</strong>: The selected variables appear in an editable grid.
                  </li>
                  <li>
                    <strong>What You Can Edit</strong>:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li><strong>Name</strong>: The variable name.</li>
                      <li><strong>Label</strong>: A descriptive label for the variable.</li>
                      <li><strong>Measurement Level</strong>: Set to Nominal, Ordinal, or Scale.</li>
                      <li><strong>Role</strong>: Define how the variable is used (Input, Target, etc.).</li>
                      <li><strong>Type</strong>: Set the data type (Numeric, String, Date).</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Automatic Suggestions</strong>: Use the "Suggest Measurement Level" button to get recommendations based on your data.
                  </li>
                  <li>
                    <strong>Value Labels</strong>: For each unique value found in your data, you can:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li>Add a descriptive text label.</li>
                      <li>Mark certain values as "Missing".</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Save Changes</strong>: Click "OK" to save your changes.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <strong>Grid Variabel</strong>: Variabel yang dipilih muncul dalam grid yang dapat diedit.
                  </li>
                  <li>
                    <strong>Yang Dapat Anda Edit</strong>:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li><strong>Nama</strong>: Nama variabel.</li>
                      <li><strong>Label</strong>: Label deskriptif untuk variabel.</li>
                      <li><strong>Tingkat Pengukuran</strong>: Atur ke Nominal, Ordinal, atau Skala.</li>
                      <li><strong>Peran</strong>: Tentukan bagaimana variabel digunakan (Input, Target, dll.).</li>
                      <li><strong>Jenis</strong>: Atur jenis data (Numerik, String, Tanggal).</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Saran Otomatis</strong>: Gunakan tombol "Sarankan Tingkat Pengukuran" untuk mendapatkan rekomendasi berdasarkan data Anda.
                  </li>
                  <li>
                    <strong>Label Nilai</strong>: Untuk setiap nilai unik yang ditemukan dalam data Anda, Anda dapat:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li>Menambahkan label teks deskriptif.</li>
                      <li>Menandai nilai tertentu sebagai "Hilang".</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Simpan Perubahan</strong>: Klik "OK" untuk menyimpan perubahan Anda.
                  </li>
                </>
              )}
            </ul>
          </HelpSection>

          <HelpAlert variant="success" title={isEn ? "Benefits" : "Manfaat"}>
            <p className="text-sm mt-2">
              {isEn
                ? "This process makes sure your variables are labeled and organized correctly, getting your data ready for accurate analysis."
                : "Proses ini memastikan variabel Anda diberi label dan diorganisir dengan benar, membuat data Anda siap untuk analisis yang akurat."}
            </p>
          </HelpAlert>
        </div>
      )
    }
  ];


  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Performance Optimization' : 'Optimasi Performa',
      content: isEn
        ? 'Use reasonable limits for large datasets so the process runs smoothly and efficiently.'
        : 'Gunakan batas yang wajar untuk dataset besar agar proses berjalan dengan lancar dan efisien.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Automatic Suggestions' : 'Saran Otomatis',
      content: isEn
        ? 'Use the "Suggest Measurement Level" feature to get useful recommendations based on the patterns in your data.'
        : 'Gunakan fitur "Sarankan Tingkat Pengukuran" untuk mendapatkan rekomendasi yang berguna berdasarkan pola data Anda.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Validate Missing Values' : 'Validasi Nilai Hilang',
      content: isEn
        ? 'Always double-check the missing value settings to ensure an accurate and valid analysis.'
        : 'Selalu periksa kembali pengaturan nilai yang hilang untuk memastikan analisis yang akurat dan valid.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Set Measurement Level' : 'Atur Tingkat Pengukuran', href: '/help/data-guide/set-measurement-level' },
    { title: isEn ? 'Define Date and Time' : 'Definisi Tanggal Waktu', href: '/help/data-guide/define-datetime' },
    { title: isEn ? 'Select Cases' : 'Pilih Kasus', href: '/help/data-guide/select-cases' },
    { title: isEn ? 'Sort Variables' : 'Urutkan Variabel', href: '/help/data-guide/sort-vars' },
    { title: isEn ? 'Data Management Guide' : 'Panduan Manajemen Data', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Define Variable Properties" : "Definisi Properti Variabel"}
      description={isEn
        ? "A complete guide to reviewing and setting the variable properties of your data in Statify"
        : "Panduan lengkap untuk meninjau dan mengatur properti variabel data Anda di Statify"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default DefineVarPropsGuide;
