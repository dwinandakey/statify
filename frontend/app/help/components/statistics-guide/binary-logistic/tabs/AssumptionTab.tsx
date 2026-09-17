import React from 'react';
import { Shield, GitBranch, Waves } from 'lucide-react';
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
                ? "Click Check VIF (requires a dependent variable and at least 2 covariates) to detect strong correlation among independent variables. Statify fits the actual logistic model to compute VIF, and automatically switches to Generalized VIF (GVIF) when a covariate has 3 or more categories — matching R's car::vif(). Results, plus a VIF Interpretation Guide, are printed to the Output Viewer."
                : "Klik Check VIF (membutuhkan variabel dependen dan minimal 2 kovariat) untuk mendeteksi apakah variabel independen saling berkorelasi tinggi. Statify menghitung VIF dari model regresi logistik yang sungguh-sungguh di-fit, dan otomatis beralih ke Generalized VIF (GVIF) saat ada kovariat dengan 3 kategori atau lebih — mengikuti konvensi car::vif() di R. Hasilnya, beserta tabel VIF Interpretation Guide, dicetak ke Output Viewer."
            }
          />
          <HelpStep
            number={2}
            title="Box-Tidwell Test"
            description={
              isEn
                ? "Click Run Box-Tidwell (requires a dependent variable and at least 1 eligible continuous covariate) to test whether each continuous predictor has a linear relationship with the logit (log-odds) of the outcome. All constructed variables (X·ln(X)) are added to the model simultaneously alongside the original covariates; a significant Score Statistic (p < 0.05) indicates a violation of the linearity assumption for that predictor."
                : "Klik Run Box-Tidwell (membutuhkan variabel dependen dan minimal 1 kovariat kontinu yang memenuhi syarat) untuk menguji apakah setiap prediktor kontinu memiliki hubungan linear dengan logit (log-odds) dari variabel dependen. Seluruh constructed variable (X·ln(X)) dimasukkan ke model secara simultan bersama kovariat aslinya; Score Statistic yang signifikan (p < 0,05) menunjukkan pelanggaran asumsi linearitas untuk prediktor tersebut."
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Reading the VIF Output Table" : "Membaca Tabel Output VIF"} icon={GitBranch} variant="default">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li><strong>Variable</strong> — each covariate included in the check (a categorical covariate's dummy columns are grouped into a single row).</li>
              <li><strong>Tolerance</strong> — 1 / VIF (or 1 / GVIF); values close to 0 signal severe collinearity.</li>
              <li><strong>VIF</strong>, or <strong>GVIF / Df / GVIF^(1/2Df)</strong> — the collinearity statistic itself. Statify shows plain VIF when every covariate occupies a single column; the moment any categorical covariate has 3+ categories, the whole table switches to GVIF with its degrees of freedom (Df) and the adjusted GVIF^(1/2Df), so every row — continuous ones included — stays on a comparable scale, the same convention R's car::vif() uses.</li>
              <li><strong>Concern Level</strong> — Acceptable or Problematic, read directly from the VIF Interpretation Guide table underneath. The cutoff is VIF ≥ 10 (equivalently Tolerance ≤ 0.10), the single most widely used threshold in applied research (Hair, Black, Babin, &amp; Anderson, 2010, Multivariate Data Analysis, 7th ed.), automatically square-root-adjusted (√10 ≈ 3.16) whenever the table is on the GVIF^(1/2Df) scale.</li>
            </>
          ) : (
            <>
              <li><strong>Variable</strong> — setiap kovariat yang diikutsertakan dalam pemeriksaan (kolom-kolom dummy dari satu kovariat kategorikal digabung jadi satu baris).</li>
              <li><strong>Tolerance</strong> — 1 / VIF (atau 1 / GVIF); nilai mendekati 0 menandakan kolinearitas yang parah.</li>
              <li><strong>VIF</strong>, atau <strong>GVIF / Df / GVIF^(1/2Df)</strong> — statistik kolinearitasnya sendiri. Statify menampilkan VIF biasa saat setiap kovariat hanya menempati satu kolom; begitu ada kovariat kategorikal dengan 3 kategori atau lebih, seluruh tabel beralih ke GVIF beserta derajat bebasnya (Df) dan GVIF^(1/2Df) yang disesuaikan, sehingga setiap baris — termasuk variabel kontinu — tetap berada pada skala yang sebanding, konvensi yang sama dengan car::vif() di R.</li>
              <li><strong>Concern Level</strong> — Acceptable atau Problematic, dibaca langsung dari tabel VIF Interpretation Guide di bawahnya. Ambang batasnya adalah VIF ≥ 10 (setara dengan Tolerance ≤ 0,10), referensi tunggal yang paling banyak dipakai dalam penelitian terapan (Hair, Black, Babin, &amp; Anderson, 2010, Multivariate Data Analysis, edisi ke-7), otomatis disesuaikan dengan akar kuadrat (√10 ≈ 3,16) saat tabel berada pada skala GVIF^(1/2Df).</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpCard title={isEn ? "Reading the Box-Tidwell Output Table" : "Membaca Tabel Output Box-Tidwell"} icon={Waves} variant="default">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>Not every covariate is tested — binary/dichotomous covariates, variables marked categorical on the Categorical tab, variables with 4 or fewer unique values, and constant variables are skipped automatically (though they still enter the model as control variables) and listed separately in the <strong>Variables Excluded from Box-Tidwell Test</strong> table with the reason why.</li>
              <li>If an eligible covariate has values ≤ 0, Statify shifts it (X&apos; = X − min(X) + 1) before computing X&apos;·ln(X&apos;) so the logarithm is defined; a note under the table flags this.</li>
              <li><strong>Interaction Term</strong>, <strong>B</strong>, <strong>S.E.</strong> — the constructed variable (e.g. &quot;age by ln(age)&quot;) and its coefficient/standard error from the augmented model.</li>
              <li><strong>Score Statistic (z)</strong>, <strong>df</strong>, <strong>Sig.</strong> — the linearity test itself; a Sig. below 0.05 means that predictor&apos;s relationship with the logit is not linear, and a power/log transformation (or treating it as categorical) should be considered.</li>
            </>
          ) : (
            <>
              <li>Tidak semua kovariat diuji — kovariat biner/dikotomis, variabel yang ditandai kategorikal di tab Categorical, variabel dengan 4 atau kurang nilai unik, dan variabel konstan otomatis dilewati (namun tetap masuk model sebagai variabel kontrol) dan dicantumkan terpisah pada tabel <strong>Variables Excluded from Box-Tidwell Test</strong> beserta alasannya.</li>
              <li>Jika kovariat yang memenuhi syarat memiliki nilai ≤ 0, Statify menggeser nilainya (X&apos; = X − min(X) + 1) sebelum menghitung X&apos;·ln(X&apos;) agar logaritmanya terdefinisi; catatan di bawah tabel akan menandai hal ini.</li>
              <li><strong>Interaction Term</strong>, <strong>B</strong>, <strong>S.E.</strong> — constructed variable-nya (misalnya &quot;age by ln(age)&quot;) beserta koefisien/standar error dari model augmented.</li>
              <li><strong>Score Statistic (z)</strong>, <strong>df</strong>, <strong>Sig.</strong> — uji linearitasnya sendiri; Sig. di bawah 0,05 berarti hubungan prediktor tersebut dengan logit tidak linear, dan transformasi power/log (atau memperlakukannya sebagai kategorikal) perlu dipertimbangkan.</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Important: Logistic Regression Assumptions" : "Penting: Asumsi Regresi Logistik"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Binary logistic regression relies on several key assumptions: (1) the dependent variable is binary,
              (2) observations are independent of each other, (3) there is no severe multicollinearity among
              predictors — checked via VIF/GVIF, and (4) continuous predictors have a linear relationship with the
              logit — checked via the Box-Tidwell test. Check these assumptions on this tab before interpreting the
              model output.
            </>
          ) : (
            <>
              Regresi logistik memiliki beberapa asumsi penting: (1) variabel dependen bersifat biner,
              (2) observasi saling independen, (3) tidak ada multikolinearitas berlebihan antar prediktor —
              diperiksa lewat VIF/GVIF, dan (4) hubungan linear antara variabel kontinu dan logit — diperiksa
              lewat uji Box-Tidwell. Periksa asumsi-asumsi ini pada tab ini sebelum menginterpretasikan hasil
              model.
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
