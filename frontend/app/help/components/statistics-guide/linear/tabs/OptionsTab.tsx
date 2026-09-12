import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { HelpCard, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OptionsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Method & Options" : "Metode & Opsi"} icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Stepping Method" : "Metode Stepping"}
            description={isEn ? "Choose probability or F-value criteria for stepwise models." : "Pilih kriteria probabilitas atau nilai F untuk model stepwise."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Include Constant" : "Include Constant"}
            description={isEn ? "Remove intercept to force the regression through the origin." : "Hilangkan centang untuk memaksa garis regresi melalui titik nol (tanpa intersep)."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Missing Values" : "Missing Values"}
            description={isEn ? "Replace missing values with means or apply listwise deletion." : "Ganti nilai yang hilang dengan rata-rata, atau gunakan listwise deletion."}
          />
        </div>
      </HelpCard>
    </div>
  );
};
