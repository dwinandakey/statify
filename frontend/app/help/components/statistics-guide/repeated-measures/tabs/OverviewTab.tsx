import React from 'react';
import { HelpCircle, ClipboardList } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "What is GLM Repeated Measures?" : "Apa itu GLM Repeated Measures?"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              GLM Repeated Measures analyzes data where <strong>each subject is measured multiple times</strong>, e.g.
              at several time points or under different conditions. This analysis tests within-subjects effects
              (between measurements on the same subject) as well as between-subjects effects (between groups), if
              present.
            </>
          ) : (
            <>
              GLM Repeated Measures menganalisis data di mana <strong>setiap subjek diukur beberapa kali</strong>, misalnya
              pada beberapa titik waktu atau kondisi berbeda. Analisis ini menguji efek within-subjects (antar pengukuran
              pada subjek yang sama) sekaligus efek between-subjects (antar kelompok), jika ada.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "When to Use Repeated Measures?" : "Kapan Menggunakan Repeated Measures?"} icon={HelpCircle} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>Pre-test / post-test / follow-up designs on the same subjects</li>
              <li>Every subject receives all treatment levels (a full within-subjects design)</li>
              <li>A mixed design: there's a within-subjects factor (time) and a between-subjects factor (group)</li>
              <li>More than one variable measured repeatedly on the same within-subjects factor (doubly multivariate)</li>
            </>
          ) : (
            <>
              <li>Desain pre-test / post-test / follow-up pada subjek yang sama</li>
              <li>Setiap subjek menerima semua level treatment (desain within-subjects penuh)</li>
              <li>Desain campuran: ada faktor within-subjects (waktu) dan faktor between-subjects (kelompok)</li>
              <li>Lebih dari satu variabel diukur berulang pada within-subjects factor yang sama (doubly multivariate)</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpCard title={isEn ? "Difference from GLM Univariate & Multivariate" : "Bedanya dengan GLM Univariate & Multivariate"} icon={ClipboardList} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>The only GLM with a <strong>two-phase</strong> dialog flow: Define first, then the main dialog</li>
              <li>A distinctive output: <strong>Mauchly's Test of Sphericity</strong> along with the Greenhouse-Geisser, Huynh-Feldt, and Lower-bound corrections</li>
              <li>Dataset variables are mapped to level×measure combinations, rather than selected directly as a single dependent variable</li>
            </>
          ) : (
            <>
              <li>Satu-satunya GLM dengan alur dialog <strong>dua fase</strong>: Define dulu, baru dialog utama</li>
              <li>Output khas: <strong>Mauchly&apos;s Test of Sphericity</strong> beserta koreksi Greenhouse-Geisser, Huynh-Feldt, dan Lower-bound</li>
              <li>Variabel dataset dipetakan ke kombinasi level×measure, bukan dipilih langsung sebagai satu dependent variable</li>
            </>
          )}
        </ul>
      </HelpCard>
    </div>
  );
};
