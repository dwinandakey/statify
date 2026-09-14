import React from 'react';
import { BarChart3, Table, Layers, TrendingUp, Target } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OutputTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Output Order Follows the Analysis Workflow" : "Urutan Output Mengikuti Alur Analisis"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Tables in the Output Viewer follow the discriminant-analysis workflow: assumption checks, data overview, covariance structure, variable selection, discriminant functions, then classification and charts. Every table comes with a short description explaining how to read it."
            : "Tabel di Output Viewer disusun mengikuti alur kerja analisis diskriminan: pemeriksaan asumsi, gambaran data, struktur kovarians, seleksi variabel, fungsi diskriminan, lalu klasifikasi dan grafik. Setiap tabel disertai deskripsi singkat yang menjelaskan cara membacanya."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "1. Data Overview and Initial Separation" : "1. Gambaran Data dan Pemisahan Awal"} icon={BarChart3} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li><strong>Analysis Case Processing Summary</strong>: the number of valid and excluded cases along with the reasons</li>
              <li><strong>Group Statistics</strong>: mean and standard deviation of each variable per group</li>
              <li><strong>Tests of Equality of Group Means</strong>: Wilks' Lambda and F-test per variable. Sig. below 0.05 means that variable distinguishes the groups</li>
            </>
          ) : (
            <>
              <li><strong>Analysis Case Processing Summary</strong>: jumlah kasus yang valid dan yang dikeluarkan beserta alasannya</li>
              <li><strong>Group Statistics</strong>: rata-rata dan simpangan baku tiap variabel per kelompok</li>
              <li><strong>Tests of Equality of Group Means</strong>: Wilks&apos; Lambda dan uji F per variabel. Sig. kurang dari 0,05 berarti variabel tersebut membedakan kelompok</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpCard title={isEn ? "2. Covariance Structure" : "2. Struktur Kovarians"} icon={Table} variant="default">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li><strong>Pooled Within-Groups Covariance and Correlation Matrix</strong>: the joint spread used by the model</li>
              <li><strong>Covariance Matrices</strong>: covariance for each group separately</li>
              <li><strong>Log Determinants and Box's M</strong>: a large difference in log determinants signals unequal covariance across groups</li>
            </>
          ) : (
            <>
              <li><strong>Pooled Within-Groups Covariance dan Correlation Matrix</strong>: sebaran bersama yang dipakai model</li>
              <li><strong>Covariance Matrices</strong>: kovarians tiap kelompok secara terpisah</li>
              <li><strong>Log Determinants dan Box&apos;s M</strong>: selisih log determinan yang besar menandakan kovarians antar kelompok tidak sama</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpCard title={isEn ? "3. Stepwise Process (If Used)" : "3. Proses Stepwise (Jika Dipakai)"} icon={Layers} variant="default">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li><strong>Variables Entered/Removed</strong>: variables entering or leaving at each step</li>
              <li><strong>Variables in the Analysis</strong>: statistics for variables already in the model</li>
              <li><strong>Variables Not in the Analysis</strong>: next candidates with their F-to-enter values</li>
              <li><strong>Wilks' Lambda (Stepwise)</strong>: Lambda value after each step, smaller means better separation</li>
            </>
          ) : (
            <>
              <li><strong>Variables Entered/Removed</strong>: variabel yang masuk atau keluar pada tiap langkah</li>
              <li><strong>Variables in the Analysis</strong>: statistik variabel yang sudah berada di dalam model</li>
              <li><strong>Variables Not in the Analysis</strong>: kandidat berikutnya beserta nilai F-to-enter-nya</li>
              <li><strong>Wilks&apos; Lambda (Stepwise)</strong>: nilai Lambda setelah tiap langkah, makin kecil makin baik pemisahannya</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpCard title={isEn ? "4. The Discriminant Functions Formed" : "4. Fungsi Diskriminan yang Terbentuk"} icon={TrendingUp} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li><strong>Eigenvalues</strong>: each function's strength, percentage of variance explained, and canonical correlation</li>
              <li><strong>Wilks' Lambda</strong>: significance test of each function. Sig. below 0.05 means that function separates the groups significantly</li>
              <li><strong>Standardized Canonical Discriminant Function Coefficients</strong>: standardized weights, used to compare each variable's contribution</li>
              <li><strong>Structure Matrix</strong>: each variable's correlation with a function. A large absolute value means that variable best represents the function</li>
              <li><strong>Canonical Discriminant Function Coefficients</strong>: unstandardized coefficients for computing scores</li>
              <li><strong>Functions at Group Centroids</strong>: mean discriminant score for each group — its position in discriminant space</li>
            </>
          ) : (
            <>
              <li><strong>Eigenvalues</strong>: kekuatan tiap fungsi, persentase keragaman yang dijelaskan, dan korelasi kanonik</li>
              <li><strong>Wilks&apos; Lambda</strong>: uji signifikansi fungsi. Sig. kurang dari 0,05 berarti fungsi tersebut memisahkan kelompok secara nyata</li>
              <li><strong>Standardized Canonical Discriminant Function Coefficients</strong>: bobot terstandarisasi, dipakai membandingkan kontribusi antar variabel</li>
              <li><strong>Structure Matrix</strong>: korelasi tiap variabel dengan fungsi. Nilai mutlak yang besar menandakan variabel tersebut paling mewakili fungsi</li>
              <li><strong>Canonical Discriminant Function Coefficients</strong>: koefisien tak terstandarisasi untuk menghitung skor</li>
              <li><strong>Functions at Group Centroids</strong>: rata-rata skor diskriminan tiap kelompok, yaitu posisi pusat kelompok di ruang diskriminan</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Standardized Coefficients or Structure Matrix?" : "Standardized Coefficients atau Structure Matrix?"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Both explain variable importance from a different angle. <strong>Standardized coefficients</strong>{' '}
              show a variable's unique contribution once other variables are accounted for, so they can shrink when
              predictors are correlated. <strong>Structure matrix</strong> shows a variable's direct relationship
              with the function and is usually more stable, so it's often used to name each function.
            </>
          ) : (
            <>
              Keduanya menjelaskan pentingnya variabel dari sudut berbeda. <strong>Standardized coefficients</strong>{' '}
              menunjukkan kontribusi unik sebuah variabel setelah variabel lain diperhitungkan, sehingga bisa mengecil bila
              ada korelasi antar prediktor. <strong>Structure matrix</strong> menunjukkan hubungan langsung variabel dengan
              fungsi dan biasanya lebih stabil, sehingga sering dipakai untuk memberi nama pada tiap fungsi.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "5. Classification Results" : "5. Hasil Klasifikasi"} icon={Target} variant="default">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li><strong>Prior Probabilities for Groups</strong>: each group's prior probability and the case count used</li>
              <li><strong>Classification Function Coefficients</strong>: Fisher's coefficients — a case is assigned to the group with the highest score</li>
              <li><strong>Casewise Statistics</strong>: per-case results, two asterisks flag a misclassified case</li>
              <li><strong>Classification Results</strong>: the confusion matrix plus overall classification accuracy percentage</li>
            </>
          ) : (
            <>
              <li><strong>Prior Probabilities for Groups</strong>: peluang awal tiap kelompok beserta jumlah kasus yang dipakai</li>
              <li><strong>Classification Function Coefficients</strong>: koefisien Fisher, kasus masuk ke kelompok dengan skor tertinggi</li>
              <li><strong>Casewise Statistics</strong>: hasil per kasus, dua tanda bintang menandai kasus yang salah klasifikasi</li>
              <li><strong>Classification Results</strong>: matriks konfusi beserta persentase ketepatan klasifikasi keseluruhan</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpCard title={isEn ? "6. Discriminant Space Charts" : "6. Grafik Ruang Diskriminan"} icon={TrendingUp} variant="default">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li><strong>Combined-Groups Plot</strong>: tight, well-separated clusters indicate good discrimination</li>
              <li><strong>Separate-Groups Plots</strong>: one chart per group to check spread and outliers</li>
              <li><strong>Territorial Map</strong>: classification regions in function-1/function-2 space, stars mark the centroids</li>
            </>
          ) : (
            <>
              <li><strong>Combined-Groups Plot</strong>: klaster yang rapat dan saling terpisah menandakan diskriminasi yang baik</li>
              <li><strong>Separate-Groups Plots</strong>: satu grafik per kelompok untuk memeriksa sebaran dan pencilan</li>
              <li><strong>Territorial Map</strong>: wilayah klasifikasi pada ruang fungsi 1 dan fungsi 2, dengan tanda bintang sebagai centroid</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Compare the Hit Ratio Against Chance" : "Bandingkan Hit Ratio dengan Peluang Acak"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              The classification accuracy percentage should clearly exceed the chance level. For two balanced
              groups, guessing at random already yields about 50 percent, so 55 percent accuracy is not yet a good
              model. Also pay attention to the <strong>Cross-validated</strong> row, since it's a more honest number
              than the Original row.
            </>
          ) : (
            <>
              Persentase ketepatan klasifikasi sebaiknya jelas melebihi peluang menebak secara acak. Untuk dua kelompok
              seimbang, tebakan acak sudah menghasilkan sekitar 50 persen, sehingga ketepatan 55 persen belum bisa disebut
              model yang baik. Perhatikan pula baris <strong>Cross-validated</strong> karena angka tersebut lebih jujur
              daripada baris Original.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
