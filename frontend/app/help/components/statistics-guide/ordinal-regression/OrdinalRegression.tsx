import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import {
    HelpCircle,
    SlidersHorizontal,
    FileText,
    Layers,
    ClipboardList,
    ArrowRightLeft,
    HelpCircleIcon
} from 'lucide-react';

/*
 * Help Guide: Ordinal Regression (Statify / IBM SPSS PLUM Standard)
 * -----------------------------------------------------------------------------
 * Panduan interaktif berbasis FAQ untuk pengguna awam dan analisis statistik.
 */

// ----------- 1. TAB RINGKASAN (OVERVIEW) -----------------------------------

const OverviewTab = () => (
    <div className="space-y-6">
        <HelpAlert variant="info" title="Apa itu Analisis Regresi Ordinal?">
            <p className="text-sm mt-2">
                Regresi Ordinal merupakan metode statistik untuk memodelkan hubungan antara satu variabel target/dependen (Y) yang berbentuk <strong>tingkatan/kategori berurutan</strong> dengan satu atau beberapa variabel prediktor/independen (X).
            </p>
        </HelpAlert>

        <HelpCard title="Pengenalan Analisis Regresi Ordinal" icon={HelpCircleIcon} variant="feature">
            <div className="space-y-4 text-sm mt-2">
                <div>
                    <p className="font-semibold text-primary">Penggunaan Data dan Variabel</p>
                    <p className="text-muted-foreground mt-1">
                        Variabel dependen diasumsikan ordinal dan dapat berupa angka atau string dan wajib memiliki &lt;2 kategori.
                    </p>
                    <p className="text-muted-foreground mt-1">
                        Urutan ditentukan dengan mengurutkan nilai variabel dependen dalam urutan menaik sehingga nilai terendah mendefinisikan kategori pertama.
                    </p>
                    <p className="text-muted-foreground mt-1">
                        <strong>Variabel faktor</strong> diasumsikan kategorikal dan <strong>variabel kovariat</strong> harus berupa angka/numerik.
                    </p>
                </div>
                <hr className="border-border" />
                <div>
                    <p className="font-semibold text-primary">Kasus Regresi Ordinal</p>
                    <p className="text-muted-foreground mt-1">
                        Regresi ordinal mampu memodelkan data kategorikal berjenjang tanpa memaksakan asumsi bahwa jarak antar kategori bernilai sama, sehingga menghasilkan estimasi peluang yang jauh lebih akurat dibanding regresi linier.
                    </p>
                    <p className="text-muted-foreground mt-1">
                        Contoh penggunaan regresi ordinal:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
                        <li>
                            <a href="https://journal.iteba.ac.id/index.php/jurnalsintak/article/download/723/308" target="_blank" rel="noopener noreferrer">
                                Regresi Logistik Ordinal untuk Pemodelan Indeks Pembangunan Manusia
                            </a>
                        </li>
                        <li>
                            <a href="http://dx.doi.org/10.11594/jesi.02.03.06" target="_blank" rel="noopener noreferrer">
                                Regresi Logistik Ordinal Determinan Tingkat Kebahagiaan di Provinsi Yogyakarta
                            </a>
                        </li>
                    </ul>
                </div>
                <hr className="border-border" />
                <div>
                    <p className="font-semibold text-primary">Asumsi</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
                        <li>Hanya ada <strong>satu variabel dependen</strong> (Y) dan kategorinya harus terurut.</li>
                        <li>Respon antar responden diasumsikan bersifat independen satu sama lain.</li>
                    </ul>
                </div>
            </div>
        </HelpCard>
    </div>
);

// ----------- 2. TAB VARIABEL & LINK FUNCTION --------------------------------

