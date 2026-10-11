import React from 'react';
import { Save } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const SaveTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Save New Variables to Dataset" : "Save New Variables to Dataset"} icon={Save} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Cluster membership"
            description={isEn ? "Saves each case's cluster number as a new variable in the active dataset, named CLU_1, CLU_2, and so on." : "Menyimpan nomor cluster setiap kasus sebagai variabel baru di dataset aktif, dengan penamaan CLU_1, CLU_2, dan seterusnya."}
          />
          <HelpStep
            number={2}
            title="Distance from medoid"
            description={isEn ? "Saves each case's distance to its cluster's medoid as a new variable (DIS_1, DIS_2, and so on). A large value flags a case far from its group's center." : "Menyimpan jarak setiap kasus ke medoid clusternya sebagai variabel baru (DIS_1, DIS_2, dan seterusnya). Nilai besar menandakan kasus yang jauh dari pusat kelompoknya."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="info" title={isEn ? "Save vs. Results" : "Beda Save dan Results"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              The <strong>Save</strong> tab adds new columns to the active dataset so they can be used for further
              analysis (e.g. comparing clusters with Crosstabs or a mean-difference test). The{' '}
              <strong>Results</strong> tab only controls which tables appear on the output page and doesn't change
              the dataset.
            </>
          ) : (
            <>
              Tab <strong>Save</strong> menambahkan kolom baru ke dataset aktif sehingga dapat dipakai untuk
              analisis lanjutan (misalnya membandingkan cluster dengan Crosstabs atau uji beda rata-rata).
              Tab <strong>Results</strong> hanya mengatur tabel yang ditampilkan pada halaman output dan
              tidak mengubah dataset.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpAlert variant="tip" title={isEn ? "Tip: Using the Saved Variables" : "Tips: Memakai Variabel Tersimpan"}>
        <p className="text-sm mt-2">
          {isEn
            ? "The distance-to-medoid variable is useful for spotting deviating cases. Sort the dataset by DIS_1 in descending order to find cases furthest from their medoid — these are usually outliers or borderline cases between clusters."
            : "Variabel jarak ke medoid berguna untuk mendeteksi kasus yang menyimpang. Urutkan dataset berdasarkan DIS_1 secara menurun untuk menemukan kasus dengan jarak terjauh dari medoidnya, kasus tersebut biasanya merupakan outlier atau kasus di perbatasan antar cluster."}
        </p>
      </HelpAlert>
    </div>
  );
};
