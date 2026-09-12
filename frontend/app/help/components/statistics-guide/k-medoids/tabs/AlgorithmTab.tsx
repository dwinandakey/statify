import React from 'react';
import { Cpu, SlidersHorizontal } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AlgorithmTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title="K-Medoids Method" icon={Cpu} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="PAM (Partitioning Around Medoids)"
            description={isEn ? "The classic algorithm with two phases: BUILD greedily picks initial medoids, and SWAP exchanges medoids as long as it keeps lowering cost. Best quality, but heaviest. Suits data under roughly 1,000 cases." : "Algoritma klasik dengan dua fase: BUILD untuk memilih medoid awal secara greedy, dan SWAP untuk menukar medoid selama masih menurunkan cost. Kualitas terbaik, tetapi paling berat. Cocok untuk data di bawah sekitar 1.000 kasus."}
          />
          <HelpStep
            number={2}
            title="CLARA (Large Datasets)"
            description={isEn ? "Runs PAM on several random samples, then evaluates the result against the full data and keeps the best. Much faster on large data while keeping good quality." : "Menjalankan PAM pada beberapa sampel acak, lalu mengevaluasi hasilnya pada seluruh data dan memilih yang terbaik. Jauh lebih cepat pada data besar dengan kualitas yang tetap baik."}
          />
          <HelpStep
            number={3}
            title="CLARANS (Randomized Search)"
            description={isEn ? "Performs a randomized search over neighboring solutions and moves whenever it finds an improvement, repeated for several local minima. A compromise between speed and quality, suited to medium-sized and spatial data." : "Melakukan pencarian acak pada tetangga solusi dan berpindah setiap kali menemukan perbaikan, diulang untuk beberapa local minima. Kompromi antara kecepatan dan kualitas, cocok untuk data menengah dan data spasial."}
          />
        </div>
      </HelpCard>

      <HelpCard title="Iteration Parameters" icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Maximum Iterations"
            description={isEn ? "The iteration limit before the process stops (default 300). Raise it if the results report non-convergence in the Algorithm Convergence panel." : "Batas maksimum iterasi sebelum proses dihentikan (default 300). Naikkan nilainya jika hasil dilaporkan belum konvergen pada panel Konvergensi Algoritma."}
          />
          <HelpStep
            number={2}
            title="Convergence Tolerance (PAM only)"
            description={isEn ? "The cost-change threshold between iterations. The process stops once improvement falls below this threshold. The default of 0 means it stops only when there is no improvement at all." : "Ambang perubahan cost antar iterasi. Proses berhenti jika perbaikan lebih kecil dari ambang ini. Nilai default 0 berarti berhenti hanya ketika tidak ada perbaikan sama sekali."}
          />
          <HelpStep
            number={3}
            title="Seed Mode"
            description={isEn ? "Default uses the deterministic BUILD phase. Random performs a different random initialization on every run. Custom asks you to enter a seed number so results can be reproduced exactly." : "Default memakai fase BUILD yang deterministik. Random melakukan inisialisasi acak berbeda setiap kali dijalankan. Custom meminta Anda mengisi angka seed agar hasil dapat diulang persis."}
          />
          <HelpStep
            number={4}
            title="Number of Initializations (PAM only)"
            description={isEn ? "How many times the analysis repeats with different starting points, keeping the best result (default 10). A larger value gives more stable but slower results — use 1 to 3 for large datasets." : "Jumlah pengulangan analisis dengan titik awal berbeda, hasil terbaik yang dipakai (default 10). Nilai lebih besar memberi hasil lebih stabil tetapi lebih lambat, gunakan 1 sampai 3 untuk dataset besar."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "CLARA-Specific Parameters" : "Parameter Khusus CLARA"} icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Sample Size"
            description={isEn ? "The size of the random sample drawn from the dataset. Leave blank for an automatic value (40 + 2k). It must be larger than the number of clusters, otherwise the OK button stays disabled." : "Ukuran sampel acak yang diambil dari dataset. Biarkan kosong untuk perhitungan otomatis (40 + 2k). Nilainya wajib lebih besar dari jumlah cluster; jika tidak, tombol OK akan nonaktif."}
          />
          <HelpStep
            number={2}
            title="Number of Samples"
            description={isEn ? "How many samples are drawn and evaluated (default 5). More samples increase the chance of finding good medoids, but the process takes longer." : "Banyaknya sampel yang diambil dan dievaluasi (default 5). Semakin banyak sampel, semakin besar peluang menemukan medoid yang baik, tetapi prosesnya lebih lama."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "CLARANS-Specific Parameters" : "Parameter Khusus CLARANS"} icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Number of Local Minima"
            description={isEn ? "How many times the search repeats from a different random starting point (default 2). A larger value reduces the risk of getting stuck at a poor local solution." : "Berapa kali pencarian diulang dari titik awal acak yang berbeda (default 2). Nilai lebih besar mengurangi risiko terjebak pada solusi lokal yang buruk."}
          />
          <HelpStep
            number={2}
            title="Maximum Neighbors"
            description={isEn ? "The number of neighbors examined at each search step. Leave blank for an automatic value. A larger value improves quality at the cost of computation time." : "Jumlah tetangga yang diperiksa pada setiap langkah pencarian. Biarkan kosong untuk perhitungan otomatis. Nilai lebih besar meningkatkan kualitas dengan biaya waktu komputasi."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Tip: Choosing an Algorithm" : "Tips: Memilih Algoritma"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Use <strong>PAM</strong> for small data (best quality), <strong>CLARA</strong> when there are over a
              thousand cases and speed is the priority, and <strong>CLARANS</strong> for medium-sized data when you
              want a balance of both. CLARA- and CLARANS-specific parameters only appear once that method is
              selected.
            </>
          ) : (
            <>
              Gunakan <strong>PAM</strong> untuk data kecil (kualitas terbaik), <strong>CLARA</strong> jika
              jumlah kasus di atas seribu dan kecepatan menjadi prioritas, serta <strong>CLARANS</strong>{' '}
              untuk data menengah ketika Anda menginginkan keseimbangan keduanya. Parameter khusus CLARA
              dan CLARANS hanya muncul setelah metode tersebut dipilih.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
