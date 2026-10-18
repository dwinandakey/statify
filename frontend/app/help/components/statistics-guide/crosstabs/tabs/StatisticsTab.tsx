import React from 'react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { Calculator, TrendingUp, Target, BarChart3, AlertTriangle } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const StatisticsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Statistics in Crosstabs Analysis" : "Statistik dalam Analisis Crosstabs"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Crosstabs analysis provides various <strong>tests of independence</strong> and <strong>measures of association</strong>{' '}
              to measure the relationship between two categorical variables. Choose the statistics that suit your data type and table size.
            </>
          ) : (
            <>
              Analisis crosstabs menyediakan berbagai <strong>uji independensi</strong> dan <strong>ukuran asosiasi</strong>{' '}
              untuk mengukur hubungan antara dua variabel kategorikal. Pilih statistik yang sesuai dengan jenis data dan ukuran tabel.
            </>
          )}
        </p>
      </HelpAlert>
      <HelpCard title={isEn ? "Chi-Square Test" : "Uji Chi-Square"} icon={Calculator} variant="feature">
        <div className="space-y-4 mt-2">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Chi-Square Test of Independence</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'\\chi^2 = \\sum \\frac{(O_{ij} - E_{ij})^2}{E_{ij}}'} />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              {isEn ? (
                <>
                  <p><strong>H₀:</strong> The two variables are independent (no relationship)</p>
                  <p><strong>H₁:</strong> There is a relationship between the two variables</p>
                </>
              ) : (
                <>
                  <p><strong>H₀:</strong> Kedua variabel independen (tidak ada hubungan)</p>
                  <p><strong>H₁:</strong> Ada hubungan antara kedua variabel</p>
                </>
              )}
              <p>
                <strong>df:</strong>{' '}
                <InlineMath math={'(r-1)(c-1)'} />
              </p>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">{isEn ? "Interpreting the Results" : "Interpretasi Hasil"}</h4>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              {isEn ? (
                <>
                  <p><strong>p-value &lt; 0.05:</strong> Reject H₀; there is a significant relationship</p>
                  <p><strong>p-value ≥ 0.05:</strong> Fail to reject H₀; there is no evidence of a relationship</p>
                  <p><strong>Effect size:</strong> Use Cramer&apos;s V to measure the strength of the relationship</p>
                </>
              ) : (
                <>
                  <p><strong>p-value &lt; 0.05:</strong> Tolak H₀, ada hubungan signifikan</p>
                  <p><strong>p-value ≥ 0.05:</strong> Terima H₀, tidak ada bukti hubungan</p>
                  <p><strong>Effect size:</strong> Gunakan Cramer&apos;s V untuk mengukur kekuatan hubungan</p>
                </>
              )}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">{isEn ? "Chi-Square Assumptions" : "Asumsi Chi-Square"}</h4>
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
              {isEn ? (
                <>
                  <p>• Expected frequency ≥ 5 in every cell</p>
                  <p>• Independent observations</p>
                  <p>• A random sample</p>
                  <p>• Mutually exclusive categories</p>
                </>
              ) : (
                <>
                  <p>• Frekuensi yang diharapkan ≥ 5 di setiap sel</p>
                  <p>• Observasi independen</p>
                  <p>• Sampel acak</p>
                  <p>• Kategori saling eksklusif</p>
                </>
              )}
            </div>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Measures of Association" : "Ukuran Asosiasi"} icon={TrendingUp} variant="default">
        <div className="space-y-4 mt-2">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Cramer&apos;s V</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'V = \\sqrt{ \\dfrac{ \\chi^2 }{ n \\cdot \\min(r-1, \\; c-1) } }'} />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              {isEn ? (
                <>
                  <p><strong>Range:</strong> 0 - 1 (0 = no association, 1 = perfect association)</p>
                  <p><strong>Interpretation:</strong> 0.1 = weak, 0.3 = moderate, 0.5 = strong</p>
                  <p><strong>Use:</strong> Can be used for tables of any size</p>
                </>
              ) : (
                <>
                  <p><strong>Rentang:</strong> 0 - 1 (0 = tidak ada asosiasi, 1 = asosiasi sempurna)</p>
                  <p><strong>Interpretasi:</strong> 0.1 = lemah, 0.3 = sedang, 0.5 = kuat</p>
                  <p><strong>Kegunaan:</strong> Dapat digunakan untuk tabel berukuran apa pun</p>
                </>
              )}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Phi Coefficient (φ)</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'\\varphi = \\sqrt{ \\dfrac{ \\chi^2 }{ n } }'} />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              {isEn ? (
                <>
                  <p><strong>Range:</strong> 0 - 1 for 2×2 tables</p>
                  <p><strong>Specifically for:</strong> 2×2 contingency tables</p>
                  <p><strong>Equivalent to:</strong> The Pearson correlation for dichotomous variables</p>
                </>
              ) : (
                <>
                  <p><strong>Rentang:</strong> 0 - 1 untuk tabel 2×2</p>
                  <p><strong>Khusus untuk:</strong> Tabel kontingensi 2×2</p>
                  <p><strong>Setara dengan:</strong> Korelasi Pearson untuk variabel dikotomi</p>
                </>
              )}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Contingency Coefficient (C)</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'C = \\sqrt{ \\dfrac{ \\chi^2 }{ \\chi^2 + n } }'} />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              {isEn ? (
                <>
                  <p><strong>Range:</strong> 0 to below 1 (the maximum depends on the table size)</p>
                  <p><strong>Use:</strong> An alternative for tables of different sizes</p>
                  <p><strong>Note:</strong> Hard to compare across tables of different sizes</p>
                </>
              ) : (
                <>
                  <p><strong>Rentang:</strong> 0 - tidak mencapai 1 (maksimum tergantung ukuran tabel)</p>
                  <p><strong>Kegunaan:</strong> Alternatif untuk tabel dengan ukuran berbeda</p>
                  <p><strong>Catatan:</strong> Sulit dibandingkan antar tabel berbeda ukuran</p>
                </>
              )}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Lambda (λ)</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'\\lambda = \\dfrac{E_1 + E_2 - E_0}{2n - E_0}'} />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              {isEn ? (
                <>
                  <p><strong>Interpretation:</strong> Proportional reduction in error (PRE)</p>
                  <p><strong>Use:</strong> Measures asymmetric predictability</p>
                  <p><strong>Range:</strong> 0 - 1 (the proportional reduction in prediction error)</p>
                </>
              ) : (
                <>
                  <p><strong>Interpretasi:</strong> Proportional reduction in error (PRE)</p>
                  <p><strong>Kegunaan:</strong> Mengukur prediktabilitas asimetrik</p>
                  <p><strong>Rentang:</strong> 0 - 1 (proporsi pengurangan kesalahan prediksi)</p>
                </>
              )}
            </div>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Alternative Tests" : "Uji Alternatif"} icon={Target} variant="default">
        <div className="space-y-4 mt-2">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Fisher&apos;s Exact Test</h4>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              {isEn ? (
                <>
                  <p><strong>When to use:</strong> Expected frequencies &lt; 5 in some cells</p>
                  <p><strong>Advantage:</strong> Gives an exact p-value that does not depend on assumptions</p>
                  <p><strong>Limitation:</strong> Computationally intensive for large tables</p>
                  <p><strong>Ideal for:</strong> 2×2 tables with small samples</p>
                </>
              ) : (
                <>
                  <p><strong>Kapan digunakan:</strong> Frekuensi yang diharapkan &lt; 5 di beberapa sel</p>
                  <p><strong>Keunggulan:</strong> Memberikan p-value yang tepat, tidak bergantung pada asumsi</p>
                  <p><strong>Keterbatasan:</strong> Komputasi intensif untuk tabel besar</p>
                  <p><strong>Ideal untuk:</strong> Tabel 2×2 dengan sampel kecil</p>
                </>
              )}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Likelihood Ratio Chi-Square</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'G^2 = 2 \\sum O_{ij} \\ln \\left( \\dfrac{O_{ij}}{E_{ij}} \\right)'} />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              {isEn ? (
                <>
                  <p><strong>Use:</strong> An alternative to the classic Chi-Square</p>
                  <p><strong>Advantage:</strong> More sensitive for small samples</p>
                  <p><strong>Interpretation:</strong> The same as the ordinary Chi-Square</p>
                </>
              ) : (
                <>
                  <p><strong>Kegunaan:</strong> Alternatif untuk Chi-Square klasik</p>
                  <p><strong>Keunggulan:</strong> Lebih sensitif untuk sampel kecil</p>
                  <p><strong>Interpretasi:</strong> Sama dengan Chi-Square biasa</p>
                </>
              )}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Linear-by-Linear Association</h4>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              {isEn ? (
                <>
                  <p><strong>When to use:</strong> Both variables are ordinal</p>
                  <p><strong>Advantage:</strong> More powerful for detecting a linear trend</p>
                  <p><strong>Interpretation:</strong> Tests for a linear trend in the association</p>
                  <p><strong>df = 1:</strong> Always has 1 degree of freedom</p>
                </>
              ) : (
                <>
                  <p><strong>Kapan digunakan:</strong> Kedua variabel bersifat ordinal</p>
                  <p><strong>Keunggulan:</strong> Lebih powerful untuk mendeteksi tren linear</p>
                  <p><strong>Interpretasi:</strong> Menguji tren linear dalam asosiasi</p>
                  <p><strong>df = 1:</strong> Selalu memiliki 1 derajat kebebasan</p>
                </>
              )}
            </div>
          </div>
        </div>
      </HelpCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HelpCard title={isEn ? "Choosing a Measure of Association" : "Pemilihan Ukuran Asosiasi"} variant="default" icon={BarChart3}>
          <div className="space-y-4 mt-2">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">{isEn ? "Recommendations by Table Size" : "Rekomendasi Berdasarkan Ukuran Tabel"}</h4>
              <div className="text-sm space-y-2 text-muted-foreground">
                {isEn ? (
                  <>
                    <p><strong>2×2 tables:</strong> Phi Coefficient</p>
                    <p><strong>Any table:</strong> Cramer&apos;s V</p>
                    <p><strong>Ordinal variables:</strong> Gamma, Tau-b, Tau-c</p>
                    <p><strong>Asymmetric prediction:</strong> Lambda</p>
                  </>
                ) : (
                  <>
                    <p><strong>Tabel 2×2:</strong> Phi Coefficient</p>
                    <p><strong>Tabel Apa Pun:</strong> Cramer&apos;s V</p>
                    <p><strong>Variabel Ordinal:</strong> Gamma, Tau-b, Tau-c</p>
                    <p><strong>Prediksi Asimetrik:</strong> Lambda</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">{isEn ? "Interpreting the Strength of Association" : "Interpretasi Kekuatan Asosiasi"}</h4>
              <div className="text-sm space-y-2 text-muted-foreground">
                {isEn ? (
                  <>
                    <p><strong>0.00 - 0.09:</strong> Very weak/none</p>
                    <p><strong>0.10 - 0.29:</strong> Weak</p>
                    <p><strong>0.30 - 0.49:</strong> Moderate</p>
                    <p><strong>0.50 - 1.00:</strong> Strong</p>
                  </>
                ) : (
                  <>
                    <p><strong>0.00 - 0.09:</strong> Sangat lemah/tidak ada</p>
                    <p><strong>0.10 - 0.29:</strong> Lemah</p>
                    <p><strong>0.30 - 0.49:</strong> Sedang</p>
                    <p><strong>0.50 - 1.00:</strong> Kuat</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </HelpCard>

        <HelpCard title={isEn ? "Cautions When Interpreting" : "Perhatian dalam Interpretasi"} variant="default" icon={AlertTriangle}>
          <div className="text-sm space-y-2 mt-2">
            {isEn ? (
              <>
                <p>
                  <strong>Significance vs Strength:</strong> A significant Chi-Square does not always mean a strong relationship.
                  With a large sample, even a weak association can be statistically significant.
                </p>
                <p>
                  <strong>Causality:</strong> A significant association does not imply a causal relationship.
                  Consider possible confounding variables.
                </p>
                <p>
                  <strong>Practical Validity:</strong> Always consider whether the results are practically meaningful
                  in the context of your research.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>Signifikansi vs Kekuatan:</strong> Chi-Square yang signifikan tidak selalu berarti hubungan yang kuat.
                  Dengan sampel besar, bahkan asosiasi lemah bisa menjadi signifikan secara statistik.
                </p>
                <p>
                  <strong>Kausalitas:</strong> Asosiasi yang signifikan tidak menyiratkan hubungan kausal.
                  Pertimbangkan kemungkinan confounding variables.
                </p>
                <p>
                  <strong>Validitas Praktis:</strong> Selalu pertimbangkan apakah hasil secara praktis bermakna
                  dalam konteks penelitian Anda.
                </p>
              </>
            )}
          </div>
        </HelpCard>
      </div>
    </div>
  );
};
