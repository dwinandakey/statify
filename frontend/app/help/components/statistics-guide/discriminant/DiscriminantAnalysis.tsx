import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { HelpCircle, Table, BarChart3, Layers, Target, Save, CheckCircle, TrendingUp, ClipboardList } from 'lucide-react';

/*
 * Help Guide: Discriminant Analysis (Bahasa Indonesia)
 * ----------------------------------------------------------------------------
 * Panduan pengguna untuk modal Discriminant Analysis
 * (lihat `components/Modals/Analyze/Classify/discriminant/dialogs/discriminant-main.tsx`).
 *
 * Struktur tab mengikuti tab pada modal aslinya (Variables, Statistics, Method,
 * Classify, Save, Bootstrap, Assumptions) ditambah satu tab "Baca Output" yang
 * menjelaskan urutan tabel hasil sesuai `services/store.ts`. Gaya penulisan
 * mengikuti guide GLM Multivariate: praktis, tanpa turunan rumus.
 */

// ----------- Tab content components ----------------------------------------

const OverviewTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="info" title="Apa itu Analisis Diskriminan?">
      <p className="text-sm mt-2">
        Analisis Diskriminan (Linear Discriminant Analysis) membentuk kombinasi linear dari beberapa variabel
        numerik yang <strong>paling memisahkan kelompok-kelompok</strong> pada satu variabel kategorikal.
        Kombinasi linear itu disebut <strong>fungsi diskriminan</strong>, dan dipakai untuk dua tujuan sekaligus:
        menjelaskan variabel mana yang membedakan kelompok, serta mengklasifikasikan kasus ke salah satu kelompok.
      </p>
    </HelpAlert>

    <HelpCard title="Kapan Menggunakan Analisis Diskriminan?" icon={HelpCircle} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Variabel terikat bersifat <strong>kategorikal</strong> (2 kelompok atau lebih) dan variabel bebasnya numerik</li>
        <li>Ingin mengetahui variabel mana yang paling kuat membedakan antar kelompok</li>
        <li>Ingin membangun aturan klasifikasi untuk memprediksi keanggotaan kelompok suatu kasus</li>
        <li>Ingin mengukur ketepatan klasifikasi model (hit ratio) dan memvalidasinya dengan leave-one-out</li>
        <li>Ingin memvisualisasikan pemisahan antar kelompok pada ruang diskriminan</li>
      </ul>
    </HelpCard>

    <HelpCard title="Cara Membuka Modul" icon={ClipboardList} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Analyze -> Classify -> Discriminant"
          description="Buka menu Analyze pada menu bar, pilih submenu Classify, lalu klik Discriminant. Modal akan terbuka dengan tab Variables aktif."
        />
        <HelpStep
          number={2}
          title="Isi Tab Variables Terlebih Dahulu"
          description="Tombol OK baru aktif setelah Grouping Variable terisi dan minimal ada satu Independent Variable. Tab lain bersifat opsional dan menambah tabel keluaran."
        />
        <HelpStep
          number={3}
          title="Hasil Muncul di Output Viewer"
          description="Setelah menekan OK, perhitungan dijalankan di latar belakang (Rust/WebAssembly di dalam Web Worker) dan seluruh tabel serta grafik ditulis berurutan ke Output Viewer."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Tombol Tanda Tanya di Dalam Modal">
      <p className="text-sm mt-2">
        Ikon <strong>?</strong> di pojok kiri bawah modal menjalankan <strong>feature tour</strong>: panduan singkat
        yang menyorot satu per satu bagian modal, mulai dari pemilihan metode, kotak variabel beserta cara memilih
        banyak variabel sekaligus, tab Statistics, Classify, Save, Assumptions, sampai tombol OK. Gunakan tour ini
        ketika baru pertama kali membuka modul, lalu kembali ke halaman panduan ini untuk penjelasan yang lebih rinci.
      </p>
    </HelpAlert>

    <HelpCard title="Syarat Data" icon={CheckCircle} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li><strong>Grouping Variable</strong>: kategorikal dengan kode berupa bilangan bulat, misalnya 1, 2, 3</li>
        <li><strong>Independents</strong>: numerik (scale), minimal satu variabel</li>
        <li>Jumlah kasus per kelompok sebaiknya lebih banyak dari jumlah variabel bebas agar matriks kovarians tidak singular</li>
        <li>Idealnya asumsi normalitas multivariat dan homogenitas matriks kovarians terpenuhi, gunakan tab Assumptions dan Box&apos;s M untuk memeriksanya</li>
      </ul>
    </HelpCard>

    <HelpAlert variant="tip" title="Berapa Banyak Fungsi Diskriminan yang Terbentuk?">
      <p className="text-sm mt-2">
        Jumlah fungsi diskriminan adalah nilai terkecil antara <strong>(jumlah kelompok - 1)</strong> dan{' '}
        <strong>jumlah variabel bebas</strong>. Jadi untuk 2 kelompok hanya terbentuk 1 fungsi, sedangkan 3 kelompok
        dengan minimal 2 variabel bebas menghasilkan 2 fungsi. Territorial Map dan plot dua dimensi hanya bermakna
        jika terbentuk minimal 2 fungsi.
      </p>
    </HelpAlert>
  </div>
);

