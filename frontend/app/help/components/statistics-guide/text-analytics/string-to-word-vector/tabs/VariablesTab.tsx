import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const VariablesTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Choosing the Text Variable" : "Pemilihan Variabel Teks"} icon={ArrowRightLeft} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Variables List" : "Daftar Variabel"}
            description={
              isEn
                ? "The left list shows the variables that can be processed: variables of type String or with a nominal measure. Click a variable to highlight it; click it again to clear the highlight."
                : "Daftar di kiri menampilkan variabel yang dapat diproses: variabel bertipe String atau berukuran nominal. Klik variabel untuk menandainya; klik sekali lagi untuk membatalkan tanda."
            }
          />
          <HelpStep
            number={2}
            title={isEn ? "Move Button" : "Tombol Pindah"}
            description={
              isEn
                ? "Press the arrow button to move the highlighted variable into Target Variable. The button is disabled when no variable is highlighted or when the target already holds a variable."
                : "Tekan tombol panah untuk memindahkan variabel yang ditandai ke Target Variable. Tombol nonaktif bila belum ada variabel yang ditandai atau target sudah berisi variabel."
            }
          />
          <HelpStep
            number={3}
            title="Target Variable"
            description={
              isEn
                ? "Holds exactly one text variable to process. Click the variable in this box to remove it. The OK button is enabled only after a variable is placed here and every option is valid."
                : "Berisi tepat satu variabel teks yang akan diproses. Klik variabel di kotak ini untuk mengeluarkannya. Tombol OK baru aktif setelah variabel diletakkan di sini dan semua opsi sah."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Tip: Data in the Variable" : "Tips: Isi Variabel"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Each row is one document. Empty cells are kept as empty documents (a row of zeros) so the new columns stay aligned with the dataset. Numbers in a nominal numeric variable are read as text."
            : "Setiap baris adalah satu dokumen. Sel kosong tetap dipertahankan sebagai dokumen kosong (baris bernilai nol) agar kolom baru tetap sejajar dengan dataset. Angka pada variabel numerik nominal dibaca sebagai teks."}
        </p>
      </HelpAlert>
    </div>
  );
};
