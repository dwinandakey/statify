import React from 'react';
import { Table } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const VariablesTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Mapping Variables" : "Memetakan Variabel"} icon={Table} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Within-Subjects Variables"
            description={isEn ? "Move dataset variables into each cell (level × measure combination) in the order set during the Define phase." : "Pindahkan variabel dataset ke tiap sel (kombinasi level × measure) sesuai urutan yang sudah ditentukan di fase Define."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Between-Subjects Factor(s) (Optional)" : "Between-Subjects Factor(s) (Opsional)"}
            description={isEn ? "Add a categorical variable as a between-subjects grouping factor if your design is a mixed design." : "Tambahkan variabel kategorikal sebagai faktor grouping antar subjek jika desain Anda bersifat campuran (mixed design)."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Covariate(s) (Optional)" : "Covariate(s) (Opsional)"}
            description={isEn ? "Add continuous variables whose influence you want to control for." : "Tambahkan variabel kontinu yang ingin dikontrol pengaruhnya."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="info" title={isEn ? "Mapping Order Must Match" : "Urutan Pemetaan Harus Sesuai"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Every cell slot on the left panel represents one level × measure combination defined earlier. Make sure the variable mapped to each cell is in the correct order — an order mistake means a misinterpreted result (e.g. post-test data being read as pre-test)."
            : "Setiap slot sel pada panel kiri mewakili satu kombinasi level×measure yang sudah didefinisikan sebelumnya. Pastikan variabel yang dipetakan ke tiap sel urutannya benar, kesalahan urutan berarti kesalahan interpretasi hasil (misalnya data post-test terbaca sebagai pre-test)."}
        </p>
      </HelpAlert>
    </div>
  );
};
