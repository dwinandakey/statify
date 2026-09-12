import React from 'react';
import { ListOrdered } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const DefineTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="warning" title={isEn ? "Required Phase Before the Main Dialog" : "Fase Wajib Sebelum Dialog Utama"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Repeated Measures is the only GLM analysis that requires you to define the within-subjects factor structure first, before the main configuration dialog appears."
            : "Repeated Measures adalah satu-satunya analisis GLM yang mewajibkan Anda mendefinisikan struktur within-subjects factor terlebih dahulu, sebelum dialog konfigurasi utama muncul."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Defining the Within-Subjects Factor" : "Mendefinisikan Within-Subjects Factor"} icon={ListOrdered} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Name the Within-Subjects Factor" : "Beri Nama Within-Subjects Factor"}
            description={isEn ? "Example: 'time' for a pre/post/follow-up design." : "Contoh: 'waktu' untuk desain pre/post/follow-up."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Set the Number of Levels" : "Tentukan Jumlah Level"}
            description={isEn ? "Example: 3 levels for pre-test, post-test, and follow-up." : "Contoh: 3 level untuk pre-test, post-test, dan follow-up."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Name the Measure" : "Beri Nama Measure"}
            description={isEn ? "The name of the dependent variable measured repeatedly, e.g. 'score'. There can be more than one measure for a doubly multivariate analysis." : "Nama variabel dependen yang diukur berulang, misalnya 'skor'. Bisa lebih dari satu measure jika analisis bersifat doubly multivariate."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Click Define" : "Klik Define"}
            description={isEn ? "Proceed to the main configuration dialog to map dataset variables onto the structure you just defined." : "Lanjut ke dialog konfigurasi utama untuk memetakan variabel dataset ke struktur yang baru didefinisikan."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Editable Before You Continue" : "Bisa Diedit Sebelum Lanjut"}>
        <p className="text-sm mt-2">
          {isEn
            ? "The factor name, number of levels, and measure settings can still be changed while you're on the Define dialog, before you proceed to variable mapping in the main dialog."
            : "Pengaturan nama factor, jumlah level, dan measure bisa diubah lagi selama masih di dialog Define, sebelum Anda melanjutkan ke pemetaan variabel di dialog utama."}
        </p>
      </HelpAlert>
    </div>
  );
};
