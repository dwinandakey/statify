import React from 'react';
import { Repeat } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const SphericityEffectsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="warning" title={isEn ? "The Hardest Concept in Repeated Measures" : "Konsep Tersulit di Repeated Measures"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Sphericity is a special assumption relevant only to Repeated Measures — it doesn't appear in GLM Univariate or Multivariate."
            : "Sphericity adalah asumsi khusus yang hanya relevan untuk Repeated Measures, tidak ditemukan di GLM Univariate maupun Multivariate."}
        </p>
      </HelpAlert>

      <HelpCard title="Mauchly's Test of Sphericity" icon={Repeat} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "What Is Being Tested?" : "Apa yang Diuji?"}
            description={isEn ? "Sphericity is the assumption that the variance of differences between every pair of within-subjects levels is equal. Mauchly's Test checks whether this assumption holds." : "Sphericity adalah asumsi bahwa varians dari selisih antar semua pasangan level within-subjects itu sama. Mauchly's Test menguji apakah asumsi ini terpenuhi."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Reading the Sig. Value" : "Cara Membaca Sig."}
            description={isEn ? "Sig. > 0.05 → the sphericity assumption holds, you may read the 'Sphericity Assumed' row in the effects table. Sig. < 0.05 → the assumption is violated, use one of the epsilon-corrected rows instead." : "Sig. > 0.05 → asumsi sphericity terpenuhi, boleh membaca baris 'Sphericity Assumed' pada tabel efek. Sig. < 0.05 → asumsi dilanggar, gunakan salah satu baris koreksi epsilon."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Three Epsilon Values" : "Tiga Nilai Epsilon"}
            description={isEn ? "Greenhouse-Geisser (the most commonly used, safe default), Huynh-Feldt (a lighter correction, suited when Greenhouse-Geisser's epsilon > 0.75), and Lower-bound (the most conservative correction / worst-case scenario)." : "Greenhouse-Geisser (paling umum dipakai sebagai pilihan default yang aman), Huynh-Feldt (koreksi lebih ringan, cocok dipakai bila epsilon Greenhouse-Geisser > 0.75), dan Lower-bound (koreksi paling konservatif / skenario terburuk)."}
          />
        </div>
      </HelpCard>

      <HelpCard title="Tests of Within-Subjects Effects" icon={Repeat} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "4 Rows per Effect" : "4 Baris per Efek"}
            description={isEn ? "The table shows 4 rows for every within-subjects effect: Sphericity Assumed, Greenhouse-Geisser, Huynh-Feldt, and Lower-bound." : "Tabel menampilkan 4 baris untuk tiap efek within-subjects: Sphericity Assumed, Greenhouse-Geisser, Huynh-Feldt, dan Lower-bound."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Epsilon Only Corrects the Degrees of Freedom" : "Epsilon Hanya Mengoreksi Degrees of Freedom"}
            description={isEn ? "The F value is the same in all four rows — only the degrees of freedom (df) and significance (Sig.) change after the epsilon correction." : "Nilai F pada keempat baris tetap sama, yang berbeda hanyalah derajat bebas (df) dan signifikansi (Sig.) setelah dikoreksi epsilon."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "When in Doubt, Use Greenhouse-Geisser" : "Kalau Ragu, Pakai Greenhouse-Geisser"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              If you're unsure which row to read, <strong>Greenhouse-Geisser</strong> is the most common and safest
              default choice in practice.
            </>
          ) : (
            <>
              Jika tidak yakin baris mana yang harus dibaca, <strong>Greenhouse-Geisser</strong> adalah pilihan default
              yang paling umum dan aman digunakan dalam praktik.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
