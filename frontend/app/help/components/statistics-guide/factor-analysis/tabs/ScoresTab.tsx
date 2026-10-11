import React from 'react';
import { BadgeCheck, FileOutput, Sigma } from 'lucide-react';
import { FeatureGrid, IntroSection, StepList } from '../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ScoresTab = () => {
  const isEn = useHelpLanguageStore((state) => state.language === 'en');

  return (
  <div className="space-y-6">
    <IntroSection
      title={isEn ? 'Factor Scores' : 'Factor Scores'}
      description={isEn ? 'Factor scores save factor values to the dataset so the results can be used in further analyses.' : 'Factor scores dipakai untuk menyimpan nilai faktor ke dataset sehingga hasil analisis faktor dapat digunakan lagi di analisis lanjutan.'}
      variant="success"
    />

    <FeatureGrid
      features={[
        {
          title: isEn ? 'Scoring Methods' : 'Metode Penyimpanan',
          icon: FileOutput,
          items: [
            isEn ? 'Regression: commonly used for factor score estimation' : 'Regression: umum dipakai untuk estimasi skor faktor',
            isEn ? 'Bartlett: emphasizes consistent estimation' : 'Bartlett: lebih menekankan estimasi yang konsisten',
            isEn ? 'Anderson: an alternative for specific needs' : 'Anderson: alternatif untuk kebutuhan tertentu',
          ],
        },
        {
          title: isEn ? 'When to Save Scores' : 'Kapan Perlu Disimpan',
          icon: BadgeCheck,
          items: [
            isEn ? 'When factor scores will be used as new variables' : 'Saat skor faktor akan dipakai sebagai variabel baru',
            isEn ? 'When you want to perform further regression, clustering, or classification' : 'Saat Anda ingin regresi, clustering, atau klasifikasi lanjutan',
            isEn ? 'When creating a concise index from many indicators' : 'Saat ingin membuat indeks ringkas dari banyak indikator',
          ],
        },
      ]}
    />

    <StepList
      title={isEn ? 'Steps for Saving Factor Scores' : 'Langkah Menyimpan Skor Faktor'}
      icon={Sigma}
      steps={[
        {
          number: 1,
          title: isEn ? 'Enable score saving' : 'Aktifkan penyimpanan skor',
          description: isEn ? 'Select Save as variables so factor score results can be added to the dataset.' : 'Centang opsi Save as variables agar hasil skor faktor dapat ditambahkan ke dataset.',
        },
        {
          number: 2,
          title: isEn ? 'Choose a scoring method' : 'Pilih metode skor',
          description: isEn ? 'Use Regression, Bartlett, or Anderson according to the analysis needs and model consistency.' : 'Gunakan Regression, Bartlett, atau Anderson sesuai kebutuhan analisis dan konsistensi model.',
        },
        {
          number: 3,
          title: isEn ? 'Reuse the results' : 'Gunakan hasilnya kembali',
          description: isEn ? 'Once saved, factor scores can be used as input for subsequent analyses or reporting.' : 'Setelah tersimpan, factor scores bisa dipakai sebagai input analisis berikutnya atau untuk pelaporan.',
        },
      ]}
    />
  </div>
  );
};
