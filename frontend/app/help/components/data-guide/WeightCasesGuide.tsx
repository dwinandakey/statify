/* eslint-disable react/no-unescaped-entities */
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpSection } from '../../ui/HelpLayout';
import { Scale, Settings } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const WeightCasesGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'functionality',
      title: isEn ? 'Feature Overview' : 'Ringkasan Fitur',
      description: isEn ? 'An explanation of the case weighting feature' : 'Penjelasan fitur pembobotan kasus',
      icon: Scale,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Variable-Based Weighting" : "Pembobotan Berbasis Variabel"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "You can choose one numeric variable from the available list. The values of this variable are used to weight each case."
                : "Anda dapat memilih satu variabel numerik dari daftar yang tersedia. Nilai dari variabel ini akan digunakan untuk membobot setiap kasus."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Type Validation" : "Validasi Jenis"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "The dialog automatically filters the list to show only numeric variables as valid weighting candidates."
                : "Dialog secara otomatis memfilter daftar untuk hanya menampilkan variabel numerik sebagai kandidat yang valid untuk pembobotan."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Case Exclusion" : "Pengecualian Kasus"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "Any case with a zero, negative, or missing value for the chosen weight variable is automatically excluded from analyses that use this weight."
                : "Setiap kasus dengan nilai nol, negatif, atau hilang untuk variabel pembobotan yang dipilih akan secara otomatis dikecualikan dari analisis yang menggunakan bobot ini."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Global Setting" : "Pengaturan Global"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "The weighting configuration is a global setting. The dialog shows the currently active weight variable, or \"Do not weight cases\" if none is selected."
                : "Konfigurasi pembobotan adalah pengaturan global. Dialog menampilkan variabel pembobotan yang sedang aktif, atau \"Jangan membobot kasus\" jika tidak ada yang dipilih."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Turning Weighting Off" : "Menonaktifkan Pembobotan"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "To turn weighting off, simply remove the variable from the \"Weight cases by\" list and confirm by clicking \"OK\"."
                : "Untuk mematikan pembobotan, cukup hapus variabel dari daftar \"Bobot kasus berdasarkan\" dan konfirmasi dengan mengklik \"OK\"."}
            </p>
          </HelpCard>

          <HelpAlert variant="info" title={isEn ? "Important Note" : "Catatan Penting"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Case weighting affects all statistical analyses run after it is activated."
                : "Pembobotan kasus mempengaruhi semua analisis statistik yang dilakukan setelah aktivasi."}
            </p>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'workflow',
      title: isEn ? 'Workflow' : 'Alur Kerja',
      description: isEn ? 'Using the feature step by step' : 'Penggunaan fitur langkah demi langkah',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpSection title={isEn ? "Step 1: Initialization" : "Langkah 1: Inisialisasi"}>
            <p className="text-sm">
              {isEn
                ? "The dialog initializes, fetching the variable list and the current weight status."
                : "Modal menginisialisasi, mengambil daftar variabel dan status bobot saat ini."}
            </p>
          </HelpSection>

          <HelpSection title={isEn ? "Step 2: Display" : "Langkah 2: Tampilan"}>
            <p className="text-sm">
              {isEn
                ? "The UI renders the dialog with the available variables and the currently selected weight variable (if any)."
                : "UI merender dialog dengan variabel yang tersedia dan variabel bobot yang dipilih saat ini (jika ada)."}
            </p>
          </HelpSection>

          <HelpSection title={isEn ? "Step 3: Selection" : "Langkah 3: Seleksi"}>
            <p className="text-sm">
              {isEn
                ? "You move a numeric variable into the \"Weight cases by\" target list."
                : "Anda memindahkan variabel numerik ke dalam daftar target \"Bobotkan kasus berdasarkan\"."}
            </p>
          </HelpSection>

          <HelpSection title={isEn ? "Step 4: Confirmation" : "Langkah 4: Konfirmasi"}>
            <p className="text-sm">
              {isEn
                ? "You click \"OK\". This triggers saving the global weight status."
                : "Anda mengklik \"OK\". Ini memicu penyimpanan status bobot global."}
            </p>
          </HelpSection>

          <HelpSection title={isEn ? "Step 5: Global Update" : "Langkah 5: Pembaruan Global"}>
            <p className="text-sm">
              {isEn
                ? "The global store is updated with the new weight variable name (or an empty string if none is selected)."
                : "Penyimpanan global diperbarui dengan nama variabel bobot baru (atau string kosong jika tidak ada yang dipilih)."}
            </p>
          </HelpSection>

          <HelpSection title={isEn ? "Step 6: Completion" : "Langkah 6: Penyelesaian"}>
            <p className="text-sm">
              {isEn ? "The dialog closes." : "Dialog tertutup."}
            </p>
          </HelpSection>

          <HelpAlert variant="success" title={isEn ? "Process Complete" : "Proses Selesai"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Once complete, weighting is active for all subsequent analyses."
                : "Setelah selesai, pembobotan akan aktif untuk semua analisis berikutnya."}
            </p>
          </HelpAlert>
        </div>
      )
    }
  ];


  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Validate the Variable' : 'Validasi Variabel',
      content: isEn
        ? 'Make sure the chosen weight variable is a valid numeric variable.'
        : 'Pastikan variabel pembobot yang dipilih adalah variabel numerik yang valid.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Invalid Values' : 'Nilai Tidak Valid',
      content: isEn
        ? 'Cases with zero, negative, or missing values are excluded from the analysis.'
        : 'Kasus dengan nilai nol, negatif, atau hilang akan dikecualikan dari analisis.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Global Setting' : 'Pengaturan Global',
      content: isEn
        ? 'Weighting is a global setting that affects all analyses.'
        : 'Pembobotan adalah pengaturan global yang mempengaruhi semua analisis.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Data Management' : 'Manajemen Data', href: '/help/data-guide' },
    { title: isEn ? 'Statistical Analysis' : 'Analisis Statistik', href: '/help/statistics-guide' },
    { title: isEn ? 'Variable Types' : 'Jenis Variabel', href: '/help/data-guide/variable-types' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Weight Cases Feature" : "Fitur Pembobotan Kasus"}
      description={isEn
        ? "This guide explains the Weight Cases feature, which lets you apply case weights to a dataset based on the values of a numeric variable"
        : "Panduan ini menjelaskan fungsionalitas Pembobotan Kasus, yang memungkinkan Anda menerapkan bobot kasus pada dataset berdasarkan nilai dari variabel numerik"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default WeightCasesGuide;
