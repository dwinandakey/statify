import React from 'react';
import { Target, Layers, ClipboardList, TrendingUp } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ClassifyTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title="Prior Probabilities" icon={Target} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="All Groups Equal (Default)"
            description={isEn ? "Every group is assumed to have the same prior probability. Use this when the group proportions in the sample don't reflect the proportions in the population." : "Setiap kelompok dianggap punya peluang awal yang sama. Gunakan bila proporsi kelompok pada sampel tidak mencerminkan proporsi di populasi."}
          />
          <HelpStep
            number={2}
            title="Compute from Group Sizes"
            description={isEn ? "Prior probabilities are computed from each group's case proportion. Use this when the sample composition genuinely represents the population, so larger groups deserve more weight." : "Peluang awal dihitung dari proporsi jumlah kasus tiap kelompok. Gunakan bila komposisi sampel memang mewakili populasi, sehingga kelompok besar layak diberi bobot lebih besar."}
          />
        </div>
      </HelpCard>

      <HelpCard title="Use Covariance Matrix" icon={Layers} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Within-groups (Default)"
            description={isEn ? "Classification uses one pooled covariance matrix for all groups. This is the standard and most stable linear approach." : "Klasifikasi memakai satu matriks kovarians gabungan untuk semua kelompok. Inilah pendekatan linear yang standar dan paling stabil."}
          />
          <HelpStep
            number={2}
            title="Separate-groups"
            description={isEn ? "Classification uses each group's own covariance matrix. Choose this when Box's M shows the covariance matrices differ meaningfully across groups, provided each group has enough cases." : "Klasifikasi memakai matriks kovarians masing-masing kelompok. Pilih ini bila Box's M menunjukkan matriks kovarians antar kelompok berbeda nyata, dengan catatan tiap kelompok harus punya cukup banyak kasus."}
          />
        </div>
      </HelpCard>

      <HelpCard title="Classify" icon={ClipboardList} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Casewise Results"
            description={isEn ? "Shows per-case results: actual group, predicted group, membership probability, and discriminant score. Misclassified cases are flagged with two asterisks." : "Menampilkan hasil per kasus: kelompok sebenarnya, kelompok prediksi, peluang keanggotaan, dan skor diskriminan. Kasus yang salah diklasifikasikan ditandai dengan dua tanda bintang."}
          />
          <HelpStep
            number={2}
            title="Limit Cases to First"
            description={isEn ? "Limits the number of rows shown in the Casewise Statistics table. Strongly recommended for large datasets. This box is only active once Casewise Results is checked." : "Membatasi jumlah baris yang ditampilkan pada tabel Casewise Statistics. Sangat disarankan untuk dataset besar. Kotak ini hanya aktif setelah Casewise Results dicentang."}
          />
          <HelpStep
            number={3}
            title="Summary Table"
            description={isEn ? "Shows the Classification Results table — a confusion matrix of actual versus predicted groups, complete with the percentage of correctly classified cases." : "Menampilkan tabel Classification Results, yaitu matriks konfusi kelompok sebenarnya terhadap kelompok prediksi, lengkap dengan persentase kasus yang benar diklasifikasikan."}
          />
          <HelpStep
            number={4}
            title="Leave-one-out Classification"
            description={isEn ? "Cross-validation: each case is classified using a model estimated without that case. Results appear as the Cross-validated row in the Classification Results table and give a more honest picture of model performance." : "Validasi silang: setiap kasus diklasifikasikan memakai model yang diestimasi tanpa menyertakan kasus tersebut. Hasilnya muncul sebagai baris Cross-validated pada tabel Classification Results dan lebih jujur menggambarkan performa model."}
          />
        </div>
      </HelpCard>

      <HelpCard title="Plots" icon={TrendingUp} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Combined-groups"
            description={isEn ? "A single scatter plot of every case on the first two discriminant functions, colored by group, with a star marking each group's centroid." : "Satu diagram pencar berisi seluruh kasus pada dua fungsi diskriminan pertama, diwarnai menurut kelompok, lengkap dengan tanda bintang untuk centroid tiap kelompok."}
          />
          <HelpStep
            number={2}
            title="Separate-groups"
            description={isEn ? "One scatter plot per group. Useful for seeing spread and outliers within a group without other groups obscuring it." : "Satu diagram pencar untuk setiap kelompok. Berguna untuk melihat sebaran dan pencilan di dalam satu kelompok tanpa tertutup kelompok lain."}
          />
          <HelpStep
            number={3}
            title="Territorial Map"
            description={isEn ? "Divides discriminant space into classification regions. Each region is colored by the group a case would be predicted into if it fell there. Requires at least two discriminant functions." : "Membagi ruang diskriminan menjadi wilayah klasifikasi. Setiap wilayah diwarnai sesuai kelompok yang akan diprediksi bila sebuah kasus jatuh di sana. Memerlukan minimal dua fungsi diskriminan."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="info" title="Replace Missing Values with Mean">
        <p className="text-sm mt-2">
          {isEn
            ? "The option at the bottom of this tab replaces missing values on predictors with their mean during classification, so incomplete cases can still be predicted. Use with care, since mean imputation shrinks data variability."
            : "Opsi di bagian bawah tab ini mengganti nilai hilang pada variabel bebas dengan rata-ratanya saat tahap klasifikasi, sehingga kasus yang datanya tidak lengkap tetap bisa diprediksi. Gunakan dengan hati-hati karena imputasi rata-rata mengecilkan keragaman data."}
        </p>
      </HelpAlert>
    </div>
  );
};
