import React from 'react';
import { ArrowUpDown, Orbit, PanelsTopLeft } from 'lucide-react';
import { ConceptSection, FeatureGrid, IntroSection } from '../../shared/StandardizedContentLayout';

export const RotationTab = () => (
  <div className="space-y-6">
    <IntroSection
      title="Rotasi Faktor"
      description="Rotasi dipakai untuk membuat struktur loading lebih sederhana dan mudah dibaca. Pilihan rotasi menentukan apakah faktor saling bebas atau boleh berkorelasi."
      variant="info"
    />

    <FeatureGrid
      features={[
        {
          title: 'Rotasi Ortogonal',
          icon: PanelsTopLeft,
          items: [
            'Varimax: paling umum untuk interpretasi sederhana',
            'Quartimax: menonjolkan variabel dengan loading tinggi',
            'Equimax: kompromi antara varimax dan quartimax',
          ],
        },
        {
          title: 'Rotasi Oblique',
          icon: Orbit,
          items: [
            'Oblimin: faktor boleh berkorelasi',
            'Promax: sering lebih cepat dan stabil untuk solusi oblique',
            'Cocok bila konstruk teoritis memang saling terkait',
          ],
        },
      ]}
    />

    <ConceptSection
      title="Cara Membaca Hasil Rotasi"
      icon={ArrowUpDown}
      concepts={[
        {
          title: 'Pattern / Rotated Loadings',
          description:
            'Gunakan loading yang sudah diputar untuk melihat variabel mana yang paling kuat membentuk setiap faktor.',
          color: 'blue',
        },
        {
          title: 'Factor Correlations',
          description:
            'Muncul pada rotasi oblique dan menunjukkan seberapa erat hubungan antar faktor laten.',
          color: 'purple',
        },
        {
          title: 'Convergence',
          description:
            'Pastikan rotasi mencapai konvergensi. Jika tidak, tingkatkan iterasi atau evaluasi ulang model.',
          color: 'orange',
        },
      ]}
    />

    <div className="rounded-lg border bg-muted/30 p-6">
      <h3 className="text-lg font-semibold mb-2">Aturan Cepat</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Gunakan Varimax jika Anda ingin faktor yang mudah dipisahkan, dan gunakan Oblimin atau Promax jika teori Anda menganggap faktor-faktor tersebut memang saling berhubungan.
      </p>
    </div>
  </div>
);
