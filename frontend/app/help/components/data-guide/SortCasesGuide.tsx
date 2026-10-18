/* eslint-disable react/no-unescaped-entities */
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpSection, HelpStep } from '../../ui/HelpLayout';
import { ArrowUpDown, Settings, ListOrdered } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const SortCasesGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'how-to-steps',
      title: isEn ? 'How to Sort Cases' : 'Cara Mengurutkan Kasus',
      description: isEn ? 'Steps to reorder rows based on certain criteria' : 'Langkah-langkah untuk mengatur ulang baris berdasarkan kriteria tertentu',
      icon: ListOrdered,
      content: (
        <div className="space-y-4">
          <HelpStep number={1} title={isEn ? "Open the Sort Cases Dialog" : "Buka Dialog Urutkan Kasus"}>
            <p className="text-sm">
              {isEn ? (
                <>Open the <strong>Data → Sort Cases</strong> menu to open the sort dialog.</>
              ) : (
                <>Akses menu <strong>Data → Sort Cases</strong> untuk membuka dialog pengurutan.</>
              )}
            </p>
          </HelpStep>

          <HelpStep number={2} title={isEn ? "Choose the Sort Variables" : "Pilih Variabel Pengurutan"}>
            <p className="text-sm">
              {isEn
                ? "Move variables from the available list to the \"Sort By\" list. The first variable becomes the primary sort key."
                : "Pindahkan variabel dari daftar tersedia ke daftar \"Urutkan Berdasarkan\". Variabel pertama akan menjadi kunci utama pengurutan."}
            </p>
          </HelpStep>

          <HelpStep number={3} title={isEn ? "Set the Sort Direction" : "Atur Arah Pengurutan"}>
            <p className="text-sm">
              {isEn ? "Choose the sort direction for each variable:" : "Pilih arah pengurutan untuk setiap variabel:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li><strong>Ascending</strong>: from the smallest to the largest value (A-Z, 1-9)</li>
                  <li><strong>Descending</strong>: from the largest to the smallest value (Z-A, 9-1)</li>
                </>
              ) : (
                <>
                  <li><strong>Menaik</strong>: dari nilai terkecil ke terbesar (A-Z, 1-9)</li>
                  <li><strong>Menurun</strong>: dari nilai terbesar ke terkecil (Z-A, 9-1)</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={4} title={isEn ? "Set the Priority (Optional)" : "Atur Prioritas (Opsional)"}>
            <p className="text-sm">
              {isEn
                ? "For multi-level sorting, use the priority buttons to change the order of the variables in the sort list."
                : "Untuk pengurutan multi-tingkat, gunakan tombol prioritas untuk mengubah urutan variabel dalam daftar pengurutan."}
            </p>
          </HelpStep>

          <HelpStep number={5} title={isEn ? "Apply the Sort" : "Terapkan Pengurutan"}>
            <p className="text-sm">
              {isEn ? (
                <>Click the <strong>OK</strong> button to apply the sort to your dataset.</>
              ) : (
                <>Klik tombol <strong>OK</strong> untuk menerapkan pengurutan ke dataset Anda.</>
              )}
            </p>
          </HelpStep>
        </div>
      )
    },
    {
      id: 'interface',
      title: isEn ? 'Interface & Component Functions' : 'Antarmuka & Fungsionalitas Komponen',
      description: isEn ? 'The components of the Sort Cases dialog' : 'Komponen dalam dialog Urutkan Kasus',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpSection title={isEn ? "Available Variables List" : "Daftar Variabel Tersedia"}>
            <p className="text-sm">
              {isEn
                ? "Shows all variables available to use as sort keys."
                : "Menampilkan semua variabel yang tersedia untuk digunakan sebagai kunci pengurutan."}
            </p>
          </HelpSection>

          <HelpSection title={isEn ? "Sort By List" : "Daftar Urutkan Berdasarkan"}>
            <p className="text-sm">
              {isEn
                ? "This list holds the variables chosen as sort keys. The order here determines the sort priority."
                : "Daftar ini menyimpan variabel yang dipilih sebagai kunci pengurutan. Urutan di sini menentukan prioritas pengurutan."}
            </p>
          </HelpSection>

          <HelpSection title={isEn ? "Sort Controls" : "Kontrol Pengurutan"}>
            <p className="text-sm mb-3">
              {isEn
                ? "When a variable in the \"Sort By\" list is highlighted:"
                : "Ketika variabel dalam daftar \"Urutkan Berdasarkan\" disorot:"}
            </p>
            <div className="ml-4 space-y-2">
              <HelpCard title={isEn ? "Sort Direction" : "Arah Pengurutan"} variant="step">
                <p className="text-sm">
                  {isEn ? "Choose to sort in ascending or descending order." : "Pilih untuk mengurutkan dalam urutan naik atau turun."}
                </p>
              </HelpCard>
              <HelpCard title={isEn ? "Sort Priority" : "Prioritas Pengurutan"} variant="step">
                <p className="text-sm">
                  {isEn ? "Buttons to change a variable's sort priority." : "Tombol untuk mengubah prioritas pengurutan variabel."}
                </p>
              </HelpCard>
            </div>
          </HelpSection>
        </div>
      )
    },
    {
      id: 'workflow',
      title: isEn ? 'Workflow & Usage Examples' : 'Alur Kerja & Contoh Penggunaan',
      description: isEn ? 'Practical examples of using Sort Cases' : 'Contoh praktis menggunakan Urutkan Kasus',
      icon: ArrowUpDown,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Example 1: Single-Level Sort" : "Contoh 1: Pengurutan Tingkat Tunggal"} variant="feature">
            <div className="space-y-3">
              <p className="text-sm">
                {isEn ? (
                  <><strong>Goal</strong>: Sort your entire dataset by Income from highest to lowest.</>
                ) : (
                  <><strong>Tujuan</strong>: Urutkan seluruh dataset Anda berdasarkan Pendapatan dari tertinggi ke terendah.</>
                )}
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-sm mb-2">{isEn ? "Steps:" : "Langkah:"}</p>
                <ol className="list-decimal list-inside text-sm space-y-1">
                  {isEn ? (
                    <>
                      <li>Open the "Sort Cases" dialog</li>
                      <li>Move the Income variable to the "Sort By" list</li>
                      <li>Choose Descending for the "Sort Order"</li>
                      <li>Click OK</li>
                    </>
                  ) : (
                    <>
                      <li>Buka dialog "Urutkan Kasus"</li>
                      <li>Pindahkan variabel Pendapatan ke daftar "Urutkan Berdasarkan"</li>
                      <li>Pilih Menurun untuk "Urutan Pengurutan"</li>
                      <li>Klik OK</li>
                    </>
                  )}
                </ol>
              </div>
            </div>
          </HelpCard>

          <HelpCard title={isEn ? "Example 2: Multi-Level Sort" : "Contoh 2: Pengurutan Multi-Tingkat"} variant="feature">
            <div className="space-y-3">
              <p className="text-sm">
                {isEn ? (
                  <><strong>Goal</strong>: Group cases by Department, then within each department, sort by Income from highest to lowest.</>
                ) : (
                  <><strong>Tujuan</strong>: Kelompokkan kasus berdasarkan Departemen, kemudian dalam setiap departemen, urutkan berdasarkan Pendapatan dari tertinggi ke terendah.</>
                )}
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-sm mb-2">{isEn ? "Steps:" : "Langkah:"}</p>
                <ol className="list-decimal list-inside text-sm space-y-1">
                  {isEn ? (
                    <>
                      <li>Move the Department variable to "Sort By" (Ascending)</li>
                      <li>Move the Income variable to "Sort By" below Department</li>
                      <li>Change the direction of Income to Descending</li>
                      <li>Click OK</li>
                    </>
                  ) : (
                    <>
                      <li>Pindahkan variabel Departemen ke "Urutkan Berdasarkan" (Menaik)</li>
                      <li>Pindahkan variabel Pendapatan ke "Urutkan Berdasarkan" di bawah Departemen</li>
                      <li>Ubah arah Pendapatan menjadi Menurun</li>
                      <li>Klik OK</li>
                    </>
                  )}
                </ol>
              </div>
            </div>
          </HelpCard>

          <HelpAlert variant="info" title={isEn ? "Multi-Level Sorting Tips" : "Tips Pengurutan Multi-Tingkat"}>
            <p className="text-sm mt-2">
              {isEn
                ? "The order of variables in the \"Sort By\" list determines the sort priority. The first variable has the highest priority."
                : "Urutan variabel dalam daftar \"Urutkan Berdasarkan\" menentukan prioritas pengurutan. Variabel pertama memiliki prioritas tertinggi."}
            </p>
          </HelpAlert>
        </div>
      )
    }
  ];


  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Sort Priority Order' : 'Urutan Prioritas Pengurutan',
      content: isEn
        ? 'The first variable chosen has the highest priority in a multi-level sort. Use the priority buttons to rearrange the order.'
        : 'Variabel yang dipilih pertama memiliki prioritas tertinggi dalam pengurutan multi-tingkat. Gunakan tombol prioritas untuk mengatur ulang urutan.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Understanding Sort Direction' : 'Pemahaman Arah Pengurutan',
      content: isEn
        ? 'Ascending means from the smallest to the largest value (A-Z, 1-9). Descending means from the largest to the smallest value (Z-A, 9-1).'
        : 'Menaik berarti dari nilai terkecil ke terbesar (A-Z, 1-9). Menurun berarti dari nilai terbesar ke terkecil (Z-A, 9-1).'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Permanent Order Change' : 'Perubahan Urutan Permanen',
      content: isEn
        ? 'Sorting permanently changes the order of rows in your dataset. Keep a copy of the original data before sorting if needed.'
        : 'Pengurutan akan mengubah urutan baris dalam dataset Anda secara permanen. Simpan salinan data asli sebelum melakukan pengurutan jika diperlukan.'
    },
    {
      type: 'tip' as const,
      title: isEn ? 'Sorting Empty Data' : 'Pengurutan Data Kosong',
      content: isEn
        ? 'Empty values (missing values) are always placed at the end of the list, regardless of the chosen sort direction.'
        : 'Nilai kosong (missing values) akan selalu ditempatkan di akhir daftar, terlepas dari arah pengurutan yang dipilih.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Data Management' : 'Manajemen Data', href: '/help/data-guide' },
    { title: isEn ? 'Select Cases' : 'Pilih Kasus', href: '/help/data-guide/select-cases' },
    { title: isEn ? 'Sort Variables' : 'Urutkan Variabel', href: '/help/data-guide/sort-vars' },
    { title: isEn ? 'Measurement Level' : 'Tingkat Pengukuran', href: '/help/data-guide/set-measurement-level' },
    { title: isEn ? 'Data Preparation' : 'Persiapan Data', href: '/help/data-guide/restructure' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Sort Cases" : "Urutkan Kasus"}
      description={isEn
        ? "A complete guide to reordering the rows (cases) of a dataset based on the values of certain variables"
        : "Panduan lengkap untuk mengatur ulang baris (kasus) dalam dataset berdasarkan nilai variabel tertentu"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default SortCasesGuide;
