import React from 'react';
import { BadgeCheck, FileOutput, Sigma } from 'lucide-react';
import { FeatureGrid, IntroSection, StepList } from '../../shared/StandardizedContentLayout';

export const ScoresTab = () => (
  <div className="space-y-6">
    <IntroSection
      title="Factor Scores"
      description="Factor scores dipakai untuk menyimpan nilai faktor ke dataset sehingga hasil analisis faktor dapat digunakan lagi di analisis lanjutan."
      variant="success"
    />

    <FeatureGrid
      features={[
        {
          title: 'Metode Penyimpanan',
          icon: FileOutput,
          items: [
            'Regression: umum dipakai untuk estimasi skor faktor',
            'Bartlett: lebih menekankan estimasi yang konsisten',
            'Anderson: alternatif untuk kebutuhan tertentu',
          ],
        },
        {
          title: 'Kapan Perlu Disimpan',
          icon: BadgeCheck,
          items: [
            'Saat skor faktor akan dipakai sebagai variabel baru',
            'Saat Anda ingin regresi, clustering, atau klasifikasi lanjutan',
            'Saat ingin membuat indeks ringkas dari banyak indikator',
          ],
        },
      ]}
    />

    <StepList
      title="Langkah Menyimpan Skor Faktor"
      icon={Sigma}
      steps={[
        {
          number: 1,
          title: 'Aktifkan penyimpanan skor',
          description:
            'Centang opsi Save as variables agar hasil skor faktor dapat ditambahkan ke dataset.',
        },
        {
          number: 2,
          title: 'Pilih metode skor',
          description:
            'Gunakan Regression, Bartlett, atau Anderson sesuai kebutuhan analisis dan konsistensi model.',
        },
        {
          number: 3,
          title: 'Gunakan hasilnya kembali',
          description:
            'Setelah tersimpan, factor scores bisa dipakai sebagai input analisis berikutnya atau untuk pelaporan.',
        },
      ]}
    />
  </div>
);
