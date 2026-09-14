import React from 'react';
import { Table } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const VariablesTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Selecting Variables" : "Memilih Variabel"} icon={Table} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Choose Dependent Variable" : "Pilih Variabel Dependen"}
            description={isEn ? "Select one quantitative variable to predict." : "Pilih satu variabel kuantitatif yang akan diprediksi."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Select Independent Variable(s)" : "Pilih Variabel Independen"}
            description={isEn ? "Move one or more predictor variables into the Independent box." : "Pindahkan satu atau lebih variabel prediktor ke kotak Independent."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Re-order Predictors (Optional)" : "Urutkan Ulang Prediktor (Opsional)"}
            description={isEn ? "Use the up/down arrows to change predictor order." : "Gunakan tombol panah atas/bawah untuk mengubah urutan prediktor."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Variable Types" : "Tipe Variabel"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Linear regression requires a scale (numeric) dependent variable. Nominal predictors should be converted to dummy variables first."
            : "Regresi linear membutuhkan variabel dependen bertipe scale (numerik). Prediktor nominal harus diubah menjadi variabel dummy terlebih dahulu."}
        </p>
      </HelpAlert>
    </div>
  );
};
