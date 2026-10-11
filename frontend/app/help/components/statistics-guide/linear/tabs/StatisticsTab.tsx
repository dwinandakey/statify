import React from 'react';
import { Calculator } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const StatisticsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Available Statistics" : "Statistik yang Tersedia"} icon={Calculator} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep number={1} title="Estimates" description={isEn ? "Coefficients, standard errors and t-tests." : "Koefisien, standar error, dan uji t."} />
          <HelpStep number={2} title={isEn ? "Model Fit" : "Kesesuaian Model"} description={isEn ? "R², adjusted R², ANOVA table, Durbin-Watson." : "R², adjusted R², tabel ANOVA, Durbin-Watson."} />
          <HelpStep number={3} title="Descriptives" description={isEn ? "Means and standard deviations of variables." : "Rata-rata dan simpangan baku variabel."} />
          <HelpStep number={4} title={isEn ? "Collinearity" : "Kolinearitas"} description={isEn ? "Tolerance, VIF and diagnostics." : "Tolerance, VIF, dan diagnostik lainnya."} />
          <HelpStep number={5} title={isEn ? "Residual Diagnostics" : "Diagnostik Residual"} description={isEn ? "Casewise diagnostics and residual statistics." : "Diagnostik per kasus dan statistik residual."} />
        </div>
      </HelpCard>

      <HelpAlert variant="info" title={isEn ? "Statistics Options" : "Opsi Statistik"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Tick only the tables you need. Extra diagnostics can slow large datasets."
            : "Centang hanya tabel yang benar-benar diperlukan. Diagnostik tambahan dapat memperlambat proses pada dataset besar."}
        </p>
      </HelpAlert>
    </div>
  );
};
