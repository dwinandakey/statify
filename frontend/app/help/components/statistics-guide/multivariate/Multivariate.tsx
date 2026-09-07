import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { HelpCircle, Table, Layers, GitCompare, TrendingUp, Save, ArrowLeftRight, ClipboardList } from 'lucide-react';

/*
 * Help Guide: GLM Multivariate (Bahasa Indonesia)
 * ----------------------------------------------------------------------------
 * Komponen ini menyediakan panduan pengguna untuk modal GLM Multivariate
 * (lihat `components/Modals/Analyze/general-linear-model/multivariate/dialogs/dialog.tsx`).
 *
 * Layout mengikuti pola yang sama dengan guide Regression (Linear, Binary
 * Logistic, Multinomial Logistic, Ordinal) agar UX konsisten di seluruh
 * prosedur statistik: satu halaman, tab mirip nama dialog aslinya, tanpa
 * rumus matematika (fokus praktis, cara pakai & cara baca output).
 */

// ----------- Tab content components ----------------------------------------

const OverviewTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="info" title="Apa itu GLM Multivariate?">
      <p className="text-sm mt-2">
        GLM Multivariate (MANOVA/MANCOVA) menganalisis <strong>lebih dari satu variabel dependen secara simultan</strong>,
        berbeda dari GLM Univariate yang hanya menganalisis satu variabel dependen. Cocok dipakai ketika beberapa
        outcome yang berkorelasi ingin diuji bersamaan terhadap efek faktor dan kovariat yang sama.
      </p>
    </HelpAlert>

    <HelpCard title="Kapan Menggunakan GLM Multivariate?" icon={HelpCircle} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Memiliki 2 atau lebih variabel dependen (outcome) yang ingin dianalisis bersamaan</li>
        <li>Ingin menguji efek satu atau lebih faktor kategorikal terhadap kombinasi beberapa outcome (One-Way / Two-Way MANOVA)</li>
        <li>Perlu mengontrol pengaruh kovariat kontinu (MANCOVA)</li>
        <li>Ingin membandingkan sepasang pengukuran (pre/post) pada beberapa outcome sekaligus (Hotelling&apos;s T² berpasangan)</li>
        <li>Membutuhkan model kustom dengan term tertentu, atau analisis berbobot (WLS)</li>
      </ul>
    </HelpCard>

    <HelpCard title="Yang Akan Anda Pelajari" icon={ClipboardList} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Memilih dependent variables, fixed factors, dan kovariat</li>
        <li>Mengatur spesifikasi model (full factorial atau custom)</li>
        <li>Menggunakan contrasts dan post hoc tests</li>
        <li>Menampilkan estimated marginal means dan plots</li>
        <li>Opsi bootstrap dan penyimpanan hasil</li>
        <li>Mode Paired T² untuk uji berpasangan</li>
        <li>Membaca tabel output utama (Multivariate Tests, Box&apos;s M, SSCP, dst.)</li>
      </ul>
    </HelpCard>
  </div>
);

const VariablesTab = () => (
  <div className="space-y-6">
    <HelpCard title="Memilih Variabel" icon={Table} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Dependent Variables"
          description="Pindahkan minimal 2 variabel numerik (scale) sebagai outcome yang dianalisis bersamaan. Inilah yang membedakan Multivariate dari Univariate, semua dependent variable diuji dalam satu model sekaligus."
        />
        <HelpStep
          number={2}
          title="Fixed Factor(s)"
          description="Pindahkan variabel kategorikal sebagai faktor grouping (mis. kelompok perlakuan, jenis kelamin). Bisa lebih dari satu untuk desain faktorial (Two-Way MANOVA)."
        />
        <HelpStep
          number={3}
          title="Covariate(s)"
          description="Pindahkan variabel kontinu yang ingin dikontrol pengaruhnya (MANCOVA), misalnya usia atau skor pre-test."
        />
        <HelpStep
          number={4}
          title="WLS Weight (Opsional)"
          description="Pilih satu variabel numerik sebagai bobot jika ingin melakukan Weighted Least Squares, misalnya ketika varians antar kelompok diketahui tidak sama."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Minimal 2 Dependent Variables">
      <p className="text-sm mt-2">
        Kalau hanya ada 1 variabel dependen, gunakan <strong>GLM Univariate</strong>, Multivariate dirancang khusus
        untuk menguji beberapa outcome sekaligus dalam satu model.
      </p>
    </HelpAlert>

    <HelpAlert variant="info" title="Tipe Variabel">
      <p className="text-sm mt-2">
        Dependent Variables dan Covariates harus bertipe numerik (scale). Fixed Factors harus bertipe kategorikal
        (nominal atau ordinal).
      </p>
    </HelpAlert>
  </div>
);

