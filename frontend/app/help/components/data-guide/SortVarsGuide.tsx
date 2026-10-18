/* eslint-disable react/no-unescaped-entities */
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpSection, HelpStep } from '../../ui/HelpLayout';
import { ArrowUpDown, Settings, ListOrdered } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const SortVarsGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'how-to-steps',
      title: isEn ? 'How to Sort Variables' : 'Cara Mengurutkan Variabel',
      description: isEn ? 'Steps to reorder the variables in a dataset' : 'Langkah-langkah untuk mengatur ulang urutan variabel dalam dataset',
      icon: ListOrdered,
      content: (
        <div className="space-y-4">
          <HelpStep number={1} title={isEn ? "Open the Sort Variables Dialog" : "Buka Dialog Urutkan Variabel"}>
            <p className="text-sm">
              {isEn ? (
                <>
                  Open the <strong>Data → Sort Variables</strong> menu to open the sort dialog.
                  The dialog shows a list of variable attributes you can sort by.
                </>
              ) : (
                <>
                  Akses menu <strong>Data → Sort Variables</strong> untuk membuka dialog pengurutan.
                  Dialog akan menampilkan daftar atribut variabel yang dapat diurutkan.
                </>
              )}
            </p>
          </HelpStep>

          <HelpStep number={2} title={isEn ? "Choose the Sort Attribute" : "Pilih Atribut Pengurutan"}>
            <p className="text-sm">
              {isEn ? "Choose the attribute to sort by:" : "Pilih atribut yang akan digunakan sebagai dasar pengurutan:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li><strong>Name</strong>: Sort by variable name (alphabetical)</li>
                  <li><strong>Type</strong>: Group by data type (Numeric, String, etc.)</li>
                  <li><strong>Width</strong>: Sort by column width</li>
                  <li><strong>Label</strong>: Sort by the variable's descriptive label</li>
                </>
              ) : (
                <>
                  <li><strong>Nama</strong>: Urutkan berdasarkan nama variabel (alfabetis)</li>
                  <li><strong>Jenis</strong>: Kelompokkan berdasarkan tipe data (Numerik, String, dll)</li>
                  <li><strong>Lebar</strong>: Urutkan berdasarkan lebar kolom</li>
                  <li><strong>Label</strong>: Urutkan berdasarkan label deskriptif variabel</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={3} title={isEn ? "Set the Sort Direction" : "Tentukan Arah Pengurutan"}>
            <p className="text-sm">
              {isEn ? "Choose the sort direction you want:" : "Pilih arah pengurutan yang diinginkan:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li><strong>Ascending</strong>: A-Z, 1-9, smallest to largest</li>
                  <li><strong>Descending</strong>: Z-A, 9-1, largest to smallest</li>
                </>
              ) : (
                <>
                  <li><strong>Naik</strong>: A-Z, 1-9, terkecil ke terbesar</li>
                  <li><strong>Turun</strong>: Z-A, 9-1, terbesar ke terkecil</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={4} title={isEn ? "Apply the Sort" : "Terapkan Pengurutan"}>
            <p className="text-sm">
              {isEn ? (
                <>Click the <strong>OK</strong> button to apply the sort. The system will:</>
              ) : (
                <>Klik tombol <strong>OK</strong> untuk menerapkan pengurutan. Sistem akan:</>
              )}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Sort the variables by the chosen criteria</li>
                  <li>Rearrange the data columns to match the new variable order</li>
                  <li>Update the variable view and the data view</li>
                </>
              ) : (
                <>
                  <li>Mengurutkan variabel berdasarkan kriteria yang dipilih</li>
                  <li>Mengatur ulang kolom data sesuai urutan variabel baru</li>
                  <li>Memperbarui tampilan variabel dan data view</li>
                </>
              )}
            </ul>
          </HelpStep>
        </div>
      )
    },
    {
      id: 'functionality',
      title: isEn ? 'Feature Overview' : 'Ringkasan Fitur',
      description: isEn ? 'A full explanation of the Sort Variables feature' : 'Penjelasan lengkap fitur Urutkan Variabel',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <p className="text-sm mb-4">
            {isEn
              ? "The \"Sort Variables\" feature lets you rearrange the variables in the \"Variable View\" based on the properties of any column."
              : "Fitur \"Urutkan Variabel\" memungkinkan Anda mengatur ulang variabel dalam \"Tampilan Variabel\" berdasarkan properti dari kolom mana pun."}
          </p>

          <div className="space-y-3">
            <HelpCard title={isEn ? "Attribute-Based Sorting" : "Pengurutan Berbasis Atribut"} variant="feature">
              <p className="text-sm">
                {isEn
                  ? "You can choose any column from the variable view grid (for example, \"Name\", \"Type\", \"Width\") to use as the sort key."
                  : "Anda dapat memilih kolom mana pun dari grid tampilan variabel (misalnya, \"Nama\", \"Jenis\", \"Lebar\") untuk digunakan sebagai kunci pengurutan."}
              </p>
            </HelpCard>

            <HelpCard title={isEn ? "Sort Direction" : "Arah Pengurutan"} variant="feature">
              <p className="text-sm">
                {isEn ? "Both ascending and descending sort directions are supported." : "Baik arah pengurutan naik maupun turun didukung."}
              </p>
            </HelpCard>

            <HelpCard title={isEn ? "Full Dataset Update" : "Pembaruan Dataset Lengkap"} variant="feature">
              <p className="text-sm">
                {isEn
                  ? "This feature performs a comprehensive update. It reorders the variable array and physically rearranges the data columns to match the new variable order, preserving data integrity."
                  : "Fitur ini melakukan pembaruan komprehensif. Ini mengurutkan ulang array variabel dan secara fisik mengatur ulang kolom data agar sesuai dengan urutan variabel baru, memastikan integritas data."}
              </p>
            </HelpCard>

            <HelpCard title={isEn ? "Applied Immediately" : "Aplikasi Langsung"} variant="feature">
              <p className="text-sm">
                {isEn
                  ? "The sort is applied directly to your current dataset, and the changes are saved in the app state."
                  : "Pengurutan diterapkan langsung ke dataset Anda saat ini, dan perubahan disimpan dalam status aplikasi."}
              </p>
            </HelpCard>
          </div>

          <HelpAlert variant="info" title={isEn ? "Important Note" : "Catatan Penting"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Sorting variables changes the physical structure of your dataset, including the column order in the data array."
                : "Pengurutan variabel mengubah struktur fisik dataset Anda, termasuk urutan kolom dalam array data."}
            </p>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'workflow',
      title: isEn ? 'Workflow' : 'Alur Kerja',
      description: isEn ? 'The variable sorting process step by step' : 'Proses pengurutan variabel langkah demi langkah',
      icon: ArrowUpDown,
      content: (
        <div className="space-y-4">
          <HelpSection title={isEn ? "Step 1: Initialization" : "Langkah 1: Inisialisasi"}>
            <p className="text-sm">
              {isEn
                ? "You open the \"Sort Variables\" dialog. The UI shows the list of variable attributes you can sort by."
                : "Anda membuka modal \"Urutkan Variabel\". UI menampilkan daftar atribut variabel yang dapat diurutkan."}
            </p>
          </HelpSection>

          <HelpSection title={isEn ? "Step 2: User Interaction" : "Langkah 2: Interaksi Pengguna"}>
            <p className="text-sm">
              {isEn
                ? "You choose an attribute (for example, \"Name\") and a sort direction (for example, \"Ascending\")."
                : "Anda memilih atribut (misalnya, \"Nama\") dan arah pengurutan (misalnya, \"Naik\")."}
            </p>
          </HelpSection>

          <HelpSection title={isEn ? "Step 3: Execution" : "Langkah 3: Eksekusi"}>
            <div className="space-y-2">
              <p className="text-sm mb-2">{isEn ? "The execution process includes:" : "Proses eksekusi meliputi:"}</p>
              <ul className="list-disc list-inside ml-4 text-sm space-y-1">
                {isEn ? (
                  <>
                    <li>You click the "OK" button</li>
                    <li>
                      The system sorts the variable array by the attribute and direction you chose. Each
                      variable's position is updated to reflect its new location.
                    </li>
                    <li>
                      The system then calculates the new position of each data column and returns the
                      newly sorted dataset.
                    </li>
                    <li>
                      The app state is updated with the new variable list and data array.
                    </li>
                  </>
                ) : (
                  <>
                    <li>Anda mengklik tombol "OK"</li>
                    <li>
                      Sistem mengurutkan array variabel berdasarkan atribut dan arah yang Anda pilih.
                      Posisi setiap variabel diperbarui untuk mencerminkan lokasi barunya.
                    </li>
                    <li>
                      Sistem kemudian menghitung posisi baru untuk setiap kolom data dan mengembalikan
                      dataset yang baru diurutkan.
                    </li>
                    <li>
                      Status aplikasi diperbarui dengan daftar variabel baru dan array data.
                    </li>
                  </>
                )}
              </ul>
            </div>
          </HelpSection>

          <HelpAlert variant="success" title={isEn ? "Final Result" : "Hasil Akhir"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Your dataset will have a new column order based on the chosen sort criteria, with data integrity preserved."
                : "Dataset Anda akan memiliki urutan kolom baru berdasarkan kriteria pengurutan yang dipilih, dengan integritas data terjaga."}
            </p>
          </HelpAlert>
        </div>
      )
    }
  ];


  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Choose a Relevant Attribute' : 'Pilih Atribut yang Relevan',
      content: isEn
        ? 'Choose the attribute most relevant to your analysis needs. Sorting by name helps with organization, while sorting by type helps group similar variables.'
        : 'Pilih atribut yang paling relevan dengan kebutuhan analisis Anda. Pengurutan nama berguna untuk organisasi, sedangkan pengurutan jenis membantu mengelompokkan variabel serupa.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Data Integrity Preserved' : 'Integritas Data Terjaga',
      content: isEn
        ? 'This feature keeps the data consistent by physically rearranging the columns. The data in each row stays matched to its variable.'
        : 'Fitur ini memastikan konsistensi data dengan menata ulang kolom secara fisik. Urutan data dalam setiap baris tetap terjaga sesuai variabel yang bersangkutan.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Dataset Structure Change' : 'Perubahan Struktur Dataset',
      content: isEn
        ? 'Sorting permanently changes the structure of your dataset for the current session. Make sure the chosen order fits your analysis needs.'
        : 'Pengurutan akan secara permanen mengubah struktur dataset Anda untuk sesi saat ini. Pastikan urutan yang dipilih sesuai dengan kebutuhan analisis.'
    },
    {
      type: 'tip' as const,
      title: isEn ? 'Effective Variable Organization' : 'Organisasi Variabel Efektif',
      content: isEn
        ? 'Sort by name for easy navigation, or by type to group variables with similar characteristics.'
        : 'Gunakan pengurutan berdasarkan nama untuk kemudahan navigasi, atau berdasarkan jenis untuk mengelompokkan variabel dengan karakteristik serupa.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Data Management' : 'Manajemen Data', href: '/help/data-guide' },
    { title: isEn ? 'Variable Properties' : 'Properti Variabel', href: '/help/data-guide/define-var-props' },
    { title: isEn ? 'Sort Cases' : 'Urutkan Kasus', href: '/help/data-guide/sort-cases' },
    { title: isEn ? 'Measurement Level' : 'Tingkat Pengukuran', href: '/help/data-guide/set-measurement-level' },
    { title: isEn ? 'Restructure Data' : 'Restrukturisasi Data', href: '/help/data-guide/restructure' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Sort Variables" : "Urutkan Variabel"}
      description={isEn
        ? "A complete guide to reordering the variables in a dataset based on various attributes"
        : "Panduan lengkap untuk mengatur ulang urutan variabel dalam dataset berdasarkan berbagai atribut"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default SortVarsGuide;
