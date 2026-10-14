/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpStep, HelpSection } from '../../ui/HelpLayout';
import { Filter, Settings, FileText } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const SelectCasesGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'how-to-steps',
      title: isEn ? 'How to Select Cases' : 'Cara Memilih Kasus',
      description: isEn ? 'A step-by-step guide to filtering cases in a dataset' : 'Panduan langkah demi langkah untuk memfilter kasus dalam dataset',
      icon: Filter,
      content: (
        <div className="space-y-4">
          <HelpStep
            number={1}
            title={isEn ? "Open the Data Menu" : "Buka Menu Data"}
            description={isEn ? "Click 'Data' in the app's top menu bar." : "Klik 'Data' di bilah menu atas aplikasi."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose Select Cases" : "Pilih Select Cases"}
            description={isEn ? "Click Data → Select Cases to open the case selection dialog." : "Klik Data → Select Cases untuk membuka dialog pemilihan kasus."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose a Selection Method" : "Pilih Metode Seleksi"}
            description={isEn
              ? "Choose the appropriate method: all cases, a condition, a random sample, a range, or a filter variable."
              : "Pilih metode yang sesuai: semua kasus, kondisi, sampel acak, rentang, atau variabel filter."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Configure the Criteria" : "Konfigurasi Kriteria"}
            description={isEn
              ? "Adjust the settings based on the chosen method (condition, percentage, range, etc.)."
              : "Sesuaikan pengaturan berdasarkan metode yang dipilih (kondisi, persentase, rentang, dll.)."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Choose the Output" : "Pilih Output"}
            description={isEn
              ? "Decide whether to filter out or delete the unselected cases."
              : "Tentukan apakah akan memfilter atau menghapus kasus yang tidak dipilih."}
          />
          <HelpStep
            number={6}
            title={isEn ? "Apply the Selection" : "Terapkan Seleksi"}
            description={isEn
              ? "Click 'OK' to apply the selection criteria to your dataset."
              : "Klik 'OK' untuk menerapkan kriteria seleksi ke dataset Anda."}
          />
        </div>
      )
    },
    {
      id: 'selection-methods',
      title: isEn ? 'Selection Methods (Select)' : 'Metode Seleksi (Select) ',
      description: isEn ? 'The different ways to select cases in your dataset' : 'Berbagai cara untuk memilih kasus dalam dataset Anda',
      icon: Filter,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "All Cases" : "Semua Kasus"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "Choose this option to include all cases in your dataset. This effectively removes any previously applied filter."
                : "Pilih opsi ini untuk menyertakan semua kasus dalam dataset Anda. Ini secara efektif menghapus filter yang diterapkan sebelumnya."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "If condition is satisfied" : "Jika kondisi terpenuhi (If condition is satisfied)"} variant="feature">
            <p className="text-sm mb-3">
              {isEn
                ? "Build a logical expression to filter cases. Only cases that meet your condition will be selected."
                : "Buat ekspresi logis untuk memfilter kasus. Hanya kasus yang memenuhi kondisi Anda yang akan dipilih."}
            </p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-semibold text-sm mb-1">{isEn ? "Available operators:" : "Operator yang tersedia:"}</p>
              <p className="text-xs font-mono">&gt;, &lt;, ==, != {isEn ? "(comparison)" : "(perbandingan)"}</p>
              <p className="text-xs font-mono">{isEn ? "& (AND), | (OR), ~ (NOT)" : "& (DAN), | (ATAU), ~ (TIDAK)"}</p>
            </div>
          </HelpCard>

          <HelpCard title={isEn ? "Random sample of cases" : "Sampel acak kasus (Random sample of cases)"} variant="feature">
            <p className="text-sm mb-3">{isEn ? "Select a random subset of cases:" : "Pilih subset acak dari kasus:"}</p>
            <div className="space-y-2 text-sm">
              {isEn ? (
                <>
                  <div><strong>Approximately</strong>: Selects roughly a given percentage of all cases.</div>
                  <div><strong>Exactly</strong>: Selects an exact number of cases from the first N cases.</div>
                </>
              ) : (
                <>
                  <div><strong>Kurang Lebih</strong>: Memilih sekitar persentase tertentu dari total kasus.</div>
                  <div><strong>Tepat</strong>: Memilih jumlah kasus yang tepat dari N kasus pertama.</div>
                </>
              )}
            </div>
          </HelpCard>

          <HelpCard title={isEn ? "Based on time or case range" : "Berdasarkan waktu atau rentang kasus (Based on time or case range)"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "Select cases based on their position in your dataset (1-based index)."
                : "Pilih kasus berdasarkan posisi mereka dalam dataset Anda (indeks berbasis 1)."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Use filter variable" : "Gunakan variabel filter (Use filter variable)"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "Use an existing variable as the filter. Non-zero/non-empty values will be selected."
                : "Gunakan variabel yang ada sebagai filter. Nilai non-nol/non-kosong akan dipilih."}
            </p>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'output-options',
      title: 'Output',
      description: isEn ? 'Options for handling unselected cases' : 'Opsi untuk menangani kasus yang tidak dipilih',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Filter out unselected cases" : "Saring kasus yang tidak dipilih (Filter out unselected cases)"} variant="step">
            <p className="text-sm">
              {isEn ? (
                <>
                  A filter is applied to temporarily hide the unselected cases. The filter variable
                  (<code className="text-xs bg-gray-100 px-1 rounded">filter_$</code>) is created or updated.
                  Your original dataset stays intact.
                </>
              ) : (
                <>
                  Filter diterapkan untuk menyembunyikan kasus yang tidak dipilih sementara. Variabel filter
                  (<code className="text-xs bg-gray-100 px-1 rounded">filter_$</code>) akan dibuat atau diperbarui.
                  Dataset asli Anda tetap utuh.
                </>
              )}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Delete unselected cases" : "Hapus kasus yang tidak dipilih (Delete unselected cases)"} variant="step">
            <p className="text-sm">
              {isEn ? (
                <>
                  Unselected cases will be{' '}
                  <strong>permanently deleted</strong> from your dataset. This operation
                  cannot be undone.
                </>
              ) : (
                <>
                  Kasus yang tidak dipilih akan{' '}
                  <strong>dihapus secara permanen</strong> dari dataset Anda. Operasi ini
                  tidak dapat dibatalkan.
                </>
              )}
            </p>
          </HelpCard>

          <HelpAlert variant="warning" title={isEn ? "Important" : "Penting"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Always back up your data before using the permanent delete option."
                : "Selalu backup data Anda sebelum menggunakan opsi hapus permanen."}
            </p>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'usage-examples',
      title: isEn ? 'Usage Examples' : 'Contoh Penggunaan',
      description: isEn ? 'Practical examples of using the Select Cases feature' : 'Contoh praktis menggunakan fitur Pilih Kasus',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <HelpSection title={isEn ? "Filter by Condition" : "Filter berdasarkan Kondisi"}>
            <p className="text-sm mb-2">
              {isEn
                ? "To select cases where age > 30 AND income >= 50000:"
                : "Untuk memilih kasus di mana umur > 30 DAN pendapatan >= 50000:"}
            </p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <code className="text-sm font-mono">age &gt; 30 & income &gt;= 50000</code>
            </div>
          </HelpSection>

          <HelpSection title="Random sample">
            <p className="text-sm mb-2">
              {isEn ? "To create a 10% random sample:" : "Untuk membuat sampel acak 10%:"}
            </p>
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              {isEn ? (
                <>
                  1. Choose "Random sample"<br/>
                  2. Choose "Approximately"<br/>
                  3. Enter "10"
                </>
              ) : (
                <>
                  1. Pilih "Sampel acak"<br/>
                  2. Pilih "Kurang lebih"<br/>
                  3. Masukkan "10"
                </>
              )}
            </div>
          </HelpSection>

          <HelpSection title="Case range">
            <p className="text-sm mb-2">
              {isEn ? "To select cases 100 through 500:" : "Untuk memilih kasus 100 sampai 500:"}
            </p>
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              {isEn ? (
                <>
                  1. Choose "Based on time or case range"<br/>
                  2. Enter "100" in "First Case"<br/>
                  3. Enter "500" in "Last Case"
                </>
              ) : (
                <>
                  1. Pilih "Based on time or case range"<br/>
                  2. Masukkan "100" di "Kasus Pertama"<br/>
                  3. Masukkan "500" di "Kasus Terakhir"
                </>
              )}
            </div>
          </HelpSection>
        </div>
      )
    }
  ];


  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Condition Syntax' : 'Sintaks Kondisi',
      content: isEn
        ? 'Use quotation marks for string values and make sure variable names are spelled correctly in the condition expression.'
        : 'Gunakan tanda kutip untuk nilai string dan pastikan nama variabel dieja dengan benar dalam ekspresi kondisi.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Permanent Operation' : 'Operasi Permanen',
      content: isEn
        ? 'Be careful with the permanent delete option - this operation cannot be undone and will remove data permanently.'
        : 'Hati-hati dengan opsi hapus permanen - operasi ini tidak dapat dibatalkan dan akan menghilangkan data secara permanen.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Automatic Filter Variable' : 'Variabel Filter Otomatis',
      content: isEn
        ? 'The filter_$ variable is created automatically to track the selected cases, letting you see the selection status.'
        : 'Variabel filter_$ akan dibuat secara otomatis untuk melacak kasus yang dipilih, memungkinkan Anda melihat status seleksi.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Sort Cases' : 'Urutkan Kasus', href: '/help/data-guide/sort-cases' },
    { title: isEn ? 'Weight Cases' : 'Bobot Kasus', href: '/help/data-guide/weight-cases' },
    { title: isEn ? 'Duplicate Cases' : 'Kasus Duplikat', href: '/help/data-guide/duplicate-cases' },
    { title: isEn ? 'Define Variable Properties' : 'Definisi Properti Variabel', href: '/help/data-guide/define-var-props' },
    { title: isEn ? 'Data Management Guide' : 'Panduan Manajemen Data', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Select Cases" : "Pilih Kasus"}
      description={isEn
        ? "A complete guide to filtering or deleting rows (cases) based on various criteria in Statify"
        : "Panduan lengkap untuk memfilter atau menghapus baris (kasus) berdasarkan berbagai kriteria di Statify"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default SelectCasesGuide;