const ModelTab = () => (
  <div className="space-y-6">
    <HelpCard title="Spesifikasi Model" icon={Layers} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Full Factorial (Default)"
          description="Semua main effect dari tiap faktor beserta seluruh interaksi antar faktor dimasukkan otomatis ke dalam model. Cocok untuk sebagian besar analisis standar."
        />
        <HelpStep
          number={2}
          title="Custom"
          description="Pilih sendiri term mana yang dimasukkan, main effect saja, interaksi 2 arah/3 arah tertentu, atau term nested. Berguna untuk desain tidak seimbang atau model hierarkis."
        />
        <HelpStep
          number={3}
          title="Sum of Squares Type"
          description="Tentukan metode perhitungan Type I, II, atau III. Type III adalah default dan paling umum digunakan, terutama untuk desain dengan jumlah observasi tidak seimbang antar sel."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Kapan Pakai Custom Model?">
      <p className="text-sm mt-2">
        Gunakan Custom jika desain Anda tidak seimbang dan ingin mengontrol urutan term secara eksplisit, atau jika
        Anda memiliki hipotesis spesifik yang hanya melibatkan sebagian interaksi saja.
      </p>
    </HelpAlert>
  </div>
);

const ContrastsPostHocTab = () => (
  <div className="space-y-6">
    <HelpCard title="Contrasts" icon={GitCompare} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Pilih Tipe Kontras"
          description="Tentukan tipe kontras untuk tiap faktor: Deviation, Simple, Difference, Helmert, Repeated, atau Polynomial. Kontras adalah perbandingan terencana antar level faktor yang ditentukan sebelum melihat hasil analisis."
        />
        <HelpStep
          number={2}
          title="Tentukan Kategori Referensi"
          description="Untuk kontras yang membutuhkan baseline (mis. Simple), pilih apakah level First atau Last yang jadi pembanding."
        />
      </div>
    </HelpCard>

    <HelpCard title="Post Hoc Tests" icon={GitCompare} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Perbandingan Berpasangan Antar Level"
          description="Post Hoc membandingkan setiap pasangan level pada suatu faktor setelah hasil analisis diketahui signifikan. Tersedia untuk faktor dengan 3 level atau lebih."
        />
        <HelpStep
          number={2}
          title="Metode Koreksi Perbandingan Berganda"
          description="Pilih metode koreksi (mis. Bonferroni) untuk mengendalikan inflasi galat Tipe I akibat banyaknya perbandingan yang dilakukan sekaligus."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="warning" title="Post Hoc Hanya untuk Main Effect">
      <p className="text-sm mt-2">
        Post Hoc Tests hanya berlaku untuk main effect faktor, bukan untuk term interaksi. Untuk menelusuri interaksi
        signifikan, gunakan Estimated Marginal Means beserta opsi Compare Main Effects.
      </p>
    </HelpAlert>
  </div>
);

const EMMeansPlotsTab = () => (
  <div className="space-y-6">
    <HelpCard title="Estimated Marginal Means" icon={TrendingUp} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Pilih Faktor / Interaksi"
          description="Pindahkan faktor atau kombinasi interaksi yang ingin ditampilkan rata-rata terestimasinya (mean yang sudah disesuaikan dengan kovariat dalam model)."
        />
        <HelpStep
          number={2}
          title="Compare Main Effects (Opsional)"
          description="Aktifkan untuk mendapatkan uji perbandingan berpasangan langsung dari estimated marginal means, lengkap dengan pilihan metode koreksi (mis. Bonferroni)."
        />
      </div>
    </HelpCard>

    <HelpCard title="Plots (Profile Plots)" icon={TrendingUp} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Horizontal Axis"
          description="Pilih satu faktor sebagai sumbu horizontal grafik."
        />
        <HelpStep
          number={2}
          title="Separate Lines (Opsional)"
          description="Tambahkan faktor kedua agar digambarkan sebagai garis terpisah, berguna untuk memvisualisasikan interaksi antar dua faktor."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Cara Membaca Profile Plot">
      <p className="text-sm mt-2">
        Garis-garis yang <strong>relatif paralel</strong> menunjukkan tidak ada interaksi antar faktor. Garis yang{' '}
        <strong>saling menyilang atau tidak paralel</strong> mengindikasikan adanya interaksi, efek satu faktor
        berbeda tergantung level faktor lainnya.
      </p>
    </HelpAlert>
  </div>
);

