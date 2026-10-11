import React from 'react';
import { ArrowUpDown, Orbit, PanelsTopLeft } from 'lucide-react';
import { ConceptSection, FeatureGrid, IntroSection } from '../../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const RotationTab = () => {
  const isEn = useHelpLanguageStore((state) => state.language === 'en');

  return (
  <div className="space-y-6">
    <IntroSection
      title={isEn ? 'Factor Rotation' : 'Rotasi Faktor'}
      description={isEn ? 'Rotation is used to make the loading structure simpler and easier to read. The rotation choice determines whether factors are independent or may be correlated.' : 'Rotasi dipakai untuk membuat struktur loading lebih sederhana dan mudah dibaca. Pilihan rotasi menentukan apakah faktor saling bebas atau boleh berkorelasi.'}
      variant="info"
    />

    <FeatureGrid
      features={[
        {
          title: isEn ? 'Orthogonal Rotation' : 'Rotasi Ortogonal',
          icon: PanelsTopLeft,
          items: [
            isEn ? 'Varimax: most common for simple interpretation' : 'Varimax: paling umum untuk interpretasi sederhana',
            isEn ? 'Quartimax: emphasizes variables with high loadings' : 'Quartimax: menonjolkan variabel dengan loading tinggi',
            isEn ? 'Equimax: a compromise between Varimax and Quartimax' : 'Equimax: kompromi antara varimax dan quartimax',
          ],
        },
        {
          title: isEn ? 'Oblique Rotation' : 'Rotasi Oblique',
          icon: Orbit,
          items: [
            isEn ? 'Oblimin: factors may be correlated' : 'Oblimin: faktor boleh berkorelasi',
            isEn ? 'Promax: often faster and more stable for oblique solutions' : 'Promax: sering lebih cepat dan stabil untuk solusi oblique',
            isEn ? 'Suitable when theoretical constructs are related' : 'Cocok bila konstruk teoritis memang saling terkait',
          ],
        },
      ]}
    />

    <ConceptSection
      title={isEn ? 'How to Read Rotation Results' : 'Cara Membaca Hasil Rotasi'}
      icon={ArrowUpDown}
      concepts={[
        {
          title: 'Pattern / Rotated Loadings',
          description:
            isEn ? 'Use rotated loadings to see which variables most strongly form each factor.' : 'Gunakan loading yang sudah diputar untuk melihat variabel mana yang paling kuat membentuk setiap faktor.',
          color: 'blue',
        },
        {
          title: 'Factor Correlations',
          description:
            isEn ? 'Appears in oblique rotations and shows how closely latent factors are related.' : 'Muncul pada rotasi oblique dan menunjukkan seberapa erat hubungan antar faktor laten.',
          color: 'purple',
        },
        {
          title: 'Convergence',
          description:
            isEn ? 'Ensure that rotation converges. If it does not, increase iterations or reevaluate the model.' : 'Pastikan rotasi mencapai konvergensi. Jika tidak, tingkatkan iterasi atau evaluasi ulang model.',
          color: 'orange',
        },
      ]}
    />

    <div className="rounded-lg border bg-muted/30 p-6">
      <h3 className="text-lg font-semibold mb-2">{isEn ? 'Quick Rule' : 'Aturan Cepat'}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {isEn ? 'Use Varimax when you want clearly separated factors, and use Oblimin or Promax when your theory considers the factors to be related.' : 'Gunakan Varimax jika Anda ingin faktor yang mudah dipisahkan, dan gunakan Oblimin atau Promax jika teori Anda menganggap faktor-faktor tersebut memang saling berhubungan.'}
      </p>
    </div>
  </div>
  );
};
