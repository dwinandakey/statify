import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpSection, HelpStep } from '../../ui/HelpLayout';
import { Ruler, Hash, Settings, ListOrdered } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export default function SetMeasurementLevelGuide() {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'how-to-steps',
      title: isEn ? 'How to Set the Measurement Level' : 'Cara Mengatur Tingkat Pengukuran',
      description: isEn ? 'Steps to define the measurement level of variables' : 'Langkah-langkah untuk mendefinisikan tingkat pengukuran variabel',
      icon: ListOrdered,
      content: (
        <div className="space-y-4">
          <HelpStep number={1} title={isEn ? "Open the Measurement Level Dialog" : "Buka Dialog Tingkat Pengukuran"}>
            <p className="text-sm">
              {isEn ? (
                <>
                  Open the <strong>Data → Set Measurement Level</strong> menu to open the dialog.
                  The system automatically shows the variables whose measurement level is still unknown.
                </>
              ) : (
                <>
                  Akses menu <strong>Data → Set Measurement Level</strong> untuk membuka dialog.
                  Sistem akan otomatis menampilkan variabel dengan tingkat pengukuran yang belum diketahui.
                </>
              )}
            </p>
          </HelpStep>

          <HelpStep number={2} title={isEn ? "Identify the Data Type" : "Identifikasi Jenis Data"}>
            <p className="text-sm">
              {isEn ? "Determine the data type of each variable:" : "Tentukan jenis data untuk setiap variabel:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li><strong>Nominal</strong>: Categories without order (Gender, Color, Religion)</li>
                  <li><strong>Ordinal</strong>: Ordered categories (Education Level, Satisfaction Rating)</li>
                  <li><strong>Scale</strong>: Numeric data (Age, Income, Height)</li>
                </>
              ) : (
                <>
                  <li><strong>Nominal</strong>: Kategori tanpa urutan (Jenis Kelamin, Warna, Agama)</li>
                  <li><strong>Ordinal</strong>: Kategori dengan urutan (Tingkat Pendidikan, Rating Kepuasan)</li>
                  <li><strong>Skala</strong>: Data numerik (Umur, Pendapatan, Tinggi Badan)</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={3} title={isEn ? "Select and Move Variables" : "Pilih dan Pindahkan Variabel"}>
            <p className="text-sm">
              {isEn
                ? "Select variables from the \"Available\" list and use the arrow buttons to move them to the appropriate category (Nominal, Ordinal, or Scale)."
                : "Pilih variabel dari daftar \"Tersedia\" dan gunakan tombol panah untuk memindahkannya ke kategori yang sesuai (Nominal, Ordinal, atau Skala)."}
            </p>
          </HelpStep>

          <HelpStep number={4} title={isEn ? "Verify the Grouping" : "Verifikasi Pengelompokan"}>
            <p className="text-sm">
              {isEn
                ? "Double-check the variable grouping. You can move variables between categories if needed before saving the changes."
                : "Periksa kembali pengelompokan variabel. Anda dapat memindahkan variabel antar kategori jika diperlukan sebelum menyimpan perubahan."}
            </p>
          </HelpStep>

          <HelpStep number={5} title={isEn ? "Save the Changes" : "Simpan Perubahan"}>
            <p className="text-sm">
              {isEn ? (
                <>Click the <strong>OK</strong> button to save the measurement level settings permanently.</>
              ) : (
                <>Klik tombol <strong>OK</strong> untuk menyimpan pengaturan tingkat pengukuran secara permanen.</>
              )}
            </p>
          </HelpStep>
        </div>
      )
    },
    {
      id: 'overview',
      title: isEn ? 'Overview' : 'Ringkasan',
      description: isEn ? 'An introduction to the Set Measurement Level feature' : 'Pengantar fitur Atur Tingkat Pengukuran',
      icon: Ruler,
      content: (
        <div className="space-y-4">
          <p>
            {isEn
              ? "This feature helps you quickly define the measurement level of your variables. When opened, it automatically detects and shows all variables in your dataset whose measurement level has not been set. You can easily move these variables into the right category using the intuitive interface."
              : "Fitur ini membantu Anda dengan cepat mendefinisikan tingkat pengukuran untuk variabel Anda. Ketika dibuka, fitur ini secara otomatis mendeteksi dan menampilkan semua variabel dalam dataset Anda yang belum ditentukan tingkat pengukurannya. Anda dapat dengan mudah memindahkan variabel-variabel ini ke kategori yang sesuai menggunakan antarmuka yang intuitif."}
          </p>

          <HelpAlert variant="info" title={isEn ? "Why It Matters" : "Mengapa Ini Penting"}>
            <p className="text-sm mt-2">
              {isEn
                ? "The measurement level determines which statistical analyses you can run and how to interpret your results. Correct classification is essential for a valid analysis."
                : "Tingkat pengukuran menentukan analisis statistik apa yang dapat Anda lakukan dan cara menginterpretasikan hasil Anda. Klasifikasi yang tepat sangat penting untuk analisis yang valid."}
            </p>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'interface',
      title: isEn ? 'Interface and Components' : 'Antarmuka dan Komponen',
      description: isEn ? 'The components of the Set Measurement Level dialog' : 'Komponen dalam modal Atur Tingkat Pengukuran',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Available Variables List" : "Daftar Variabel Tersedia"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "Shows all variables with an unknown measurement level. These variables appear automatically when the dialog opens."
                : "Menampilkan semua variabel dengan tingkat pengukuran yang tidak diketahui. Variabel-variabel ini muncul secara otomatis ketika modal dibuka."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Target Lists" : "Daftar Target"} variant="feature">
            <p className="text-sm mb-3">
              {isEn
                ? "Three separate boxes to hold variables by their measurement level:"
                : "Tiga kotak terpisah untuk menampung variabel berdasarkan tingkat pengukurannya:"}
            </p>
            <div className="space-y-3">
              <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700 p-3 rounded-lg">
                <p className="font-semibold text-sm mb-1">Nominal</p>
                <p className="text-xs">
                  {isEn
                    ? "For categorical data without order (for example, 'Gender', 'City')."
                    : "Untuk data kategorikal tanpa urutan (misalnya, 'Jenis Kelamin', 'Kota')."}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-green-200 dark:border-green-700 p-3 rounded-lg">
                <p className="font-semibold text-sm mb-1">Ordinal</p>
                <p className="text-xs">
                  {isEn
                    ? "For ordered categorical data (for example, 'Education Level', 'Customer Satisfaction')."
                    : "Untuk data kategorikal dengan urutan (misalnya, 'Tingkat Pendidikan', 'Kepuasan Pelanggan')."}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-700 p-3 rounded-lg">
                <p className="font-semibold text-sm mb-1">{isEn ? "Scale" : "Skala"}</p>
                <p className="text-xs">
                  {isEn
                    ? "For quantitative/numeric data (for example, 'Age', 'Income')."
                    : "Untuk data kuantitatif/numerik (misalnya, 'Umur', 'Pendapatan')."}
                </p>
              </div>
            </div>
          </HelpCard>

          <HelpCard title={isEn ? "Arrow Buttons" : "Tombol Panah"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "Let you move the highlighted variables from the \"Available\" list to the appropriate target list. Select the variables first, then click the arrow button pointing to the category you want."
                : "Memungkinkan Anda memindahkan variabel yang disorot dari daftar \"Tersedia\" ke daftar target yang sesuai. Pilih variabel terlebih dahulu, kemudian klik tombol panah yang menunjuk ke kategori yang Anda inginkan."}
            </p>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'workflow',
      title: isEn ? 'Workflow and Usage Examples' : 'Alur Kerja dan Contoh Penggunaan',
      description: isEn ? 'A step-by-step guide to using this feature' : 'Panduan langkah demi langkah untuk menggunakan fitur ini',
      icon: Hash,
      content: (
        <div className="space-y-4">
          <HelpSection title={isEn ? "Step 1: Initialization" : "Langkah 1: Inisialisasi"}>
            <p className="text-sm">
              {isEn
                ? "When you open the dialog, all variables with an unknown measurement level are automatically loaded into the \"Available\" list."
                : "Ketika Anda membuka modal, semua variabel dengan tingkat pengukuran yang tidak diketahui secara otomatis dimuat ke dalam daftar \"Tersedia\"."}
            </p>
          </HelpSection>

          <HelpSection title={isEn ? "Step 2: User Interaction" : "Langkah 2: Interaksi Pengguna"}>
            <p className="text-sm">
              {isEn
                ? "Select one or more variables from the \"Available\" list and use the arrow buttons to move them into the appropriate category: Nominal, Ordinal, or Scale."
                : "Pilih satu atau lebih variabel dari daftar \"Tersedia\" dan gunakan tombol panah untuk memindahkannya ke kategori yang sesuai yaitu Nominal, Ordinal, atau Skala."}
            </p>
          </HelpSection>

          <HelpSection title={isEn ? "Step 3: Save the Changes" : "Langkah 3: Simpan Perubahan"}>
            <p className="text-sm">
              {isEn ? (
                <>Click <strong>OK</strong> and the measurement level of the moved variables will be updated permanently in your dataset.</>
              ) : (
                <>Klik <strong>OK</strong> dan tingkat pengukuran untuk variabel yang dipindahkan akan diperbarui secara permanen dalam dataset Anda.</>
              )}
            </p>
          </HelpSection>

          <HelpAlert variant="success" title={isEn ? "Usage Tips" : "Tips Penggunaan"}>
            <div className="text-sm mt-2 space-y-1">
              {isEn ? (
                <>
                  <p>• You can select several variables at once through the available selection interface</p>
                  <p>• Variables can be moved back if you change your mind about their category</p>
                  <p>• Changes are only saved after you click OK</p>
                </>
              ) : (
                <>
                  <p>• Anda dapat memilih beberapa variabel sekaligus melalui antarmuka pemilihan yang tersedia</p>
                  <p>• Variabel dapat dipindahkan kembali jika Anda berubah pikiran tentang kategorinya</p>
                  <p>• Perubahan hanya disimpan setelah mengklik OK</p>
                </>
              )}
            </div>
          </HelpAlert>
        </div>
      )
    }
  ];



  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Identify Data Types Quickly' : 'Identifikasi Jenis Data dengan Cepat',
      content: isEn
        ? 'Consider the nature of your data: is it categories without order (nominal), ordered categories (ordinal), or numeric data (scale)?'
        : 'Pertimbangkan sifat data Anda: apakah berupa kategori tanpa urutan (nominal), kategori dengan urutan (ordinal), atau data numerik (skala)?'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Selecting Multiple Variables' : 'Pemilihan Multiple Variabel',
      content: isEn
        ? 'Use the multiple selection in the dialog to pick several variables at once and move them together into the same category.'
        : 'Gunakan fitur seleksi multiple pada dialog untuk memilih beberapa variabel sekaligus dan memindahkannya bersamaan ke kategori yang sama.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Validate Before Saving' : 'Validasi Sebelum Simpan',
      content: isEn
        ? 'Always double-check the chosen categories before saving the changes. A wrong measurement level can affect the statistical analysis.'
        : 'Selalu periksa kembali kategori yang dipilih sebelum menyimpan perubahan. Tingkat pengukuran yang salah dapat mempengaruhi analisis statistik.'
    },
    {
      type: 'tip' as const,
      title: isEn ? 'Practical Grouping Examples' : 'Contoh Praktis Pengelompokan',
      content: isEn
        ? 'Nominal: Gender, Religion, Color. Ordinal: Rating, Education Level, Likert Scale. Scale: Age, Income, Weight.'
        : 'Nominal: Jenis Kelamin, Agama, Warna. Ordinal: Rating, Tingkat Pendidikan, Skala Likert. Skala: Umur, Pendapatan, Berat Badan.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Data Management' : 'Manajemen Data', href: '/help/data-guide' },
    { title: isEn ? 'Variable Properties' : 'Properti Variabel', href: '/help/data-guide/define-var-props' },
    { title: isEn ? 'Sort Cases' : 'Urutkan Kasus', href: '/help/data-guide/sort-cases' },
    { title: isEn ? 'Descriptive Statistics' : 'Statistik Deskriptif', href: '/help/statistics-guide/descriptive' },
    { title: isEn ? 'Data Validation' : 'Validasi Data', href: '/help/data-guide/unusual-cases' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Set Measurement Level" : "Atur Tingkat Pengukuran"}
      description={isEn
        ? "A complete guide to defining the measurement level (Nominal, Ordinal, Scale) of variables in a dataset"
        : "Panduan lengkap untuk mendefinisikan tingkat pengukuran (Nominal, Ordinal, Skala) variabel dalam dataset"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
}