const VariablesTab = () => (
  <div className="space-y-6">
    <HelpCard title="Memilih Metode Analisis" icon={Layers} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Enter Independents Together (Default)"
          description="Seluruh variabel bebas dimasukkan sekaligus ke dalam model. Pilih ini jika Anda sudah yakin variabel mana saja yang relevan secara teori."
        />
        <HelpStep
          number={2}
          title="Use Stepwise Method"
          description="Variabel dimasukkan atau dikeluarkan satu per satu berdasarkan kriteria statistik. Pilih ini jika ingin sistem menyaring sendiri variabel yang paling berkontribusi."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="warning" title="Pilihan Metode Mengubah Tab yang Tersedia">
      <p className="text-sm mt-2">
        Tab <strong>Method</strong> hanya muncul saat memilih Use stepwise method, sedangkan tab{' '}
        <strong>Bootstrap</strong> hanya muncul saat memilih Enter independents together. Jika Anda beralih ke
        stepwise setelah mengaktifkan bootstrap, opsi bootstrap otomatis dimatikan agar tidak berjalan diam-diam.
      </p>
    </HelpAlert>

    <HelpCard title="Mengisi Kotak Variabel" icon={Table} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Grouping Variable"
          description="Seret satu variabel kategorikal ke kotak ini. Variabel inilah yang kelompoknya akan dibedakan, misalnya status kelulusan atau kategori nasabah."
        />
        <HelpStep
          number={2}
          title="Define Range..."
          description="Klik tombol ini lalu isi Minimum dan Maximum untuk menentukan rentang kode kelompok yang ikut dianalisis. Contoh: Minimum 1 dan Maximum 3 berarti hanya kasus dengan kode 1 sampai 3 yang diproses. Klik Continue untuk menyimpan."
        />
        <HelpStep
          number={3}
          title="Independents"
          description="Masukkan variabel numerik yang akan menjadi prediktor ke kotak ini. Bisa dipindahkan beberapa sekaligus dengan Ctrl+klik atau Shift+klik, dan urutannya tidak memengaruhi hasil pada metode Together."
        />
        <HelpStep
          number={4}
          title="Selection Variable (Opsional)"
          description="Seret satu variabel penyeleksi, lalu klik tombol Value... dan isi nilainya. Hanya kasus yang nilainya sama dengan nilai tersebut yang dipakai untuk mengestimasi fungsi diskriminan, sedangkan kasus lain tetap ikut diklasifikasikan."
        />
      </div>
    </HelpCard>

    <HelpCard title="Memilih Banyak Variabel Sekaligus" icon={Table} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Klik Biasa"
          description="Klik satu variabel di daftar Available Variables untuk memilihnya. Klik lagi pada variabel yang sama untuk membatalkan pilihan."
        />
        <HelpStep
          number={2}
          title="Ctrl+Klik untuk Memilih Beberapa"
          description="Tahan Ctrl (atau Command di Mac) lalu klik beberapa variabel yang letaknya berjauhan. Setiap klik menambah atau mengurangi satu variabel dari pilihan."
        />
        <HelpStep
          number={3}
          title="Shift+Klik untuk Memilih Rentang"
          description="Klik variabel pertama, lalu tahan Shift dan klik variabel terakhir. Seluruh variabel di antaranya ikut terpilih sekaligus."
        />
        <HelpStep
          number={4}
          title="Pindahkan dengan Tombol Panah atau Drag"
          description="Setelah beberapa variabel terpilih, klik tombol panah di sebelah kiri kotak tujuan untuk memindahkan semuanya sekaligus, atau seret salah satu variabel yang terpilih sehingga seluruh pilihan ikut terbawa."
        />
        <HelpStep
          number={5}
          title="Remove All untuk Mengosongkan Independents"
          description="Tombol Remove All muncul di sebelah kanan label Independents begitu kotaknya terisi, lengkap dengan jumlah variabel di dalamnya. Sekali klik, seluruh isi kotak dikosongkan dan semua variabel kembali ke daftar Available Variables."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Menghapus Variabel dan Kotak Tujuan Bernilai Tunggal">
      <p className="text-sm mt-2">
        Untuk mengeluarkan variabel dari sebuah kotak, cukup <strong>klik badge variabel</strong> tersebut, dan
        variabel itu akan kembali muncul di daftar Available Variables. Kotak <strong>Grouping Variable</strong> dan{' '}
        <strong>Selection Variable</strong> hanya menampung satu variabel, sehingga bila pilihan Anda berisi beberapa
        variabel, hanya variabel pertama yang dipindahkan. Variabel yang sudah dipakai di salah satu kotak otomatis
        hilang dari daftar Available Variables agar tidak terpilih dua kali.
      </p>
    </HelpAlert>

    <HelpAlert variant="info" title="Tombol Reset dan Cancel">
      <p className="text-sm mt-2">
        Pengaturan modal tersimpan otomatis, sehingga saat dibuka kembali isian terakhir Anda masih ada. Tekan{' '}
        <strong>Reset</strong> untuk mengembalikan seluruh tab ke nilai bawaan, atau <strong>Cancel</strong> untuk
        menutup modal tanpa menjalankan analisis.
      </p>
    </HelpAlert>
  </div>
);

const StatisticsTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="info" title="Tab Statistics Menentukan Tabel Tambahan">
      <p className="text-sm mt-2">
        Semua opsi di tab ini bersifat opsional. Mencentangnya akan menambahkan tabel tertentu ke Output Viewer,
        tanpa mengubah model yang diestimasi.
      </p>
    </HelpAlert>

    <HelpCard title="Descriptives" icon={BarChart3} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Means"
          description="Menampilkan tabel Group Statistics, berisi rata-rata dan simpangan baku tiap variabel bebas pada masing-masing kelompok beserta jumlah kasusnya. Berguna untuk melihat arah perbedaan antar kelompok."
        />
        <HelpStep
          number={2}
          title="Univariate ANOVAs"
          description="Menampilkan tabel Tests of Equality of Group Means. Setiap variabel diuji satu per satu, apakah rata-ratanya berbeda antar kelompok. Sig. kurang dari 0,05 menandakan variabel tersebut memisahkan kelompok dengan baik."
        />
        <HelpStep
          number={3}
          title="Box's M"
          description="Menampilkan tabel Log Determinants dan Box's M Test Results untuk menguji kesamaan matriks kovarians antar kelompok, yaitu asumsi utama LDA."
        />
      </div>
    </HelpCard>

    <HelpCard title="Function Coefficients" icon={Layers} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Fisher's"
          description="Menampilkan Classification Function Coefficients, yaitu satu set koefisien untuk tiap kelompok. Sebuah kasus dimasukkan ke kelompok yang memberi skor tertinggi."
        />
        <HelpStep
          number={2}
          title="Unstandardized"
          description="Menampilkan Canonical Discriminant Function Coefficients, yaitu koefisien dalam satuan asli variabel beserta konstantanya, dipakai untuk menghitung skor diskriminan tiap kasus."
        />
      </div>
    </HelpCard>

    <HelpCard title="Matrices" icon={Table} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Within-groups Correlation"
          description="Matriks korelasi antar variabel bebas yang digabungkan dari seluruh kelompok. Korelasi yang sangat tinggi menjadi indikasi awal multikolinearitas."
        />
        <HelpStep
          number={2}
          title="Within-groups Covariance"
          description="Matriks kovarians gabungan dalam kelompok, yaitu sebaran bersama yang dipakai untuk mengestimasi fungsi diskriminan."
        />
        <HelpStep
          number={3}
          title="Separate-groups Covariance"
          description="Matriks kovarians yang dihitung terpisah untuk setiap kelompok. Perbandingan antar matriks ini menjadi dasar uji Box's M."
        />
        <HelpStep
          number={4}
          title="Total Covariance"
          description="Matriks kovarians yang dihitung dari seluruh kasus tanpa memisahkan kelompok."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Centang Minimal Means dan Univariate ANOVAs">
      <p className="text-sm mt-2">
        Untuk laporan penelitian, dua opsi ini biasanya wajib ada karena menjelaskan profil tiap kelompok sekaligus
        menunjukkan variabel mana yang secara individual signifikan sebelum masuk ke model gabungan.
      </p>
    </HelpAlert>
  </div>
);

const MethodTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="warning" title="Tab Ini Hanya Muncul pada Metode Stepwise">
      <p className="text-sm mt-2">
        Pilih <strong>Use stepwise method</strong> pada tab Variables terlebih dahulu agar tab Method tampil.
      </p>
    </HelpAlert>

    <HelpCard title="Kriteria Pemilihan Variabel" icon={Layers} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Wilks' Lambda (Default)"
          description="Pada setiap langkah, variabel yang dipilih adalah yang paling menurunkan nilai Wilks' Lambda, artinya paling memperbaiki pemisahan antar kelompok secara keseluruhan. Ini pilihan paling umum dan paling mudah dijelaskan."
        />
        <HelpStep
          number={2}
          title="Unexplained Variance"
          description="Memilih variabel yang paling memperkecil total variasi antar kelompok yang belum terjelaskan oleh model."
        />
        <HelpStep
          number={3}
          title="Mahalanobis Distance"
          description="Memilih variabel yang paling memperbesar jarak Mahalanobis terkecil antar pasangan kelompok. Cocok jika perhatian utama adalah memisahkan dua kelompok yang paling mirip."
        />
        <HelpStep
          number={4}
          title="Smallest F Ratio"
          description="Memilih variabel yang memaksimalkan nilai F terkecil dari seluruh pasangan kelompok, jadi fokusnya juga pada pasangan kelompok yang paling sulit dibedakan."
        />
        <HelpStep
          number={5}
          title="Rao's V"
          description="Memilih variabel yang memberi kenaikan Rao's V terbesar. Isi kotak V-to-enter untuk menetapkan kenaikan minimum yang harus dicapai agar sebuah variabel boleh masuk. Kotak ini hanya aktif ketika Rao's V dipilih."
        />
      </div>
    </HelpCard>

    <HelpCard title="Criteria: Ambang Masuk dan Keluar" icon={Target} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Use F Value (Default)"
          description="Variabel masuk jika F-to-enter melebihi nilai Entry, dan dikeluarkan jika F-to-remove turun di bawah nilai Removal. Nilai bawaan adalah Entry 3.84 dan Removal 2.71, sama dengan SPSS."
        />
        <HelpStep
          number={2}
          title="Use Probability of F"
          description="Kriteria yang sama dinyatakan dalam bentuk peluang. Variabel masuk jika signifikansi F-nya lebih kecil dari Entry, dan keluar jika lebih besar dari Removal. Nilai bawaan adalah Entry 0.05 dan Removal 0.10."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="warning" title="Aturan Penting Nilai Entry dan Removal">
      <p className="text-sm mt-2">
        Jika memakai F Value, nilai <strong>Entry harus lebih besar</strong> daripada Removal. Sebaliknya jika memakai
        Probability of F, nilai <strong>Entry harus lebih kecil</strong> daripada Removal. Jika aturan ini dilanggar,
        variabel bisa keluar masuk berulang dan proses seleksi tidak berhenti dengan wajar.
      </p>
    </HelpAlert>

    <HelpCard title="Display" icon={ClipboardList} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Summary of Steps (Default Aktif)"
          description="Menampilkan tabel Variables Entered/Removed, Variables in the Analysis, Variables Not in the Analysis, dan Wilks' Lambda per langkah. Inilah rekam jejak lengkap proses seleksi."
        />
        <HelpStep
          number={2}
          title="F for Pairwise Distances"
          description="Menambahkan matriks jarak antar pasangan kelompok dalam bentuk nilai F pada setiap langkah, berguna untuk melihat pasangan kelompok mana yang makin terpisah setiap kali variabel baru masuk."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Stepwise Bukan Pengganti Teori">
      <p className="text-sm mt-2">
        Seleksi stepwise memilih variabel berdasarkan data yang ada, sehingga hasilnya bisa berubah pada sampel lain.
        Gunakan sebagai alat bantu eksplorasi, lalu pastikan variabel terpilih tetap masuk akal secara substansi.
      </p>
    </HelpAlert>
  </div>
);

