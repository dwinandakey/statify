import React from 'react';
import { BarChart3, Layers, Table } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const StatisticsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "The Statistics Tab Controls Extra Tables" : "Tab Statistics Menentukan Tabel Tambahan"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Every option on this tab is optional. Checking one adds a specific table to the Output Viewer without changing the model that gets estimated."
            : "Semua opsi di tab ini bersifat opsional. Mencentangnya akan menambahkan tabel tertentu ke Output Viewer, tanpa mengubah model yang diestimasi."}
        </p>
      </HelpAlert>

      <HelpCard title="Descriptives" icon={BarChart3} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Means"
            description={isEn ? "Shows the Group Statistics table: the mean and standard deviation of each predictor per group along with case counts. Useful for seeing the direction of group differences." : "Menampilkan tabel Group Statistics, berisi rata-rata dan simpangan baku tiap variabel bebas pada masing-masing kelompok beserta jumlah kasusnya. Berguna untuk melihat arah perbedaan antar kelompok."}
          />
          <HelpStep
            number={2}
            title="Univariate ANOVAs"
            description={isEn ? "Shows the Tests of Equality of Group Means table. Each variable is tested individually for whether its mean differs across groups. Sig. below 0.05 indicates the variable separates groups well." : "Menampilkan tabel Tests of Equality of Group Means. Setiap variabel diuji satu per satu, apakah rata-ratanya berbeda antar kelompok. Sig. kurang dari 0,05 menandakan variabel tersebut memisahkan kelompok dengan baik."}
          />
          <HelpStep
            number={3}
            title="Box's M"
            description={isEn ? "Shows the Log Determinants and Box's M Test Results tables, testing the equality of covariance matrices across groups — the key assumption behind LDA." : "Menampilkan tabel Log Determinants dan Box's M Test Results untuk menguji kesamaan matriks kovarians antar kelompok, yaitu asumsi utama LDA."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Function Coefficients" : "Function Coefficients"} icon={Layers} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Fisher's"
            description={isEn ? "Shows the Classification Function Coefficients — one coefficient set per group. A case is assigned to the group that gives the highest score." : "Menampilkan Classification Function Coefficients, yaitu satu set koefisien untuk tiap kelompok. Sebuah kasus dimasukkan ke kelompok yang memberi skor tertinggi."}
          />
          <HelpStep
            number={2}
            title="Unstandardized"
            description={isEn ? "Shows the Canonical Discriminant Function Coefficients — coefficients in the variables' original units plus the constant, used to compute each case's discriminant score." : "Menampilkan Canonical Discriminant Function Coefficients, yaitu koefisien dalam satuan asli variabel beserta konstantanya, dipakai untuk menghitung skor diskriminan tiap kasus."}
          />
        </div>
      </HelpCard>

      <HelpCard title="Matrices" icon={Table} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Within-groups Correlation"
            description={isEn ? "The correlation matrix between predictors, pooled across all groups. Very high correlations are an early sign of multicollinearity." : "Matriks korelasi antar variabel bebas yang digabungkan dari seluruh kelompok. Korelasi yang sangat tinggi menjadi indikasi awal multikolinearitas."}
          />
          <HelpStep
            number={2}
            title="Within-groups Covariance"
            description={isEn ? "The pooled within-group covariance matrix — the joint spread used to estimate the discriminant function." : "Matriks kovarians gabungan dalam kelompok, yaitu sebaran bersama yang dipakai untuk mengestimasi fungsi diskriminan."}
          />
          <HelpStep
            number={3}
            title="Separate-groups Covariance"
            description={isEn ? "Covariance matrices computed separately for each group. Comparing these matrices is the basis of the Box's M test." : "Matriks kovarians yang dihitung terpisah untuk setiap kelompok. Perbandingan antar matriks ini menjadi dasar uji Box's M."}
          />
          <HelpStep
            number={4}
            title="Total Covariance"
            description={isEn ? "The covariance matrix computed across all cases without separating by group." : "Matriks kovarians yang dihitung dari seluruh kasus tanpa memisahkan kelompok."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Check at Least Means and Univariate ANOVAs" : "Centang Minimal Means dan Univariate ANOVAs"}>
        <p className="text-sm mt-2">
          {isEn
            ? "For research reports, these two options are usually essential: they profile each group and show which variables are individually significant before entering the combined model."
            : "Untuk laporan penelitian, dua opsi ini biasanya wajib ada karena menjelaskan profil tiap kelompok sekaligus menunjukkan variabel mana yang secara individual signifikan sebelum masuk ke model gabungan."}
        </p>
      </HelpAlert>
    </div>
  );
};
