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
            title="Dependent Variables"
            description={isEn ? "Move at least 2 numeric (scale) variables as the outcomes to be analyzed together. This is what distinguishes Multivariate from Univariate — every dependent variable is tested in one model at once." : "Pindahkan minimal 2 variabel numerik (scale) sebagai outcome yang dianalisis bersamaan. Inilah yang membedakan Multivariate dari Univariate, semua dependent variable diuji dalam satu model sekaligus."}
          />
          <HelpStep
            number={2}
            title="Fixed Factor(s)"
            description={isEn ? "Move categorical variables in as grouping factors (e.g. treatment group, sex). You can add more than one for a factorial design (Two-Way MANOVA)." : "Pindahkan variabel kategorikal sebagai faktor grouping (mis. kelompok perlakuan, jenis kelamin). Bisa lebih dari satu untuk desain faktorial (Two-Way MANOVA)."}
          />
          <HelpStep
            number={3}
            title="Covariate(s)"
            description={isEn ? "Move continuous variables whose influence you want to control for (MANCOVA), e.g. age or pre-test score." : "Pindahkan variabel kontinu yang ingin dikontrol pengaruhnya (MANCOVA), misalnya usia atau skor pre-test."}
          />
          <HelpStep
            number={4}
            title={isEn ? "WLS Weight (Optional)" : "WLS Weight (Opsional)"}
            description={isEn ? "Choose one numeric variable as a weight if you want Weighted Least Squares, e.g. when variances are known to differ across groups." : "Pilih satu variabel numerik sebagai bobot jika ingin melakukan Weighted Least Squares, misalnya ketika varians antar kelompok diketahui tidak sama."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "At Least 2 Dependent Variables" : "Minimal 2 Dependent Variables"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              If there's only 1 dependent variable, use <strong>GLM Univariate</strong> instead — Multivariate is
              built specifically to test several outcomes at once in a single model.
            </>
          ) : (
            <>
              Kalau hanya ada 1 variabel dependen, gunakan <strong>GLM Univariate</strong>, Multivariate dirancang khusus
              untuk menguji beberapa outcome sekaligus dalam satu model.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpAlert variant="info" title={isEn ? "Variable Types" : "Tipe Variabel"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Dependent Variables and Covariates must be numeric (scale). Fixed Factors must be categorical (nominal or ordinal)."
            : "Dependent Variables dan Covariates harus bertipe numerik (scale). Fixed Factors harus bertipe kategorikal (nominal atau ordinal)."}
        </p>
      </HelpAlert>
    </div>
  );
};
