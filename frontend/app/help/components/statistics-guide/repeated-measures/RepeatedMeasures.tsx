import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { HelpCircle, ListOrdered, Table, Layers, TrendingUp, Save, Repeat, ClipboardList } from 'lucide-react';

/*
 * Help Guide: GLM Repeated Measures (Bahasa Indonesia)
 * ----------------------------------------------------------------------------
 * Komponen ini menyediakan panduan pengguna untuk modal GLM Repeated Measures
 * (lihat `components/Modals/Analyze/general-linear-model/repeated-measures/dialogs/dialog.tsx`).
 *
 * Layout mengikuti pola yang sama dengan guide Regression (Linear, Binary
 * Logistic, Multinomial Logistic, Ordinal) agar UX konsisten di seluruh
 * prosedur statistik: satu halaman, tab mirip nama dialog aslinya, tanpa
 * rumus matematika (fokus praktis, cara pakai & cara baca output).
 */

// ----------- Tab content components ----------------------------------------

const OverviewTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="info" title="Apa itu GLM Repeated Measures?">
      <p className="text-sm mt-2">
        GLM Repeated Measures menganalisis data di mana <strong>setiap subjek diukur beberapa kali</strong>, misalnya
        pada beberapa titik waktu atau kondisi berbeda. Analisis ini menguji efek within-subjects (antar pengukuran
        pada subjek yang sama) sekaligus efek between-subjects (antar kelompok), jika ada.
      </p>
    </HelpAlert>

    <HelpCard title="Kapan Menggunakan Repeated Measures?" icon={HelpCircle} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Desain pre-test / post-test / follow-up pada subjek yang sama</li>
        <li>Setiap subjek menerima semua level treatment (desain within-subjects penuh)</li>
        <li>Desain campuran: ada faktor within-subjects (waktu) dan faktor between-subjects (kelompok)</li>
        <li>Lebih dari satu variabel diukur berulang pada within-subjects factor yang sama (doubly multivariate)</li>
      </ul>
    </HelpCard>

    <HelpCard title="Bedanya dengan GLM Univariate & Multivariate" icon={ClipboardList} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Satu-satunya GLM dengan alur dialog <strong>dua fase</strong>: Define dulu, baru dialog utama</li>
        <li>Output khas: <strong>Mauchly&apos;s Test of Sphericity</strong> beserta koreksi Greenhouse-Geisser, Huynh-Feldt, dan Lower-bound</li>
        <li>Variabel dataset dipetakan ke kombinasi level×measure, bukan dipilih langsung sebagai satu dependent variable</li>
      </ul>
    </HelpCard>
  </div>
);

const DefineTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="warning" title="Fase Wajib Sebelum Dialog Utama">
      <p className="text-sm mt-2">
        Repeated Measures adalah satu-satunya analisis GLM yang mewajibkan Anda mendefinisikan struktur
        within-subjects factor terlebih dahulu, sebelum dialog konfigurasi utama muncul.
      </p>
    </HelpAlert>

    <HelpCard title="Mendefinisikan Within-Subjects Factor" icon={ListOrdered} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Beri Nama Within-Subjects Factor"
          description="Contoh: 'waktu' untuk desain pre/post/follow-up."
        />
        <HelpStep
          number={2}
          title="Tentukan Jumlah Level"
          description="Contoh: 3 level untuk pre-test, post-test, dan follow-up."
        />
        <HelpStep
          number={3}
          title="Beri Nama Measure"
          description="Nama variabel dependen yang diukur berulang, misalnya 'skor'. Bisa lebih dari satu measure jika analisis bersifat doubly multivariate."
        />
        <HelpStep
          number={4}
          title="Klik Define"
          description="Lanjut ke dialog konfigurasi utama untuk memetakan variabel dataset ke struktur yang baru didefinisikan."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Bisa Diedit Sebelum Lanjut">
      <p className="text-sm mt-2">
        Pengaturan nama factor, jumlah level, dan measure bisa diubah lagi selama masih di dialog Define, sebelum
        Anda melanjutkan ke pemetaan variabel di dialog utama.
      </p>
    </HelpAlert>
  </div>
);

