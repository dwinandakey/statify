import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { HelpCircle, Table, Calculator, ClipboardList, SlidersHorizontal, Save } from 'lucide-react';

/*
 * Help Guide: Multinomial Logistic Regression (Bahasa Indonesia)
 * ----------------------------------------------------------------------------
 * Komponen ini menyediakan panduan pengguna untuk modal Regresi Logistik Multinomial
 * (lihat `components/Modals/Analyze/Regression/MultinomialLogistic/dialogs/MultinomialLogisticMain.tsx`).
 */

// ----------- Tab content components ----------------------------------------

const OverviewTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="info" title="Apa itu Regresi Logistik Multinomial?">
      <p className="text-sm mt-2">
        Regresi Logistik Multinomial (Multinomial Logistic Regression) adalah perluasan dari regresi logistik biner yang digunakan ketika variabel dependen (outcome) bertipe kategorikal dengan <strong>lebih dari dua kategori</strong> (polikotomus), tanpa urutan intrinsik tertentu (nominal). Metode ini membandingkan beberapa kategori secara simultan dengan memilih satu kategori referensi (baseline).
      </p>
    </HelpAlert>

    <HelpCard title="Kapan Menggunakan Regresi Logistik Multinomial?" icon={HelpCircle} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Variabel dependen (outcome) bersifat kategorikal nominal dengan 3 kategori atau lebih (contoh: Pilihan Transportasi: Bus, Kereta, Mobil Pribadi).</li>
        <li>Variabel prediktor (independen) berupa variabel kontinu (kovariat) dan/atau kategorikal (faktor).</li>
        <li>Memprediksi peluang keanggotaan kelompok (kategori) berdasarkan nilai prediktor.</li>
        <li>Menilai kekuatan hubungan antara prediktor dengan kategori dependen tertentu dibandingkan dengan kategori dasar (referensi).</li>
      </ul>
    </HelpCard>

    <HelpCard title="Yang Akan Anda Pelajari" icon={ClipboardList} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Menentukan Variabel Dependen, Faktor (kategorikal), dan Kovariat (kontinu).</li>
        <li>Menentukan Kategori Referensi untuk perbandingan kelompok.</li>
        <li>Memilih statistik uji model, estimasi parameter, uji rasio kecocokan model, dan klasifikasi.</li>
        <li>Mengatur kriteria iterasi estimasi dan opsi model stepwise.</li>
        <li>Menyimpan nilai peluang prediksi dan kategori hasil prediksi ke dataset.</li>
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
          description="Pilih satu variabel kategorikal dengan 3 kategori atau lebih sebagai variabel dependen. Anda dapat menentukan kategori referensi (First, Last, atau Custom) yang berfungsi sebagai basis perbandingan di tab variabel."
        />
        <HelpStep
          number={2}
          title="Pilih Faktor (Factors)"
          description="Pindahkan variabel independen yang bertipe kategorikal (nominal atau ordinal) ke kotak Factors. Pilihan ini akan dipisahkan dalam analisis dengan membuat variabel dummy internal."
        />
        <HelpStep
          number={3}
          title="Pilih Kovariat (Covariates)"
          description="Pindahkan variabel independen yang bertipe kontinu (interval atau rasio) ke kotak Covariates."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Tips: Kategori Referensi">
      <p className="text-sm mt-2">
        Penentuan <strong>Reference Category</strong> sangat penting untuk interpretasi log-odds. Secara default, kategori terakhir (Last) atau pertama (First) dapat digunakan. Koefisien yang dihasilkan akan menunjukkan peluang memilih kategori X dibandingkan dengan memilih kategori referensi.
      </p>
    </HelpAlert>
  </div>
);

const StatisticsHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Pilihan Statistik Output" icon={Calculator} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Model Fitting Information &amp; Goodness-of-Fit"
          description="Model Fitting Information membandingkan model final dengan model intersep saja untuk melihat apakah prediktor secara signifikan memperbaiki model. Goodness-of-Fit (uji Pearson dan Deviance) menilai apakah model sesuai dengan data (nilai p > 0.05 menunjukkan model fit)."
        />
        <HelpStep
          number={2}
          title="Pseudo R-Square"
          description="Menampilkan Cox and Snell, Nagelkerke, dan McFadden R-Square yang memperkirakan proporsi varians variabel dependen yang dijelaskan oleh model."
        />
        <HelpStep
          number={3}
          title="Likelihood Ratio Tests &amp; Parameter Estimates"
          description="Likelihood Ratio Tests menilai signifikansi kontribusi masing-masing prediktor terhadap model secara keseluruhan. Parameter Estimates menampilkan koefisien B, standar error, uji Wald, nilai p, dan Odds Ratio (Exp(B)) untuk perbandingan setiap kategori terhadap referensi."
        />
        <HelpStep
          number={4}
          title="Classification Table"
          description="Tabel silang yang membandingkan kategori aktual dengan kategori hasil prediksi untuk mengukur akurasi klasifikasi model secara keseluruhan."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="info" title="Statistik Tambahan">
      <p className="text-sm mt-2">
        Anda juga dapat mengaktifkan <strong>Asymptotic Covariances/Correlations</strong> untuk menganalisis hubungan antar estimasi parameter, serta opsi <strong>Cell Probabilities</strong> untuk melihat probabilitas observasi berdasarkan sub-sampel.
      </p>
    </HelpAlert>
  </div>
);

const CriteriaHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Kriteria Estimasi &amp; Stepwise" icon={SlidersHorizontal} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Metode Estimasi (Maximum Likelihood)"
          description="Mengatur batas iterasi maksimum (default: 100) dan batas penyusutan langkah (step-halving). Konvergensi tercapai ketika perubahan nilai log-likelihood atau estimasi parameter sangat kecil."
        />
        <HelpStep
          number={2}
          title="Metode Seleksi Stepwise (Opsi Lanjutan)"
          description="Jika menggunakan model stepwise, tentukan tingkat signifikansi untuk memasukkan efek (Entry Probability, default: 0.05) dan menghapus efek (Removal Probability, default: 0.10). Anda dapat memilih metode uji rasio Likelihood atau uji Score."
        />
        <HelpStep
          number={3}
          title="Kendala Hierarki (Hierarchy Constraints)"
          description="Menentukan bagaimana efek hierarkis dimasukkan ke dalam model, baik memperlakukan kovariat seperti faktor atau hanya mempertimbangkan efek faktorial saja."
        />
      </div>
    </HelpCard>
  </div>
);

const SaveHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Menyimpan Hasil Prediksi" icon={Save} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Estimated Response Probabilities"
          description="Menyimpan peluang prediksi untuk setiap kategori variabel dependen sebagai variabel baru di dataset."
        />
        <HelpStep
          number={2}
          title="Predicted Category"
          description="Menyimpan kategori yang diprediksi paling mungkin terjadi untuk setiap baris data."
        />
        <HelpStep
          number={3}
          title="Predicted Category Probability"
          description="Menyimpan nilai probabilitas dari kategori yang berhasil diprediksi oleh model."
        />
        <HelpStep
          number={4}
          title="Actual Category Probability"
          description="Menyimpan probabilitas prediksi untuk kategori yang benar-benar terjadi pada observasi tersebut."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Tips: Hasil Variabel Baru">
      <p className="text-sm mt-2">
        Hasil penyimpanan akan otomatis membentuk kolom-kolom baru di lembar data (Data Editor) dengan prefiks bawaan seperti <strong>MLP_</strong> (untuk probabilitas) dan <strong>MLC_</strong> (untuk kategori terprediksi) secara otomatis.
      </p>
    </HelpAlert>
  </div>
);

const QuickStartGuide = () => (
  <div className="mt-8 grid gap-4">
    <HelpCard title="Panduan Cepat Regresi Logistik Multinomial" icon={ClipboardList} variant="feature">
      <div className="space-y-3">
        <p className="text-sm">Siap menjalankan Regresi Logistik Multinomial?</p>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Pilih variabel dependen dengan 3 kategori atau lebih dan tentukan kategori referensinya.</li>
          <li>Pindahkan variabel prediktor kategori ke kotak <b>Factors</b> dan kontinu ke kotak <b>Covariates</b>.</li>
          <li>Centang statistik utama yang dibutuhkan pada tab <b>Statistics</b> (seperti Parameter Estimates &amp; Likelihood Ratio).</li>
          <li>Gunakan tab <b>Save</b> jika Anda ingin menyimpan probabilitas prediksi ke lembar data kerja.</li>
          <li>Klik <b>OK</b> untuk memproses hasil analisis.</li>
        </ol>
      </div>
    </HelpCard>
  </div>
);

// ----------- Main component -------------------------------------------------

export const MultinomialLogisticRegression: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabConfig = [
    { value: 'overview', label: 'Ringkasan', icon: HelpCircle },
    { value: 'variables', label: 'Variabel', icon: Table },
    { value: 'statistics', label: 'Statistik', icon: Calculator },
    { value: 'criteria', label: 'Kriteria & Opsi', icon: SlidersHorizontal },
    { value: 'save', label: 'Simpan', icon: Save },
  ];

  return (
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Panduan Regresi Logistik Multinomial</h1>
        <p className="text-muted-foreground">
          Pelajari cara mengatur dan menginterpretasikan analisis regresi logistik multinomial di Statify.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {tabConfig.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
        <TabsContent value="variables" className="mt-6"><VariablesHelpTab /></TabsContent>
        <TabsContent value="statistics" className="mt-6"><StatisticsHelpTab /></TabsContent>
        <TabsContent value="criteria" className="mt-6"><CriteriaHelpTab /></TabsContent>
        <TabsContent value="save" className="mt-6"><SaveHelpTab /></TabsContent>
      </Tabs>

      <QuickStartGuide />
    </div>
  );
};
