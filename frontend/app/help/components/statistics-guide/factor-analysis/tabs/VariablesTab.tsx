import React from 'react';
import { Database, Lightbulb, TriangleAlert } from 'lucide-react';
import { FeatureGrid, IntroSection, StepList } from '../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const VariablesTab = () => {
  const isEn = useHelpLanguageStore((state) => state.language === 'en');

  return (
  <div className="space-y-6">
    <IntroSection
      title={isEn ? 'Variable Selection' : 'Pemilihan Variabel'}
      description={isEn ? 'Factor analysis works best with correlated numeric variables. Categorical variables should be processed first or excluded from the factor model.' : 'Analisis faktor bekerja paling baik pada variabel numerik yang berkorelasi. Variabel kategorikal perlu diolah terlebih dahulu atau dipisahkan dari model faktor.'}
      variant="warning"
    />

    <FeatureGrid
      features={[
        {
          title: isEn ? 'Recommended Variables' : 'Variabel yang Disarankan',
          icon: Database,
          items: [
            isEn ? 'Likert scales or numeric questionnaire items' : 'Skala Likert atau item kuesioner numerik',
            isEn ? 'Measurement variables representing similar constructs' : 'Variabel pengukuran yang merepresentasikan konstruk serupa',
            isEn ? 'Variables with adequate pairwise correlations' : 'Variabel dengan korelasi antarpasangan yang memadai',
          ],
        },
        {
          title: isEn ? 'Variables to Avoid' : 'Variabel yang Sebaiknya Dihindari',
          icon: TriangleAlert,
          items: [
            isEn ? 'Nominal variables without appropriate coding' : 'Variabel nominal tanpa pengkodean yang tepat',
            isEn ? 'Variables with extreme amounts of missing data' : 'Variabel dengan missing value ekstrem',
            isEn ? 'Variables with very low correlations with the others' : 'Variabel dengan korelasi sangat rendah terhadap yang lain',
          ],
        },
      ]}
    />

    <StepList
      title={isEn ? 'Steps for Selecting Variables' : 'Langkah Memilih Variabel'}
      icon={Lightbulb}
      steps={[
        {
          number: 1,
          title: isEn ? 'Select core variables' : 'Pilih variabel inti',
          description: isEn ? 'Include all indicators that theoretically form the same or closely related construct.' : 'Masukkan semua indikator yang secara teoritis membentuk konstruk yang sama atau berdekatan.',
        },
        {
          number: 2,
          title: isEn ? 'Check correlations' : 'Periksa korelasi',
          description: isEn ? 'Ensure that not all correlations are too small. Factor analysis requires a sufficiently clear relationship pattern.' : 'Pastikan tidak semua korelasi terlalu kecil. Analisis faktor membutuhkan pola hubungan yang cukup jelas.',
        },
        {
          number: 3,
          title: isEn ? 'Avoid redundant variables' : 'Hindari variabel redundan',
          description: isEn ? 'Nearly identical variables can make the solution unstable or overly dominant on one factor.' : 'Variabel yang hampir identik dapat membuat solusi menjadi tidak stabil atau terlalu dominan pada satu faktor.',
        },
      ]}
    />
  </div>
  );
};
