import React from 'react';
import { Save, BarChart3 } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const SaveBootstrapTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Save: Writing Results to the Dataset" : "Save: Menyimpan Hasil ke Dataset"} icon={Save} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Predicted Group Membership"
            description={isEn ? "Adds a new variable holding the predicted group for every case." : "Menambahkan variabel baru berisi kelompok hasil prediksi untuk setiap kasus."}
          />
          <HelpStep
            number={2}
            title="Discriminant Scores"
            description={isEn ? "Adds a new variable holding each discriminant function's score. These scores can be reused in further analyses, e.g. as a variable in another analysis." : "Menambahkan variabel baru berisi skor tiap fungsi diskriminan. Skor ini bisa dipakai lagi untuk analisis lanjutan, misalnya sebagai variabel dalam analisis lain."}
          />
          <HelpStep
            number={3}
            title="Probabilities of Group Membership"
            description={isEn ? "Adds a new variable holding the membership probability for each group, one variable per group." : "Menambahkan variabel baru berisi peluang keanggotaan setiap kelompok, satu variabel untuk tiap kelompok."}
          />
          <HelpStep
            number={4}
            title="Export Model Information to XML File"
            description={isEn ? "Loads an XML file with model information, with a preview of its contents right inside the dialog." : "Memuat berkas XML informasi model, dengan pratinjau isinya langsung di dalam modal."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Bootstrap Is Only for the Together Method" : "Bootstrap Hanya untuk Metode Together"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              The Bootstrap tab is only available when the <strong>Enter independents together</strong> method is
              selected. Under the stepwise method it is hidden and any already-enabled bootstrap option is turned off.
            </>
          ) : (
            <>
              Tab Bootstrap hanya tersedia ketika metode <strong>Enter independents together</strong> dipilih. Pada metode
              stepwise, tab ini disembunyikan dan opsi bootstrap yang terlanjur aktif akan dimatikan.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title="Bootstrap" icon={BarChart3} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Perform Bootstrapping"
            description={isEn ? "Check to enable. All settings below it can only be filled in once this box is checked." : "Centang untuk mengaktifkan. Seluruh pengaturan di bawahnya baru bisa diisi setelah kotak ini dicentang."}
          />
          <HelpStep
            number={2}
            title="Number of Samples"
            description={isEn ? "The number of resamples drawn, default 1000. More samples give more stable results but take longer to compute." : "Jumlah sampel ulang yang dibentuk, bawaannya 1000. Semakin banyak sampel, semakin stabil hasilnya, tetapi waktu hitung juga bertambah."}
          />
          <HelpStep
            number={3}
            title="Set Seed for Mersenne Twister"
            description={isEn ? "Sets the random-number generator's starting seed so the bootstrap result can be reproduced exactly on the next run. The default seed value is 2000000." : "Menetapkan angka awal pembangkit bilangan acak agar hasil bootstrap dapat direproduksi persis pada eksekusi berikutnya. Nilai bawaan seed adalah 2000000."}
          />
          <HelpStep
            number={4}
            title="Confidence Interval: Percentile or BCa"
            description={isEn ? "Percentile takes interval bounds straight from the bootstrap distribution's percentiles. BCa corrects for bias and skewness, giving a more accurate but slower result. The default confidence level is 95 percent." : "Percentile mengambil batas interval langsung dari persentil distribusi bootstrap. BCa mengoreksi bias dan kemencengan, hasilnya lebih akurat namun perlu waktu hitung lebih lama. Tingkat kepercayaan bawaan adalah 95 persen."}
          />
          <HelpStep
            number={5}
            title="Sampling: Simple or Stratified"
            description={isEn ? "Simple resamples from all cases. Stratified resamples within the strata you define by dragging a variable into the Strata Variables box, keeping each stratum's composition intact." : "Simple mengambil sampel ulang dari seluruh kasus. Stratified mengambil sampel ulang di dalam strata yang Anda tentukan dengan menyeret variabel ke kotak Strata Variables, sehingga komposisi tiap strata tetap terjaga."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "When Is Bootstrap Useful?" : "Kapan Bootstrap Berguna?"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Use bootstrap when the sample size is limited or normality is doubtful. Results appear as the{' '}
              <strong>Bootstrap for Standardized Canonical Discriminant Function Coefficients</strong> table,
              with bias, standard error, and confidence interval for each standardized coefficient.
            </>
          ) : (
            <>
              Gunakan bootstrap ketika ukuran sampel terbatas atau asumsi normalitas diragukan. Hasilnya muncul sebagai tabel{' '}
              <strong>Bootstrap for Standardized Canonical Discriminant Function Coefficients</strong>, berisi bias, galat
              baku, dan selang kepercayaan tiap koefisien terstandarisasi.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
