import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const PairedT2Tab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="warning" title={isEn ? "An Alternative Analysis Mode" : "Mode Analisis Alternatif"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Paired Mode is a <strong>separate</strong> analysis mode from ordinary MANOVA/MANCOVA, dedicated to
              testing a paired Hotelling's T², comparing a pair of measurements (e.g. before vs. after) across
              several outcomes at once.
            </>
          ) : (
            <>
              Paired Mode adalah mode analisis <strong>terpisah</strong> dari MANOVA/MANCOVA biasa, khusus untuk menguji
              Hotelling&apos;s T² berpasangan, membandingkan sepasang pengukuran (mis. sebelum vs sesudah) pada beberapa
              outcome sekaligus.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "How to Use Paired Mode" : "Cara Menggunakan Paired Mode"} icon={ArrowLeftRight} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Enable Paired Mode" : "Aktifkan Paired Mode"}
            description={isEn ? "Switch from the regular Dependent Variables mode to the variable-pairing mode." : "Beralih dari mode Dependent Variables biasa ke mode pasangan variabel."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Pair the Variables" : "Pasangkan Variabel"}
            description={isEn ? "Set the pairs of variables to compare, e.g. pre_a ↔ post_a and pre_b ↔ post_b. The system automatically computes each pair's difference as the basis for the analysis." : "Tentukan pasangan variabel yang ingin dibandingkan, misalnya pre_a ↔ post_a dan pre_b ↔ post_b. Sistem otomatis menghitung selisih tiap pasangan sebagai dasar analisis."}
          />
          <HelpStep
            number={3}
            title="Test Value (δ₀)"
            description={isEn ? "Set the test value for each pair's difference, default 0, meaning it tests whether the mean difference significantly differs from zero." : "Tentukan nilai uji untuk selisih tiap pasangan, default 0, artinya menguji apakah rata-rata selisih berbeda signifikan dari nol."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Interpreting the Output" : "Interpretasi Output"}
            description={isEn ? "The output uses the same Multivariate Tests table as regular MANOVA, but applied to the computed paired-difference columns." : "Output menggunakan tabel Multivariate Tests yang sama seperti MANOVA biasa, namun diterapkan pada kolom selisih pasangan yang telah dihitung."}
          />
        </div>
      </HelpCard>
    </div>
  );
};
