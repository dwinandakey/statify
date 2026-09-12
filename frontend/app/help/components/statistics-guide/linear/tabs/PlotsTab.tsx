import React from 'react';
import { BarChart3 } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const PlotsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Plot Options" : "Opsi Plot"} icon={BarChart3} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep number={1} title={isEn ? "Scatter Plot" : "Scatter Plot"} description={isEn ? "Plot any X vs Y combination (including residuals)." : "Membuat plot untuk kombinasi X vs Y apa pun (termasuk residual)."} />
          <HelpStep number={2} title="Histogram" description={isEn ? "Show distribution of a selected variable." : "Menampilkan distribusi variabel yang dipilih."} />
          <HelpStep number={3} title={isEn ? "Customization" : "Kustomisasi"} description={isEn ? "Choose axis labels, colors and titles." : "Mengatur label sumbu, warna, dan judul grafik."} />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Best Practices" : "Praktik Terbaik"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Check residual scatter plots for non-linearity or heteroscedasticity."
            : "Periksa scatter plot residual untuk mendeteksi non-linearitas atau heteroskedastisitas."}
        </p>
      </HelpAlert>
    </div>
  );
};
