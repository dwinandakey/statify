/* eslint-disable react/no-unescaped-entities */
import { HelpGuideTemplate } from '../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpSection } from '../../ui/HelpLayout';
import { ArrowUpDown, Database, Settings } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const TransposeGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'interface',
      title: isEn ? 'Interface & Component Functions' : 'Antarmuka & Fungsionalitas Komponen',
      description: isEn ? 'The main components of the transpose feature' : 'Komponen utama dalam fitur transpose',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Available Variables List" : "Daftar Variabel Tersedia"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "Shows all variables available in your current dataset."
                : "Menampilkan semua variabel yang tersedia dalam dataset Anda saat ini."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Variables to Transpose" : "Variabel untuk Ditranspose"} variant="feature">
            <p className="text-sm">
              {isEn
                ? "This list holds the variables you have chosen to become rows in your new dataset."
                : "Daftar ini menyimpan variabel yang telah Anda pilih untuk menjadi baris dalam dataset baru Anda."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "Name Variable (Optional)" : "Variabel Nama (Opsional)"} variant="feature">
            <p className="text-sm">
              {isEn ? (
                <>
                  This field is optional. You can move <strong>one</strong>{' '}
                  variable here. The value in each row of this variable is used as the
                  name of the new variables (columns) that will be created.
                </>
              ) : (
                <>
                  Bidang ini bersifat opsional. Anda dapat memindahkan <strong>satu</strong>{' '}
                  variabel ke sini. Nilai dari setiap baris variabel ini akan
                  digunakan sebagai nama untuk variabel baru (kolom) yang akan dibuat.
                </>
              )}
            </p>
          </HelpCard>

          <HelpAlert variant="info" title={isEn ? "Usage Tip" : "Tips Penggunaan"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Drag and drop variables between the components to configure your transpose settings."
                : "Seret dan lepas variabel antar komponen untuk mengkonfigurasi pengaturan transpose Anda."}
            </p>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'new-variables',
      title: isEn ? 'New Variables Created' : 'Variabel Baru yang Dibuat',
      description: isEn ? 'The variables that will be created after transposing' : 'Variabel yang akan dibuat setelah transpose',
      icon: Database,
      content: (
        <div className="space-y-4">
          <HelpCard title="case_lbl" variant="feature">
            <p className="text-sm">
              {isEn
                ? "This variable is created automatically. This column contains the names of the original variables you chose to transpose."
                : "Variabel ini dibuat secara otomatis. Kolom ini akan berisi nama-nama variabel asli yang Anda pilih untuk ditranspose."}
            </p>
          </HelpCard>

          <HelpCard title={isEn ? "New Case Variables" : "Variabel Kasus Baru"} variant="feature">
            <div className="space-y-3">
              <p className="text-sm">
                {isEn
                  ? "New variables (columns) are created, one for each case (row) in your original data."
                  : "Variabel baru (kolom) akan dibuat, satu untuk setiap kasus (baris) dalam data asli Anda."}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <HelpCard title={isEn ? "Without a Name Variable" : "Tanpa Variabel Nama"} variant="step">
                  <p className="text-sm">
                    {isEn
                      ? "The new column names will be `Var1`, `Var2`, `Var3`, and so on."
                      : "Nama kolom baru akan menjadi `Var1`, `Var2`, `Var3`, dan seterusnya."}
                  </p>
                </HelpCard>

                <HelpCard title={isEn ? "With a Name Variable" : "Dengan Variabel Nama"} variant="step">
                  <p className="text-sm">
                    {isEn
                      ? "The new column names are taken from the values in that variable."
                      : "Nama kolom baru akan diambil dari nilai dalam variabel tersebut."}
                  </p>
                </HelpCard>
              </div>
            </div>
          </HelpCard>

          <HelpAlert variant="success" title={isEn ? "Transpose Result" : "Hasil Transpose"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Your data structure will change from wide to long format or vice versa."
                : "Struktur data Anda akan berubah dari format lebar ke format panjang atau sebaliknya."}
            </p>
          </HelpAlert>
        </div>
      )
    },
    {
      id: 'examples',
      title: isEn ? 'Usage Examples' : 'Contoh Penggunaan',
      description: isEn ? 'Practical scenarios for using transpose' : 'Skenario praktis penggunaan transpose',
      icon: ArrowUpDown,
      content: (
        <div className="space-y-4">
          <HelpCard title={isEn ? "Scenario 1: Simple Transpose (Wide to Long)" : "Skenario 1: Transpose Sederhana (Lebar ke Panjang)"} variant="feature">
            <div className="space-y-3">
              <p className="text-sm">
                {isEn
                  ? "You have quarterly sales data with the columns `Q1`, `Q2`, `Q3`, `Q4`. You want each quarter to become a row."
                  : "Anda memiliki data penjualan kuartalan dengan kolom `Q1`, `Q2`, `Q3`, `Q4`. Anda ingin setiap kuartal menjadi baris."}
              </p>

              <HelpSection title={isEn ? "Steps:" : "Langkah:"}>
                <ol className="list-decimal list-inside ml-4 text-sm space-y-1">
                  {isEn ? (
                    <>
                      <li>Move the variables `Q1`, `Q2`, `Q3`, and `Q4` to the "Variable(s)" list.</li>
                      <li>Leave "Name Variable" empty.</li>
                      <li>Click OK.</li>
                    </>
                  ) : (
                    <>
                      <li>Pindahkan variabel `Q1`, `Q2`, `Q3`, dan `Q4` ke daftar "Variabel".</li>
                      <li>Biarkan "Variabel Nama" kosong.</li>
                      <li>Klik OK.</li>
                    </>
                  )}
                </ol>
              </HelpSection>
            </div>
          </HelpCard>

          <HelpCard title={isEn ? "Scenario 2: Using Values as Column Names" : "Skenario 2: Menggunakan Nilai sebagai Nama Kolom"} variant="feature">
            <div className="space-y-3">
              <p className="text-sm">
                {isEn
                  ? "You have yearly data with the columns `Product_ID`, `Year_2020`, `Year_2021`, `Year_2022`. You want each year to become a row and use `Product_ID` as the new column names."
                  : "Anda memiliki data tahunan dengan kolom `Product_ID`, `Year_2020`, `Year_2021`, `Year_2022`. Anda ingin setiap tahun menjadi baris dan menggunakan `Product_ID` sebagai nama kolom baru."}
              </p>

              <HelpSection title={isEn ? "Steps:" : "Langkah:"}>
                <ol className="list-decimal list-inside ml-4 text-sm space-y-1">
                  {isEn ? (
                    <>
                      <li>Move `Year_2020`, `Year_2021`, `Year_2022` to the "Variable(s)" list.</li>
                      <li>Move `Product_ID` to the "Name Variable" list.</li>
                      <li>Click OK.</li>
                    </>
                  ) : (
                    <>
                      <li>Pindahkan `Year_2020`, `Year_2021`, `Year_2022` ke daftar "Variable(s)".</li>
                      <li>Pindahkan `Product_ID` ke daftar "Name Variable".</li>
                      <li>Klik OK.</li>
                    </>
                  )}
                </ol>
              </HelpSection>
            </div>
          </HelpCard>

          <HelpAlert variant="warning" title={isEn ? "Important" : "Penting"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Make sure the selected variables have compatible data types for transposition."
                : "Pastikan variabel yang dipilih memiliki jenis data yang kompatibel untuk ditranspose."}
            </p>
          </HelpAlert>
        </div>
      )
    }
  ];


  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Name Variable' : 'Variabel Nama',
      content: isEn
        ? 'Use a name variable to give the new columns meaningful names.'
        : 'Gunakan variabel nama untuk memberikan nama yang bermakna untuk kolom baru.'
    },
    {
      type: 'info' as const,
      title: 'case_lbl',
      content: isEn
        ? 'The case_lbl variable is created automatically to store the original variable names.'
        : 'Variabel case_lbl akan dibuat secara otomatis untuk menyimpan nama variabel asli.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Data Types' : 'Jenis Data',
      content: isEn
        ? 'Make sure the transposed variables have consistent data types.'
        : 'Pastikan variabel yang ditranspose memiliki jenis data yang konsisten.'
    }
  ];

  const relatedTopics = [
    { title: isEn ? 'Data Management' : 'Manajemen Data', href: '/help/data-guide' },
    { title: isEn ? 'Restructure Data' : 'Restrukturisasi Data', href: '/help/data-guide/restructure' },
    { title: isEn ? 'Sort Variables' : 'Urutkan Variabel', href: '/help/data-guide/sort-vars' },
    { title: isEn ? 'Merge Data' : 'Gabung Data', href: '/help/data-guide/merge' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Transpose Data Feature" : "Fitur Transpose Data"}
      description={isEn
        ? "This guide explains the 'Transpose' feature, a powerful tool for restructuring your dataset by swapping rows and columns."
        : "Panduan ini menjelaskan fungsionalitas 'Transpose', alat yang kuat untuk merestrukturisasi dataset Anda dengan menukar baris dan kolom."}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default TransposeGuide;
