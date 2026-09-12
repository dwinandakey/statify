import React from 'react';
import { TrendingUp } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const EMMeansPlotsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title="Estimated Marginal Means" icon={TrendingUp} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Choose Factor / Interaction" : "Pilih Faktor / Interaksi"}
            description={isEn ? "Move in the factor or interaction combination whose estimated mean (adjusted for covariates in the model) you want displayed." : "Pindahkan faktor atau kombinasi interaksi yang ingin ditampilkan rata-rata terestimasinya (mean yang sudah disesuaikan dengan kovariat dalam model)."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Compare Main Effects (Optional)" : "Compare Main Effects (Opsional)"}
            description={isEn ? "Enable this to get pairwise comparison tests directly from estimated marginal means, complete with a correction-method choice (e.g. Bonferroni)." : "Aktifkan untuk mendapatkan uji perbandingan berpasangan langsung dari estimated marginal means, lengkap dengan pilihan metode koreksi (mis. Bonferroni)."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Plots (Profile Plots)" : "Plots (Profile Plots)"} icon={TrendingUp} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Horizontal Axis"
            description={isEn ? "Choose one factor as the chart's horizontal axis." : "Pilih satu faktor sebagai sumbu horizontal grafik."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Separate Lines (Optional)" : "Separate Lines (Opsional)"}
            description={isEn ? "Add a second factor so it's drawn as separate lines, useful for visualizing the interaction between two factors." : "Tambahkan faktor kedua agar digambarkan sebagai garis terpisah, berguna untuk memvisualisasikan interaksi antar dua faktor."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "How to Read a Profile Plot" : "Cara Membaca Profile Plot"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              <strong>Roughly parallel</strong> lines mean there's no interaction between factors. Lines that{' '}
              <strong>cross or aren't parallel</strong> indicate an interaction — one factor's effect differs
              depending on the level of the other.
            </>
          ) : (
            <>
              Garis-garis yang <strong>relatif paralel</strong> menunjukkan tidak ada interaksi antar faktor. Garis yang{' '}
              <strong>saling menyilang atau tidak paralel</strong> mengindikasikan adanya interaksi, efek satu faktor
              berbeda tergantung level faktor lainnya.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
