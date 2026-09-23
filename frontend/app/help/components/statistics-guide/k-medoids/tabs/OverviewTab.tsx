import React from 'react';
import { HelpCircle, BarChart3, ClipboardList } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "What is K-Medoids Clustering?" : "Apa itu K-Medoids Clustering?"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              K-Medoids is a clustering method that partitions objects into k groups, where the center of each group
              is a <strong>medoid</strong> — an actual object from the data with the smallest total distance to every
              other member of its group. Unlike K-Means, which uses a mean (centroid) as the center, a medoid is
              always a real case, making the result more resistant to outliers and easier to interpret.
            </>
          ) : (
            <>
              K-Medoids adalah metode pengelompokan (clustering) yang membagi objek ke dalam k kelompok,
              di mana pusat setiap kelompok adalah <strong>medoid</strong>, yaitu salah satu objek nyata
              dari data yang memiliki total jarak terkecil ke seluruh anggota kelompoknya. Berbeda dengan
              K-Means yang memakai rata-rata (centroid) sebagai pusat, medoid selalu berupa kasus asli
              sehingga hasilnya lebih tahan terhadap outlier dan lebih mudah diinterpretasikan.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "When to Use K-Medoids?" : "Kapan Menggunakan K-Medoids?"} icon={HelpCircle} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>Data contains outliers or extreme values that could pull K-Means centroids off-center</li>
              <li>You want cluster centers to be actual objects (representative cases), not averaged values</li>
              <li>You want to use Manhattan (city-block) distance, which is more robust than Euclidean</li>
              <li>Segmenting (regions, respondents, products) with no pre-existing group labels</li>
              <li>You want to find the optimal number of clusters automatically via Silhouette or Elbow</li>
            </>
          ) : (
            <>
              <li>Data mengandung outlier atau nilai ekstrem yang dapat menarik centroid K-Means</li>
              <li>Anda ingin pusat cluster berupa objek nyata (kasus perwakilan), bukan nilai rata-rata</li>
              <li>Ingin menggunakan jarak Manhattan (city-block) yang lebih robust dibanding Euclidean</li>
              <li>Melakukan segmentasi (wilayah, responden, produk) tanpa label kelompok sebelumnya</li>
              <li>Ingin mencari jumlah cluster optimal secara otomatis lewat Silhouette atau Elbow</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpCard title={isEn ? "K-Medoids vs. K-Means" : "Perbedaan K-Medoids dan K-Means"} icon={BarChart3} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Cluster Center" : "Pusat Cluster"}
            description={isEn ? "K-Means uses a centroid (a mean, possibly a point that doesn't exist in the data). K-Medoids uses a medoid — one of the dataset's actual cases." : "K-Means memakai centroid (rata-rata, bisa berupa titik yang tidak ada di data). K-Medoids memakai medoid, yaitu salah satu kasus asli dari dataset."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Outlier Resistance" : "Ketahanan terhadap Outlier"}
            description={isEn ? "K-Medoids minimizes total distance (cost), not squared distance, so outliers have far less influence than in K-Means." : "K-Medoids meminimalkan total jarak (cost), bukan kuadrat jarak, sehingga pengaruh outlier jauh lebih kecil dibanding K-Means."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Computation Speed" : "Kecepatan Komputasi"}
            description={isEn ? "K-Medoids (especially PAM) is heavier because it must compute distances between objects. For large data, the CLARA and CLARANS algorithms are available." : "K-Medoids (khususnya PAM) lebih berat karena perlu menghitung jarak antar objek. Untuk data besar tersedia algoritma CLARA dan CLARANS."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari"} icon={ClipboardList} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>Choosing numeric variables and setting the number of clusters (manual or automatic)</li>
              <li>Choosing a distance measure: Euclidean or Manhattan</li>
              <li>Choosing the PAM, CLARA, or CLARANS algorithm and its parameters</li>
              <li>Configuring the tables and charts shown in the output</li>
              <li>Assessing cluster quality with Silhouette and Elbow</li>
              <li>Saving cluster membership and distance-to-medoid as new variables</li>
              <li>Handling missing values and normalizing data before analysis</li>
            </>
          ) : (
            <>
              <li>Memilih variabel numerik dan menentukan jumlah cluster (manual atau otomatis)</li>
              <li>Memilih ukuran jarak: Euclidean atau Manhattan</li>
              <li>Memilih algoritma PAM, CLARA, atau CLARANS beserta parameternya</li>
              <li>Mengatur tabel dan grafik yang muncul pada output</li>
              <li>Menilai kualitas cluster dengan Silhouette dan Elbow</li>
              <li>Menyimpan keanggotaan cluster dan jarak ke medoid sebagai variabel baru</li>
              <li>Menangani missing value dan normalisasi data sebelum analisis</li>
            </>
          )}
        </ul>
      </HelpCard>
    </div>
  );
};
