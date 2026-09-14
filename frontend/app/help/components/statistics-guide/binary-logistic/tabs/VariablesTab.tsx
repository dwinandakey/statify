import React from 'react';
import { Table, SlidersHorizontal } from 'lucide-react';
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
                ? "Select a single binary variable (exactly 2 unique values) as the outcome — for example 0/1, Yes/No, or Pass/Fail."
                : "Pilih satu variabel biner (hanya memiliki 2 nilai unik) sebagai variabel outcome. Variabel ini harus memiliki tepat 2 kategori, misalnya 0/1, Ya/Tidak, atau Lulus/Gagal."
            }
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose Covariates (Independent Variables)" : "Pilih Kovariat (Variabel Independen)"}
            description={
              isEn
                ? "Move one or more predictors into the Covariates box. Select a variable and click the arrow button, or drag and drop it directly into the target box."
                : "Pindahkan satu atau lebih variabel prediktor ke kotak Covariates. Anda dapat memilih variabel lalu klik tombol panah, atau langsung drag and drop variabel ke kotak target."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose the Variable-Selection Method" : "Pilih Metode Seleksi Variabel"}
            description={
              isEn
                ? "Use the Method dropdown at the bottom of the tab to pick the approach that fits your analysis."
                : "Gunakan dropdown Method di bagian bawah untuk memilih metode yang sesuai dengan kebutuhan analisis Anda."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Tip: Drag and Drop" : "Tips: Drag and Drop"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              You can drag and drop variables to move them. Click a variable in the list on the left, then drag it
              into the Dependent or Covariates box on the right. Use <strong>Ctrl/Cmd + click</strong> to select
              multiple variables at once, then drag once to move them all together.
            </>
          ) : (
            <>
              Anda dapat menggunakan fitur drag and drop untuk memindahkan variabel. Klik variabel di daftar
              sebelah kiri, lalu seret (drag) ke kotak Dependent atau Covariates di sebelah kanan.
              Gunakan <strong>Ctrl/Cmd + klik</strong> untuk memilih beberapa variabel sekaligus,
              lalu drag sekali untuk memindahkan semuanya.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Variable-Selection Methods" : "Metode Seleksi Variabel"} icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Enter"
            description={
              isEn
                ? "All predictors are entered into the model simultaneously. Best when you already know which variables are relevant from theory."
                : "Semua variabel prediktor dimasukkan ke dalam model secara bersamaan. Cocok ketika Anda sudah mengetahui variabel mana yang relevan berdasarkan teori."
            }
          />
          <HelpStep
            number={2}
            title={isEn ? "Forward (Conditional / LR / Wald)" : "Forward (Conditional / LR / Wald)"}
            description={
              isEn
                ? "Variables are added one at a time based on a statistical criterion. Forward Conditional uses the conditional likelihood-ratio statistic, Forward LR uses the likelihood-ratio test, and Forward Wald uses the Wald test."
                : "Variabel ditambahkan satu per satu ke dalam model berdasarkan kriteria statistik. Forward Conditional menggunakan uji rasio likelihood kondisional, Forward LR menggunakan likelihood ratio test, dan Forward Wald menggunakan Wald test."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Backward (Conditional / LR / Wald)" : "Backward (Conditional / LR / Wald)"}
            description={
              isEn
                ? "Starts with all variables in the model, then removes non-significant variables one at a time. The criteria mirror Forward, but the elimination direction is reversed."
                : "Dimulai dengan semua variabel dalam model, kemudian variabel yang tidak signifikan dihapus satu per satu. Prinsip kriteria sama seperti Forward, tetapi arah eliminasinya terbalik."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="info" title={isEn ? "Variable Types" : "Tipe Variabel"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              The dependent variable <strong>must</strong> be binary (2 categories). Nominal or ordinal variables
              moved into Covariates are automatically flagged in the Categorical tab with a default Indicator
              contrast (reference: Last).
            </>
          ) : (
            <>
              Variabel dependen <strong>harus</strong> bersifat biner (2 kategori). Variabel nominal atau ordinal
              yang dipindahkan ke Covariates akan otomatis ditandai di tab Categorical dengan pengaturan default
              kontras Indicator (referensi: Last).
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
