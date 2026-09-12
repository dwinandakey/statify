import React from 'react';
import { Layers } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ModelTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Model Specification" : "Spesifikasi Model"} icon={Layers} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Full Factorial (Default)"
            description={isEn ? "Every main effect of each factor plus every interaction between factors is entered automatically. Suits most standard analyses." : "Semua main effect dari tiap faktor beserta seluruh interaksi antar faktor dimasukkan otomatis ke dalam model. Cocok untuk sebagian besar analisis standar."}
          />
          <HelpStep
            number={2}
            title="Custom"
            description={isEn ? "Choose exactly which terms enter the model — main effects only, specific 2-way/3-way interactions, or nested terms. Useful for unbalanced designs or hierarchical models." : "Pilih sendiri term mana yang dimasukkan, main effect saja, interaksi 2 arah/3 arah tertentu, atau term nested. Berguna untuk desain tidak seimbang atau model hierarkis."}
          />
          <HelpStep
            number={3}
            title="Sum of Squares Type"
            description={isEn ? "Choose the calculation method: Type I, II, or III. Type III is the default and most commonly used, especially for designs with unbalanced cell counts." : "Tentukan metode perhitungan Type I, II, atau III. Type III adalah default dan paling umum digunakan, terutama untuk desain dengan jumlah observasi tidak seimbang antar sel."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "When to Use a Custom Model?" : "Kapan Pakai Custom Model?"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Use Custom when your design is unbalanced and you want explicit control over term order, or when you have a specific hypothesis involving only some of the interactions."
            : "Gunakan Custom jika desain Anda tidak seimbang dan ingin mengontrol urutan term secara eksplisit, atau jika Anda memiliki hipotesis spesifik yang hanya melibatkan sebagian interaksi saja."}
        </p>
      </HelpAlert>
    </div>
  );
};
