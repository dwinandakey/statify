import React from 'react';
import { Calculator, Cpu, BarChart3, SlidersHorizontal, ClipboardList } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

/**
 * Formula box: notation shown centered in monospace, followed by a list of
 * symbol descriptions. Follows the same formula-box style as the K-Means
 * guide, but uses theme color tokens so it stays readable in dark mode.
 */
const FormulaBox: React.FC<{
  formula: string;
  note?: string;
  where?: Array<{ symbol: string; meaning: string }>;
  whereLabel: string;
}> = ({ formula, note, where, whereLabel }) => (
  <div className="bg-muted/50 border rounded-lg p-4 my-3">
    <div className="text-center text-base font-mono font-semibold overflow-x-auto">
      {formula}
    </div>
    {note && <p className="mt-3 text-sm text-muted-foreground">{note}</p>}
    {where && where.length > 0 && (
      <>
        <p className="mt-3 text-sm text-muted-foreground">{whereLabel}</p>
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

export const FormulaTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';
  const whereLabel = isEn ? "Where:" : "Keterangan:";

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Formulas Used by This Module" : "Rumus yang Dipakai Modul Ini"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Every formula below is exactly what Statify's K-Medoids engine computes, including how the optimal k is determined and the default parameter values for CLARA/CLARANS. Notation follows Kaufman & Rousseeuw (1990)."
            : "Seluruh rumus di bawah ini adalah rumus yang benar-benar dihitung oleh mesin K-Medoids Statify, termasuk cara penentuan k optimal dan nilai default parameter CLARA/CLARANS. Notasi mengikuti Kaufman & Rousseeuw (1990)."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "1. Objective Function (Total Cost)" : "1. Fungsi Objektif (Total Cost)"} icon={Calculator} variant="feature">
        <p className="text-sm mt-2">
          {isEn
            ? "K-Medoids searches for a set of medoids that minimizes the total distance from every object to its nearest medoid. This value is shown as Total Cost in the output."
            : "K-Medoids mencari himpunan medoid yang meminimalkan total jarak seluruh objek ke medoid terdekatnya. Nilai inilah yang ditampilkan sebagai Total Cost pada output."}
        </p>
        <FormulaBox
          whereLabel={whereLabel}
          formula="Cost(M) = Σᵢ₌₁ⁿ minₘ∈M d(xᵢ, m)"
          where={[
            { symbol: 'n', meaning: isEn ? "number of objects (cases) analyzed" : "banyaknya objek (kasus) yang dianalisis" },
            { symbol: 'M', meaning: isEn ? "the set of k chosen medoids" : "himpunan k medoid terpilih" },
            { symbol: 'd(·,·)', meaning: isEn ? "the chosen distance measure (Euclidean or Manhattan)" : "ukuran jarak yang dipilih (Euclidean atau Manhattan)" },
            { symbol: 'xᵢ', meaning: isEn ? "the variable-value vector for object i" : "vektor nilai variabel untuk objek ke-i" },
          ]}
          note={isEn ? "Unlike K-Means, which minimizes squared distance, K-Medoids minimizes distance itself — this is why its results are more resistant to outliers." : "Berbeda dengan K-Means yang meminimalkan kuadrat jarak, K-Medoids meminimalkan jarak itu sendiri, inilah sebab hasilnya lebih tahan terhadap outlier."}
        />
      </HelpCard>

      <HelpCard title={isEn ? "2. Distance Measures" : "2. Ukuran Jarak"} icon={Calculator} variant="feature">
        <p className="text-sm mt-2">{isEn ? "Options in Distance Measure on the Variables tab:" : "Pilihan pada Distance Measure di tab Variables:"}</p>
        <FormulaBox
          whereLabel={whereLabel}
          formula="d(x, y) = √( Σₚ₌₁ᴾ (xₚ − yₚ)² )"
          note={isEn ? "Euclidean distance, ordinary straight-line distance. Sensitive to extreme values because differences are squared." : "Euclidean distance, jarak geometris (garis lurus). Peka terhadap nilai ekstrem karena selisih dikuadratkan."}
        />
        <FormulaBox
          whereLabel={whereLabel}
          formula="d(x, y) = Σₚ₌₁ᴾ |xₚ − yₚ|"
          note={isEn ? "Manhattan distance (City-block), sums absolute differences per variable, making it more robust to outliers." : "Manhattan distance (City-block), menjumlahkan selisih absolut per variabel, sehingga lebih robust terhadap outlier."}
          where={[{ symbol: 'P', meaning: isEn ? "number of variables selected for clustering" : "banyaknya variabel yang dipilih untuk clustering" }]}
        />
      </HelpCard>

      <HelpCard title={isEn ? "3. Object Assignment and Medoid Definition" : "3. Penugasan Objek dan Definisi Medoid"} icon={Calculator} variant="feature">
        <p className="text-sm mt-2">{isEn ? "Every object joins the cluster with the nearest medoid:" : "Setiap objek masuk ke cluster dengan medoid terdekat:"}</p>
        <FormulaBox
          whereLabel={whereLabel}
          formula="c(i) = argmin ⱼ₌₁..ₖ d(xᵢ, mⱼ)"
          note={isEn ? "c(i) is the cluster number for object i, and mⱼ is the medoid of cluster j." : "c(i) adalah nomor cluster untuk objek ke-i, dan mⱼ adalah medoid cluster ke-j."}
        />
        <p className="text-sm mt-4">
          {isEn
            ? "A cluster's medoid is the member of that cluster whose total distance to all other members is smallest:"
            : "Medoid sebuah cluster adalah anggota cluster itu sendiri yang total jaraknya ke seluruh anggota lain paling kecil:"}
        </p>
        <FormulaBox
          whereLabel={whereLabel}
          formula="mₖ = argmin ₓⱼ∈Cₖ  Σ ₓᵢ∈Cₖ d(xᵢ, xⱼ)"
          where={[
            { symbol: 'Cₖ', meaning: isEn ? "the set of objects belonging to cluster k" : "himpunan objek anggota cluster ke-k" },
            { symbol: 'mₖ', meaning: isEn ? "the medoid of cluster k, always a real object from the data" : "medoid cluster ke-k, selalu berupa objek nyata dari data" },
          ]}
        />
      </HelpCard>

      <HelpCard title={isEn ? "4. The PAM Algorithm: BUILD and SWAP Phases" : "4. Algoritma PAM: Fase BUILD dan SWAP"} icon={Cpu} variant="feature">
        <p className="text-sm mt-2">
          {isEn ? (
            <>The <strong>BUILD phase</strong> greedily picks initial medoids one at a time, choosing the object with the largest total gain:</>
          ) : (
            <><strong>Fase BUILD</strong> memilih medoid awal satu per satu secara greedy, objek dengan total perbaikan (gain) terbesar yang dipilih:</>
          )}
        </p>
        <FormulaBox
          whereLabel={whereLabel}
          formula="gₕ = Σⱼ max( Dⱼ − d(j, h), 0 )"
          where={[
            { symbol: 'h', meaning: isEn ? "the candidate object being considered as the next medoid" : "kandidat objek yang akan dijadikan medoid berikutnya" },
            { symbol: 'Dⱼ', meaning: isEn ? "the distance from object j to the nearest already-chosen medoid" : "jarak objek j ke medoid terdekat yang sudah terpilih" },
          ]}
        />
        <p className="text-sm mt-4">
          {isEn ? (
            <>The <strong>SWAP phase</strong> tries exchanging medoid i with a non-medoid object h, then computes the change in total cost:</>
          ) : (
            <><strong>Fase SWAP</strong> mencoba menukar medoid i dengan objek non-medoid h, lalu menghitung perubahan total cost:</>
          )}
        </p>
        <FormulaBox
          whereLabel={whereLabel}
          formula="Tᵢₕ = Σⱼ Cⱼᵢₕ"
          note={isEn ? "Cⱼᵢₕ = min(d(j,h), Eⱼ) − Dⱼ when object j's nearest medoid is i (the medoid being dropped); otherwise Cⱼᵢₕ = min(d(j,h), Dⱼ) − Dⱼ." : "Cⱼᵢₕ = min( d(j,h), Eⱼ ) − Dⱼ  bila medoid terdekat objek j adalah i (medoid yang dicopot); selain itu Cⱼᵢₕ = min( d(j,h), Dⱼ ) − Dⱼ."}
          where={[
            { symbol: 'Dⱼ', meaning: isEn ? "the distance from object j to its nearest medoid" : "jarak objek j ke medoid terdekat" },
            { symbol: 'Eⱼ', meaning: isEn ? "the distance from object j to its second-nearest medoid" : "jarak objek j ke medoid terdekat kedua" },
          ]}
        />
        <HelpAlert variant="tip" title={isEn ? "When Is a Swap Accepted?" : "Kapan Swap Diterima?"}>
          <p className="text-sm mt-2">
            {isEn ? (
              <>
                A swap is only made when <strong>Tᵢₕ &lt; 0</strong>, i.e. when total cost genuinely drops. The
                process stops once no swap lowers cost any further (or the decrease is smaller than the Convergence
                Tolerance), or once Maximum Iterations is reached.
              </>
            ) : (
              <>
                Pertukaran hanya dilakukan jika <strong>Tᵢₕ &lt; 0</strong>, yaitu ketika total cost benar-benar
                turun. Proses berhenti saat tidak ada lagi swap yang menurunkan cost (atau penurunannya
                lebih kecil dari Convergence Tolerance), atau ketika Maximum Iterations tercapai.
              </>
            )}
          </p>
        </HelpAlert>
      </HelpCard>

      <HelpCard title="5. Silhouette" icon={BarChart3} variant="feature">
        <p className="text-sm mt-2">
          {isEn
            ? "For every object i, its cohesion within its own cluster and its distance to the nearest neighboring cluster are computed:"
            : "Untuk setiap objek i dihitung kerapatan di dalam clusternya dan jarak ke cluster tetangga terdekat:"}
        </p>
        <FormulaBox
          whereLabel={whereLabel}
          formula="a(i) = ( 1 / (|Cᵢ| − 1) ) · Σ ⱼ∈Cᵢ, ⱼ≠ᵢ d(i, j)"
          note={isEn ? "Average distance from object i to fellow members of its cluster (cohesion)." : "Rata-rata jarak objek i ke sesama anggota clusternya (kohesi)."}
        />
        <FormulaBox
          whereLabel={whereLabel}
          formula="b(i) = min C≠Cᵢ ( 1 / |C| ) · Σ ⱼ∈C d(i, j)"
          note={isEn ? "The smallest average distance from object i to all members of another cluster (separation)." : "Rata-rata jarak terkecil dari objek i ke seluruh anggota cluster lain (separasi)."}
        />
        <FormulaBox
          whereLabel={whereLabel}
          formula="s(i) = ( b(i) − a(i) ) / max( a(i), b(i) )"
          note={isEn ? "s(i) ranges from −1 to +1. An object in a singleton cluster is given a value of 0 because a(i) is undefined." : "Nilai s(i) berkisar −1 sampai +1. Objek pada cluster beranggota tunggal diberi nilai 0 karena a(i) tidak terdefinisi."}
        />
        <FormulaBox
          whereLabel={whereLabel}
          formula="S = ( 1 / n ) · Σᵢ₌₁ⁿ s(i)"
          note={isEn ? "The average of every s(i) — this is the number shown in Overall Quality Assessment and used to pick k under the Silhouette method." : "Rata-rata seluruh s(i), inilah angka yang tampil pada Overall Quality Assessment dan yang dipakai untuk memilih k pada metode Silhouette."}
        />
      </HelpCard>

      <HelpCard title={isEn ? "6. Elbow (WCSS) and Optimal K Selection" : "6. Elbow (WCSS) dan Pemilihan k Optimal"} icon={BarChart3} variant="feature">
        <p className="text-sm mt-2">{isEn ? "Total within-cluster deviation for each candidate k:" : "Total simpangan dalam cluster untuk setiap kandidat k:"}</p>
        <FormulaBox
          whereLabel={whereLabel}
          formula="WCSS(k) = Σᵢ₌₁ⁿ d( xᵢ, m_c(i) )²"
          note={isEn ? "For Euclidean distance, squared distance is used; for Manhattan distance, the plain distance is used (not squared)." : "Untuk jarak Euclidean dipakai kuadrat jarak; untuk jarak Manhattan dipakai jarak apa adanya (tanpa dikuadratkan)."}
        />
        <p className="text-sm mt-4">
          {isEn
            ? "The elbow point is found from a second-derivative approximation — the k with the largest change in decline rate:"
            : "Titik siku ditentukan dari pendekatan turunan kedua — k dengan perubahan laju penurunan terbesar:"}
        </p>
        <FormulaBox
          whereLabel={whereLabel}
          formula="k* = argmaxₖ | WCSS(k+1) − 2·WCSS(k) + WCSS(k−1) |"
          note={isEn ? "The Elbow method needs at least three candidate k values so the second derivative can be computed." : "Metode Elbow membutuhkan minimal tiga kandidat k agar turunan kedua dapat dihitung."}
        />
        <p className="text-sm mt-4">{isEn ? "The Silhouette method instead picks the k with the highest score:" : "Sedangkan metode Silhouette memilih k dengan skor tertinggi:"}</p>
        <FormulaBox whereLabel={whereLabel} formula="k* = argmaxₖ S(k)" />
      </HelpCard>

      <HelpCard title={isEn ? "7. Data Normalization" : "7. Normalisasi Data"} icon={SlidersHorizontal} variant="feature">
        <p className="text-sm mt-2">{isEn ? "Preprocessing choices on the Options tab:" : "Pilihan Preprocessing pada tab Options:"}</p>
        <FormulaBox
          whereLabel={whereLabel}
          formula="z = ( x − μ ) / σ"
          note={isEn ? "Z-score standardization: every variable is transformed to mean 0 and standard deviation 1." : "Standarisasi Z-score, setiap variabel diubah menjadi rata-rata 0 dan simpangan baku 1."}
          where={[
            { symbol: 'μ', meaning: isEn ? "the variable's mean" : "rata-rata variabel" },
            { symbol: 'σ', meaning: isEn ? "the variable's standard deviation, σ = √((1/n) Σ (x − μ)²)" : "simpangan baku variabel, σ = √( (1/n) Σ (x − μ)² )" },
          ]}
        />
        <FormulaBox
          whereLabel={whereLabel}
          formula="x′ = ( x − min ) / ( max − min )"
          note={isEn ? "Min-Max normalization: every value is scaled to the 0–1 range." : "Normalisasi Min-Max, seluruh nilai diskalakan ke rentang 0 sampai 1."}
        />
      </HelpCard>

      <HelpCard title={isEn ? "8. CLARA and CLARANS Default Parameter Values" : "8. Nilai Default Parameter CLARA dan CLARANS"} icon={Cpu} variant="feature">
        <p className="text-sm mt-2">{isEn ? "If a parameter field is left blank, the system uses the following formulas:" : "Jika kolom parameter dibiarkan kosong, sistem memakai rumus berikut:"}</p>
        <FormulaBox
          whereLabel={whereLabel}
          formula="sample_size = 40 + 2k"
          note={isEn ? "CLARA, the size of each random sample. It must be larger than k." : "CLARA, ukuran setiap sampel acak. Nilainya wajib lebih besar dari k."}
        />
        <FormulaBox
          whereLabel={whereLabel}
          formula="max_neighbors = max( 250 ; 0.0125 × k(n − k) )"
          note={isEn ? "CLARANS, the number of neighbors checked per search — 1.25% of every possible swap, with a floor of 250." : "CLARANS, banyaknya tetangga yang diperiksa per pencarian, yaitu 1,25% dari total kemungkinan swap dengan batas bawah 250."}
        />
      </HelpCard>

      <HelpCard title={isEn ? "Computational Complexity" : "Kompleksitas Komputasi"} icon={Cpu} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          <li><strong className="font-mono">PAM</strong>, {isEn ? "BUILD" : "BUILD"} O(k·n²·P), {isEn ? "SWAP" : "SWAP"} O(k(n−k)²·P) {isEn ? "per iteration" : "per iterasi"}</li>
          <li><strong className="font-mono">CLARA</strong>, O(s² · k · {isEn ? "iterations" : "iterasi"}) {isEn ? "per sample, where s = sample_size" : "per sampel, dengan s = sample_size"}</li>
          <li><strong className="font-mono">CLARANS</strong>, O( num_local · (n·k + max_neighbors · n) )</li>
          <li><strong className="font-mono">Silhouette</strong>, O(n²) {isEn ? "for every k value evaluated" : "untuk setiap nilai k yang dievaluasi"}</li>
        </ul>
        <p className="text-sm mt-3 text-muted-foreground">
          {isEn
            ? "Since PAM and Silhouette grow quadratically with the number of cases, use CLARA and narrow the k range on large datasets."
            : "Karena PAM dan Silhouette tumbuh kuadratik terhadap jumlah kasus, gunakan CLARA dan persempit rentang k pada dataset besar."}
        </p>
      </HelpCard>

      <HelpCard title={isEn ? "References" : "Referensi"} icon={ClipboardList} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          <li>Kaufman, L. &amp; Rousseeuw, P. J. (1990). <em>Finding Groups in Data: An Introduction to Cluster Analysis</em>. Wiley. (PAM &amp; CLARA)</li>
          <li>Ng, R. T. &amp; Han, J. (1994). <em>Efficient and Effective Clustering Methods for Spatial Data Mining</em>. (CLARANS)</li>
          <li>Rousseeuw, P. J. (1987). <em>Silhouettes: A Graphical Aid to the Interpretation and Validation of Cluster Analysis</em>. Journal of Computational and Applied Mathematics.</li>
          <li>Schubert, E. &amp; Rousseeuw, P. J. (2019). <em>Faster k-Medoids Clustering: Improving the PAM, CLARA, and CLARANS Algorithms</em>.</li>
        </ul>
      </HelpCard>
    </div>
  );
};
