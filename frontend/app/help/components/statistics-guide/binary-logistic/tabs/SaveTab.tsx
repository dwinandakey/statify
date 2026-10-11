import React from 'react';
import { Save } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const SaveTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Saving Prediction Results" : "Menyimpan Hasil Prediksi"} icon={Save} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Predicted Values"
            description={
              isEn
                ? "Save the predicted probability (PRE_1) and predicted group membership (PGR_1) as new variables in the dataset."
                : "Simpan probabilitas prediksi (PRE_1) dan keanggotaan kelompok prediksi (PGR_1) sebagai variabel baru di dataset."
            }
          />
          <HelpStep
            number={2}
            title="Residuals"
            description={
              isEn
                ? "Save one or more residual types: Unstandardized, Logit, Studentized, Standardized, and Deviance residuals. Useful for diagnosing model quality and spotting poorly fit cases."
                : "Simpan berbagai jenis residual: Unstandardized, Logit, Studentized, Standardized, dan Deviance residual. Berguna untuk mendiagnosis kualitas model dan menemukan kasus yang tidak sesuai dengan model."
            }
          />
          <HelpStep
            number={3}
            title="Influence Statistics"
            description={
              isEn
                ? "Save influence diagnostics such as Cook's Distance, Leverage values, and DfBeta(s). These help identify observations that have a disproportionate effect on the estimated model."
                : "Simpan statistik pengaruh seperti Cook's Distance, Leverage values, dan DfBeta(s). Membantu mengidentifikasi observasi yang berpengaruh besar terhadap model yang diestimasi."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Tip: Saved Variable Names" : "Tips: Variabel Tersimpan"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              New variables are appended to the dataset with an incremental suffix (e.g. PRE_1, PRE_2, and so on).
              If a variable with the same name already exists, the sequence number is bumped automatically so no
              existing column is overwritten.
            </>
          ) : (
            <>
              Variabel baru akan ditambahkan ke dataset dengan penamaan inkremental (contoh: PRE_1, PRE_2, dst.).
              Jika variabel dengan nama yang sama sudah ada, nomor urut akan otomatis dinaikkan sehingga tidak ada
              kolom yang tertimpa.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