const ClassifyTab = () => (
  <div className="space-y-6">
    <HelpCard title="Prior Probabilities" icon={Target} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="All Groups Equal (Default)"
          description="Setiap kelompok dianggap punya peluang awal yang sama. Gunakan bila proporsi kelompok pada sampel tidak mencerminkan proporsi di populasi."
        />
        <HelpStep
          number={2}
          title="Compute from Group Sizes"
          description="Peluang awal dihitung dari proporsi jumlah kasus tiap kelompok. Gunakan bila komposisi sampel memang mewakili populasi, sehingga kelompok besar layak diberi bobot lebih besar."
        />
      </div>
    </HelpCard>

    <HelpCard title="Use Covariance Matrix" icon={Layers} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Within-groups (Default)"
          description="Klasifikasi memakai satu matriks kovarians gabungan untuk semua kelompok. Inilah pendekatan linear yang standar dan paling stabil."
        />
        <HelpStep
          number={2}
          title="Separate-groups"
          description="Klasifikasi memakai matriks kovarians masing-masing kelompok. Pilih ini bila Box's M menunjukkan matriks kovarians antar kelompok berbeda nyata, dengan catatan tiap kelompok harus punya cukup banyak kasus."
        />
      </div>
    </HelpCard>

    <HelpCard title="Classify" icon={ClipboardList} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Casewise Results"
          description="Menampilkan hasil per kasus: kelompok sebenarnya, kelompok prediksi, peluang keanggotaan, dan skor diskriminan. Kasus yang salah diklasifikasikan ditandai dengan dua tanda bintang."
        />
        <HelpStep
          number={2}
          title="Limit Cases to First"
          description="Membatasi jumlah baris yang ditampilkan pada tabel Casewise Statistics. Sangat disarankan untuk dataset besar. Kotak ini hanya aktif setelah Casewise Results dicentang."
        />
        <HelpStep
          number={3}
          title="Summary Table"
          description="Menampilkan tabel Classification Results, yaitu matriks konfusi kelompok sebenarnya terhadap kelompok prediksi, lengkap dengan persentase kasus yang benar diklasifikasikan."
        />
        <HelpStep
          number={4}
          title="Leave-one-out Classification"
          description="Validasi silang: setiap kasus diklasifikasikan memakai model yang diestimasi tanpa menyertakan kasus tersebut. Hasilnya muncul sebagai baris Cross-validated pada tabel Classification Results dan lebih jujur menggambarkan performa model."
        />
      </div>
    </HelpCard>

    <HelpCard title="Plots" icon={TrendingUp} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Combined-groups"
          description="Satu diagram pencar berisi seluruh kasus pada dua fungsi diskriminan pertama, diwarnai menurut kelompok, lengkap dengan tanda bintang untuk centroid tiap kelompok."
        />
        <HelpStep
          number={2}
          title="Separate-groups"
          description="Satu diagram pencar untuk setiap kelompok. Berguna untuk melihat sebaran dan pencilan di dalam satu kelompok tanpa tertutup kelompok lain."
        />
        <HelpStep
          number={3}
          title="Territorial Map"
          description="Membagi ruang diskriminan menjadi wilayah klasifikasi. Setiap wilayah diwarnai sesuai kelompok yang akan diprediksi bila sebuah kasus jatuh di sana. Memerlukan minimal dua fungsi diskriminan."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="info" title="Replace Missing Values with Mean">
      <p className="text-sm mt-2">
        Opsi di bagian bawah tab ini mengganti nilai hilang pada variabel bebas dengan rata-ratanya saat tahap
        klasifikasi, sehingga kasus yang datanya tidak lengkap tetap bisa diprediksi. Gunakan dengan hati-hati karena
        imputasi rata-rata mengecilkan keragaman data.
      </p>
    </HelpAlert>
  </div>
);

const SaveBootstrapTab = () => (
  <div className="space-y-6">
    <HelpCard title="Save: Menyimpan Hasil ke Dataset" icon={Save} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Predicted Group Membership"
          description="Menambahkan variabel baru berisi kelompok hasil prediksi untuk setiap kasus."
        />
        <HelpStep
          number={2}
          title="Discriminant Scores"
          description="Menambahkan variabel baru berisi skor tiap fungsi diskriminan. Skor ini bisa dipakai lagi untuk analisis lanjutan, misalnya sebagai variabel dalam analisis lain."
        />
        <HelpStep
          number={3}
          title="Probabilities of Group Membership"
          description="Menambahkan variabel baru berisi peluang keanggotaan setiap kelompok, satu variabel untuk tiap kelompok."
        />
        <HelpStep
          number={4}
          title="Export Model Information to XML File"
          description="Memuat berkas XML informasi model, dengan pratinjau isinya langsung di dalam modal."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="warning" title="Bootstrap Hanya untuk Metode Together">
      <p className="text-sm mt-2">
        Tab Bootstrap hanya tersedia ketika metode <strong>Enter independents together</strong> dipilih. Pada metode
        stepwise, tab ini disembunyikan dan opsi bootstrap yang terlanjur aktif akan dimatikan.
      </p>
    </HelpAlert>

    <HelpCard title="Bootstrap" icon={BarChart3} variant="default">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Perform Bootstrapping"
          description="Centang untuk mengaktifkan. Seluruh pengaturan di bawahnya baru bisa diisi setelah kotak ini dicentang."
        />
        <HelpStep
          number={2}
          title="Number of Samples"
          description="Jumlah sampel ulang yang dibentuk, bawaannya 1000. Semakin banyak sampel, semakin stabil hasilnya, tetapi waktu hitung juga bertambah."
        />
        <HelpStep
          number={3}
          title="Set Seed for Mersenne Twister"
          description="Menetapkan angka awal pembangkit bilangan acak agar hasil bootstrap dapat direproduksi persis pada eksekusi berikutnya. Nilai bawaan seed adalah 2000000."
        />
        <HelpStep
          number={4}
          title="Confidence Interval: Percentile atau BCa"
          description="Percentile mengambil batas interval langsung dari persentil distribusi bootstrap. BCa mengoreksi bias dan kemencengan, hasilnya lebih akurat namun perlu waktu hitung lebih lama. Tingkat kepercayaan bawaan adalah 95 persen."
        />
        <HelpStep
          number={5}
          title="Sampling: Simple atau Stratified"
          description="Simple mengambil sampel ulang dari seluruh kasus. Stratified mengambil sampel ulang di dalam strata yang Anda tentukan dengan menyeret variabel ke kotak Strata Variables, sehingga komposisi tiap strata tetap terjaga."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Kapan Bootstrap Berguna?">
      <p className="text-sm mt-2">
        Gunakan bootstrap ketika ukuran sampel terbatas atau asumsi normalitas diragukan. Hasilnya muncul sebagai tabel{' '}
        <strong>Bootstrap for Standardized Canonical Discriminant Function Coefficients</strong>, berisi bias, galat
        baku, dan selang kepercayaan tiap koefisien terstandarisasi.
      </p>
    </HelpAlert>
  </div>
);

const AssumptionsTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="info" title="Uji Asumsi Bisa Dijalankan Terpisah">
      <p className="text-sm mt-2">
        Tab Assumptions memiliki tombol <strong>Run Assumption Tests</strong> yang langsung menulis hasil pemeriksaan
        ke Output Viewer <strong>tanpa</strong> menjalankan analisis diskriminan lengkap. Tombol ini baru aktif setelah
        Grouping Variable dan minimal satu Independent Variable dipilih di tab Variables.
      </p>
    </HelpAlert>

    <HelpCard title="Pemeriksaan yang Dijalankan" icon={CheckCircle} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Multicollinearity (Tolerance dan VIF)"
          description="Mendeteksi variabel bebas yang terlalu berkorelasi satu sama lain. Ambang yang dipakai adalah VIF 10; nilai VIF di atas itu menandakan multikolinearitas yang perlu ditangani, misalnya dengan mengeluarkan salah satu variabel."
        />
        <HelpStep
          number={2}
          title="Multivariate Normality (Henze-Zirkler)"
          description="Menguji kenormalan bersama seluruh variabel bebas pada keseluruhan data. Asumsi dianggap terpenuhi jika p value lebih besar dari 0,05."
        />
        <HelpStep
          number={3}
          title="Univariate Normality (Anderson-Darling)"
          description="Menguji kenormalan tiap variabel bebas satu per satu, juga dengan taraf 0,05. Kolom Normality menunjukkan status tiap variabel, dan catatan di bawah tabel menyebutkan variabel mana yang bermasalah."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="warning" title="Homogenitas Kovarians Ada di Tab Statistics">
      <p className="text-sm mt-2">
        Asumsi kesamaan matriks kovarians antar kelompok tidak ada di tab ini, melainkan diperiksa lewat{' '}
        <strong>Box&apos;s M</strong> pada tab Statistics. Centang opsi tersebut agar tabel Log Determinants dan
        Box&apos;s M Test Results ikut ditampilkan bersama hasil analisis lengkap.
      </p>
    </HelpAlert>

    <HelpCard title="Membaca Tabel Assumption Checks Summary" icon={ClipboardList} variant="default">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Kolom <strong>Assumption</strong> dan <strong>Test</strong> menyebutkan asumsi serta uji yang dipakai</li>
        <li>Kolom <strong>Finding</strong> merangkum angka kuncinya, misalnya nilai VIF terbesar atau nilai HZ beserta p value</li>
        <li>Kolom <strong>Status</strong> menyatakan terpenuhi atau tidaknya asumsi tersebut</li>
        <li>Catatan di bawah tabel muncul jika ada asumsi yang dilanggar, sekaligus menjelaskan bagian mana yang perlu diperiksa</li>
      </ul>
    </HelpCard>

    <HelpAlert variant="tip" title="Jika Asumsi Tidak Terpenuhi">
      <p className="text-sm mt-2">
        Penyimpangan normalitas umumnya masih ditoleransi bila jumlah kasus cukup besar. Jika Box&apos;s M signifikan,
        pertimbangkan memakai <strong>Separate-groups</strong> pada tab Classify. Jika VIF tinggi, keluarkan salah satu
        variabel yang berkorelasi atau gunakan metode stepwise agar variabel yang berlebihan tersaring sendiri.
      </p>
    </HelpAlert>
  </div>
);

const OutputTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="info" title="Urutan Output Mengikuti Alur Analisis">
      <p className="text-sm mt-2">
        Tabel di Output Viewer disusun mengikuti alur kerja analisis diskriminan: pemeriksaan asumsi, gambaran data,
        struktur kovarians, seleksi variabel, fungsi diskriminan, lalu klasifikasi dan grafik. Setiap tabel disertai
        deskripsi singkat yang menjelaskan cara membacanya.
      </p>
    </HelpAlert>

    <HelpCard title="1. Gambaran Data dan Pemisahan Awal" icon={BarChart3} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li><strong>Analysis Case Processing Summary</strong>: jumlah kasus yang valid dan yang dikeluarkan beserta alasannya</li>
        <li><strong>Group Statistics</strong>: rata-rata dan simpangan baku tiap variabel per kelompok</li>
        <li><strong>Tests of Equality of Group Means</strong>: Wilks&apos; Lambda dan uji F per variabel. Sig. kurang dari 0,05 berarti variabel tersebut membedakan kelompok</li>
      </ul>
    </HelpCard>

    <HelpCard title="2. Struktur Kovarians" icon={Table} variant="default">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li><strong>Pooled Within-Groups Covariance dan Correlation Matrix</strong>: sebaran bersama yang dipakai model</li>
        <li><strong>Covariance Matrices</strong>: kovarians tiap kelompok secara terpisah</li>
        <li><strong>Log Determinants dan Box&apos;s M</strong>: selisih log determinan yang besar menandakan kovarians antar kelompok tidak sama</li>
      </ul>
    </HelpCard>

    <HelpCard title="3. Proses Stepwise (Jika Dipakai)" icon={Layers} variant="default">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li><strong>Variables Entered/Removed</strong>: variabel yang masuk atau keluar pada tiap langkah</li>
        <li><strong>Variables in the Analysis</strong>: statistik variabel yang sudah berada di dalam model</li>
        <li><strong>Variables Not in the Analysis</strong>: kandidat berikutnya beserta nilai F-to-enter-nya</li>
        <li><strong>Wilks&apos; Lambda (Stepwise)</strong>: nilai Lambda setelah tiap langkah, makin kecil makin baik pemisahannya</li>
      </ul>
    </HelpCard>

    <HelpCard title="4. Fungsi Diskriminan yang Terbentuk" icon={TrendingUp} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li><strong>Eigenvalues</strong>: kekuatan tiap fungsi, persentase keragaman yang dijelaskan, dan korelasi kanonik</li>
        <li><strong>Wilks&apos; Lambda</strong>: uji signifikansi fungsi. Sig. kurang dari 0,05 berarti fungsi tersebut memisahkan kelompok secara nyata</li>
        <li><strong>Standardized Canonical Discriminant Function Coefficients</strong>: bobot terstandarisasi, dipakai membandingkan kontribusi antar variabel</li>
        <li><strong>Structure Matrix</strong>: korelasi tiap variabel dengan fungsi. Nilai mutlak yang besar menandakan variabel tersebut paling mewakili fungsi</li>
        <li><strong>Canonical Discriminant Function Coefficients</strong>: koefisien tak terstandarisasi untuk menghitung skor</li>
        <li><strong>Functions at Group Centroids</strong>: rata-rata skor diskriminan tiap kelompok, yaitu posisi pusat kelompok di ruang diskriminan</li>
      </ul>
    </HelpCard>

    <HelpAlert variant="tip" title="Standardized Coefficients atau Structure Matrix?">
      <p className="text-sm mt-2">
        Keduanya menjelaskan pentingnya variabel dari sudut berbeda. <strong>Standardized coefficients</strong>{' '}
        menunjukkan kontribusi unik sebuah variabel setelah variabel lain diperhitungkan, sehingga bisa mengecil bila
        ada korelasi antar prediktor. <strong>Structure matrix</strong> menunjukkan hubungan langsung variabel dengan
        fungsi dan biasanya lebih stabil, sehingga sering dipakai untuk memberi nama pada tiap fungsi.
      </p>
    </HelpAlert>

    <HelpCard title="5. Hasil Klasifikasi" icon={Target} variant="default">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li><strong>Prior Probabilities for Groups</strong>: peluang awal tiap kelompok beserta jumlah kasus yang dipakai</li>
        <li><strong>Classification Function Coefficients</strong>: koefisien Fisher, kasus masuk ke kelompok dengan skor tertinggi</li>
        <li><strong>Casewise Statistics</strong>: hasil per kasus, dua tanda bintang menandai kasus yang salah klasifikasi</li>
        <li><strong>Classification Results</strong>: matriks konfusi beserta persentase ketepatan klasifikasi keseluruhan</li>
      </ul>
    </HelpCard>

    <HelpCard title="6. Grafik Ruang Diskriminan" icon={TrendingUp} variant="default">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li><strong>Combined-Groups Plot</strong>: klaster yang rapat dan saling terpisah menandakan diskriminasi yang baik</li>
        <li><strong>Separate-Groups Plots</strong>: satu grafik per kelompok untuk memeriksa sebaran dan pencilan</li>
        <li><strong>Territorial Map</strong>: wilayah klasifikasi pada ruang fungsi 1 dan fungsi 2, dengan tanda bintang sebagai centroid</li>
      </ul>
    </HelpCard>

    <HelpAlert variant="warning" title="Bandingkan Hit Ratio dengan Peluang Acak">
      <p className="text-sm mt-2">
        Persentase ketepatan klasifikasi sebaiknya jelas melebihi peluang menebak secara acak. Untuk dua kelompok
        seimbang, tebakan acak sudah menghasilkan sekitar 50 persen, sehingga ketepatan 55 persen belum bisa disebut
        model yang baik. Perhatikan pula baris <strong>Cross-validated</strong> karena angka tersebut lebih jujur
        daripada baris Original.
      </p>
    </HelpAlert>
  </div>
);

