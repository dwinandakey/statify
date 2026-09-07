import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import {
  HelpCircle,
  Table,
  Cpu,
  ClipboardList,
  BarChart3,
  Save,
  SlidersHorizontal,
  Calculator,
} from 'lucide-react';

/*
 * Help Guide: K-Medoids Clustering (Bahasa Indonesia)
 * ----------------------------------------------------------------------------
 * Komponen ini menyediakan panduan pengguna untuk modal K-Medoids Cluster
 * (lihat 'components/Modals/Analyze/Clustering/k-medoids-cluster/dialogs/k-medoids-cluster-main.tsx').
 *
 * Urutan tab pada panduan mengikuti urutan tab pada modal
 * (Variables -> Iterate -> Results -> Evaluation -> Save -> Options) agar pengguna
 * dapat mengikuti panduan sambil mengisi dialog.
 */

// ----------- Tab content components ----------------------------------------

const OverviewTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="info" title="Apa itu K-Medoids Clustering?">
      <p className="text-sm mt-2">
        K-Medoids adalah metode pengelompokan (clustering) yang membagi objek ke dalam k kelompok,
        di mana pusat setiap kelompok adalah <strong>medoid</strong>, yaitu salah satu objek nyata
        dari data yang memiliki total jarak terkecil ke seluruh anggota kelompoknya. Berbeda dengan
        K-Means yang memakai rata-rata (centroid) sebagai pusat, medoid selalu berupa kasus asli
        sehingga hasilnya lebih tahan terhadap outlier dan lebih mudah diinterpretasikan.
      </p>
    </HelpAlert>

    <HelpCard title="Kapan Menggunakan K-Medoids?" icon={HelpCircle} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Data mengandung outlier atau nilai ekstrem yang dapat menarik centroid K-Means</li>
        <li>Anda ingin pusat cluster berupa objek nyata (kasus perwakilan), bukan nilai rata-rata</li>
        <li>Ingin menggunakan jarak Manhattan (city-block) yang lebih robust dibanding Euclidean</li>
        <li>Melakukan segmentasi (wilayah, responden, produk) tanpa label kelompok sebelumnya</li>
        <li>Ingin mencari jumlah cluster optimal secara otomatis lewat Silhouette atau Elbow</li>
      </ul>
    </HelpCard>

    <HelpCard title="Perbedaan K-Medoids dan K-Means" icon={BarChart3} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Pusat Cluster"
          description="K-Means memakai centroid (rata-rata, bisa berupa titik yang tidak ada di data). K-Medoids memakai medoid, yaitu salah satu kasus asli dari dataset."
        />
        <HelpStep
          number={2}
          title="Ketahanan terhadap Outlier"
          description="K-Medoids meminimalkan total jarak (cost), bukan kuadrat jarak, sehingga pengaruh outlier jauh lebih kecil dibanding K-Means."
        />
        <HelpStep
          number={3}
          title="Kecepatan Komputasi"
          description="K-Medoids (khususnya PAM) lebih berat karena perlu menghitung jarak antar objek. Untuk data besar tersedia algoritma CLARA dan CLARANS."
        />
      </div>
    </HelpCard>

    <HelpCard title="Yang Akan Anda Pelajari" icon={ClipboardList} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Memilih variabel numerik dan menentukan jumlah cluster (manual atau otomatis)</li>
        <li>Memilih ukuran jarak: Euclidean atau Manhattan</li>
        <li>Memilih algoritma PAM, CLARA, atau CLARANS beserta parameternya</li>
        <li>Mengatur tabel dan grafik yang muncul pada output</li>
        <li>Menilai kualitas cluster dengan Silhouette dan Elbow</li>
        <li>Menyimpan keanggotaan cluster dan jarak ke medoid sebagai variabel baru</li>
        <li>Menangani missing value dan normalisasi data sebelum analisis</li>
      </ul>
    </HelpCard>
  </div>
);

const VariablesHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Tab Variables" icon={Table} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Pindahkan Variabel ke Kotak Variables"
          description="Pilih variabel numerik yang akan menjadi dasar pengelompokan, lalu klik tombol panah atau seret (drag and drop) ke kotak Variables. Anda dapat memilih lebih dari satu variabel."
        />
        <HelpStep
          number={2}
          title="Isi Label Cases by (Opsional)"
          description="Kotak ini menampung maksimal satu variabel yang dipakai sebagai label identitas kasus pada output, misalnya nama kabupaten, kode responden, atau nama produk. Tanpa label, kasus ditampilkan sebagai nomor urut."
        />
        <HelpStep
          number={3}
          title="Tentukan Number of Clusters (k)"
          description="Pilih Manual untuk menetapkan sendiri nilai k (minimal 2), atau Automatic untuk membiarkan sistem mencari k terbaik dalam rentang tertentu."
        />
        <HelpStep
          number={4}
          title="Pilih Distance Measure"
          description="Euclidean distance untuk jarak geometris biasa, atau Manhattan distance (City-block) yang menjumlahkan selisih absolut dan lebih tahan terhadap outlier."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="warning" title="Hanya Variabel Numerik">
      <p className="text-sm mt-2">
        Kotak Variables hanya menerima variabel numerik karena perhitungan jarak membutuhkan angka.
        Variabel teks atau variabel yang seluruh isinya bukan angka akan ditolak saat dipindahkan.
        Gunakan kotak <strong>Label Cases by</strong> jika Anda ingin menampilkan variabel identitas
        (misalnya nama wilayah) pada output.
      </p>
    </HelpAlert>

    <HelpCard title="Mode Pemilihan Jumlah Cluster" icon={SlidersHorizontal} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Manual"
          description="Anda menentukan sendiri nilai k (minimal 2). Gunakan mode ini jika jumlah kelompok sudah ditentukan oleh teori, kebijakan, atau kebutuhan penelitian."
        />
        <HelpStep
          number={2}
          title="Automatic k range"
          description="Sistem mencoba setiap nilai k dalam rentang yang Anda isi (default 2 sampai 10), lalu memilih k terbaik. Batas bawah harus lebih kecil dari batas atas."
        />
        <HelpStep
          number={3}
          title="Automatic Method: Silhouette"
          description="k terbaik adalah k dengan rata-rata skor silhouette tertinggi. Metode ini menilai seberapa rapat anggota dalam satu cluster dan seberapa terpisah antar cluster."
        />
        <HelpStep
          number={4}
          title="Automatic Method: Elbow"
          description="k terbaik ditentukan dari titik siku pada kurva total cost (WCSS) terhadap k, yaitu titik ketika penambahan cluster tidak lagi menurunkan cost secara berarti."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Tips: Rentang k yang Wajar">
      <p className="text-sm mt-2">
        Semakin lebar rentang k pada mode Automatic, semakin lama proses berjalan karena clustering
        diulang untuk setiap nilai k. Untuk dataset besar, mulailah dengan rentang sempit
        (misalnya 2 sampai 6), lalu perluas jika diperlukan.
      </p>
    </HelpAlert>
  </div>
);

const AlgorithmHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="K-Medoids Method" icon={Cpu} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="PAM (Partitioning Around Medoids)"
          description="Algoritma klasik dengan dua fase: BUILD untuk memilih medoid awal secara greedy, dan SWAP untuk menukar medoid selama masih menurunkan cost. Kualitas terbaik, tetapi paling berat. Cocok untuk data di bawah sekitar 1.000 kasus."
        />
        <HelpStep
          number={2}
          title="CLARA (Large Datasets)"
          description="Menjalankan PAM pada beberapa sampel acak, lalu mengevaluasi hasilnya pada seluruh data dan memilih yang terbaik. Jauh lebih cepat pada data besar dengan kualitas yang tetap baik."
        />
        <HelpStep
          number={3}
          title="CLARANS (Randomized Search)"
          description="Melakukan pencarian acak pada tetangga solusi dan berpindah setiap kali menemukan perbaikan, diulang untuk beberapa local minima. Kompromi antara kecepatan dan kualitas, cocok untuk data menengah dan data spasial."
        />
      </div>
    </HelpCard>

    <HelpCard title="Iteration Parameters" icon={SlidersHorizontal} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Maximum Iterations"
          description="Batas maksimum iterasi sebelum proses dihentikan (default 300). Naikkan nilainya jika hasil dilaporkan belum konvergen pada panel Konvergensi Algoritma."
        />
        <HelpStep
          number={2}
          title="Convergence Tolerance (khusus PAM)"
          description="Ambang perubahan cost antar iterasi. Proses berhenti jika perbaikan lebih kecil dari ambang ini. Nilai default 0 berarti berhenti hanya ketika tidak ada perbaikan sama sekali."
        />
        <HelpStep
          number={3}
          title="Seed Mode"
          description="Default memakai fase BUILD yang deterministik. Random melakukan inisialisasi acak berbeda setiap kali dijalankan. Custom meminta Anda mengisi angka seed agar hasil dapat diulang persis."
        />
        <HelpStep
          number={4}
          title="Number of Initializations (khusus PAM)"
          description="Jumlah pengulangan analisis dengan titik awal berbeda, hasil terbaik yang dipakai (default 10). Nilai lebih besar memberi hasil lebih stabil tetapi lebih lambat, gunakan 1 sampai 3 untuk dataset besar."
        />
      </div>
    </HelpCard>

    <HelpCard title="Parameter Khusus CLARA" icon={SlidersHorizontal} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Sample Size"
          description="Ukuran sampel acak yang diambil dari dataset. Biarkan kosong untuk perhitungan otomatis (40 + 2k). Nilainya wajib lebih besar dari jumlah cluster; jika tidak, tombol OK akan nonaktif."
        />
        <HelpStep
          number={2}
          title="Number of Samples"
          description="Banyaknya sampel yang diambil dan dievaluasi (default 5). Semakin banyak sampel, semakin besar peluang menemukan medoid yang baik, tetapi prosesnya lebih lama."
        />
      </div>
    </HelpCard>

    <HelpCard title="Parameter Khusus CLARANS" icon={SlidersHorizontal} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Number of Local Minima"
          description="Berapa kali pencarian diulang dari titik awal acak yang berbeda (default 2). Nilai lebih besar mengurangi risiko terjebak pada solusi lokal yang buruk."
        />
        <HelpStep
          number={2}
          title="Maximum Neighbors"
          description="Jumlah tetangga yang diperiksa pada setiap langkah pencarian. Biarkan kosong untuk perhitungan otomatis. Nilai lebih besar meningkatkan kualitas dengan biaya waktu komputasi."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Tips: Memilih Algoritma">
      <p className="text-sm mt-2">
        Gunakan <strong>PAM</strong> untuk data kecil (kualitas terbaik), <strong>CLARA</strong> jika
        jumlah kasus di atas seribu dan kecepatan menjadi prioritas, serta <strong>CLARANS</strong>{' '}
        untuk data menengah ketika Anda menginginkan keseimbangan keduanya. Parameter khusus CLARA
        dan CLARANS hanya muncul setelah metode tersebut dipilih.
      </p>
    </HelpAlert>
  </div>
);

const ResultsHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Core Outputs (Direkomendasikan)" icon={ClipboardList} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Cluster Membership"
          description="Tabel yang menunjukkan cluster tempat setiap kasus berada, lengkap dengan jarak ke medoidnya."
        />
        <HelpStep
          number={2}
          title="Number of Cases per Cluster"
          description="Ringkasan jumlah kasus pada setiap cluster. Berguna untuk memeriksa apakah ada cluster yang terlalu kecil atau timpang."
        />
        <HelpStep
          number={3}
          title="Cluster Medoids"
          description="Menampilkan kasus yang menjadi medoid setiap cluster beserta nilai variabelnya. Inilah kasus perwakilan yang dapat Anda tafsirkan sebagai profil kelompok."
        />
      </div>
    </HelpCard>

    <HelpCard title="Additional Information (Opsional)" icon={BarChart3} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Konvergensi Algoritma"
          description="Panel status konvergensi beserta tabel histori iterasi (cost per iterasi). Mengaktifkan opsi ini otomatis menyertakan detail histori iterasi."
        />
        <HelpStep
          number={2}
          title="Grafik Konvergensi Algoritma"
          description="Grafik penurunan cost dan besar perbaikan per iterasi sebagai section tersendiri. Dapat diaktifkan tanpa tabel di atasnya, atau sebaliknya."
        />
        <HelpStep
          number={3}
          title="Histori Sampling (khusus CLARA)"
          description="Grafik dan tabel cost untuk setiap sampel yang diambil CLARA. Opsi ini menggantikan kedua opsi konvergensi di atas ketika metode CLARA dipilih."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="info" title="Opsi Menyesuaikan Metode">
      <p className="text-sm mt-2">
        Isi tab Results berubah mengikuti metode pada tab Iterate. Untuk PAM dan CLARANS akan muncul
        opsi konvergensi (tabel dan grafik iterasi), sedangkan untuk CLARA yang muncul adalah
        Histori Sampling, karena CLARA bekerja per sampel dan bukan per iterasi swap.
      </p>
    </HelpAlert>
  </div>
);

const EvaluationHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Silhouette" icon={BarChart3} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Silhouette Plot (per objek)"
          description="Grafik batang skor silhouette untuk setiap objek, dikelompokkan per cluster. Batang bernilai negatif menandakan kasus yang kemungkinan salah tempat."
        />
        <HelpStep
          number={2}
          title="Overall Quality Assessment"
          description="Ringkasan skor silhouette rata-rata beserta interpretasi kekuatan struktur cluster secara keseluruhan."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="info" title="Membaca Skor Silhouette">
      <div className="text-sm mt-2 space-y-1">
        <p>Skor silhouette berkisar dari -1 sampai +1, semakin tinggi semakin baik:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>0,7 – 1,0</strong>: struktur cluster sangat kuat</li>
          <li><strong>0,5 – 0,7</strong>: struktur cluster kuat</li>
          <li><strong>0,3 – 0,5</strong>: struktur moderat, pertimbangkan nilai k lain</li>
          <li><strong>di bawah 0,3</strong>: struktur lemah, kelompok belum terpisah jelas</li>
        </ul>
        <p className="mt-2">
          Rumus lengkap a(i), b(i), dan s(i) dapat dilihat pada tab <strong>Rumus</strong>.
        </p>
      </div>
    </HelpAlert>

    <HelpCard title="K Optimal" icon={SlidersHorizontal} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Grafik K Optimal"
          description="Kurva silhouette atau elbow untuk setiap kandidat k, membantu Anda melihat secara visual pada k berapa kualitas cluster paling baik."
        />
        <HelpStep
          number={2}
          title="Tabel K Optimal"
          description="Nilai cost dan skor silhouette untuk setiap k dalam bentuk tabel, sebagai pendamping angka dari grafik di atas."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Tips: K Optimal pada Mode Manual">
      <p className="text-sm mt-2">
        Kedua opsi K Optimal tetap dapat digunakan meskipun Anda memilih mode k manual. Jika salah
        satunya diaktifkan, sistem tetap mengevaluasi rentang k untuk menghasilkan data pembanding,
        sehingga Anda bisa memeriksa apakah nilai k pilihan Anda sudah tepat. Konsekuensinya, proses
        analisis menjadi lebih lama.
      </p>
    </HelpAlert>
  </div>
);

const SaveHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Save New Variables to Dataset" icon={Save} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Cluster membership"
          description="Menyimpan nomor cluster setiap kasus sebagai variabel baru di dataset aktif, dengan penamaan CLU_1, CLU_2, dan seterusnya."
        />
        <HelpStep
          number={2}
          title="Distance from medoid"
          description="Menyimpan jarak setiap kasus ke medoid clusternya sebagai variabel baru (DIS_1, DIS_2, dan seterusnya). Nilai besar menandakan kasus yang jauh dari pusat kelompoknya."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="info" title="Beda Save dan Results">
      <p className="text-sm mt-2">
        Tab <strong>Save</strong> menambahkan kolom baru ke dataset aktif sehingga dapat dipakai untuk
        analisis lanjutan (misalnya membandingkan cluster dengan Crosstabs atau uji beda rata-rata).
        Tab <strong>Results</strong> hanya mengatur tabel yang ditampilkan pada halaman output dan
        tidak mengubah dataset.
      </p>
    </HelpAlert>

    <HelpAlert variant="tip" title="Tips: Memakai Variabel Tersimpan">
      <p className="text-sm mt-2">
        Variabel jarak ke medoid berguna untuk mendeteksi kasus yang menyimpang. Urutkan dataset
        berdasarkan DIS_1 secara menurun untuk menemukan kasus dengan jarak terjauh dari medoidnya,
        kasus tersebut biasanya merupakan outlier atau kasus di perbatasan antar cluster.
      </p>
    </HelpAlert>
  </div>
);

