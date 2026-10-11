import React from 'react';
import { TrendingUp } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const EMMeansPostHocPlotsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "EM Means & Post Hoc" : "EM Means & Post Hoc"} icon={TrendingUp} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Estimated Marginal Means"
            description={isEn ? "Show estimated means for each level or level combination of within-subjects and between-subjects factors." : "Tampilkan rata-rata terestimasi untuk tiap level atau kombinasi level within-subjects dan between-subjects."}
          />
          <HelpStep
            number={2}
            title="Post Hoc / Compare Main Effects"
            description={isEn ? "Compare every pair of levels or groups, complete with a multiple-comparison correction method (e.g. Bonferroni)." : "Bandingkan tiap pasangan level atau grup secara berpasangan, lengkap dengan metode koreksi perbandingan berganda (mis. Bonferroni)."}
          />
        </div>
      </HelpCard>

      <HelpCard title="Profile Plots" icon={TrendingUp} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Horizontal Axis"
            description={isEn ? "Choose the within-subjects factor (e.g. time) as the horizontal axis — the most common way to visualize change across measurements." : "Pilih within-subjects factor (mis. waktu) sebagai sumbu horizontal, cara paling umum untuk memvisualisasikan perubahan antar pengukuran."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Separate Lines (Optional)" : "Separate Lines (Opsional)"}
            description={isEn ? "Add a between-subjects factor as separate lines to see whether the pattern of change over time differs by group." : "Tambahkan between-subjects factor sebagai garis terpisah untuk melihat apakah pola perubahan antar waktu berbeda tiap kelompok."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "How to Read a Profile Plot" : "Cara Membaca Profile Plot"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              <strong>Roughly parallel</strong> lines over time indicate a consistent group effect (no interaction).
              Lines that <strong>cross or diverge</strong> show different patterns of change across groups over time
              (an interaction).
            </>
          ) : (
            <>
              Garis-garis yang <strong>relatif paralel</strong> antar waktu menunjukkan efek kelompok konsisten (tidak ada
              interaksi). Garis yang <strong>saling menyilang atau divergen</strong> menunjukkan pola perubahan berbeda
              antar kelompok seiring waktu (ada interaksi).
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