const VariablesTab = () => (
  <div className="space-y-6">
    <HelpCard title="Memetakan Variabel" icon={Table} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Within-Subjects Variables"
          description="Pindahkan variabel dataset ke tiap sel (kombinasi level × measure) sesuai urutan yang sudah ditentukan di fase Define."
        />
        <HelpStep
          number={2}
          title="Between-Subjects Factor(s) (Opsional)"
          description="Tambahkan variabel kategorikal sebagai faktor grouping antar subjek jika desain Anda bersifat campuran (mixed design)."
        />
        <HelpStep
          number={3}
          title="Covariate(s) (Opsional)"
          description="Tambahkan variabel kontinu yang ingin dikontrol pengaruhnya."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="info" title="Urutan Pemetaan Harus Sesuai">
      <p className="text-sm mt-2">
        Setiap slot sel pada panel kiri mewakili satu kombinasi level×measure yang sudah didefinisikan sebelumnya.
        Pastikan variabel yang dipetakan ke tiap sel urutannya benar, kesalahan urutan berarti kesalahan
        interpretasi hasil (misalnya data post-test terbaca sebagai pre-test).
      </p>
    </HelpAlert>
  </div>
);

const ModelContrastsTab = () => (
  <div className="space-y-6">
    <HelpCard title="Model" icon={Layers} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Full Factorial (Default)"
          description="Semua main effect within-subjects dan between-subjects beserta interaksinya dimasukkan otomatis."
        />
        <HelpStep
          number={2}
          title="Custom"
          description="Pilih sendiri term yang ingin dimasukkan ke model, berguna untuk desain atau hipotesis khusus."
        />
      </div>
    </HelpCard>

    <HelpCard title="Contrasts" icon={Layers} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Pilih Tipe Kontras"
          description="Tersedia Polynomial, Helmert, Difference, Repeated, Simple, dan Deviation untuk within-subjects factor."
        />
        <HelpStep
          number={2}
          title="Polynomial untuk Faktor Waktu"
          description="Kontras Polynomial paling umum dipakai ketika within-subjects factor adalah waktu, menguji apakah tren antar level bersifat linear, kuadratik, dan seterusnya."
        />
      </div>
    </HelpCard>
  </div>
);

const EMMeansPostHocPlotsTab = () => (
  <div className="space-y-6">
    <HelpCard title="EM Means & Post Hoc" icon={TrendingUp} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Estimated Marginal Means"
          description="Tampilkan rata-rata terestimasi untuk tiap level atau kombinasi level within-subjects dan between-subjects."
        />
        <HelpStep
          number={2}
          title="Post Hoc / Compare Main Effects"
          description="Bandingkan tiap pasangan level atau grup secara berpasangan, lengkap dengan metode koreksi perbandingan berganda (mis. Bonferroni)."
        />
      </div>
    </HelpCard>

    <HelpCard title="Profile Plots" icon={TrendingUp} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Horizontal Axis"
          description="Pilih within-subjects factor (mis. waktu) sebagai sumbu horizontal, cara paling umum untuk memvisualisasikan perubahan antar pengukuran."
        />
        <HelpStep
          number={2}
          title="Separate Lines (Opsional)"
          description="Tambahkan between-subjects factor sebagai garis terpisah untuk melihat apakah pola perubahan antar waktu berbeda tiap kelompok."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Cara Membaca Profile Plot">
      <p className="text-sm mt-2">
        Garis-garis yang <strong>relatif paralel</strong> antar waktu menunjukkan efek kelompok konsisten (tidak ada
        interaksi). Garis yang <strong>saling menyilang atau divergen</strong> menunjukkan pola perubahan berbeda
        antar kelompok seiring waktu (ada interaksi).
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
          description="Simpan nilai prediksi dan residual ke dataset sebagai variabel baru, berguna untuk pemeriksaan lebih lanjut."
        />
      </div>
    </HelpCard>

    <HelpCard title="Options" icon={Save} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Display Options"
          description="Centang tabel tambahan yang ingin ditampilkan: descriptive statistics, estimates of effect size, dan observed power."
        />
        <HelpStep
          number={2}
          title="Significance Level"
          description="Tentukan tingkat signifikansi (α) yang digunakan pada seluruh uji dan confidence interval, default 0.05."
        />
      </div>
    </HelpCard>
  </div>
);

const SphericityEffectsTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="warning" title="Konsep Tersulit di Repeated Measures">
      <p className="text-sm mt-2">
        Sphericity adalah asumsi khusus yang hanya relevan untuk Repeated Measures, tidak ditemukan di GLM
        Univariate maupun Multivariate.
      </p>
    </HelpAlert>

    <HelpCard title="Mauchly's Test of Sphericity" icon={Repeat} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Apa yang Diuji?"
          description="Sphericity adalah asumsi bahwa varians dari selisih antar semua pasangan level within-subjects itu sama. Mauchly's Test menguji apakah asumsi ini terpenuhi."
        />
        <HelpStep
          number={2}
          title="Cara Membaca Sig."
          description="Sig. > 0.05 → asumsi sphericity terpenuhi, boleh membaca baris 'Sphericity Assumed' pada tabel efek. Sig. < 0.05 → asumsi dilanggar, gunakan salah satu baris koreksi epsilon."
        />
        <HelpStep
          number={3}
          title="Tiga Nilai Epsilon"
          description="Greenhouse-Geisser (paling umum dipakai sebagai pilihan default yang aman), Huynh-Feldt (koreksi lebih ringan, cocok dipakai bila epsilon Greenhouse-Geisser > 0.75), dan Lower-bound (koreksi paling konservatif / skenario terburuk)."
        />
      </div>
    </HelpCard>

    <HelpCard title="Tests of Within-Subjects Effects" icon={Repeat} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="4 Baris per Efek"
          description="Tabel menampilkan 4 baris untuk tiap efek within-subjects: Sphericity Assumed, Greenhouse-Geisser, Huynh-Feldt, dan Lower-bound."
        />
        <HelpStep
          number={2}
          title="Epsilon Hanya Mengoreksi Degrees of Freedom"
          description="Nilai F pada keempat baris tetap sama, yang berbeda hanyalah derajat bebas (df) dan signifikansi (Sig.) setelah dikoreksi epsilon."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Kalau Ragu, Pakai Greenhouse-Geisser">
      <p className="text-sm mt-2">
        Jika tidak yakin baris mana yang harus dibaca, <strong>Greenhouse-Geisser</strong> adalah pilihan default
        yang paling umum dan aman digunakan dalam praktik.
      </p>
    </HelpAlert>
  </div>
);

const QuickStartGuide = () => (
  <div className="mt-8 grid gap-4">
    <HelpCard title="Panduan Cepat" icon={ClipboardList} variant="feature">
      <div className="space-y-3">
        <p className="text-sm">Siap menjalankan GLM Repeated Measures?</p>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Definisikan within-subjects factor (nama + jumlah level) dan measure di dialog Define, lalu klik Define</li>
          <li>Petakan variabel dataset ke tiap sel level×measure di panel kiri dialog utama</li>
          <li>Tambahkan Between-Subjects Factor jika desain Anda bersifat campuran (mixed design)</li>
          <li>Atur Model, Contrasts, EM Means, dan Plots sesuai kebutuhan</li>
          <li>Klik <b>OK</b>, cek dulu <b>Mauchly&apos;s Test</b>; kalau Sig. &lt; 0.05, baca baris <b>Greenhouse-Geisser</b> di tabel Tests of Within-Subjects Effects, bukan Sphericity Assumed</li>
        </ol>
      </div>
    </HelpCard>
  </div>
);

// ----------- Main component -------------------------------------------------

export const RepeatedMeasures: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabConfig = [
    { value: 'overview', label: 'Ringkasan', icon: HelpCircle },
    { value: 'define', label: 'Define', icon: ListOrdered },
    { value: 'variables', label: 'Variabel', icon: Table },
    { value: 'model', label: 'Model & Contrasts', icon: Layers },
    { value: 'emmeans', label: 'EM Means & Plots', icon: TrendingUp },
    { value: 'save', label: 'Save & Options', icon: Save },
    { value: 'sphericity', label: 'Sphericity & Effects', icon: Repeat },
  ];

  return (
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Panduan GLM Repeated Measures</h1>
        <p className="text-muted-foreground">
          Pelajari cara mengatur dan menginterpretasikan analisis GLM Repeated Measures di Statify.
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
        <TabsContent value="define" className="mt-6"><DefineTab /></TabsContent>
        <TabsContent value="variables" className="mt-6"><VariablesTab /></TabsContent>
        <TabsContent value="model" className="mt-6"><ModelContrastsTab /></TabsContent>
        <TabsContent value="emmeans" className="mt-6"><EMMeansPostHocPlotsTab /></TabsContent>
        <TabsContent value="save" className="mt-6"><SaveOptionsTab /></TabsContent>
        <TabsContent value="sphericity" className="mt-6"><SphericityEffectsTab /></TabsContent>
      </Tabs>

      <QuickStartGuide />
    </div>
  );
};