const VariablesHelpTab = () => (
    <div className="space-y-6">
        <HelpCard title="Pemilihan Variabel" icon={ArrowRightLeft} variant="feature">
            <div className="space-y-4 mt-2">
                <HelpStep
                    number={1}
                    title="Variabel Dependen"
                    description="Masukkan 1 variabel ordinal (dapat berupa angka atau teks/string) dengan >2 kategori. Sistem secara otomatis mengurutkan nilai dari terkecil ke terbesar. Nilai terendah akan menjadi kategori dasar pertama."
                />
                <HelpStep
                    number={2}
                    title="Variabel Independen Kategorik"
                    description="Masukkan variabel independen yang berupa kelompok/kategori (misalnya: Jenis Kelamin, Tingkat Pendidikan, atau Kelompok Perlakuan) ke kolom faktor/factors."
                />
                <HelpStep
                    number={3}
                    title="Variabel Independen Numerik"
                    description="Masukkan variabel independen yang bersifat angka kontinu (misalnya: Usia, Pendapatan, atau Dosis Obat) ke kolom kovariat/covariates. Catatan: Menggunakan terlalu banyak kovariat kontinu dapat memperbesar tabel peluang sel."
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

        <HelpCard title="Pemilihan Link Function/Transformasi Model" icon={SlidersHorizontal} variant="feature">
            <p className="text-sm text-muted-foreground mb-4">
                Fungsi link digunakan untuk mentransformasikan peluang kumulatif agar model dapat diestimasi dengan tepat. Pilih berdasarkan karakteristik sebaran kategori variabel terikat (Y) Anda:
            </p>
            <div className="space-y-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-semibold">1. Logit</p>
                    <p className="text-muted-foreground text-xs mt-1">
                        <strong>Penggunaan:</strong> Pilihan standar ketika sebaran data antar kategori terbagi secara merata/seimbang (data normal).
                    </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-semibold">2. Complementary Log-log</p>
                    <p className="text-muted-foreground text-xs mt-1">
                        <strong>Penggunaan:</strong> Cocok jika kategori bernilai tinggi lebih dominan atau memiliki peluang lebih besar untuk terjadi (data menceng kiri).
                    </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-semibold">3. Negative Log-log</p>
                    <p className="text-muted-foreground text-xs mt-1">
                        <strong>Penggunaan:</strong> Cocok jika kategori bernilai rendah lebih dominan atau memiliki peluang lebih besar untuk terjadi (data menceng kanan).
                    </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-semibold">4. Probit</p>
                    <p className="text-muted-foreground text-xs mt-1">
                        <strong>Penggunaan:</strong> Cocok jika terdapat variabel laten (tersembunyi) yang diasumsikan terdistribusi normal.
                    </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-semibold">5. Cauchit</p>
                    <p className="text-muted-foreground text-xs mt-1">
                        <strong>Penggunaan:</strong> Cocok jika variabel Anda memiliki banyak nilai ekstrim pada ujung-ujung kategorinya.
                    </p>
                </div>
            </div>
        </HelpCard>
    </div>
);

// ----------- 3. TAB OPSI (OPTIONS) ------------------------------------------

const OptionsHelpTab = () => (
    <div className="space-y-6">
        <HelpCard title="Pengaturan Algoritma Iterasi & Parameter" icon={SlidersHorizontal} variant="feature">
            <div className="space-y-4 mt-2">
                <HelpStep
                    number={1}
                    title="Maksimum Iterasi (Maximum Iterations)"
                    description="Batas maksimal komputasi berulang. Masukkan angka bulat non-negatif. Jika diisi 0, sistem hanya akan menampilkan estimasi awal."
                />
                <HelpStep
                    number={2}
                    title="Pembagian Langkah Maksimum (Maximum Step-halving)"
                    description="Mengontrol penyesuaian ukuran langkah algoritma saat mencari nilai optimum. Masukkan bilangan bulat positif."
                />
                <HelpStep
                    number={3}
                    title="Konvergensi Log-likelihood & Parameter"
                    description="Kriteria penghentian komputasi. Algoritma akan berhenti jika perubahan absolut/relatif log-likelihood atau estimasi parameter kurang dari nilai batas yang ditentukan."
                />
                <HelpStep
                    number={4}
                    title="Interval Kepercayaan (Confidence Interval)"
                    description="Tentukan tingkat kepercayaan untuk estimasi parameter (misalnya 95%). Masukkan nilai dari 0 hingga kurang dari 100."
                />
                <HelpStep
                    number={5}
                    title="Nilai Delta"
                    description="Nilai penyesuaian kecil yang ditambahkan otomatis jika terdapat frekuensi sel bernilai nol (masukkan angka non-negatif kurang dari 1)."
                />
                <HelpStep
                    number={6}
                    title="Toleransi Singularitas (Singularity Tolerance)"
                    description="Digunakan oleh sistem untuk mendeteksi adanya hubungan multikolinearitas ekstrim (prediktor yang saling bergantung tinggi)."
                />
            </div>
        </HelpCard>
    </div>
);

// ----------- 4. TAB OUTPUT --------------------------------------------------

const OutputHelpTab = () => (
    <div className="space-y-6">
        <HelpCard title="Tampilan Hasil Analisis" icon={FileText} variant="feature">
            <div className="space-y-4 mt-2">
                <HelpStep
                    number={1}
                    title="Goodness of Fit"
                    description="Menampilkan statistik Chi-square Pearson dan Likelihood-ratio untuk menilai seberapa cocok model dengan data Anda."
                />
                <HelpStep
                    number={2}
                    title="Summary Statistics"
                    description="Menampilkan nilai R-Square untuk mengukur seberapa besar variasi Y dapat dijelaskan oleh variabel X."
                />
                <HelpStep
                    number={3}
                    title="Parameter Estimates"
                    description="Menampilkan koefisien regresi, standar eror, dan interval kepercayaan untuk melihat arah serta pengaruh masing-masing prediktor."
                />
                <HelpStep
                    number={4}
                    title="Cell Information & Iteration History"
                    description="Menampilkan tabel frekuensi teramati vs ekspektasi, residual Pearson, serta riwayat proses konvergensi estimasi."
                />
                <HelpStep
                    number={5}
                    title="Test of Parallel Lines"
                    description="Menguji hipotesis apakah hubungan prediktor konsisten di semua tingkatan kategori. Jika uji ini signifikan (p &lt; 0.05), asumsi regresi ordinal mungkin terlanggar."
                />
            </div>
        </HelpCard>

        <HelpCard title="Menyimpan Variabel Baru (Saved Variables)" icon={FileText} variant="feature">
            <p className="text-sm text-muted-foreground mb-3">
                Anda dapat memilih untuk menyimpan hasil perhitungan model langsung ke dalam lembar kerja data:
            </p>
            <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                <li><strong>Estimated response probabilities:</strong> Peluang estimasi model untuk setiap kategori respon.</li>
                <li><strong>Predicted category:</strong> Kategori hasil prediksi dengan nilai peluang terbesar.</li>
                <li><strong>Predicted category probability:</strong> Nilai peluang dari kategori yang diprediksi tersebut.</li>
                <li><strong>Actual category probability:</strong> Peluang estimasi pada kategori aktual/sebenarnya.</li>
            </ul>
        </HelpCard>
    </div>
);

