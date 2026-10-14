import React from 'react';
import { Brain, HelpCircle, Layers3, Target } from 'lucide-react';
import {
  ConceptSection,
  FeatureGrid,
  IntroSection,
  StepList,
} from '../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
  <div className="space-y-6">
    <IntroSection
      title={isEn ? 'What is Factor Analysis?' : 'Apa itu Analisis Faktor?'}
      description={isEn ? 'Factor analysis helps identify latent factors that explain correlations among observed variables. It is useful for simplifying many variables into a few dimensions that are easier to interpret.' : 'Analisis faktor membantu menemukan faktor laten yang menjelaskan korelasi antar variabel teramati. Teknik ini berguna untuk menyederhanakan banyak variabel menjadi beberapa dimensi yang lebih mudah diinterpretasi.'}
      variant="info"
    />

    <FeatureGrid
      features={[
        {
          title: isEn ? 'When to Use It' : 'Kapan Digunakan',
          icon: HelpCircle,
          items: [
            isEn ? 'When you have many correlated variables' : 'Saat Anda memiliki banyak variabel yang saling berkorelasi',
            isEn ? 'To examine the latent construct structure in the data' : 'Untuk menguji struktur konstruk laten dalam data',
            isEn ? 'When you want to reduce dimensions before further analysis' : 'Saat ingin mereduksi dimensi sebelum analisis lanjutan',
            isEn ? 'To construct a research index or scale' : 'Untuk menyusun indeks atau skala penelitian',
          ],
        },
        {
          title: isEn ? 'What You Will See' : 'Yang Akan Anda Lihat',
          icon: Layers3,
          items: [
            isEn ? 'Data suitability through KMO and Bartlett' : 'Kelayakan data melalui KMO dan Bartlett',
            isEn ? 'The number of factors based on eigenvalues and the scree plot' : 'Penentuan jumlah faktor dari eigenvalue dan scree plot',
            isEn ? 'Loading matrices before and after rotation' : 'Matriks loading sebelum dan sesudah rotasi',
            isEn ? 'Communalities, explained variance, and factor scores' : 'Communalities, variance explained, dan factor scores',
          ],
        },
      ]}
    />

    <ConceptSection
      title={isEn ? 'Core Concepts in Factor Analysis' : 'Konsep Inti dalam Analisis Faktor'}
      icon={Brain}
      concepts={[
        {
          title: isEn ? 'Latent Factor' : 'Faktor Laten',
          description:
            isEn ? 'An unobserved variable that explains relationships among observed variables. One factor can represent one conceptual dimension.' : 'Variabel tak teramati yang menjelaskan pola hubungan antar variabel observasi. Satu faktor dapat mewakili satu dimensi konseptual.',
          color: 'blue',
        },
        {
          title: 'Factor Loading',
          description:
            isEn ? 'The strength of the relationship between a variable and a factor. A large loading indicates that the variable strongly represents the factor.' : 'Kekuatan hubungan antara variabel dan faktor. Loading yang besar menunjukkan variabel tersebut kuat merepresentasikan faktor.',
          color: 'purple',
        },
        {
          title: 'Communality',
          description:
            isEn ? 'The proportion of a variable’s variance explained by the extracted factors. A low value usually indicates that the variable is a poor fit.' : 'Proporsi varians variabel yang dapat dijelaskan oleh faktor-faktor yang diekstrak. Nilai rendah biasanya menandakan variabel kurang cocok.',
          color: 'emerald',
        },
        {
          title: 'Rotation',
          description:
            isEn ? 'The process of rotating a factor solution so loadings are easier to interpret, such as Varimax for orthogonal solutions or Oblimin/Promax for oblique solutions.' : 'Proses memutar solusi faktor agar loading menjadi lebih mudah dibaca, misalnya Varimax untuk solusi ortogonal atau Oblimin/Promax untuk solusi oblique.',
          color: 'orange',
        },
      ]}
    />

    <StepList
      title={isEn ? 'Quick Factor Analysis Workflow' : 'Alur Cepat Analisis Faktor'}
      icon={Target}
      steps={[
        {
          number: 1,
          title: isEn ? 'Prepare Variables' : 'Siapkan Variabel',
          description: isEn ? 'Select relevant numeric variables and ensure correlations among variables are strong enough for analysis.' : 'Pilih variabel numerik yang relevan dan pastikan korelasi antarvariabel cukup kuat untuk dianalisis.',
        },
        {
          number: 2,
          title: isEn ? 'Check Suitability' : 'Periksa Kelayakan',
          description: isEn ? 'Review KMO and Bartlett tests to ensure the data are suitable for factor analysis.' : 'Lihat KMO dan Bartlett untuk memastikan data layak dianalisis dengan metode faktor.',
        },
        {
          number: 3,
          title: isEn ? 'Choose Extraction and Rotation' : 'Tentukan Ekstraksi dan Rotasi',
          description: isEn ? 'Choose an extraction method, determine the number of factors, and use the rotation most suitable for interpretation.' : 'Pilih metode ekstraksi, tentukan jumlah faktor, lalu gunakan rotasi yang paling sesuai dengan tujuan interpretasi.',
        },
        {
          number: 4,
          title: isEn ? 'Interpret Results' : 'Interpretasi Hasil',
          description: isEn ? 'Review loadings, communalities, explained variance, and factor scores to conclude the factor structure.' : 'Baca loading, communalities, variance explained, dan factor scores untuk menyimpulkan struktur faktor.',
        },
      ]}
    />
  </div>
  );
};
