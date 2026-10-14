import React from 'react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { Table, Calculator, BarChart3, EyeOff } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const CellsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Cell Configuration for Crosstabs Analysis" : "Konfigurasi Cell untuk Analisis Crosstabs"}>
        <p className="text-sm mt-2">
          {isEn
            ? "The Cells tab configures the statistics shown in each cell of the contingency table. Choose a combination of counts, percentages, and residuals to suit your analysis and interpretation needs."
            : "CellsTab mengonfigurasi statistik yang ditampilkan dalam setiap cell tabel kontingensi. Pilih kombinasi counts, percentages, dan residuals sesuai kebutuhan analisis dan interpretasi."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Cell Configuration Workflow" : "Workflow Konfigurasi Cell"} icon={Table} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Choose Counts" : "Pilih Counts"}
            description={isEn
              ? "Choose the type of count to display: observed (actual), expected (theoretical), or both."
              : "Tentukan jenis count yang ingin ditampilkan: observed (actual), expected (theoretical), atau keduanya."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose Percentages" : "Pilih Percentages"}
            description={isEn
              ? "Choose the type of percentage: within row, within column, or total percentage for different interpretations."
              : "Pilih jenis persentase: within row, within column, atau total percentage untuk interpretasi yang berbeda."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose Residuals" : "Pilih Residuals"}
            description={isEn
              ? "Add residual analysis to evaluate deviations from the independence hypothesis."
              : "Tambahkan residual analysis untuk mengevaluasi deviasi dari independence hypothesis."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Count Options" : "Opsi Counts"} icon={Table} variant="feature">
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Table className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Observed Counts</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                {isEn ? "Shows the actual frequency in each cell" : "Menampilkan frekuensi aktual dalam setiap cell"}
              </p>
              <ul className="text-xs space-y-1 text-blue-600 dark:text-blue-400">
                {isEn ? (
                  <>
                    <li>• The original data, weighted by case weights</li>
                    <li>• Default: ON (always shown)</li>
                    <li>• Essential for basic interpretation</li>
                  </>
                ) : (
                  <>
                    <li>• Data asli yang weighted dengan case weights</li>
                    <li>• Default: ON (selalu ditampilkan)</li>
                    <li>• Essential untuk interpretasi basic</li>
                  </>
                )}
              </ul>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Expected Counts</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
                Expected = (row total × column total) / grand total
              </p>
              <ul className="text-xs space-y-1 text-emerald-600 dark:text-emerald-400">
                {isEn ? (
                  <>
                    <li>• The theoretical frequency under independence</li>
                    <li>• Rounded to 1 decimal place for display</li>
                    <li>• Important for Chi-square analysis</li>
                  </>
                ) : (
                  <>
                    <li>• Theoretical frequency under independence</li>
                    <li>• Rounded to 1 decimal place untuk display</li>
                    <li>• Penting untuk Chi-square analysis</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Hide Small Counts</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {isEn
                ? "Hides cells whose observed count is below the specified threshold. Useful for hiding categories with very low frequencies."
                : "Menyembunyikan cells dengan observed count kurang dari threshold yang ditentukan. Berguna untuk menyembunyikan kategori dengan frekuensi sangat rendah."}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-2">Expected Count Formula</h4>
            <BlockMath math={'E_{ij} = \\dfrac{\\text{rowTotals}[i] \\times \\text{colTotals}[j]}{W}'} />
            <div className="text-xs text-slate-700 dark:text-slate-300 mt-2">
              <p>
                <strong>{isEn ? "Where:" : "Di mana:"}</strong> E<sub>ij</sub> = Expected count, W = Grand total
              </p>
            </div>
          </div>
        </div>
      </HelpCard>
      <HelpCard title={isEn ? "Percentage Options" : "Opsi Percentages"} icon={BarChart3} variant="feature">
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">% within Row</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                {isEn ? "The percentage of each cell relative to the row total" : "Persentase setiap cell terhadap row total"}
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                <p><strong>Formula:</strong></p>
                <p>cell / row_total × 100</p>
                <p><strong>{isEn ? "UI label:" : "Label UI:"}</strong> {isEn ? "Dynamic, based on the variable name" : "Dinamis berdasarkan variable name"}</p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">% within Column</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
                {isEn ? "The percentage of each cell relative to the column total" : "Persentase setiap cell terhadap column total"}
              </p>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                <p><strong>Formula:</strong></p>
                <p>cell / column_total × 100</p>
                <p><strong>{isEn ? "UI label:" : "Label UI:"}</strong> {isEn ? "Dynamic, based on the variable name" : "Dinamis berdasarkan variable name"}</p>
              </div>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">% of Total</span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mb-2">
                {isEn ? "The percentage of each cell relative to the grand total" : "Persentase setiap cell terhadap grand total"}
              </p>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                <p><strong>Formula:</strong></p>
                <p>cell / grand_total × 100</p>
                <p><strong>{isEn ? "UI label:" : "Label UI:"}</strong> Fixed &quot;% of Total&quot;</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-2">Percentage Formulas</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <p><strong>Row %:</strong></p>
                <BlockMath math={'\\dfrac{O_{ij}}{\\text{rowTotals}[i]} \\times 100'} />
              </div>
              <div>
                <p><strong>Column %:</strong></p>
                <BlockMath math={'\\dfrac{O_{ij}}{\\text{colTotals}[j]} \\times 100'} />
              </div>
              <div>
                <p><strong>Total %:</strong></p>
                <BlockMath math={'\\dfrac{O_{ij}}{W} \\times 100'} />
              </div>
            </div>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Residual Options" : "Opsi Residuals"} icon={Calculator} variant="feature">
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Unstandardized</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                {isEn ? "Raw difference: Observed - Expected" : "Selisih mentah: Observed - Expected"}
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                {isEn ? (
                  <>
                    <p><strong>Use case:</strong> Shows magnitude</p>
                    <p><strong>Interpretation:</strong> Absolute deviation</p>
                  </>
                ) : (
                  <>
                    <p><strong>Kegunaan:</strong> Menunjukkan besaran</p>
                    <p><strong>Interpretasi:</strong> Deviasi absolut</p>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Standardized</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
                {isEn ? "Z-score-like: (O-E)/√E" : "Mirip z-score: (O-E)/√E"}
              </p>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                {isEn ? (
                  <>
                    <p><strong>Use case:</strong> Cross-cell comparison</p>
                    <p><strong>Interpretation:</strong> |value| &gt; 2 significant</p>
                  </>
                ) : (
                  <>
                    <p><strong>Kegunaan:</strong> Perbandingan antar cell</p>
                    <p><strong>Interpretasi:</strong> |nilai| &gt; 2 signifikan</p>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Adjusted</span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mb-2">
                {isEn ? "Adjusted for the marginal totals" : "Disesuaikan terhadap total marginal"}
              </p>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                {isEn ? (
                  <>
                    <p><strong>Use case:</strong> Most accurate testing</p>
                    <p><strong>Interpretation:</strong> |value| &gt; 1.96 significant</p>
                  </>
                ) : (
                  <>
                    <p><strong>Kegunaan:</strong> Pengujian paling akurat</p>
                    <p><strong>Interpretasi:</strong> |nilai| &gt; 1.96 signifikan</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-2">Residual Formulas</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <p><strong>Unstandardized:</strong></p>
                <BlockMath math={'O_{ij} - E_{ij}'} />
              </div>
              <div>
                <p><strong>Standardized:</strong></p>
                <BlockMath math={'\\dfrac{O_{ij} - E_{ij}}{\\sqrt{E_{ij}}}'} />
              </div>
              <div>
                <p><strong>Adjusted:</strong></p>
                <BlockMath math={'\\dfrac{\\text{std}_{ij}}{\\sqrt{(1-r_i)(1-c_j)}}'} />
              </div>
            </div>
          </div>
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Cell Display Configuration Tips" : "Tips Konfigurasi Cell Display"}>
        <div className="text-sm space-y-2 mt-2">
          {isEn ? (
            <>
              <p><strong>Basic analysis:</strong> Observed counts + Row percentages for basic interpretation</p>
              <p><strong>Chi-square test:</strong> Add Expected counts to see theoretical vs actual</p>
              <p><strong>Advanced analysis:</strong> Use Adjusted residuals to identify cells that contribute significantly</p>
              <p><strong>Presentation:</strong> Choose only 2-3 statistics to avoid overly complex tables</p>
            </>
          ) : (
            <>
              <p><strong>Basic analysis:</strong> Observed counts + Row percentages untuk interpretasi dasar</p>
              <p><strong>Chi-square test:</strong> Tambahkan Expected counts untuk melihat theoretical vs actual</p>
              <p><strong>Advanced analysis:</strong> Gunakan Adjusted residuals untuk mengidentifikasi cell yang berkontribusi signifikan</p>
              <p><strong>Presentation:</strong> Pilih 2-3 statistik saja untuk menghindari tabel yang terlalu kompleks</p>
            </>
          )}
        </div>
      </HelpAlert>
    </div>
  );
};
