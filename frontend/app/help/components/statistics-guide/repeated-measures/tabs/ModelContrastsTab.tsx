import React from 'react';
import { Layers } from 'lucide-react';
import { HelpCard, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ModelContrastsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title="Model" icon={Layers} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Full Factorial (Default)"
            description={isEn ? "Every within-subjects and between-subjects main effect plus their interactions is entered automatically." : "Semua main effect within-subjects dan between-subjects beserta interaksinya dimasukkan otomatis."}
          />
          <HelpStep
            number={2}
            title="Custom"
            description={isEn ? "Choose exactly which terms enter the model, useful for special designs or hypotheses." : "Pilih sendiri term yang ingin dimasukkan ke model, berguna untuk desain atau hipotesis khusus."}
          />
        </div>
      </HelpCard>

      <HelpCard title="Contrasts" icon={Layers} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Choose the Contrast Type" : "Pilih Tipe Kontras"}
            description={isEn ? "Polynomial, Helmert, Difference, Repeated, Simple, and Deviation are available for the within-subjects factor." : "Tersedia Polynomial, Helmert, Difference, Repeated, Simple, dan Deviation untuk within-subjects factor."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Polynomial for a Time Factor" : "Polynomial untuk Faktor Waktu"}
            description={isEn ? "The Polynomial contrast is most commonly used when the within-subjects factor is time, testing whether the trend across levels is linear, quadratic, and so on." : "Kontras Polynomial paling umum dipakai ketika within-subjects factor adalah waktu, menguji apakah tren antar level bersifat linear, kuadratik, dan seterusnya."}
          />
        </div>
      </HelpCard>
    </div>
  );
};