const SaveOptionsTab = () => (
  <div className="space-y-6">
    <HelpCard title="Save" icon={Save} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Predicted Values & Residuals"
          description="Simpan nilai prediksi dan residual untuk setiap dependent variable sebagai variabel baru di dataset, berguna untuk pemeriksaan lebih lanjut."
        />
      </div>
    </HelpCard>

    <HelpCard title="Options" icon={Save} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Bootstrap"
          description="Aktifkan Simple atau Stratified Bootstrap, tentukan jumlah replikasi, dan pilih tipe confidence interval (Percentile atau BCa/Bias-Corrected and accelerated). Berguna untuk mendapatkan estimasi CI yang lebih robust ketika asumsi normalitas diragukan."
        />
        <HelpStep
          number={2}
          title="Display Options"
          description="Centang tabel tambahan yang ingin ditampilkan: descriptive statistics, homogeneity tests (Box's M, Levene's, Bartlett's Sphericity), estimates of effect size, dan observed power."
        />
        <HelpStep
          number={3}
          title="Significance Level"
          description="Tentukan tingkat signifikansi (α) yang digunakan pada seluruh uji dan confidence interval, default 0.05."
        />
      </div>
    </HelpCard>
  </div>
);

const PairedT2Tab = () => (
  <div className="space-y-6">
    <HelpAlert variant="warning" title="Mode Analisis Alternatif">
      <p className="text-sm mt-2">
        Paired Mode adalah mode analisis <strong>terpisah</strong> dari MANOVA/MANCOVA biasa, khusus untuk menguji
        Hotelling&apos;s T² berpasangan, membandingkan sepasang pengukuran (mis. sebelum vs sesudah) pada beberapa
        outcome sekaligus.
      </p>
    </HelpAlert>

    <HelpCard title="Cara Menggunakan Paired Mode" icon={ArrowLeftRight} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Aktifkan Paired Mode"
          description="Beralih dari mode Dependent Variables biasa ke mode pasangan variabel."
        />
        <HelpStep
          number={2}
          title="Pasangkan Variabel"
          description="Tentukan pasangan variabel yang ingin dibandingkan, misalnya pre_a ↔ post_a dan pre_b ↔ post_b. Sistem otomatis menghitung selisih tiap pasangan sebagai dasar analisis."
        />
        <HelpStep
          number={3}
          title="Test Value (δ₀)"
          description="Tentukan nilai uji untuk selisih tiap pasangan, default 0, artinya menguji apakah rata-rata selisih berbeda signifikan dari nol."
        />
        <HelpStep
          number={4}
          title="Interpretasi Output"
          description="Output menggunakan tabel Multivariate Tests yang sama seperti MANOVA biasa, namun diterapkan pada kolom selisih pasangan yang telah dihitung."
        />
      </div>
    </HelpCard>
  </div>
);

const QuickStartGuide = () => (
  <div className="mt-8 grid gap-4">
    <HelpCard title="Panduan Cepat" icon={ClipboardList} variant="feature">
      <div className="space-y-3">
        <p className="text-sm">Siap menjalankan GLM Multivariate?</p>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Pilih minimal 2 dependent variables, lalu tambahkan fixed factors dan/atau covariates</li>
          <li>Biarkan Model pada Full Factorial jika tidak yakin perlu Custom</li>
          <li>Atur Contrasts, Post Hoc, EM Means, dan Plots sesuai kebutuhan analisis</li>
          <li>Aktifkan Paired Mode jika ingin menguji Hotelling&apos;s T² berpasangan</li>
          <li>Klik <b>OK</b>, lalu baca tabel <b>Multivariate Tests</b> terlebih dahulu sebagai output utama sebelum melihat tabel lainnya</li>
        </ol>
      </div>
    </HelpCard>
  </div>
);

// ----------- Main component -------------------------------------------------

export const Multivariate: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabConfig = [
    { value: 'overview', label: 'Ringkasan', icon: HelpCircle },
    { value: 'variables', label: 'Variabel', icon: Table },
    { value: 'model', label: 'Model', icon: Layers },
    { value: 'contrasts', label: 'Contrasts & Post Hoc', icon: GitCompare },
    { value: 'emmeans', label: 'EM Means & Plots', icon: TrendingUp },
    { value: 'save', label: 'Save & Options', icon: Save },
    { value: 'paired', label: 'Paired T²', icon: ArrowLeftRight },
  ];

  return (
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Panduan GLM Multivariate</h1>
        <p className="text-muted-foreground">
          Pelajari cara mengatur dan menginterpretasikan analisis GLM Multivariate (MANOVA/MANCOVA) di Statify.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          {tabConfig.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
        <TabsContent value="variables" className="mt-6"><VariablesTab /></TabsContent>
        <TabsContent value="model" className="mt-6"><ModelTab /></TabsContent>
        <TabsContent value="contrasts" className="mt-6"><ContrastsPostHocTab /></TabsContent>
        <TabsContent value="emmeans" className="mt-6"><EMMeansPlotsTab /></TabsContent>
        <TabsContent value="save" className="mt-6"><SaveOptionsTab /></TabsContent>
        <TabsContent value="paired" className="mt-6"><PairedT2Tab /></TabsContent>
      </Tabs>

      <QuickStartGuide />
    </div>
  );
};
