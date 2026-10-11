import React from 'react';
import { Settings2 } from 'lucide-react';
import { FeatureGrid, IntroSection } from '../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OptionsTab = () => {
  const isEn = useHelpLanguageStore((state) => state.language === 'en');

  return (
  <div className="space-y-6">
    <IntroSection
      title={isEn ? 'Missing Value Handling' : 'Penanganan Missing Value'}
      description={isEn ? 'Missing value handling determines how unavailable data are treated before factor analysis. The method should be selected based on the missingness pattern, available sample size, and variable characteristics.' : 'Penanganan missing value diperlukan untuk menentukan bagaimana data yang tidak tersedia diperlakukan sebelum analisis faktor dilakukan. Pemilihan metode perlu mempertimbangkan pola kehilangan data, jumlah sampel yang tersedia, dan karakteristik variabel.'}
      variant="info"
    />

    <FeatureGrid
      columns={1}
      features={[
        {
          title: 'Exclude Cases List-wise',
          icon: Settings2,
          description:
            isEn ? 'Removes every row with at least one missing value. This is suitable when relatively few rows are removed and the remaining sample size is still adequate for factor analysis.' : 'Menghapus seluruh baris data yang memiliki setidaknya satu nilai missing. Metode ini sesuai jika jumlah baris yang dihapus relatif sedikit sehingga jumlah sampel yang tersisa masih memadai untuk analisis faktor.',
        },
        {
          title: 'Exclude Cases Pair-wise',
          icon: Settings2,
          description:
            isEn ? 'Uses the available data for each pair of variables when calculating correlations. It can retain more data than list-wise deletion, but the number of observations may differ for each pair. It is suitable when the available data for each pair remain sufficient and the resulting correlation matrix is valid.' : 'Menggunakan data yang tersedia untuk setiap pasangan variabel dalam perhitungan korelasi. Metode ini dapat mempertahankan lebih banyak data dibandingkan pendekatan list-wise, tetapi jumlah observasi dapat berbeda untuk setiap pasangan variabel. Metode ini sesuai jika data yang tersedia pada setiap pasangan variabel masih mencukupi dan matriks korelasi yang dihasilkan tetap layak digunakan.',
        },
        {
          title: 'Replace with Mean',
          icon: Settings2,
          description:
            isEn ? 'Replaces missing values with the mean of the relevant variable. This may be considered when the missing proportion is relatively low and numeric data are not heavily skewed or affected by outliers. However, mean replacement can reduce data variation and affect correlations, changing the factor analysis results.' : 'Mengganti nilai missing dengan rata-rata variabel terkait. Metode ini dapat dipertimbangkan jika proporsi missing value relatif rendah dan data numerik memiliki distribusi yang tidak terlalu menceng serta tidak banyak dipengaruhi pencilan (outlier). Namun, penggantian dengan rata-rata dapat mengurangi variasi data dan memengaruhi korelasi antarvariabel sehingga hasil analisis faktor dapat berubah.',
        },
      ]}
    />

    <IntroSection
      title={isEn ? 'Note' : 'Catatan'}
      description={isEn ? 'No single method is always appropriate for every data condition. Consider the missingness pattern, remaining sample size, and data distribution before choosing a handling method.' : 'Tidak ada satu metode yang selalu paling sesuai untuk semua kondisi data. Pertimbangkan pola missing value, jumlah sampel yang tersisa, dan karakteristik distribusi data sebelum memilih metode penanganan.'}
      variant="warning"
    />
  </div>
  );
};
