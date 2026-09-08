import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { HelpCircle, Table, Calculator, BarChart3, ClipboardList, SlidersHorizontal, Shield, Save } from 'lucide-react';

/*
 * Help Guide: Binary Logistic Regression (Bahasa Indonesia)
 * ----------------------------------------------------------------------------
 * Komponen ini menyediakan panduan pengguna untuk modal Regresi Logistik Biner
 * (lihat `components/Modals/Analyze/Regression/BinaryLogistic/dialogs/BinaryLogisticMain.tsx`).
 *
 * Layout mengikuti pola yang sama dengan Frequencies help guide dan
 * LinearRegression help guide agar UX konsisten di seluruh prosedur statistik.
 */

// ----------- Tab content components ----------------------------------------

const OverviewTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="info" title="Apa itu Regresi Logistik Biner?">
      <p className="text-sm mt-2">
        Regresi Logistik Biner adalah metode statistik yang digunakan untuk memprediksi 
        probabilitas suatu kejadian biner (ya/tidak, sukses/gagal, 0/1) berdasarkan 
        satu atau lebih variabel prediktor. Metode ini menggunakan fungsi logistik (sigmoid) 
        untuk memodelkan hubungan antara variabel dependen kategorikal dan variabel independen.
      </p>
    </HelpAlert>

    <HelpCard title="Kapan Menggunakan Regresi Logistik Biner?" icon={HelpCircle} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Variabel dependen (outcome) bersifat biner — hanya memiliki 2 kategori (contoh: Lulus/Tidak Lulus, Ya/Tidak)</li>
        <li>Memprediksi probabilitas suatu kejadian berdasarkan prediktor</li>
        <li>Menilai kekuatan hubungan antara variabel prediktor dan outcome</li>
        <li>Mengidentifikasi faktor risiko atau faktor protektif (Odds Ratio)</li>
        <li>Membangun model klasifikasi untuk mengelompokkan observasi</li>
      </ul>
    </HelpCard>

    <HelpCard title="Yang Akan Anda Pelajari" icon={ClipboardList} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Memilih variabel dependen dan kovariat untuk analisis</li>
        <li>Menggunakan berbagai metode seleksi variabel (Enter, Forward, Backward)</li>
        <li>Pengaturan variabel kategorikal (kontras dan referensi)</li>
        <li>Opsi statistik dan diagnostik yang tersedia</li>
        <li>Uji asumsi (multikolinearitas, Box-Tidwell)</li>
        <li>Menyimpan prediksi dan residual ke dataset</li>
        <li>Menginterpretasikan tabel output utama</li>
      </ul>
    </HelpCard>
  </div>
);

const VariablesHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Memilih Variabel" icon={Table} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Pilih Variabel Dependen"
          description="Pilih satu variabel biner (hanya memiliki 2 nilai unik) sebagai variabel outcome. Variabel ini harus memiliki tepat 2 kategori, misalnya 0/1, Ya/Tidak, atau Lulus/Gagal."
        />
        <HelpStep
          number={2}
          title="Pilih Kovariat (Variabel Independen)"
          description="Pindahkan satu atau lebih variabel prediktor ke kotak Covariates. Anda dapat memilih variabel lalu klik tombol panah, atau langsung drag and drop variabel ke kotak target."
        />
        <HelpStep
          number={3}
          title="Pilih Metode Seleksi Variabel"
          description="Gunakan dropdown Method di bagian bawah untuk memilih metode yang sesuai dengan kebutuhan analisis Anda."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Tips: Drag and Drop">
      <p className="text-sm mt-2">
        Anda dapat menggunakan fitur drag and drop untuk memindahkan variabel. Klik variabel di daftar 
        sebelah kiri, lalu seret (drag) ke kotak Dependent atau Covariates di sebelah kanan. 
        Gunakan <strong>Ctrl/Cmd + klik</strong> untuk memilih beberapa variabel sekaligus, 
        lalu drag sekali untuk memindahkan semuanya.
      </p>
    </HelpAlert>

    <HelpCard title="Metode Seleksi Variabel" icon={SlidersHorizontal} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Enter"
          description="Semua variabel prediktor dimasukkan ke dalam model secara bersamaan. Cocok ketika Anda sudah mengetahui variabel mana yang relevan berdasarkan teori."
        />
        <HelpStep
          number={2}
          title="Forward (Conditional / LR / Wald)"
          description="Variabel ditambahkan satu per satu ke dalam model berdasarkan kriteria statistik. Forward Conditional menggunakan uji rasio likelihood kondisional, Forward LR menggunakan likelihood ratio test, dan Forward Wald menggunakan Wald test."
        />
        <HelpStep
          number={3}
          title="Backward (Conditional / LR / Wald)"
          description="Dimulai dengan semua variabel dalam model, kemudian variabel yang tidak signifikan dihapus satu per satu. Prinsip kriteria sama seperti Forward, tetapi arah eliminasinya terbalik."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="info" title="Tipe Variabel">
      <p className="text-sm mt-2">
        Variabel dependen <strong>harus</strong> bersifat biner (2 kategori). Variabel nominal atau ordinal 
        yang dipindahkan ke Covariates akan otomatis ditandai di tab Categorical dengan pengaturan default 
        kontras Indicator (referensi: Last).
      </p>
    </HelpAlert>
  </div>
);

const CategoricalHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Pengaturan Variabel Kategorikal" icon={Table} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Variabel Kategorikal Otomatis"
          description="Variabel dengan tipe nominal atau ordinal akan otomatis dimasukkan ke daftar kategorikal saat dipindahkan ke Covariates."
        />
        <HelpStep
          number={2}
          title="Pilih Tipe Kontras"
          description="Tentukan metode pengkodean dummy untuk setiap variabel kategorikal: Indicator, Simple, Helmert, Difference, Repeated, Polynomial, Deviation, atau Special."
        />
        <HelpStep
          number={3}
          title="Tentukan Kategori Referensi"
          description="Pilih apakah kategori First atau Last yang digunakan sebagai referensi (baseline) dalam perbandingan."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Tips: Pemilihan Kontras">
      <p className="text-sm mt-2">
        Untuk kebanyakan analisis, kontras <strong>Indicator</strong> (dummy coding) dengan referensi 
        <strong> Last</strong> adalah pilihan yang paling umum dan mudah diinterpretasikan. 
        Gunakan kontras lain jika Anda memiliki hipotesis spesifik tentang perbandingan antar kategori.
      </p>
    </HelpAlert>
  </div>
);

const OptionsHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Opsi Statistik" icon={Calculator} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Classification Plots &amp; CI for Exp(B)"
          description="Tampilkan plot klasifikasi dan interval kepercayaan untuk Odds Ratio (Exp(B)). CI membantu menilai presisi estimasi Odds Ratio."
        />
        <HelpStep
          number={2}
          title="Hosmer-Lemeshow Goodness of Fit"
          description="Uji kesesuaian model yang membandingkan frekuensi yang diamati dengan yang diharapkan. Nilai p > 0.05 menunjukkan model sesuai dengan data."
        />
        <HelpStep
          number={3}
          title="Iteration History &amp; Casewise Listing"
          description="Iteration History menampilkan proses konvergensi algoritma. Casewise Listing menunjukkan kasus-kasus yang diprediksi salah oleh model."
        />
        <HelpStep
          number={4}
          title="Korelasi Estimasi &amp; Display at Each Step"
          description="Korelasi antar koefisien estimasi dan opsi untuk menampilkan hasil di setiap langkah (untuk metode stepwise)."
        />
      </div>
    </HelpCard>

    <HelpCard title="Probabilitas untuk Stepwise" icon={SlidersHorizontal} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Entry Probability"
          description="Nilai p minimum agar variabel dapat masuk ke model (default: 0.05). Variabel dengan p-value di bawah ambang ini akan dimasukkan."
        />
        <HelpStep
          number={2}
          title="Removal Probability"
          description="Nilai p maksimum agar variabel tetap dalam model (default: 0.10). Variabel dengan p-value di atas ambang ini akan dihapus."
        />
        <HelpStep
          number={3}
          title="Classification Cutoff"
          description="Ambang batas probabilitas untuk klasifikasi (default: 0.5). Kasus dengan probabilitas prediksi ≥ cutoff diklasifikasikan ke kategori 1."
        />
      </div>
    </HelpCard>
  </div>
);

const AssumptionHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Uji Asumsi" icon={Shield} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Multikolinearitas (VIF &amp; Tolerance)"
          description="Mendeteksi apakah variabel independen saling berkorelasi tinggi. VIF > 10 atau Tolerance < 0.1 mengindikasikan masalah multikolinearitas yang serius."
        />
        <HelpStep
          number={2}
          title="Box-Tidwell Test"
          description="Menguji asumsi linearitas antara variabel prediktor kontinu dan logit (log-odds) dari variabel dependen. Interaksi yang signifikan (p < 0.05) menunjukkan pelanggaran asumsi linearitas."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="warning" title="Penting: Asumsi Regresi Logistik">
      <p className="text-sm mt-2">
        Regresi logistik memiliki beberapa asumsi penting: (1) variabel dependen bersifat biner, 
        (2) observasi saling independen, (3) tidak ada multikolinearitas berlebihan antar prediktor, 
        dan (4) hubungan linear antara variabel kontinu dan logit. Pastikan untuk memeriksa asumsi-asumsi 
        ini sebelum menginterpretasikan hasil.
      </p>
    </HelpAlert>
  </div>
);

const SaveHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Menyimpan Hasil Prediksi" icon={Save} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Predicted Values"
          description="Simpan probabilitas prediksi (PRE_1) dan keanggotaan kelompok prediksi (PGR_1) sebagai variabel baru di dataset."
        />
        <HelpStep
          number={2}
          title="Residuals"
          description="Simpan berbagai jenis residual: Unstandardized, Logit, Studentized, Standardized, dan Deviance residual. Berguna untuk mendiagnosis kualitas model."
        />
        <HelpStep
          number={3}
          title="Influence Statistics"
          description="Simpan statistik pengaruh seperti Cook's Distance, Leverage, dan DfBeta. Membantu mengidentifikasi observasi yang berpengaruh besar terhadap model."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Tips: Variabel Tersimpan">
      <p className="text-sm mt-2">
        Variabel baru akan ditambahkan ke dataset dengan penamaan inkremental (contoh: PRE_1, PRE_2, dst.). 
        Jika variabel dengan nama yang sama sudah ada, nomor urut akan otomatis dinaikkan.
      </p>
    </HelpAlert>
  </div>
);

const QuickStartGuide = () => (
  <div className="mt-8 grid gap-4">
    <HelpCard title="Panduan Cepat" icon={ClipboardList} variant="feature">
      <div className="space-y-3">
        <p className="text-sm">Siap menjalankan Regresi Logistik Biner?</p>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Pilih variabel dependen (harus biner — 2 kategori)</li>
          <li>Pindahkan variabel prediktor ke kotak Covariates (klik panah atau drag &amp; drop)</li>
          <li>Atur metode seleksi variabel (Enter / Forward / Backward)</li>
          <li>Sesuaikan pengaturan kategorikal jika diperlukan</li>
          <li>Centang opsi statistik dan uji asumsi yang diinginkan</li>
          <li>Klik <b>OK</b> untuk menjalankan analisis</li>
        </ol>
      </div>
    </HelpCard>
  </div>
);

// ----------- Main component -------------------------------------------------

export const BinaryLogisticRegression: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabConfig = [
    { value: 'overview', label: 'Ringkasan', icon: HelpCircle },
    { value: 'variables', label: 'Variabel', icon: Table },
    { value: 'categorical', label: 'Kategorikal', icon: BarChart3 },
    { value: 'save', label: 'Simpan', icon: Save },
    { value: 'options', label: 'Opsi', icon: SlidersHorizontal },
    { value: 'assumption', label: 'Asumsi', icon: Shield },
  ];

  return (
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Panduan Regresi Logistik Biner</h1>
        <p className="text-muted-foreground">
          Pelajari cara mengatur dan menginterpretasikan analisis regresi logistik biner di Statify.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          {tabConfig.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
        <TabsContent value="variables" className="mt-6"><VariablesHelpTab /></TabsContent>
        <TabsContent value="categorical" className="mt-6"><CategoricalHelpTab /></TabsContent>
        <TabsContent value="save" className="mt-6"><SaveHelpTab /></TabsContent>
        <TabsContent value="options" className="mt-6"><OptionsHelpTab /></TabsContent>
        <TabsContent value="assumption" className="mt-6"><AssumptionHelpTab /></TabsContent>
      </Tabs>

      <QuickStartGuide />
    </div>
  );
};
