import React from 'react';
import { GitCompare } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ContrastsPostHocTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title="Contrasts" icon={GitCompare} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Choose the Contrast Type" : "Pilih Tipe Kontras"}
            description={isEn ? "Set the contrast type for each factor: Deviation, Simple, Difference, Helmert, Repeated, or Polynomial. A contrast is a planned comparison between factor levels, defined before seeing the results." : "Tentukan tipe kontras untuk tiap faktor: Deviation, Simple, Difference, Helmert, Repeated, atau Polynomial. Kontras adalah perbandingan terencana antar level faktor yang ditentukan sebelum melihat hasil analisis."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Set the Reference Category" : "Tentukan Kategori Referensi"}
            description={isEn ? "For contrasts that need a baseline (e.g. Simple), choose whether the First or Last level is the comparison point." : "Untuk kontras yang membutuhkan baseline (mis. Simple), pilih apakah level First atau Last yang jadi pembanding."}
          />
        </div>
      </HelpCard>

      <HelpCard title="Post Hoc Tests" icon={GitCompare} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Pairwise Comparisons Between Levels" : "Perbandingan Berpasangan Antar Level"}
            description={isEn ? "Post Hoc compares every pair of levels within a factor once the overall analysis is known to be significant. Available for factors with 3 or more levels." : "Post Hoc membandingkan setiap pasangan level pada suatu faktor setelah hasil analisis diketahui signifikan. Tersedia untuk faktor dengan 3 level atau lebih."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Multiple-Comparison Correction Method" : "Metode Koreksi Perbandingan Berganda"}
            description={isEn ? "Choose a correction method (e.g. Bonferroni) to control the Type I error inflation caused by running many comparisons at once." : "Pilih metode koreksi (mis. Bonferroni) untuk mengendalikan inflasi galat Tipe I akibat banyaknya perbandingan yang dilakukan sekaligus."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Post Hoc Applies to Main Effects Only" : "Post Hoc Hanya untuk Main Effect"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Post Hoc Tests apply only to a factor's main effect, not to interaction terms. To follow up a
              significant interaction, use Estimated Marginal Means together with the Compare Main Effects option.
            </>
          ) : (
            <>
              Post Hoc Tests hanya berlaku untuk main effect faktor, bukan untuk term interaksi. Untuk menelusuri interaksi
              signifikan, gunakan Estimated Marginal Means beserta opsi Compare Main Effects.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