const OptionsHelpTab = () => (
  <div className="space-y-6">
    <HelpCard title="Visualization" icon={BarChart3} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="PCA Projection"
          description="Memproyeksikan data multivariat ke dua komponen utama sehingga sebaran cluster dapat dilihat dalam satu bidang dua dimensi."
        />
        <HelpStep
          number={2}
          title="Cluster Scatter Plot"
          description="Diagram pencar antar variabel asli dengan pewarnaan menurut cluster, berguna untuk melihat variabel mana yang paling memisahkan kelompok."
        />
        <HelpStep
          number={3}
          title="Cluster Size Distribution"
          description="Grafik perbandingan jumlah anggota tiap cluster, memudahkan mengenali cluster yang terlalu kecil atau yang mendominasi."
        />
      </div>
    </HelpCard>

    <HelpCard title="Matriks Jarak" icon={Table} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Matriks Jarak Antar Medoid"
          description="Menampilkan jarak antar medoid. Jarak yang besar menandakan cluster saling terpisah jauh, sedangkan jarak kecil menunjukkan dua cluster yang mirip dan berpotensi digabung."
        />
        <HelpStep
          number={2}
          title="Matriks Jarak Semua Objek"
          description="Matriks jarak lengkap antar seluruh objek. Tabelnya dipaginasi agar tetap ringan, tetapi sebaiknya tetap dihindari pada dataset yang sangat besar."
        />
      </div>
    </HelpCard>

    <HelpCard title="Preprocessing" icon={SlidersHorizontal} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Tanpa Normalisasi"
          description="Data dipakai apa adanya. Pilihan default, cocok jika seluruh variabel sudah memakai satuan dan rentang yang sebanding."
        />
        <HelpStep
          number={2}
          title="Standarisasi Data (Z-score)"
          description="Mengubah setiap variabel menjadi rata-rata 0 dan simpangan baku 1, sehingga variabel dengan satuan besar tidak mendominasi perhitungan jarak."
        />
        <HelpStep
          number={3}
          title="Normalisasi Min-Max (0-1)"
          description="Menskalakan setiap variabel ke rentang 0 sampai 1. Cocok bila Anda ingin batas rentang yang seragam, tetapi lebih peka terhadap nilai ekstrem dibanding Z-score."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="warning" title="Penting: Skala Variabel">
      <p className="text-sm mt-2">
        K-Medoids bekerja atas dasar jarak, sehingga variabel dengan rentang nilai besar (misalnya
        pendapatan dalam rupiah) akan mendominasi variabel berrentang kecil (misalnya persentase).
        Jika satuan antar variabel berbeda jauh, pilih Standarisasi Z-score atau Normalisasi Min-Max
        sebelum menjalankan analisis.
      </p>
    </HelpAlert>

    <HelpCard title="Missing Values" icon={SlidersHorizontal} variant="feature">
      <div className="space-y-4 mt-2">
        <HelpStep
          number={1}
          title="Exclude Cases Listwise"
          description="Baris yang memiliki missing value pada variabel mana pun dihapus dari analisis. Pilihan default dan paling aman untuk interpretasi."
        />
        <HelpStep
          number={2}
          title="Exclude Cases Pairwise"
          description="Baris dipertahankan selama masih ada minimal satu nilai valid; sel yang kosong diisi rata-rata variabelnya agar matriks jarak tetap numerik."
        />
      </div>
    </HelpCard>

    <HelpAlert variant="info" title="Notice Missing Value">
      <p className="text-sm mt-2">
        Jika variabel yang dipilih mengandung missing value, sebuah notice akan muncul tepat di atas
        grup Missing Values, memuat jumlah dan persentase baris yang terpengaruh beserta variabel
        penyumbang terbesar. Rekap lengkapnya tetap tersedia pada tabel Case Processing Summary di
        halaman output.
      </p>
    </HelpAlert>
  </div>
);

/**
 * Kotak rumus: notasi ditampilkan monospace di tengah, diikuti daftar keterangan
 * simbol. Mengikuti gaya kotak rumus pada panduan K-Means, tetapi memakai token
 * warna tema agar tetap terbaca pada mode gelap.
 */
const FormulaBox: React.FC<{
  formula: string;
  note?: string;
  where?: Array<{ symbol: string; meaning: string }>;
}> = ({ formula, note, where }) => (
  <div className="bg-muted/50 border rounded-lg p-4 my-3">
    <div className="text-center text-base font-mono font-semibold overflow-x-auto">
      {formula}
    </div>
    {note && <p className="mt-3 text-sm text-muted-foreground">{note}</p>}
    {where && where.length > 0 && (
      <>
        <p className="mt-3 text-sm text-muted-foreground">Keterangan:</p>
        <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
          {where.map((item) => (
            <li key={item.symbol}>
              <strong className="font-mono">{item.symbol}</strong> = {item.meaning}
            </li>
          ))}
        </ul>
      </>
    )}
  </div>
);

