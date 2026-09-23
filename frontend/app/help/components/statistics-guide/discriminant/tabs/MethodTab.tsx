import React from 'react';
import { Layers, Target, ClipboardList } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const MethodTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="warning" title={isEn ? "This Tab Only Appears for the Stepwise Method" : "Tab Ini Hanya Muncul pada Metode Stepwise"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>Select <strong>Use stepwise method</strong> on the Variables tab first so the Method tab appears.</>
          ) : (
            <>Pilih <strong>Use stepwise method</strong> pada tab Variables terlebih dahulu agar tab Method tampil.</>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Variable Selection Criteria" : "Kriteria Pemilihan Variabel"} icon={Layers} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Wilks' Lambda (Default)"
            description={isEn ? "At each step, the variable chosen is the one that most reduces Wilks' Lambda, i.e. improves overall group separation the most. This is the most common and easiest to explain." : "Pada setiap langkah, variabel yang dipilih adalah yang paling menurunkan nilai Wilks' Lambda, artinya paling memperbaiki pemisahan antar kelompok secara keseluruhan. Ini pilihan paling umum dan paling mudah dijelaskan."}
          />
          <HelpStep
            number={2}
            title="Unexplained Variance"
            description={isEn ? "Chooses the variable that most reduces the total between-group variance not yet explained by the model." : "Memilih variabel yang paling memperkecil total variasi antar kelompok yang belum terjelaskan oleh model."}
          />
          <HelpStep
            number={3}
            title="Mahalanobis Distance"
            description={isEn ? "Chooses the variable that most increases the smallest Mahalanobis distance between any pair of groups. Good when the main concern is separating the two most similar groups." : "Memilih variabel yang paling memperbesar jarak Mahalanobis terkecil antar pasangan kelompok. Cocok jika perhatian utama adalah memisahkan dua kelompok yang paling mirip."}
          />
          <HelpStep
            number={4}
            title="Smallest F Ratio"
            description={isEn ? "Chooses the variable that maximizes the smallest F value across all group pairs, also focusing on the hardest-to-separate pair." : "Memilih variabel yang memaksimalkan nilai F terkecil dari seluruh pasangan kelompok, jadi fokusnya juga pada pasangan kelompok yang paling sulit dibedakan."}
          />
          <HelpStep
            number={5}
            title="Rao's V"
            description={isEn ? "Chooses the variable giving the largest increase in Rao's V. Fill in the V-to-enter box to set the minimum increase a variable must reach to enter. This box is only active when Rao's V is selected." : "Memilih variabel yang memberi kenaikan Rao's V terbesar. Isi kotak V-to-enter untuk menetapkan kenaikan minimum yang harus dicapai agar sebuah variabel boleh masuk. Kotak ini hanya aktif ketika Rao's V dipilih."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Criteria: Entry and Removal Thresholds" : "Criteria: Ambang Masuk dan Keluar"} icon={Target} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Use F Value (Default)"
            description={isEn ? "A variable enters when F-to-enter exceeds the Entry value, and is removed when F-to-remove drops below the Removal value. Defaults are Entry 3.84 and Removal 2.71, matching SPSS." : "Variabel masuk jika F-to-enter melebihi nilai Entry, dan dikeluarkan jika F-to-remove turun di bawah nilai Removal. Nilai bawaan adalah Entry 3.84 dan Removal 2.71, sama dengan SPSS."}
          />
          <HelpStep
            number={2}
            title="Use Probability of F"
            description={isEn ? "The same criterion expressed as a probability. A variable enters when its F significance is smaller than Entry, and leaves when it is larger than Removal. Defaults are Entry 0.05 and Removal 0.10." : "Kriteria yang sama dinyatakan dalam bentuk peluang. Variabel masuk jika signifikansi F-nya lebih kecil dari Entry, dan keluar jika lebih besar dari Removal. Nilai bawaan adalah Entry 0.05 dan Removal 0.10."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Important Rule for Entry and Removal Values" : "Aturan Penting Nilai Entry dan Removal"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              With F Value, the <strong>Entry value must be larger</strong> than Removal. Conversely, with Probability
              of F, the <strong>Entry value must be smaller</strong> than Removal. Breaking this rule can cause
              variables to cycle in and out repeatedly without the selection process ever settling.
            </>
          ) : (
            <>
              Jika memakai F Value, nilai <strong>Entry harus lebih besar</strong> daripada Removal. Sebaliknya jika memakai
              Probability of F, nilai <strong>Entry harus lebih kecil</strong> daripada Removal. Jika aturan ini dilanggar,
              variabel bisa keluar masuk berulang dan proses seleksi tidak berhenti dengan wajar.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title="Display" icon={ClipboardList} variant="default">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Summary of Steps (On by Default)" : "Summary of Steps (Default Aktif)"}
            description={isEn ? "Shows the Variables Entered/Removed, Variables in the Analysis, Variables Not in the Analysis, and Wilks' Lambda per step tables — the full trace of the selection process." : "Menampilkan tabel Variables Entered/Removed, Variables in the Analysis, Variables Not in the Analysis, dan Wilks' Lambda per langkah. Inilah rekam jejak lengkap proses seleksi."}
          />
          <HelpStep
            number={2}
            title="F for Pairwise Distances"
            description={isEn ? "Adds a matrix of pairwise group distances expressed as F values at every step, useful for seeing which pair of groups separates further each time a new variable enters." : "Menambahkan matriks jarak antar pasangan kelompok dalam bentuk nilai F pada setiap langkah, berguna untuk melihat pasangan kelompok mana yang makin terpisah setiap kali variabel baru masuk."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Stepwise Is No Substitute for Theory" : "Stepwise Bukan Pengganti Teori"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Stepwise selection picks variables based on the data at hand, so results can change on a different sample. Use it as an exploratory tool, then make sure the chosen variables still make substantive sense."
            : "Seleksi stepwise memilih variabel berdasarkan data yang ada, sehingga hasilnya bisa berubah pada sampel lain. Gunakan sebagai alat bantu eksplorasi, lalu pastikan variabel terpilih tetap masuk akal secara substansi."}
        </p>
      </HelpAlert>
    </div>
  );
};
