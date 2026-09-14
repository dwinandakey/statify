import React from 'react';
import { Brain, HelpCircle, Layers3, Target } from 'lucide-react';
import {
  ConceptSection,
  FeatureGrid,
  IntroSection,
  StepList,
} from '../../shared/StandardizedContentLayout';

export const OverviewTab = () => (
  <div className="space-y-6">
    <IntroSection
      title="Apa itu Analisis Faktor?"
      description="Analisis faktor membantu menemukan faktor laten yang menjelaskan korelasi antar variabel teramati. Teknik ini berguna untuk menyederhanakan banyak variabel menjadi beberapa dimensi yang lebih mudah diinterpretasi."
      variant="info"
    />

    <FeatureGrid
      features={[
        {
          title: 'Kapan Digunakan',
          icon: HelpCircle,
          items: [
            'Saat Anda memiliki banyak variabel yang saling berkorelasi',
            'Untuk menguji struktur konstruk laten dalam data',
            'Saat ingin mereduksi dimensi sebelum analisis lanjutan',
            'Untuk menyusun indeks atau skala penelitian',
          ],
        },
        {
          title: 'Yang Akan Anda Lihat',
          icon: Layers3,
          items: [
            'Kelayakan data melalui KMO dan Bartlett',
            'Penentuan jumlah faktor dari eigenvalue dan scree plot',
            'Matriks loading sebelum dan sesudah rotasi',
            'Communalities, variance explained, dan factor scores',
          ],
        },
      ]}
    />

    <ConceptSection
      title="Konsep Inti dalam Analisis Faktor"
      icon={Brain}
      concepts={[
        {
          title: 'Faktor Laten',
          description:
            'Variabel tak teramati yang menjelaskan pola hubungan antar variabel observasi. Satu faktor dapat mewakili satu dimensi konseptual.',
          color: 'blue',
        },
        {
          title: 'Factor Loading',
          description:
            'Kekuatan hubungan antara variabel dan faktor. Loading yang besar menunjukkan variabel tersebut kuat merepresentasikan faktor.',
          color: 'purple',
        },
        {
          title: 'Communality',
          description:
            'Proporsi varians variabel yang dapat dijelaskan oleh faktor-faktor yang diekstrak. Nilai rendah biasanya menandakan variabel kurang cocok.',
          color: 'emerald',
        },
        {
          title: 'Rotation',
          description:
            'Proses memutar solusi faktor agar loading menjadi lebih mudah dibaca, misalnya Varimax untuk solusi ortogonal atau Oblimin/Promax untuk solusi oblique.',
          color: 'orange',
        },
      ]}
    />

    <StepList
      title="Alur Cepat Analisis Faktor"
      icon={Target}
      steps={[
        {
          number: 1,
          title: 'Siapkan Variabel',
          description:
            'Pilih variabel numerik yang relevan dan pastikan korelasi antarvariabel cukup kuat untuk dianalisis.',
        },
        {
          number: 2,
          title: 'Periksa Kelayakan',
          description:
            'Lihat KMO dan Bartlett untuk memastikan data layak dianalisis dengan metode faktor.',
        },
        {
          number: 3,
          title: 'Tentukan Ekstraksi dan Rotasi',
          description:
            'Pilih metode ekstraksi, tentukan jumlah faktor, lalu gunakan rotasi yang paling sesuai dengan tujuan interpretasi.',
        },
        {
          number: 4,
          title: 'Interpretasi Hasil',
          description:
            'Baca loading, communalities, variance explained, dan factor scores untuk menyimpulkan struktur faktor.',
        },
      ]}
    />
  </div>
);