const FormulaHelpTab = () => (
  <div className="space-y-6">
    <HelpAlert variant="info" title="Rumus yang Dipakai Modul Ini">
      <p className="text-sm mt-2">
        Seluruh rumus di bawah ini adalah rumus yang benar-benar dihitung oleh mesin K-Medoids
        Statify, termasuk cara penentuan k optimal dan nilai default parameter CLARA/CLARANS.
        Notasi mengikuti Kaufman &amp; Rousseeuw (1990).
      </p>
    </HelpAlert>

    <HelpCard title="1. Fungsi Objektif (Total Cost)" icon={Calculator} variant="feature">
      <p className="text-sm mt-2">
        K-Medoids mencari himpunan medoid yang meminimalkan total jarak seluruh objek ke medoid
        terdekatnya. Nilai inilah yang ditampilkan sebagai Total Cost pada output.
      </p>
      <FormulaBox
        formula="Cost(M) = Σᵢ₌₁ⁿ minₘ∈M d(xᵢ, m)"
        where={[
          { symbol: 'n', meaning: 'banyaknya objek (kasus) yang dianalisis' },
          { symbol: 'M', meaning: 'himpunan k medoid terpilih' },
          { symbol: 'd(·,·)', meaning: 'ukuran jarak yang dipilih (Euclidean atau Manhattan)' },
          { symbol: 'xᵢ', meaning: 'vektor nilai variabel untuk objek ke-i' },
        ]}
        note="Berbeda dengan K-Means yang meminimalkan kuadrat jarak, K-Medoids meminimalkan jarak itu sendiri, inilah sebab hasilnya lebih tahan terhadap outlier."
      />
    </HelpCard>

    <HelpCard title="2. Ukuran Jarak" icon={Calculator} variant="feature">
      <p className="text-sm mt-2">Pilihan pada Distance Measure di tab Variables:</p>
      <FormulaBox
        formula="d(x, y) = √( Σₚ₌₁ᴾ (xₚ − yₚ)² )"
        note="Euclidean distance, jarak geometris (garis lurus). Peka terhadap nilai ekstrem karena selisih dikuadratkan."
      />
      <FormulaBox
        formula="d(x, y) = Σₚ₌₁ᴾ |xₚ − yₚ|"
        note="Manhattan distance (City-block), menjumlahkan selisih absolut per variabel, sehingga lebih robust terhadap outlier."
        where={[{ symbol: 'P', meaning: 'banyaknya variabel yang dipilih untuk clustering' }]}
      />
    </HelpCard>

    <HelpCard title="3. Penugasan Objek dan Definisi Medoid" icon={Calculator} variant="feature">
      <p className="text-sm mt-2">Setiap objek masuk ke cluster dengan medoid terdekat:</p>
      <FormulaBox
        formula="c(i) = argmin ⱼ₌₁..ₖ d(xᵢ, mⱼ)"
        note="c(i) adalah nomor cluster untuk objek ke-i, dan mⱼ adalah medoid cluster ke-j."
      />
      <p className="text-sm mt-4">
        Medoid sebuah cluster adalah anggota cluster itu sendiri yang total jaraknya ke seluruh
        anggota lain paling kecil:
      </p>
      <FormulaBox
        formula="mₖ = argmin ₓⱼ∈Cₖ  Σ ₓᵢ∈Cₖ d(xᵢ, xⱼ)"
        where={[
          { symbol: 'Cₖ', meaning: 'himpunan objek anggota cluster ke-k' },
          { symbol: 'mₖ', meaning: 'medoid cluster ke-k, selalu berupa objek nyata dari data' },
        ]}
      />
    </HelpCard>

    <HelpCard title="4. Algoritma PAM: Fase BUILD dan SWAP" icon={Cpu} variant="feature">
      <p className="text-sm mt-2">
        <strong>Fase BUILD</strong> memilih medoid awal satu per satu secara greedy, objek dengan
        total perbaikan (gain) terbesar yang dipilih:
      </p>
      <FormulaBox
        formula="gₕ = Σⱼ max( Dⱼ − d(j, h), 0 )"
        where={[
          { symbol: 'h', meaning: 'kandidat objek yang akan dijadikan medoid berikutnya' },
          { symbol: 'Dⱼ', meaning: 'jarak objek j ke medoid terdekat yang sudah terpilih' },
        ]}
      />
      <p className="text-sm mt-4">
        <strong>Fase SWAP</strong> mencoba menukar medoid i dengan objek non-medoid h, lalu
        menghitung perubahan total cost:
      </p>
      <FormulaBox
        formula="Tᵢₕ = Σⱼ Cⱼᵢₕ"
        note="Cⱼᵢₕ = min( d(j,h), Eⱼ ) − Dⱼ  bila medoid terdekat objek j adalah i (medoid yang dicopot); selain itu Cⱼᵢₕ = min( d(j,h), Dⱼ ) − Dⱼ."
        where={[
          { symbol: 'Dⱼ', meaning: 'jarak objek j ke medoid terdekat' },
          { symbol: 'Eⱼ', meaning: 'jarak objek j ke medoid terdekat kedua' },
        ]}
      />
      <HelpAlert variant="tip" title="Kapan Swap Diterima?">
        <p className="text-sm mt-2">
          Pertukaran hanya dilakukan jika <strong>Tᵢₕ &lt; 0</strong>, yaitu ketika total cost benar-benar
          turun. Proses berhenti saat tidak ada lagi swap yang menurunkan cost (atau penurunannya
          lebih kecil dari Convergence Tolerance), atau ketika Maximum Iterations tercapai.
        </p>
      </HelpAlert>
    </HelpCard>

    <HelpCard title="5. Silhouette" icon={BarChart3} variant="feature">
      <p className="text-sm mt-2">
        Untuk setiap objek i dihitung kerapatan di dalam clusternya dan jarak ke cluster tetangga
        terdekat:
      </p>
      <FormulaBox
        formula="a(i) = ( 1 / (|Cᵢ| − 1) ) · Σ ⱼ∈Cᵢ, ⱼ≠ᵢ d(i, j)"
        note="Rata-rata jarak objek i ke sesama anggota clusternya (kohesi)."
      />
      <FormulaBox
        formula="b(i) = min C≠Cᵢ ( 1 / |C| ) · Σ ⱼ∈C d(i, j)"
        note="Rata-rata jarak terkecil dari objek i ke seluruh anggota cluster lain (separasi)."
      />
      <FormulaBox
        formula="s(i) = ( b(i) − a(i) ) / max( a(i), b(i) )"
        note="Nilai s(i) berkisar −1 sampai +1. Objek pada cluster beranggota tunggal diberi nilai 0 karena a(i) tidak terdefinisi."
      />
      <FormulaBox
        formula="S = ( 1 / n ) · Σᵢ₌₁ⁿ s(i)"
        note="Rata-rata seluruh s(i), inilah angka yang tampil pada Overall Quality Assessment dan yang dipakai untuk memilih k pada metode Silhouette."
      />
    </HelpCard>

    <HelpCard title="6. Elbow (WCSS) dan Pemilihan k Optimal" icon={BarChart3} variant="feature">
      <p className="text-sm mt-2">Total simpangan dalam cluster untuk setiap kandidat k:</p>
      <FormulaBox
        formula="WCSS(k) = Σᵢ₌₁ⁿ d( xᵢ, m_c(i) )²"
        note="Untuk jarak Euclidean dipakai kuadrat jarak; untuk jarak Manhattan dipakai jarak apa adanya (tanpa dikuadratkan)."
      />
      <p className="text-sm mt-4">
        Titik siku ditentukan dari pendekatan turunan kedua — k dengan perubahan laju penurunan
        terbesar:
      </p>
      <FormulaBox
        formula="k* = argmaxₖ | WCSS(k+1) − 2·WCSS(k) + WCSS(k−1) |"
        note="Metode Elbow membutuhkan minimal tiga kandidat k agar turunan kedua dapat dihitung."
      />
      <p className="text-sm mt-4">Sedangkan metode Silhouette memilih k dengan skor tertinggi:</p>
      <FormulaBox formula="k* = argmaxₖ S(k)" />
    </HelpCard>

    <HelpCard title="7. Normalisasi Data" icon={SlidersHorizontal} variant="feature">
      <p className="text-sm mt-2">Pilihan Preprocessing pada tab Options:</p>
      <FormulaBox
        formula="z = ( x − μ ) / σ"
        note="Standarisasi Z-score, setiap variabel diubah menjadi rata-rata 0 dan simpangan baku 1."
        where={[
          { symbol: 'μ', meaning: 'rata-rata variabel' },
          { symbol: 'σ', meaning: 'simpangan baku variabel, σ = √( (1/n) Σ (x − μ)² )' },
        ]}
      />
      <FormulaBox
        formula="x′ = ( x − min ) / ( max − min )"
        note="Normalisasi Min-Max, seluruh nilai diskalakan ke rentang 0 sampai 1."
      />
    </HelpCard>

    <HelpCard title="8. Nilai Default Parameter CLARA dan CLARANS" icon={Cpu} variant="feature">
      <p className="text-sm mt-2">
        Jika kolom parameter dibiarkan kosong, sistem memakai rumus berikut:
      </p>
      <FormulaBox
        formula="sample_size = 40 + 2k"
        note="CLARA, ukuran setiap sampel acak. Nilainya wajib lebih besar dari k."
      />
      <FormulaBox
        formula="max_neighbors = max( 250 ; 0,0125 × k(n − k) )"
        note="CLARANS, banyaknya tetangga yang diperiksa per pencarian, yaitu 1,25% dari total kemungkinan swap dengan batas bawah 250."
      />
    </HelpCard>

    <HelpCard title="Kompleksitas Komputasi" icon={Cpu} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li><strong className="font-mono">PAM</strong>, BUILD O(k·n²·P), SWAP O(k(n−k)²·P) per iterasi</li>
        <li><strong className="font-mono">CLARA</strong>, O(s² · k · iterasi) per sampel, dengan s = sample_size</li>
        <li><strong className="font-mono">CLARANS</strong>, O( num_local · (n·k + max_neighbors · n) )</li>
        <li><strong className="font-mono">Silhouette</strong>, O(n²) untuk setiap nilai k yang dievaluasi</li>
      </ul>
      <p className="text-sm mt-3 text-muted-foreground">
        Karena PAM dan Silhouette tumbuh kuadratik terhadap jumlah kasus, gunakan CLARA dan
        persempit rentang k pada dataset besar.
      </p>
    </HelpCard>

    <HelpCard title="Referensi" icon={ClipboardList} variant="feature">
      <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
        <li>Kaufman, L. &amp; Rousseeuw, P. J. (1990). <em>Finding Groups in Data: An Introduction to Cluster Analysis</em>. Wiley. (PAM &amp; CLARA)</li>
        <li>Ng, R. T. &amp; Han, J. (1994). <em>Efficient and Effective Clustering Methods for Spatial Data Mining</em>. (CLARANS)</li>
        <li>Rousseeuw, P. J. (1987). <em>Silhouettes: A Graphical Aid to the Interpretation and Validation of Cluster Analysis</em>. Journal of Computational and Applied Mathematics.</li>
        <li>Schubert, E. &amp; Rousseeuw, P. J. (2019). <em>Faster k-Medoids Clustering: Improving the PAM, CLARA, and CLARANS Algorithms</em>.</li>
      </ul>
    </HelpCard>
  </div>
);

