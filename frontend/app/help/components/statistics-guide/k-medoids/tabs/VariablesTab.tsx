import React from 'react';
import { Table, SlidersHorizontal } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const VariablesTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Variables Tab" : "Tab Variables"} icon={Table} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Move Variables into the Variables Box" : "Pindahkan Variabel ke Kotak Variables"}
            description={isEn ? "Choose the numeric variables that will form the basis of clustering, then click the arrow button or drag and drop them into the Variables box. You can select more than one variable." : "Pilih variabel numerik yang akan menjadi dasar pengelompokan, lalu klik tombol panah atau seret (drag and drop) ke kotak Variables. Anda dapat memilih lebih dari satu variabel."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Fill in Label Cases by (Optional)" : "Isi Label Cases by (Opsional)"}
            description={isEn ? "This box holds at most one variable used as a case identity label in the output, e.g. a district name, respondent code, or product name. Without a label, cases are shown as sequence numbers." : "Kotak ini menampung maksimal satu variabel yang dipakai sebagai label identitas kasus pada output, misalnya nama kabupaten, kode responden, atau nama produk. Tanpa label, kasus ditampilkan sebagai nomor urut."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Set the Number of Clusters (k)" : "Tentukan Number of Clusters (k)"}
            description={isEn ? "Choose Manual to set k yourself (at least 2), or Automatic to let the system search for the best k within a range." : "Pilih Manual untuk menetapkan sendiri nilai k (minimal 2), atau Automatic untuk membiarkan sistem mencari k terbaik dalam rentang tertentu."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Choose the Distance Measure" : "Pilih Distance Measure"}
            description={isEn ? "Euclidean distance for ordinary geometric distance, or Manhattan distance (City-block), which sums absolute differences and is more resistant to outliers." : "Euclidean distance untuk jarak geometris biasa, atau Manhattan distance (City-block) yang menjumlahkan selisih absolut dan lebih tahan terhadap outlier."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Numeric Variables Only" : "Hanya Variabel Numerik"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              The Variables box only accepts numeric variables because distance calculations need numbers. Text
              variables, or variables whose values aren't numeric, are rejected when moved in. Use the{' '}
              <strong>Label Cases by</strong> box if you want an identity variable (e.g. a region name) shown in
              the output.
            </>
          ) : (
            <>
              Kotak Variables hanya menerima variabel numerik karena perhitungan jarak membutuhkan angka.
              Variabel teks atau variabel yang seluruh isinya bukan angka akan ditolak saat dipindahkan.
              Gunakan kotak <strong>Label Cases by</strong> jika Anda ingin menampilkan variabel identitas
              (misalnya nama wilayah) pada output.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Number-of-Clusters Selection Modes" : "Mode Pemilihan Jumlah Cluster"} icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Manual"
            description={isEn ? "You determine k yourself (at least 2). Use this mode when the number of groups is already fixed by theory, policy, or research needs." : "Anda menentukan sendiri nilai k (minimal 2). Gunakan mode ini jika jumlah kelompok sudah ditentukan oleh teori, kebijakan, atau kebutuhan penelitian."}
          />
          <HelpStep
            number={2}
            title="Automatic k range"
            description={isEn ? "The system tries every k value in the range you enter (default 2 to 10), then picks the best k. The lower bound must be smaller than the upper bound." : "Sistem mencoba setiap nilai k dalam rentang yang Anda isi (default 2 sampai 10), lalu memilih k terbaik. Batas bawah harus lebih kecil dari batas atas."}
          />
          <HelpStep
            number={3}
            title="Automatic Method: Silhouette"
            description={isEn ? "The best k is the one with the highest average silhouette score. This method assesses how tightly members cluster together and how well-separated clusters are." : "k terbaik adalah k dengan rata-rata skor silhouette tertinggi. Metode ini menilai seberapa rapat anggota dalam satu cluster dan seberapa terpisah antar cluster."}
          />
          <HelpStep
            number={4}
            title="Automatic Method: Elbow"
            description={isEn ? "The best k is determined from the elbow point on the total-cost (WCSS) vs. k curve — the point where adding more clusters no longer meaningfully lowers cost." : "k terbaik ditentukan dari titik siku pada kurva total cost (WCSS) terhadap k, yaitu titik ketika penambahan cluster tidak lagi menurunkan cost secara berarti."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Tip: A Sensible k Range" : "Tips: Rentang k yang Wajar"}>
        <p className="text-sm mt-2">
          {isEn
            ? "The wider the k range in Automatic mode, the longer the process takes, since clustering is repeated for every k value. For large datasets, start with a narrow range (e.g. 2 to 6), then widen it if needed."
            : "Semakin lebar rentang k pada mode Automatic, semakin lama proses berjalan karena clustering diulang untuk setiap nilai k. Untuk dataset besar, mulailah dengan rentang sempit (misalnya 2 sampai 6), lalu perluas jika diperlukan."}
        </p>
      </HelpAlert>
    </div>
  );
};
