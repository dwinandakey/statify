import React from 'react';
import { Calculator, ChartColumn, Sigma, ShieldCheck } from 'lucide-react';
import { ConceptSection, FeatureGrid, IntroSection } from '../../shared/StandardizedContentLayout';

export const ExtractionTab = () => (
  <div className="space-y-6">
    <IntroSection
      title="Pengaturan Ekstraksi"
      description="Tab ekstraksi menentukan bagaimana faktor dibentuk, berapa banyak faktor yang dipertahankan, dan statistik apa yang ditampilkan selama proses estimasi."
      variant="info"
    />

    <FeatureGrid
      features={[
        {
          title: 'Metode Ekstraksi',
          icon: Calculator,
          items: [
            'Principal Component / Principal Axis untuk eksplorasi awal',
            'Maximum Likelihood untuk pengujian model yang lebih formal',
            'Metode least squares untuk pendekatan alternatif pada data tertentu',
          ],
        },
        {
          title: 'Kriteria Menentukan Faktor',
          icon: ChartColumn,
          items: [
            'Eigenvalue lebih besar dari 1',
            'Scree plot untuk mencari titik siku',
            'Persentase variance explained yang cukup',
            'Pertimbangan teori dan interpretasi substantif',
          ],
        },
      ]}
    />

    <ConceptSection
      title="Apa yang Perlu Diperhatikan"
      icon={ShieldCheck}
      concepts={[
        {
          title: 'KMO',
          description:
            'Mengukur apakah pola korelasi cukup kompak untuk analisis faktor. Nilai yang lebih tinggi menandakan data lebih layak.',
          color: 'blue',
        },
        {
          title: 'Bartlett Test',
          description:
            'Menguji apakah matriks korelasi berbeda secara signifikan dari matriks identitas. Hasil signifikan mendukung analisis faktor.',
          color: 'purple',
        },
        {
          title: 'Communalities Awal',
          description:
            'Membantu melihat variabel mana yang paling banyak dijelaskan oleh faktor yang diekstrak.',
          color: 'emerald',
        },
      ]}
    />

    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-3 mb-3">
        <Sigma className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Tips Praktis</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Jika eigenvalue dan scree plot memberi sinyal berbeda, prioritaskan kombinasi antara teori, interpretasi loading, dan konsistensi hasil lintas model. Jangan hanya mengandalkan satu angka ambang.
      </p>
    </div>
  </div>
);