// ----------- 5. TAB MODEL LOKASI (LOCATION MODEL) --------------------------

const LocationHelpTab = () => (
    <div className="space-y-6">
        <HelpCard title="Mengatur Model Lokasi & Interaksi" icon={Layers} variant="feature">
            <p className="text-sm text-muted-foreground mb-4">
                Menu ini digunakan untuk menentukan apakah Anda hanya ingin memasukkan pengaruh utama dari masing-masing variabel atau ingin menambah efek interaksi antar variabel.
            </p>
            <div className="space-y-4">
                <HelpStep
                    number={1}
                    title="Efek Utama (Main Effects)"
                    description="Membuat istilah efek tunggal untuk setiap variabel prediktor yang dipilih tanpa memperhitungkan interaksi."
                />
                <HelpStep
                    number={2}
                    title="Interaksi (Interaction)"
                    description="Membuat istilah interaksi tingkat tertinggi dari seluruh variabel terpilih (Opsi Bawaan/Default)."
                />
                <HelpStep
                    number={3}
                    title="Kombinasi Interaksi Khusus"
                    description="Anda dapat memilih opsi 'All 2-way', 'All 3-way', hingga 'All 5-way' untuk otomatis membuat seluruh kombinasi interaksi 2 arah, 3 arah, dan seterusnya dari variabel yang Anda blok."
                />
            </div>
        </HelpCard>

        <HelpAlert variant="tip" title="Tips Penggunaan">
            <p className="text-sm mt-2">
                Bagi pengguna awam, disarankan untuk memilih <strong>Main Effects</strong> terlebih dahulu agar interpretasi model tetap sederhana sebelum mencoba menambahkan efek interaksi kompleks.
            </p>
        </HelpAlert>
    </div>
);

// ----------- PANDUAN CEPAT (QUICK START) -----------------------------------

const QuickStartGuide = () => (
    <div className="mt-8 grid gap-4">
        <HelpCard title="Panduan Cepat Analisis Regresi Ordinal" icon={ClipboardList} variant="feature">
            <div className="space-y-3">
                <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                    <li>Buka menu <strong>Analyze &gt; Regression &gt; Ordinal...</strong></li>
                    <li>Pindahkan variabel terikat ordinal Anda ke kotak <strong>Dependent</strong>.</li>
                    <li>Pindahkan variabel kategorikal ke <strong>Factors</strong> dan variabel numerik ke <strong>Covariates</strong>.</li>
                    <li>Pilih <strong>Link Function</strong> yang sesuai (Gunakan <em>Logit</em> jika ragu).</li>
                    <li>(Opsional) Atur tampilan tabel pada menu <strong>Output</strong> atau sesuaikan interaksi pada menu <strong>Location</strong>.</li>
                    <li>Klik <strong>OK</strong> untuk menjalankan analisis.</li>
                </ol>
            </div>
        </HelpCard>
    </div>
);

// ----------- KOMPONEN UTAMA (MAIN COMPONENT) --------------------------------

export const OrdinalRegression: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');

    const tabConfig = [
        { value: 'overview', label: 'Ringkasan', icon: HelpCircle },
        { value: 'variables', label: 'Variabel & Link', icon: ArrowRightLeft },
        { value: 'options', label: 'Opsi', icon: SlidersHorizontal },
        { value: 'output', label: 'Output', icon: FileText },
        { value: 'location', label: 'Model Lokasi', icon: Layers },
    ];

    return (
        <div className="w-full space-y-6">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">Regresi Ordinal</h1>
                <p className="text-muted-foreground">
                    Pelajari cara mengkonfigurasi variabel, menentukan fungsi link, mengatur algoritma, dan menginterpretasikan output analisis regresi ordinal di Statify.
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
                <TabsContent value="options" className="mt-6"><OptionsHelpTab /></TabsContent>
                <TabsContent value="output" className="mt-6"><OutputHelpTab /></TabsContent>
                <TabsContent value="location" className="mt-6"><LocationHelpTab /></TabsContent>
            </Tabs>

            <QuickStartGuide />
        </div>
    );
};