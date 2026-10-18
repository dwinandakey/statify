/* eslint-disable react/no-unescaped-entities */
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpSection } from '../../ui/HelpLayout';
import { Copy, Search, Filter } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const DuplicateCasesGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'overview',
      title: isEn ? 'Overview' : 'Ringkasan',
      description: isEn ? 'An introduction to the Identify Duplicate Cases feature' : 'Pengantar fitur Identifikasi Kasus Duplikat',
      icon: Copy,
      content: (
        <div className="space-y-4">
          <p>
            {isEn
              ? "This feature helps you find and manage duplicate cases in your dataset based on the matching variables you choose."
              : "Fitur ini membantu Anda menemukan dan mengelola kasus duplikat dalam dataset Anda berdasarkan variabel pencocokan yang Anda pilih."}
          </p>

          <HelpAlert variant="info" title={isEn ? "What It Does" : "Apa yang Dilakukannya"}>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              {isEn ? (
                <>
                  <li>Identifies duplicate cases based on identical values in one or more variables</li>
                  <li>Creates new indicator variables that mark which cases are "primary" and which are "duplicates"</li>
                  <li>Sorts the cases within duplicate groups to determine the primary case</li>
                  <li>Helps you manage the results by reordering the data or filtering out duplicate cases</li>
                </>
              ) : (
                <>
                  <li>Mengidentifikasi kasus duplikat berdasarkan nilai identik dalam satu atau lebih variabel</li>
                  <li>Membuat variabel indikator baru untuk menandai kasus mana yang "primer" dan mana yang "duplikat"</li>
                  <li>Mengurutkan kasus dalam kelompok duplikat untuk menentukan kasus primer</li>
                  <li>Membantu Anda mengelola hasil dengan mengatur ulang data atau memfilter kasus duplikat</li>
                </>
              )}
            </ul>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'specifications',
      title: isEn ? 'Features & Options' : 'Fitur & Opsi',
      description: isEn ? 'The available features and options' : 'Fitur dan opsi yang tersedia',
      icon: Search,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Variables Tab" : "Tab Variabel (Variables)"} variant="feature">
            <ul className="list-disc list-inside text-sm space-y-1">
              {isEn ? (
                <>
                  <li><strong>Define matching cases by</strong>: the list of key variables used to detect duplicate groups.</li>
                  <li><strong>Sort within matching groups by</strong>: the sort variables within a group; choose Ascending/Descending.</li>
                </>
              ) : (
                <>
                  <li><strong>Define matching cases by</strong>: daftar variabel kunci untuk mendeteksi grup duplikat.</li>
                  <li><strong>Sort within matching groups by</strong>: variabel pengurutan dalam grup; pilih Ascending/Descending.</li>
                </>
              )}
            </ul>
          </HelpCard>
          <HelpCard title={isEn ? "New Indicator Variables" : "Variabel Indikator Baru"} variant="feature">
            <p className="text-sm mb-3">
              {isEn
                ? "This feature can create two new variables to help with duplicate analysis:"
                : "Fitur ini dapat membuat dua variabel baru untuk membantu analisis duplikat:"}
            </p>

            <HelpSection title={isEn ? "1. Primary Case Indicator" : "1. Indikator Kasus Primer"}>
              <ul className="list-disc list-inside text-sm space-y-1">
                {isEn ? (
                  <>
                    <li><strong>Function</strong>: Creates a variable (default: <code>PrimaryLast</code>) that marks each case as primary (value 1) or duplicate (value 0)</li>
                    <li><strong>Choice</strong>: You can choose whether the <strong>first</strong> or <strong>last</strong> case in each duplicate group is considered primary</li>
                    <li><strong>Custom Name</strong>: You can change the variable name to suit your needs</li>
                  </>
                ) : (
                  <>
                    <li><strong>Fungsi</strong>: Membuat variabel (default: <code>PrimaryLast</code>) yang menandai setiap kasus sebagai primer (nilai 1) atau duplikat (nilai 0)</li>
                    <li><strong>Pilihan</strong>: Anda dapat memilih apakah kasus <strong>pertama</strong> atau <strong>terakhir</strong> dalam setiap kelompok duplikat yang dianggap primer</li>
                    <li><strong>Nama Kustom</strong>: Anda dapat mengubah nama variabel sesuai kebutuhan</li>
                  </>
                )}
              </ul>
            </HelpSection>

            <HelpSection title={isEn ? "2. Sequence Counter" : "2. Penghitung Urutan"}>
              <ul className="list-disc list-inside text-sm space-y-1">
                {isEn ? (
                  <>
                    <li><strong>Function</strong>: Creates a variable (default: <code>MatchSequence</code>) that gives each case in a duplicate group a sequence number (1, 2, 3, ...)</li>
                    <li><strong>Use</strong>: Helps you see how many duplicates exist in each group</li>
                    <li><strong>Custom Name</strong>: You can change the variable name as needed</li>
                  </>
                ) : (
                  <>
                    <li><strong>Fungsi</strong>: Membuat variabel (default: <code>MatchSequence</code>) yang memberikan nomor urutan untuk setiap kasus dalam kelompok duplikat (1, 2, 3, ...)</li>
                    <li><strong>Penggunaan</strong>: Membantu Anda melihat berapa banyak duplikat yang ada dalam setiap kelompok</li>
                    <li><strong>Nama Kustom</strong>: Anda dapat mengubah nama variabel sesuai kebutuhan</li>
                  </>
                )}
              </ul>
            </HelpSection>
          </HelpCard>

          <HelpCard title={isEn ? "Options Tab — File Management & Output" : "Tab Opsi (Options) — File Management & Output"} variant="feature">
            <div className="space-y-3">
              <HelpSection title={isEn ? "1. Move Duplicate Cases to the Top" : "1. Pindahkan Kasus Duplikat ke Atas"}>
                <p className="text-sm">
                  {isEn ? (
                    <>UI label: <em>Move matching cases to the top of the file</em>. Moves duplicate groups to the top of the dataset.</>
                  ) : (
                    <>Label UI: <em>Move matching cases to the top of the file</em>. Memindahkan grup duplikat ke bagian atas dataset.</>
                  )}
                </p>
              </HelpSection>

              <HelpSection title={isEn ? "2. Filter Duplicate Cases" : "2. Filter Kasus Duplikat"}>
                <p className="text-sm">
                  {isEn ? (
                    <>UI label: <em>Filter out duplicate cases after processing</em>. Filters non-primary cases (indicator = 0) out of the view.</>
                  ) : (
                    <>Label UI: <em>Filter out duplicate cases after processing</em>. Menyaring non-primer (indikator = 0) dari tampilan.</>
                  )}
                </p>
              </HelpSection>

              <HelpSection title={isEn ? "3. Display Frequencies" : "3. Tampilkan Frekuensi"}>
                <p className="text-sm">
                  {isEn ? "UI label: " : "Label UI: "}<em>Display frequencies for created variables</em>.
                </p>
              </HelpSection>
            </div>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'examples',
      title: isEn ? 'Usage Examples' : 'Contoh Penggunaan',
      description: isEn ? 'Practical scenarios for using this feature' : 'Skenario praktis untuk menggunakan fitur ini',
      icon: Filter,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Example 1: Find Exact Duplicates" : "Contoh 1: Temukan Duplikat Persis"} variant="step">
            <ol className="list-decimal list-inside text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Move <strong>all</strong> variables into the "Define matching cases by" list</li>
                  <li>Choose whether the first or last case should be primary</li>
                  <li>Click OK</li>
                </>
              ) : (
                <>
                  <li>Pindahkan <strong>semua</strong> variabel ke dalam daftar "Definisikan kasus yang cocok berdasarkan"</li>
                  <li>Pilih apakah kasus pertama atau terakhir yang harus menjadi primer</li>
                  <li>Klik OK</li>
                </>
              )}
            </ol>
            <HelpAlert variant="success" title={isEn ? "Result" : "Hasil"}>
              <p className="text-sm mt-2">
                {isEn ? (
                  <>The <code>PrimaryLast</code> variable will have the value 0 for every row that is an exact duplicate of another row.</>
                ) : (
                  <>Variabel <code>PrimaryLast</code> akan memiliki nilai 0 untuk setiap baris yang merupakan duplikat persis dari baris lain.</>
                )}
              </p>
            </HelpAlert>
          </HelpCard>

          <HelpCard title={isEn ? "Example 2: Create a Duplicate-Free Dataset" : "Contoh 2: Buat Dataset Bebas Duplikat"} variant="step">
            <ol className="list-decimal list-inside text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Move the key variables (such as Customer ID, Email) into the "Define matching cases by" list</li>
                  <li>In the <strong>Options</strong> tab, check "Filter out duplicate cases after processing"</li>
                  <li>Click OK</li>
                </>
              ) : (
                <>
                  <li>Pindahkan variabel kunci (seperti ID Pelanggan, Email) ke daftar "Definisikan kasus yang cocok berdasarkan"</li>
                  <li>Di tab <strong>Opsi</strong>, centang "Filter kasus duplikat setelah pemrosesan"</li>
                  <li>Klik OK</li>
                </>
              )}
            </ol>
            <HelpAlert variant="success" title={isEn ? "Result" : "Hasil"}>
              <p className="text-sm mt-2">
                {isEn
                  ? "Your data view will update immediately to show only the unique/primary rows."
                  : "Tampilan data Anda akan segera diperbarui untuk menampilkan hanya baris unik/primer."}
              </p>
            </HelpAlert>
          </HelpCard>
        </div>
      )
    },
  ];


  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Back Up Your Data' : 'Cadangkan Data Anda',
      content: isEn
        ? 'Always back up your dataset before processing duplicates to prevent data loss.'
        : 'Selalu cadangkan dataset Anda sebelum memproses duplikat untuk mencegah kehilangan data.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Choose Key Variables' : 'Pilih Variabel Kunci',
      content: isEn
        ? 'Choose the right key variables to define duplicate criteria that match your analysis needs.'
        : 'Pilih variabel kunci yang tepat untuk mendefinisikan kriteria duplikasi yang sesuai dengan kebutuhan analisis Anda.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Review the Results' : 'Tinjau Hasil',
      content: isEn
        ? 'Always review the duplicate detection results before permanently deleting or filtering data.'
        : 'Selalu tinjau hasil deteksi duplikat sebelum menghapus atau memfilter data secara permanen.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Data Management' : 'Manajemen Data', href: '/help/data-guide' },
    { title: isEn ? 'Select Cases' : 'Pilih Kasus', href: '/help/data-guide/select-cases' },
    { title: isEn ? 'Sort Cases' : 'Urutkan Kasus', href: '/help/data-guide/sort-cases' },
    { title: isEn ? 'Variable Properties' : 'Properti Variabel', href: '/help/data-guide/define-var-props' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Identify Duplicate Cases" : "Identifikasi Kasus Duplikat"}
      description={isEn
        ? "A complete guide to finding and flagging duplicate cases in your dataset based on matching variables"
        : "Panduan lengkap untuk menemukan dan menandai kasus duplikat dalam dataset Anda berdasarkan variabel yang cocok"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default DuplicateCasesGuide;
