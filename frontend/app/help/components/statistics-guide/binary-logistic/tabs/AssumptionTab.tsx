import React from 'react';
import { Shield } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AssumptionTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Assumption Checks" : "Uji Asumsi"} icon={Shield} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Multicollinearity (VIF & Tolerance)" : "Multikolinearitas (VIF & Tolerance)"}
            description={
              isEn
                ? "Click Check VIF (requires at least 2 covariates) to detect strong correlation among independent variables. A VIF above 10 or a Tolerance below 0.1 indicates a serious multicollinearity problem. Results are printed to the Output Viewer."
                : "Klik Check VIF (membutuhkan minimal 2 kovariat) untuk mendeteksi apakah variabel independen saling berkorelasi tinggi. VIF > 10 atau Tolerance < 0.1 mengindikasikan masalah multikolinearitas yang serius. Hasilnya dicetak ke Output Viewer."
            }
          />
          <HelpStep
            number={2}
            title="Box-Tidwell Test"
            description={
              isEn
                ? "Click Run Box-Tidwell (requires a dependent variable and at least 1 continuous covariate) to test the linearity assumption between continuous predictors and the logit (log-odds) of the outcome. A significant interaction term (p < 0.05) indicates a violation of the linearity assumption."
                : "Klik Run Box-Tidwell (membutuhkan variabel dependen dan minimal 1 kovariat kontinu) untuk menguji asumsi linearitas antara variabel prediktor kontinu dan logit (log-odds) dari variabel dependen. Interaksi yang signifikan (p < 0.05) menunjukkan pelanggaran asumsi linearitas."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Important: Logistic Regression Assumptions" : "Penting: Asumsi Regresi Logistik"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Binary logistic regression relies on several key assumptions: (1) the dependent variable is binary,
              (2) observations are independent of each other, (3) there is no severe multicollinearity among
              predictors, and (4) continuous predictors have a linear relationship with the logit. Check these
              assumptions on this tab before interpreting the model output.
            </>
          ) : (
            <>
              Regresi logistik memiliki beberapa asumsi penting: (1) variabel dependen bersifat biner,
              (2) observasi saling independen, (3) tidak ada multikolinearitas berlebihan antar prediktor,
              dan (4) hubungan linear antara variabel kontinu dan logit. Periksa asumsi-asumsi ini pada tab
              ini sebelum menginterpretasikan hasil model.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