const QuickStartGuide = () => (
  <div className="mt-8 grid gap-4">
    <HelpCard title="Panduan Cepat" icon={ClipboardList} variant="feature">
      <div className="space-y-3">
        <p className="text-sm">Siap menjalankan K-Medoids Clustering?</p>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Pindahkan variabel numerik ke kotak <b>Variables</b> (klik panah atau drag &amp; drop)</li>
          <li>Isi <b>Label Cases by</b> dengan variabel identitas bila diperlukan (maksimal 1 variabel)</li>
          <li>Tentukan jumlah cluster: Manual (isi k) atau Automatic (isi rentang k dan metodenya)</li>
          <li>Pilih Distance Measure: Euclidean atau Manhattan</li>
          <li>Buka tab <b>Iterate</b> untuk memilih metode PAM / CLARA / CLARANS dan parameternya</li>
          <li>Atur tabel yang ingin ditampilkan di tab <b>Results</b> dan metrik di tab <b>Evaluation</b></li>
          <li>Centang variabel yang ingin disimpan di tab <b>Save</b> jika diperlukan</li>
          <li>Sesuaikan visualisasi, normalisasi, dan penanganan missing value di tab <b>Options</b></li>
          <li>Klik <b>OK</b> untuk menjalankan analisis</li>
        </ol>
      </div>
    </HelpCard>

    <HelpAlert variant="tip" title="Tips: Dataset Besar">
      <p className="text-sm mt-2">
        Untuk dataset dengan ribuan kasus, gunakan metode CLARA, turunkan Number of Initializations,
        persempit rentang k pada mode Automatic, dan matikan Matriks Jarak Semua Objek. Kombinasi ini
        memangkas waktu komputasi secara signifikan tanpa banyak mengorbankan kualitas cluster.
      </p>
    </HelpAlert>
  </div>
);

