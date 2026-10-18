import React from 'react';
import { Shuffle, RotateCcw, Calculator, Filter, ListOrdered, Settings, Copy } from 'lucide-react';
import { HelpGuideTemplate } from '../../../ui/HelpGuideTemplate';
import { HelpAlert, HelpCard, HelpStep } from '../../../ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const DataTransformationTab: React.FC = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'how-to-transform',
      title: isEn ? 'How to Transform Data' : 'Cara Mentransformasi Data',
      description: isEn ? 'A step-by-step guide to effective data transformation' : 'Panduan langkah demi langkah untuk transformasi data yang efektif',
      icon: ListOrdered,
      content: (
        <div className="space-y-4">
          <HelpStep number={1} title={isEn ? "Analyze the Transformation Needs" : "Analisis Kebutuhan Transformasi"}>
            <p className="text-sm">
              {isEn ? "Determine the type of transformation needed:" : "Tentukan jenis transformasi yang diperlukan:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Identify the current data structure vs the required one</li>
                  <li>Consider the requirements of the analysis you will run</li>
                  <li>Evaluate the data format: wide vs long</li>
                  <li>Determine the level of aggregation needed</li>
                </>
              ) : (
                <>
                  <li>Identifikasi struktur data saat ini vs yang dibutuhkan</li>
                  <li>Pertimbangkan requirements analisis yang akan dilakukan</li>
                  <li>Evaluasi format data: wide vs long</li>
                  <li>Tentukan level agregasi yang diperlukan</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={2} title={isEn ? "Back Up and Prepare" : "Backup dan Persiapan"}>
            <p className="text-sm">
              {isEn ? "Make a backup before transforming:" : "Lakukan backup sebelum transformasi:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Save the original file with <strong>File → Save As</strong></li>
                  <li>Use clear versioning (v1, v2, etc.)</li>
                  <li>Document the transformations you are about to apply</li>
                  <li>Test on a subset of the data if the dataset is large</li>
                </>
              ) : (
                <>
                  <li>Simpan file asli dengan <strong>File → Save As</strong></li>
                  <li>Buat versioning yang jelas (v1, v2, dll.)</li>
                  <li>Dokumentasikan transformasi yang akan dilakukan</li>
                  <li>Test pada subset data jika dataset besar</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={3} title={isEn ? "Apply the Transformation" : "Lakukan Transformasi"}>
            <p className="text-sm">
              {isEn ? "Choose and apply the appropriate transformation:" : "Pilih dan terapkan transformasi yang sesuai:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Use <strong>Data → Aggregate</strong> for per-group summaries</li>
                  <li>Use <strong>Data → Restructure</strong> to change the format</li>
                  <li>Use <strong>Data → Select Cases</strong> for filtering</li>
                  <li>Use <strong>Data → Transpose</strong> for a different orientation</li>
                </>
              ) : (
                <>
                  <li>Gunakan <strong>Data → Aggregate</strong> untuk ringkasan per kelompok</li>
                  <li>Gunakan <strong>Data → Restructure</strong> untuk ubah format</li>
                  <li>Gunakan <strong>Data → Select Cases</strong> untuk filtering</li>
                  <li>Gunakan <strong>Data → Transpose</strong> untuk orientasi berbeda</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={4} title={isEn ? "Validate the Results" : "Validasi Hasil"}>
            <p className="text-sm">
              {isEn ? "Check the transformation results to make sure they are accurate:" : "Periksa hasil transformasi untuk memastikan akurasi:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Compare summary statistics before and after</li>
                  <li>Check the dataset size and the new structure</li>
                  <li>Validate the logical consistency of the result</li>
                  <li>Test with a simple analysis to make sure the format is right</li>
                </>
              ) : (
                <>
                  <li>Bandingkan statistik summary sebelum dan sesudah</li>
                  <li>Periksa ukuran dataset dan struktur baru</li>
                  <li>Validasi logical consistency hasil transformasi</li>
                  <li>Test dengan analisis sederhana untuk memastikan format benar</li>
                </>
              )}
            </ul>
          </HelpStep>
        </div>
      )
    },
    {
      id: 'transformation-tools',
      title: isEn ? 'Data Transformation Tools' : 'Tools Transformasi Data',
      description: isEn ? 'The main features for transforming and manipulating data' : 'Fitur-fitur utama untuk transformasi dan manipulasi data',
      icon: Settings,
      content: (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <HelpCard title={isEn ? "Data Aggregation" : "Agregasi Data"} icon={Calculator} variant="feature">
            <p className="text-sm">
              <strong>Data → Aggregate</strong><br />
              {isEn
                ? "Create summary statistics per group (mean, sum, max, etc.)"
                : "Buat statistik ringkasan per kelompok (mean, sum, max, dll.)"}
            </p>
            <ul className="text-sm mt-2 space-y-1">
              {isEn ? (
                <>
                  <li>• Choose the break variables for grouping</li>
                  <li>• Pick the appropriate aggregate function</li>
                </>
              ) : (
                <>
                  <li>• Pilih variabel break untuk pengelompokan</li>
                  <li>• Tentukan fungsi agregasi yang sesuai</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title={isEn ? "Data Restructuring" : "Restrukturisasi Data"} icon={Shuffle} variant="feature">
            <p className="text-sm">
              <strong>Data → Restructure</strong><br />
              {isEn
                ? "Switch between wide ↔ long formats to suit the analysis"
                : "Ubah format wide ↔ long sesuai kebutuhan analisis"}
            </p>
            <ul className="text-sm mt-2 space-y-1">
              {isEn ? (
                <>
                  <li>• Wide: one row per subject</li>
                  <li>• Long: multiple rows per subject</li>
                </>
              ) : (
                <>
                  <li>• Wide: satu baris per subjek</li>
                  <li>• Long: multiple baris per subjek</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title="Transpose Data" icon={RotateCcw} variant="feature">
            <p className="text-sm">
              <strong>Data → Transpose</strong><br />
              {isEn
                ? "Swap rows and columns to change the dataset orientation"
                : "Tukar baris dan kolom untuk ubah orientasi dataset"}
            </p>
            <ul className="text-sm mt-2 space-y-1">
              {isEn ? (
                <>
                  <li>• For certain compact tables</li>
                  <li>• Change the orientation of a data matrix</li>
                </>
              ) : (
                <>
                  <li>• Untuk tabel ringkas tertentu</li>
                  <li>• Ubah orientasi data matrix</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title={isEn ? "Select Cases" : "Pilih Kasus"} icon={Filter} variant="feature">
            <p className="text-sm">
              <strong>Data → Select Cases</strong><br />
              {isEn
                ? "Filter a subset of the data based on specific criteria"
                : "Filter subset data berdasarkan kriteria tertentu"}
            </p>
            <ul className="text-sm mt-2 space-y-1">
              {isEn ? (
                <>
                  <li>• Use complex logical operators</li>
                  <li>• Save frequently used filters</li>
                </>
              ) : (
                <>
                  <li>• Gunakan operator logika kompleks</li>
                  <li>• Simpan filter yang sering dipakai</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title={isEn ? "Identify Duplicates" : "Identifikasi Duplikat"} icon={Copy} variant="feature">
            <p className="text-sm">
              <strong>Data → Identify Duplicate Cases</strong><br />
              {isEn ? "Find and handle duplicate cases" : "Temukan dan tangani kasus duplikat"}
            </p>
            <ul className="text-sm mt-2 space-y-1">
              {isEn ? (
                <>
                  <li>• Define the duplicate criteria</li>
                  <li>• Document how they are handled</li>
                </>
              ) : (
                <>
                  <li>• Definisikan kriteria duplikat</li>
                  <li>• Dokumentasikan penanganan</li>
                </>
              )}
            </ul>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'transformation-concepts',
      title: isEn ? 'Transformation Concepts' : 'Konsep Transformasi',
      description: isEn ? 'An in-depth understanding of the different types of data transformation' : 'Pemahaman mendalam tentang berbagai jenis transformasi data',
      icon: Shuffle,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="info" title={isEn ? "Transformation Principles" : "Prinsip Transformasi"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Data transformations should preserve important information while changing the format to meet the analysis needs. Always validate the results to make sure no information has been lost."
                : "Transformasi data harus preserve informasi penting sambil mengubah format untuk memenuhi kebutuhan analisis. Selalu validasi hasil untuk memastikan tidak ada informasi yang hilang."}
            </p>
          </HelpAlert>

          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <HelpCard title={isEn ? "Aggregation and Summaries" : "Agregasi dan Ringkasan"} icon={Calculator} variant="step">
              <ul className="text-sm space-y-1">
                {isEn ? (
                  <>
                    <li>• Choose the right break variables</li>
                    <li>• Pick an appropriate aggregate function</li>
                    <li>• Consider missing values</li>
                    <li>• Validate the results against the original data</li>
                    <li>• Document the aggregation level</li>
                  </>
                ) : (
                  <>
                    <li>• Pilih variabel break yang tepat</li>
                    <li>• Tentukan fungsi agregasi sesuai</li>
                    <li>• Pertimbangkan missing values</li>
                    <li>• Validasi hasil dengan data asli</li>
                    <li>• Dokumentasikan level agregasi</li>
                  </>
                )}
              </ul>
            </HelpCard>

            <HelpCard title={isEn ? "Format Restructuring" : "Restrukturisasi Format"} icon={Shuffle} variant="step">
              <ul className="text-sm space-y-1">
                {isEn ? (
                  <>
                    <li>• Wide format: one row per subject</li>
                    <li>• Long format: multiple rows per subject</li>
                    <li>• Choose based on the analysis requirements</li>
                    <li>• Make sure IDs stay consistent</li>
                    <li>• Test with a subset of the data first</li>
                  </>
                ) : (
                  <>
                    <li>• Wide format: satu baris per subjek</li>
                    <li>• Long format: multiple baris per subjek</li>
                    <li>• Pilih based on analysis requirements</li>
                    <li>• Pastikan ID tetap konsisten</li>
                    <li>• Test dengan subset data dulu</li>
                  </>
                )}
              </ul>
            </HelpCard>

            <HelpCard title={isEn ? "Filtering and Selection" : "Filtering dan Seleksi"} icon={Filter} variant="step">
              <ul className="text-sm space-y-1">
                {isEn ? (
                  <>
                    <li>• Define the selection criteria clearly</li>
                    <li>• Use logical operators for complex conditions</li>
                    <li>• Save frequently used filters</li>
                    <li>• Document the reasons for filtering</li>
                    <li>• Monitor the impact on sample size</li>
                  </>
                ) : (
                  <>
                    <li>• Definisikan kriteria seleksi dengan jelas</li>
                    <li>• Gunakan operator logika untuk kondisi kompleks</li>
                    <li>• Simpan filter yang sering digunakan</li>
                    <li>• Dokumentasikan alasan filtering</li>
                    <li>• Monitor impact pada sample size</li>
                  </>
                )}
              </ul>
            </HelpCard>

            <HelpCard title={isEn ? "Handling Duplicates" : "Penanganan Duplikat"} icon={Copy} variant="step">
              <ul className="text-sm space-y-1">
                {isEn ? (
                  <>
                    <li>• Decide the criteria that define a duplicate</li>
                    <li>• Check whether duplicates are valid or errors</li>
                    <li>• Choose a strategy: delete, merge, or flag</li>
                    <li>• Document the handling decisions</li>
                    <li>• Validate the impact on the analysis</li>
                  </>
                ) : (
                  <>
                    <li>• Tentukan kriteria mendefinisikan duplikat</li>
                    <li>• Periksa apakah duplikat valid atau error</li>
                    <li>• Pilih strategi: hapus, gabung, atau tandai</li>
                    <li>• Dokumentasikan keputusan penanganan</li>
                    <li>• Validasi impact pada analysis</li>
                  </>
                )}
              </ul>
            </HelpCard>
          </div>
        </div>
      )
    }
  ];

  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Test on a Subset' : 'Test pada Subset',
      content: isEn
        ? 'Always test complex transformations on a small subset of the data first to make sure the results match your expectations.'
        : 'Selalu test transformasi kompleks pada subset data kecil terlebih dahulu untuk memastikan hasil sesuai ekspektasi.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Document Transformations' : 'Dokumentasi Transformasi',
      content: isEn
        ? 'Document every transformation step in detail for reproducibility and a good audit trail.'
        : 'Dokumentasikan setiap step transformasi dengan detail untuk reproducibility dan audit trail yang baik.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Back Up the Original Data' : 'Backup Data Asli',
      content: isEn
        ? "Don't forget to back up the original data before transforming it. Some transformations cannot be undone easily."
        : 'Jangan lupa backup data asli sebelum transformasi. Beberapa transformasi tidak bisa di-undo dengan mudah.'
    },
    {
      type: 'tip' as const,
      title: isEn ? 'Validate the Results' : 'Validasi Hasil',
      content: isEn
        ? 'Always validate transformation results by comparing summary statistics before and after the transformation.'
        : 'Selalu validasi hasil transformasi dengan membandingkan statistik summary sebelum dan sesudah transformasi.'
    }
  ];

  const relatedTopics = [
    { title: 'Aggregate Data', href: '/help/data-guide/aggregate' },
    { title: 'Restructure Data', href: '/help/data-guide/restructure' },
    { title: 'Select Cases', href: '/help/data-guide/select-cases' },
    { title: 'Transpose Data', href: '/help/data-guide/transpose' },
    { title: 'Identify Duplicate Cases', href: '/help/data-guide/duplicates' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Data Transformation" : "Transformasi Data"}
      description={isEn
        ? "Data transformation tools let you change, manipulate, and restructure a dataset to meet different analysis needs"
        : "Tools transformasi data memungkinkan Anda mengubah, memanipulasi, dan merestrukturisasi dataset untuk memenuhi kebutuhan analisis yang berbeda"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default DataTransformationTab;
