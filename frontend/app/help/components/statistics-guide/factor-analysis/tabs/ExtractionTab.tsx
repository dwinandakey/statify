import React from 'react';
import { Calculator, ChartColumn, Sigma, ShieldCheck } from 'lucide-react';
import { ConceptSection, FeatureGrid, IntroSection } from '../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ExtractionTab = () => {
  const isEn = useHelpLanguageStore((state) => state.language === 'en');

  return (
  <div className="space-y-6">
    <IntroSection
      title={isEn ? 'Extraction Settings' : 'Pengaturan Ekstraksi'}
      description={isEn ? 'The extraction tab determines how factors are formed, how many factors are retained, and which statistics are displayed during estimation.' : 'Tab ekstraksi menentukan bagaimana faktor dibentuk, berapa banyak faktor yang dipertahankan, dan statistik apa yang ditampilkan selama proses estimasi.'}
      variant="info"
    />

    <FeatureGrid
      features={[
        {
          title: isEn ? 'Extraction Methods' : 'Metode Ekstraksi',
          icon: Calculator,
          items: [
            isEn ? 'Principal Component / Principal Axis for initial exploration' : 'Principal Component / Principal Axis untuk eksplorasi awal',
            isEn ? 'Maximum Likelihood for more formal model testing' : 'Maximum Likelihood untuk pengujian model yang lebih formal',
            isEn ? 'Least squares methods as an alternative for certain data' : 'Metode least squares untuk pendekatan alternatif pada data tertentu',
          ],
        },
        {
          title: isEn ? 'Criteria for Determining Factors' : 'Kriteria Menentukan Faktor',
          icon: ChartColumn,
          items: [
            isEn ? 'Eigenvalues greater than 1' : 'Eigenvalue lebih besar dari 1',
            isEn ? 'Scree plot to identify the elbow point' : 'Scree plot untuk mencari titik siku',
            isEn ? 'A sufficient percentage of explained variance' : 'Persentase variance explained yang cukup',
            isEn ? 'Theoretical and substantive interpretation' : 'Pertimbangan teori dan interpretasi substantif',
          ],
        },
      ]}
    />

    <ConceptSection
      title={isEn ? 'What to Consider' : 'Apa yang Perlu Diperhatikan'}
      icon={ShieldCheck}
      concepts={[
        {
          title: 'KMO',
          description: isEn ? 'Measures whether the correlation pattern is compact enough for factor analysis. Higher values indicate more suitable data.' : 'Mengukur apakah pola korelasi cukup kompak untuk analisis faktor. Nilai yang lebih tinggi menandakan data lebih layak.',
          color: 'blue',
        },
        {
          title: 'Bartlett Test',
          description: isEn ? 'Tests whether the correlation matrix differs significantly from the identity matrix. A significant result supports factor analysis.' : 'Menguji apakah matriks korelasi berbeda secara signifikan dari matriks identitas. Hasil signifikan mendukung analisis faktor.',
          color: 'purple',
        },
        {
          title: 'Communalities Awal',
          description: isEn ? 'Helps identify which variables are best explained by the extracted factors.' : 'Membantu melihat variabel mana yang paling banyak dijelaskan oleh faktor yang diekstrak.',
          color: 'emerald',
        },
      ]}
    />

    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-3 mb-3">
        <Sigma className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">{isEn ? 'Practical Tips' : 'Tips Praktis'}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {isEn ? 'If eigenvalues and the scree plot give different signals, prioritize a combination of theory, loading interpretation, and consistency across models. Do not rely on a single threshold.' : 'Jika eigenvalue dan scree plot memberi sinyal berbeda, prioritaskan kombinasi antara teori, interpretasi loading, dan konsistensi hasil lintas model. Jangan hanya mengandalkan satu angka ambang.'}
      </p>
    </div>
  </div>
  );
};
