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
            title={isEn ? "Choose the Dependent Variable" : "Pilih Variabel Dependen"}
            description={
              isEn
                ? "Select one categorical variable with 3 or more categories as the dependent variable. You can set the reference category (First, Last, or Custom) that serves as the baseline for comparison in the Variables tab."
                : "Pilih satu variabel kategorikal dengan 3 kategori atau lebih sebagai variabel dependen. Anda dapat menentukan kategori referensi (First, Last, atau Custom) yang berfungsi sebagai basis perbandingan di tab variabel."
            }
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose Factors" : "Pilih Faktor (Factors)"}
            description={
              isEn
                ? "Move categorical independent variables (nominal or ordinal) into the Factors box. These are separated internally in the analysis by creating dummy variables."
                : "Pindahkan variabel independen yang bertipe kategorikal (nominal atau ordinal) ke kotak Factors. Pilihan ini akan dipisahkan dalam analisis dengan membuat variabel dummy internal."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose Covariates" : "Pilih Kovariat (Covariates)"}
            description={
              isEn
                ? "Move continuous (interval or ratio) independent variables into the Covariates box."
                : "Pindahkan variabel independen yang bertipe kontinu (interval atau rasio) ke kotak Covariates."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Tip: Reference Category" : "Tips: Kategori Referensi"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Choosing the <strong>Reference Category</strong> is critical for interpreting log-odds. By default,
              either the last or first category can be used. The resulting coefficients show the odds of choosing
              category X relative to choosing the reference category.
            </>
          ) : (
            <>
              Penentuan <strong>Reference Category</strong> sangat penting untuk interpretasi log-odds. Secara default,
              kategori terakhir (Last) atau pertama (First) dapat digunakan. Koefisien yang dihasilkan akan menunjukkan
              peluang memilih kategori X dibandingkan dengan memilih kategori referensi.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
