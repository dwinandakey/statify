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
            title="Estimated Response Probabilities"
            description={isEn ? "Saves the predicted probability for every category of the dependent variable as new variables in the dataset." : "Menyimpan peluang prediksi untuk setiap kategori variabel dependen sebagai variabel baru di dataset."}
          />
          <HelpStep
            number={2}
            title="Predicted Category"
            description={isEn ? "Saves the most likely predicted category for each row of data." : "Menyimpan kategori yang diprediksi paling mungkin terjadi untuk setiap baris data."}
          />
          <HelpStep
            number={3}
            title="Predicted Category Probability"
            description={isEn ? "Saves the probability value of the category successfully predicted by the model." : "Menyimpan nilai probabilitas dari kategori yang berhasil diprediksi oleh model."}
          />
          <HelpStep
            number={4}
            title="Actual Category Probability"
            description={isEn ? "Saves the predicted probability for the category that actually occurred in that observation." : "Menyimpan probabilitas prediksi untuk kategori yang benar-benar terjadi pada observasi tersebut."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Tip: New Saved Variables" : "Tips: Hasil Variabel Baru"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              New columns are automatically added to the Data Editor with default prefixes such as{' '}
              <strong>MLP_</strong> (for probabilities) and <strong>MLC_</strong> (for predicted categories).
            </>
          ) : (
            <>
              Hasil penyimpanan akan otomatis membentuk kolom-kolom baru di lembar data (Data Editor) dengan
              prefiks bawaan seperti <strong>MLP_</strong> (untuk probabilitas) dan <strong>MLC_</strong> (untuk
              kategori terprediksi) secara otomatis.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