const QuickStartGuide = () => (
  <div className="mt-8 grid gap-4">
    <HelpCard title="Panduan Cepat" icon={ClipboardList} variant="feature">
      <div className="space-y-3">
        <p className="text-sm">Siap menjalankan Analisis Diskriminan?</p>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Buka <b>Analyze &gt; Classify &gt; Discriminant</b></li>
          <li>Pindahkan variabel kategorikal ke <b>Grouping Variable</b>, klik <b>Define Range...</b>, lalu isi kode kelompok terkecil dan terbesar</li>
          <li>Pilih variabel numerik dengan <b>Ctrl+klik</b> atau <b>Shift+klik</b>, lalu pindahkan sekaligus ke kotak <b>Independents</b></li>
          <li>Pilih <b>Enter independents together</b> jika sudah yakin dengan daftar variabelnya, atau <b>Use stepwise method</b> untuk menyaring variabel</li>
          <li>Di tab <b>Statistics</b>, centang minimal <b>Means</b>, <b>Univariate ANOVAs</b>, dan <b>Box&apos;s M</b></li>
          <li>Di tab <b>Classify</b>, centang <b>Summary Table</b> dan <b>Leave-one-out Classification</b>, serta grafik yang diperlukan</li>
          <li>Jalankan <b>Run Assumption Tests</b> di tab Assumptions untuk memeriksa asumsi lebih dulu</li>
          <li>Klik <b>OK</b>, lalu baca output berurutan: <b>Tests of Equality of Group Means</b>, <b>Eigenvalues</b>, <b>Wilks&apos; Lambda</b>, <b>Structure Matrix</b>, dan terakhir <b>Classification Results</b></li>
        </ol>
      </div>
    </HelpCard>
  </div>
);

// ----------- Main component -------------------------------------------------

export const DiscriminantAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabConfig = [
    { value: 'overview', label: 'Ringkasan', icon: HelpCircle },
    { value: 'variables', label: 'Variabel', icon: Table },
    { value: 'statistics', label: 'Statistics', icon: BarChart3 },
    { value: 'method', label: 'Method', icon: Layers },
    { value: 'classify', label: 'Classify', icon: Target },
    { value: 'save', label: 'Save & Bootstrap', icon: Save },
    { value: 'assumptions', label: 'Assumptions', icon: CheckCircle },
    { value: 'output', label: 'Baca Output', icon: TrendingUp },
  ];

  return (
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Panduan Analisis Diskriminan</h1>
        <p className="text-muted-foreground">
          Pelajari cara mengatur dan menginterpretasikan Discriminant Analysis di Statify, mulai dari pemilihan
          variabel, metode stepwise, klasifikasi, hingga cara membaca setiap tabel keluarannya.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full h-auto grid-cols-4 lg:grid-cols-8">
          {tabConfig.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-2">
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
        <TabsContent value="variables" className="mt-6"><VariablesTab /></TabsContent>
        <TabsContent value="statistics" className="mt-6"><StatisticsTab /></TabsContent>
        <TabsContent value="method" className="mt-6"><MethodTab /></TabsContent>
        <TabsContent value="classify" className="mt-6"><ClassifyTab /></TabsContent>
        <TabsContent value="save" className="mt-6"><SaveBootstrapTab /></TabsContent>
        <TabsContent value="assumptions" className="mt-6"><AssumptionsTab /></TabsContent>
        <TabsContent value="output" className="mt-6"><OutputTab /></TabsContent>
      </Tabs>

      <QuickStartGuide />
    </div>
  );
};