// ----------- Main component -------------------------------------------------

export const KMedoidsClustering: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabConfig = [
    { value: 'overview', label: 'Ringkasan', icon: HelpCircle },
    { value: 'variables', label: 'Variabel', icon: Table },
    { value: 'algorithm', label: 'Algoritma', icon: Cpu },
    { value: 'formula', label: 'Rumus', icon: Calculator },
    { value: 'results', label: 'Hasil', icon: ClipboardList },
    { value: 'evaluation', label: 'Evaluasi', icon: BarChart3 },
    { value: 'save', label: 'Simpan', icon: Save },
    { value: 'options', label: 'Opsi', icon: SlidersHorizontal },
  ];

  return (
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Panduan K-Medoids Clustering</h1>
        <p className="text-muted-foreground">
          Pelajari cara mengatur dan menginterpretasikan analisis K-Medoids Cluster di Statify.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          {tabConfig.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-1.5">
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
        <TabsContent value="variables" className="mt-6"><VariablesHelpTab /></TabsContent>
        <TabsContent value="algorithm" className="mt-6"><AlgorithmHelpTab /></TabsContent>
        <TabsContent value="formula" className="mt-6"><FormulaHelpTab /></TabsContent>
        <TabsContent value="results" className="mt-6"><ResultsHelpTab /></TabsContent>
        <TabsContent value="evaluation" className="mt-6"><EvaluationHelpTab /></TabsContent>
        <TabsContent value="save" className="mt-6"><SaveHelpTab /></TabsContent>
        <TabsContent value="options" className="mt-6"><OptionsHelpTab /></TabsContent>
      </Tabs>

      <QuickStartGuide />
    </div>
  );
};
