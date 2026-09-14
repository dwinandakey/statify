import React from 'react';
import { Database, Lightbulb, TriangleAlert } from 'lucide-react';
import { FeatureGrid, IntroSection, StepList } from '../../shared/StandardizedContentLayout';

export const VariablesTab = () => (
  <div className="space-y-6">
    <IntroSection
      title="Pemilihan Variabel"
      description="Analisis faktor bekerja paling baik pada variabel numerik yang berkorelasi. Variabel kategorikal perlu diolah terlebih dahulu atau dipisahkan dari model faktor."
      variant="warning"
    />

    <FeatureGrid
      features={[
        {
          title: 'Variabel yang Disarankan',
          icon: Database,
          items: [
            'Skala Likert atau item kuesioner numerik',
            'Variabel pengukuran yang merepresentasikan konstruk serupa',
            'Variabel dengan korelasi antarpasangan yang memadai',
          ],
        },
        {
          title: 'Variabel yang Sebaiknya Dihindari',
          icon: TriangleAlert,
          items: [
            'Variabel nominal tanpa pengkodean yang tepat',
            'Variabel dengan missing value ekstrem',
            'Variabel dengan korelasi sangat rendah terhadap yang lain',
          ],
        },
      ]}
    />

    <StepList
      title="Langkah Memilih Variabel"
      icon={Lightbulb}
      steps={[
        {
          number: 1,
          title: 'Pilih variabel inti',
          description:
            'Masukkan semua indikator yang secara teoritis membentuk konstruk yang sama atau berdekatan.',
        },
        {
          number: 2,
          title: 'Periksa korelasi',
          description:
            'Pastikan tidak semua korelasi terlalu kecil. Analisis faktor membutuhkan pola hubungan yang cukup jelas.',
        },
        {
          number: 3,
          title: 'Hindari variabel redundan',
          description:
            'Variabel yang hampir identik dapat membuat solusi menjadi tidak stabil atau terlalu dominan pada satu faktor.',
        },
      ]}
    />
  </div>
);
