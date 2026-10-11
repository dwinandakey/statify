import React from 'react';
import { CheckCircle, ClipboardList } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AssumptionsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Assumption Checks Can Run Separately" : "Uji Asumsi Bisa Dijalankan Terpisah"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              The Assumptions tab has a <strong>Run Assumption Tests</strong> button that writes the check results
              straight to the Output Viewer <strong>without</strong> running the full discriminant analysis. This
              button only activates once a Grouping Variable and at least one Independent Variable are selected on
              the Variables tab.
            </>
          ) : (
            <>
              Tab Assumptions memiliki tombol <strong>Run Assumption Tests</strong> yang langsung menulis hasil pemeriksaan
              ke Output Viewer <strong>tanpa</strong> menjalankan analisis diskriminan lengkap. Tombol ini baru aktif setelah
              Grouping Variable dan minimal satu Independent Variable dipilih di tab Variables.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Checks That Are Run" : "Pemeriksaan yang Dijalankan"} icon={CheckCircle} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Multicollinearity (Tolerance and VIF)"
            description={isEn ? "Detects predictors that are too strongly correlated with each other. The threshold used is VIF 10; values above that indicate multicollinearity that needs addressing, e.g. by removing one of the correlated variables." : "Mendeteksi variabel bebas yang terlalu berkorelasi satu sama lain. Ambang yang dipakai adalah VIF 10; nilai VIF di atas itu menandakan multikolinearitas yang perlu ditangani, misalnya dengan mengeluarkan salah satu variabel."}
          />
          <HelpStep
            number={2}
            title="Multivariate Normality (Henze-Zirkler)"
            description={isEn ? "Tests the joint normality of all predictors across the whole dataset. The assumption is considered met when the p-value exceeds 0.05." : "Menguji kenormalan bersama seluruh variabel bebas pada keseluruhan data. Asumsi dianggap terpenuhi jika p value lebih besar dari 0,05."}
          />
          <HelpStep
            number={3}
            title="Univariate Normality (Anderson-Darling)"
            description={isEn ? "Tests the normality of each predictor individually, also at the 0.05 level. The Normality column shows each variable's status, and a note under the table names any problematic variable." : "Menguji kenormalan tiap variabel bebas satu per satu, juga dengan taraf 0,05. Kolom Normality menunjukkan status tiap variabel, dan catatan di bawah tabel menyebutkan variabel mana yang bermasalah."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Covariance Homogeneity Lives on the Statistics Tab" : "Homogenitas Kovarians Ada di Tab Statistics"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              The assumption of equal covariance matrices across groups is not checked on this tab — it's checked via{' '}
              <strong>Box&apos;s M</strong> on the Statistics tab. Check that option so the Log Determinants and
              Box&apos;s M Test Results tables appear alongside the full analysis output.
            </>
          ) : (
            <>
              Asumsi kesamaan matriks kovarians antar kelompok tidak ada di tab ini, melainkan diperiksa lewat{' '}
              <strong>Box&apos;s M</strong> pada tab Statistics. Centang opsi tersebut agar tabel Log Determinants dan
              Box&apos;s M Test Results ikut ditampilkan bersama hasil analisis lengkap.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Reading the Assumption Checks Summary Table" : "Membaca Tabel Assumption Checks Summary"} icon={ClipboardList} variant="default">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>The <strong>Assumption</strong> and <strong>Test</strong> columns name the assumption and the test used</li>
              <li>The <strong>Finding</strong> column summarizes the key number, e.g. the highest VIF or the HZ value with its p-value</li>
              <li>The <strong>Status</strong> column states whether the assumption is met</li>
              <li>A note below the table appears when an assumption is violated, explaining what to look at</li>
            </>
          ) : (
            <>
              <li>Kolom <strong>Assumption</strong> dan <strong>Test</strong> menyebutkan asumsi serta uji yang dipakai</li>
              <li>Kolom <strong>Finding</strong> merangkum angka kuncinya, misalnya nilai VIF terbesar atau nilai HZ beserta p value</li>
              <li>Kolom <strong>Status</strong> menyatakan terpenuhi atau tidaknya asumsi tersebut</li>
              <li>Catatan di bawah tabel muncul jika ada asumsi yang dilanggar, sekaligus menjelaskan bagian mana yang perlu diperiksa</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "If an Assumption Is Not Met" : "Jika Asumsi Tidak Terpenuhi"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Normality deviations are generally tolerated with a large enough sample. If Box&apos;s M is significant,
              consider using <strong>Separate-groups</strong> on the Classify tab. If VIF is high, remove one of the
              correlated variables or use the stepwise method so redundant variables filter themselves out.
            </>
          ) : (
            <>
              Penyimpangan normalitas umumnya masih ditoleransi bila jumlah kasus cukup besar. Jika Box&apos;s M signifikan,
              pertimbangkan memakai <strong>Separate-groups</strong> pada tab Classify. Jika VIF tinggi, keluarkan salah satu
              variabel yang berkorelasi atau gunakan metode stepwise agar variabel yang berlebihan tersaring sendiri.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
