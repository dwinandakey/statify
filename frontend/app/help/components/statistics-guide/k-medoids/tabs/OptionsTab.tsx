import React from 'react';
import { BarChart3, Table, SlidersHorizontal } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OptionsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title="Visualization" icon={BarChart3} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="PCA Projection"
            description={isEn ? "Projects multivariate data onto two principal components so the cluster spread can be seen on a single 2-D plane." : "Memproyeksikan data multivariat ke dua komponen utama sehingga sebaran cluster dapat dilihat dalam satu bidang dua dimensi."}
          />
          <HelpStep
            number={2}
            title="Cluster Scatter Plot"
            description={isEn ? "A scatter plot between original variables colored by cluster, useful for seeing which variable best separates the groups." : "Diagram pencar antar variabel asli dengan pewarnaan menurut cluster, berguna untuk melihat variabel mana yang paling memisahkan kelompok."}
          />
          <HelpStep
            number={3}
            title="Cluster Size Distribution"
            description={isEn ? "A chart comparing membership counts across clusters, making it easy to spot clusters that are too small or dominant." : "Grafik perbandingan jumlah anggota tiap cluster, memudahkan mengenali cluster yang terlalu kecil atau yang mendominasi."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Distance Matrix" : "Matriks Jarak"} icon={Table} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Distance Matrix Between Medoids" : "Matriks Jarak Antar Medoid"}
            description={isEn ? "Shows distances between medoids. A large distance means clusters are far apart, while a small one shows two similar clusters that could potentially be merged." : "Menampilkan jarak antar medoid. Jarak yang besar menandakan cluster saling terpisah jauh, sedangkan jarak kecil menunjukkan dua cluster yang mirip dan berpotensi digabung."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Distance Matrix Between All Objects" : "Matriks Jarak Semua Objek"}
            description={isEn ? "The full distance matrix between every object. The table is paginated to stay light, but it's still best avoided on very large datasets." : "Matriks jarak lengkap antar seluruh objek. Tabelnya dipaginasi agar tetap ringan, tetapi sebaiknya tetap dihindari pada dataset yang sangat besar."}
          />
        </div>
      </HelpCard>

      <HelpCard title="Preprocessing" icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "No Normalization" : "Tanpa Normalisasi"}
            description={isEn ? "Data is used as-is. The default choice, suitable when all variables already share comparable units and ranges." : "Data dipakai apa adanya. Pilihan default, cocok jika seluruh variabel sudah memakai satuan dan rentang yang sebanding."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Data Standardization (Z-score)" : "Standarisasi Data (Z-score)"}
            description={isEn ? "Transforms every variable to mean 0 and standard deviation 1, so variables with large units don't dominate the distance calculation." : "Mengubah setiap variabel menjadi rata-rata 0 dan simpangan baku 1, sehingga variabel dengan satuan besar tidak mendominasi perhitungan jarak."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Min-Max Normalization (0-1)" : "Normalisasi Min-Max (0-1)"}
            description={isEn ? "Scales every variable to the 0–1 range. Suitable when you want a uniform range boundary, but it's more sensitive to extreme values than Z-score." : "Menskalakan setiap variabel ke rentang 0 sampai 1. Cocok bila Anda ingin batas rentang yang seragam, tetapi lebih peka terhadap nilai ekstrem dibanding Z-score."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Important: Variable Scale" : "Penting: Skala Variabel"}>
        <p className="text-sm mt-2">
          {isEn
            ? "K-Medoids works on distance, so a variable with a large range (e.g. income in rupiah) will dominate a variable with a small range (e.g. a percentage). If your variables' units differ widely, choose Z-score Standardization or Min-Max Normalization before running the analysis."
            : "K-Medoids bekerja atas dasar jarak, sehingga variabel dengan rentang nilai besar (misalnya pendapatan dalam rupiah) akan mendominasi variabel berrentang kecil (misalnya persentase). Jika satuan antar variabel berbeda jauh, pilih Standarisasi Z-score atau Normalisasi Min-Max sebelum menjalankan analisis."}
        </p>
      </HelpAlert>

      <HelpCard title="Missing Values" icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Exclude Cases Listwise"
            description={isEn ? "Rows with a missing value on any variable are dropped from the analysis. The default and safest choice for interpretation." : "Baris yang memiliki missing value pada variabel mana pun dihapus dari analisis. Pilihan default dan paling aman untuk interpretasi."}
          />
          <HelpStep
            number={2}
            title="Exclude Cases Pairwise"
            description={isEn ? "Rows are kept as long as at least one valid value remains; empty cells are filled with that variable's mean so the distance matrix stays numeric." : "Baris dipertahankan selama masih ada minimal satu nilai valid; sel yang kosong diisi rata-rata variabelnya agar matriks jarak tetap numerik."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="info" title={isEn ? "Missing Value Notice" : "Notice Missing Value"}>
        <p className="text-sm mt-2">
          {isEn
            ? "If the selected variables contain missing values, a notice appears right above the Missing Values group, showing the count and percentage of affected rows along with the biggest contributing variable. The full breakdown is still available in the Case Processing Summary table on the output page."
            : "Jika variabel yang dipilih mengandung missing value, sebuah notice akan muncul tepat di atas grup Missing Values, memuat jumlah dan persentase baris yang terpengaruh beserta variabel penyumbang terbesar. Rekap lengkapnya tetap tersedia pada tabel Case Processing Summary di halaman output."}
        </p>
      </HelpAlert>
    </div>
  );
};
