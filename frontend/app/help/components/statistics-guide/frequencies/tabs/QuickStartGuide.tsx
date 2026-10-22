import React from 'react';
import { HelpCard } from '@/app/help/ui/HelpLayout';
import { FileText } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const QuickStartGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="mt-8 grid gap-4">
      <HelpCard title={isEn ? "Quick Guide" : "Panduan Cepat"} icon={FileText} variant="feature">
        <div className="space-y-3">
          <p className="text-sm">
            {isEn ? "Ready to create your first frequency table?" : "Siap membuat tabel frekuensi pertama Anda?"}
          </p>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            {isEn ? (
              <>
                <li>Choose variables in the Variables tab</li>
                <li>Pick statistics in the Statistics tab</li>
                <li>Set up charts in the Charts tab</li>
                <li>Click OK to run the frequency analysis</li>
              </>
            ) : (
              <>
                <li>Pilih variabel di tab Variables</li>
                <li>Tentukan statistik di tab Statistics</li>
                <li>Atur grafik di tab Charts</li>
                <li>Klik OK untuk menjalankan analisis frekuensi</li>
              </>
            )}
          </ol>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Related Topics" : "Topik Terkait"} icon={FileText} variant="feature">
        <div className="space-y-2">
          <p className="text-sm">{isEn ? "Learn more about:" : "Pelajari lebih lanjut tentang:"}</p>
          <ul className="text-sm space-y-1 list-disc list-inside">
            {isEn ? (
              <>
                <li>Descriptive Statistics for deeper analysis</li>
                <li>Crosstabs for relationship analysis</li>
                <li>Explore for a comprehensive understanding of the data</li>
              </>
            ) : (
              <>
                <li>Statistik Deskriptif untuk analisis yang lebih mendalam</li>
                <li>Tabulasi Silang untuk analisis hubungan</li>
                <li>Eksplorasi Data untuk pemahaman data yang komprehensif</li>
              </>
            )}
          </ul>
        </div>
      </HelpCard>
    </div>
  );
};
