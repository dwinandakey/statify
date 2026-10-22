/* eslint-disable react/no-unescaped-entities */
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpSection } from '../../ui/HelpLayout';
import { RefreshCw, ArrowRightLeft, Settings, FileText } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const RestructureGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'overview',
      title: isEn ? 'Overview' : 'Ringkasan',
      description: isEn ? 'An introduction to the data restructuring wizard' : 'Pengantar wizard restrukturisasi data',
      icon: RefreshCw,
      content: (
        <div className="space-y-4">
          <p>
            {isEn
              ? "This feature provides a step-by-step wizard to easily restructure your dataset. You can convert your data between wide and long formats, or transpose your entire dataset. This is useful when your current data format doesn't fit the requirements of the analysis you want to run."
              : "Fitur ini menyediakan wizard langkah demi langkah untuk dengan mudah merestrukturisasi dataset Anda. Anda dapat mengubah data Anda antara format lebar dan panjang, atau mentranspose seluruh dataset Anda. Ini berguna ketika format data Anda saat ini tidak sesuai dengan persyaratan analisis yang Anda inginkan."}
          </p>

          <HelpAlert variant="info" title={isEn ? "When to Restructure Data" : "Kapan Menggunakan Restrukturisasi Data"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Restructure your data when its current format doesn't fit your analysis needs. For example, repeated measures analysis usually needs the long format, while some multivariate analyses work better with wide-format data."
                : "Gunakan restrukturisasi data ketika format Anda saat ini tidak sesuai dengan kebutuhan analisis Anda. Misalnya, analisis pengukuran berulang biasanya memerlukan format panjang, sedangkan beberapa analisis multivariat bekerja lebih baik dengan data format lebar."}
            </p>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'restructure-methods',
      title: isEn ? 'Restructuring Methods' : 'Metode Restrukturisasi',
      description: isEn ? 'The available data restructuring options' : 'Opsi restrukturisasi data yang tersedia',
      icon: ArrowRightLeft,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Variables to Cases" : "Variabel ke Kasus"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "Turns several variables (columns) into fewer variables by creating new cases (rows). This converts wide-format data to long format, which is commonly needed for repeated measures analysis."
                : "Mengubah beberapa variabel (kolom) menjadi lebih sedikit variabel dengan membuat kasus baru (baris). Ini mengonversi data format lebar ke format panjang, umumnya diperlukan untuk analisis pengukuran berulang."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Cases to Variables" : "Kasus ke Variabel"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "The reverse of the previous method - turns several cases (rows) into variables (columns). This converts long-format data to wide format."
                : "Kebalikan dari metode sebelumnya - mengubah beberapa kasus (baris) menjadi variabel (kolom). Ini mengonversi data format panjang ke format lebar."}
            </p>
          </HelpCard>

          <HelpCard title="Transpose All Data" variant="feature">
            <p className="text-sm">
              {isEn
                ? "Swaps all rows and columns of the entire dataset. No variable selection is needed."
                : "Menukar semua baris dan kolom pada seluruh dataset. Tidak memerlukan pemilihan variabel."}
            </p>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'wizard-flow',
      title: isEn ? 'Wizard Flow' : 'Alur Wizard',
      description: isEn ? 'A step-by-step guide to using the restructuring wizard' : 'Panduan langkah demi langkah menggunakan wizard restrukturisasi',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <p>
            {isEn
              ? "The wizard guides you through 3 steps: Method → Variables → Options. Complete each step before moving on."
              : "Wizard memandu Anda melalui 3 langkah: Method → Variables → Options. Selesaikan tiap langkah sebelum melanjutkan."}
          </p>

          <HelpSection title={isEn ? "Step 1: Choose the Restructuring Method" : "Langkah 1: Pilih Metode Restrukturisasi (Method)"}>
            <p className="text-sm">
              {isEn
                ? "Choose one of the three restructuring methods described above based on your needs."
                : "Pilih salah satu dari tiga metode restrukturisasi yang dijelaskan di atas berdasarkan kebutuhan Anda."}
            </p>
          </HelpSection>

          <HelpSection title={isEn ? "Step 2: Variables" : "Langkah 2: Variabel (Variables)"}>
            <p className="text-sm mb-3">
              {isEn
                ? "Based on the chosen method, configure the variables using the drag-and-drop interface:"
                : "Berdasarkan metode yang dipilih, konfigurasikan variabel menggunakan antarmuka drag-and-drop:"}
            </p>

            <div className="space-y-3">
              <HelpCard title={isEn ? 'Variables to Cases — Target lists' : 'Variables ke Kasus (Variables to Cases) — Target lists'} variant="step">
                <ul className="text-sm space-y-1 mt-2">
                  {isEn ? (
                    <>
                      <li>• Variables to Restructure: the variables that will be converted into rows.</li>
                      <li>• Index Variables: the grouping variables (e.g. Subject ID).</li>
                    </>
                  ) : (
                    <>
                      <li>• Variables to Restructure: variabel yang akan dikonversi jadi baris.</li>
                      <li>• Index Variables: variabel pengelompokan (mis. Subject ID).</li>
                    </>
                  )}
                </ul>
              </HelpCard>

              <HelpCard title={isEn ? 'Cases to Variables — Target lists' : 'Kasus ke Variabel (Cases to Variables) — Target lists'} variant="step">
                <ul className="text-sm space-y-1 mt-2">
                  {isEn ? (
                    <>
                      <li>• Variables to Restructure: the source variables whose values will be split into columns.</li>
                      <li>• Index Variables: the grouping variables (e.g. Subject ID).</li>
                      <li>• Identifier Variables: the distinguishing variable (e.g. Time) — at most 1.</li>
                    </>
                  ) : (
                    <>
                      <li>• Variables to Restructure: variabel sumber nilai yang akan dipecah ke kolom.</li>
                      <li>• Index Variables: variabel pengelompokan (mis. Subject ID).</li>
                      <li>• Identifier Variables: variabel pembeda (mis. Time) — maksimal 1.</li>
                    </>
                  )}
                </ul>
              </HelpCard>

              <HelpCard title={isEn ? 'Transpose All Data' : 'Transpose Semua Data (Transpose All Data)'} variant="step">
                <ul className="text-sm space-y-1 mt-2">
                  {isEn ? (
                    <>
                      <li>• No additional configuration is needed</li>
                      <li>• The system swaps all rows and columns automatically</li>
                    </>
                  ) : (
                    <>
                      <li>• Tidak diperlukan konfigurasi tambahan</li>
                      <li>• Sistem akan menukar semua baris dan kolom secara otomatis</li>
                    </>
                  )}
                </ul>
              </HelpCard>
            </div>
          </HelpSection>
          <HelpSection title={isEn ? "Step 3: Options" : "Langkah 3: Opsi (Options)"}>
            <div className="space-y-3 text-sm">
              <p>
                {isEn ? "The available options depend on the chosen method:" : "Opsi yang tersedia mengikuti metode yang dipilih:"}
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Variables to Cases</strong>: Create count variable; Create index variable.</li>
                <li><strong>Cases to Variables</strong>: Drop empty variables.</li>
                <li>{isEn ? "Transpose All Data: No additional options." : "Transpose All Data: Tidak ada opsi tambahan."}</li>
              </ul>
            </div>
          </HelpSection>

          <HelpAlert variant="warning" title={isEn ? "Important" : "Penting"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Restructuring data can change the structure of your dataset significantly. Make sure you understand the implications before applying the changes."
                : "Restrukturisasi data dapat mengubah struktur dataset Anda secara signifikan. Pastikan Anda memahami implikasinya sebelum menerapkan perubahan."}
            </p>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'best-practices',
      title: isEn ? 'Tips and Best Practices' : 'Tips dan Praktik Terbaik',
      description: isEn ? 'Best practices for effective data restructuring' : 'Praktik terbaik untuk restrukturisasi data yang efektif',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HelpCard title={isEn ? "Back Up Your Data" : "Cadangkan Data Anda"} variant="step">
              <p className="text-sm">
                {isEn
                  ? "Always back up your dataset before a major restructuring to prevent data loss."
                  : "Selalu buat cadangan dataset Anda sebelum restrukturisasi besar untuk mencegah kehilangan data."}
              </p>
            </HelpCard>

            <HelpCard title={isEn ? "Validate the Results" : "Validasi Hasil"} variant="step">
              <p className="text-sm">
                {isEn
                  ? "Check the results to make sure no data was lost or distorted during the process."
                  : "Periksa hasil untuk memastikan tidak ada data yang hilang atau terdistorsi selama proses."}
              </p>
            </HelpCard>

            <HelpCard title={isEn ? "Test with a Subset" : "Uji dengan Subset"} variant="step">
              <p className="text-sm">
                {isEn
                  ? "Try restructuring a small subset of your data first before applying it to the whole dataset."
                  : "Coba restrukturisasi dengan subset kecil data Anda terlebih dahulu sebelum menerapkan ke seluruh dataset."}
              </p>
            </HelpCard>

            <HelpCard title={isEn ? "Document the Changes" : "Dokumentasikan Perubahan"} variant="step">
              <p className="text-sm">
                {isEn
                  ? "Record your restructuring steps for reproducibility and future reference."
                  : "Catat langkah-langkah restrukturisasi Anda untuk reproduktibilitas dan referensi masa depan."}
              </p>
            </HelpCard>
          </div>

          <HelpAlert variant="success" title={isEn ? "Pro Tip" : "Tips Pro"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Review the summary in the Options step (Method and number of selected variables) before running it."
                : "Tinjau ringkasan di langkah Options (Method dan jumlah variabel terpilih) sebelum mengeksekusi."}
            </p>
          </HelpAlert>
        </div>
      )
    }
  ];


  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Plan Your Format' : 'Rencanakan Format Anda',
      content: isEn
        ? 'Plan the data structure you want before you start restructuring for the best results.'
        : 'Rencanakan struktur data yang diinginkan sebelum memulai restrukturisasi untuk hasil yang optimal.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Analysis Compatibility' : 'Kompatibilitas Analisis',
      content: isEn
        ? 'Make sure the resulting data format is compatible with the type of analysis you plan to run.'
        : 'Pastikan format data yang dihasilkan kompatibel dengan jenis analisis yang Anda rencanakan.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Validate Integrity' : 'Validasi Integritas',
      content: isEn
        ? 'Always validate data integrity after restructuring to make sure no data has been lost.'
        : 'Selalu validasi integritas data setelah restrukturisasi untuk memastikan tidak ada data yang hilang.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Data Management' : 'Manajemen Data', href: '/help/data-guide' },
    { title: 'Transpose Data', href: '/help/data-guide/transpose' },
    { title: isEn ? 'Sort Cases' : 'Urutkan Kasus', href: '/help/data-guide/sort-cases' },
    { title: isEn ? 'Data Aggregation' : 'Agregasi Data', href: '/help/statistics-guide/descriptive' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Data Restructuring Guide" : "Panduan Restrukturisasi Data"}
      description={isEn
        ? "A step-by-step wizard to easily restructure your dataset"
        : "Wizard langkah demi langkah untuk merestrukturisasi dataset Anda dengan mudah"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default RestructureGuide;
