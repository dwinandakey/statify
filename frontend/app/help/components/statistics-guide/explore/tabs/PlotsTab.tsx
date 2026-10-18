import React from 'react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { BarChart3, TrendingUp, Layers } from 'lucide-react';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const PlotsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Visualizations for Explore Analysis" : "Visualisasi untuk Analisis Explore"}>
        <p className="text-sm mt-2">
          {isEn
            ? "The plots in Explore analysis are designed to help you understand the data distribution, identify outliers, and compare characteristics between groups with a robust visual approach."
            : "Grafik dalam analisis Explore dirancang untuk memahami distribusi data, mengidentifikasi outlier, dan membandingkan karakteristik antar kelompok dengan pendekatan visual yang robust."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Plot Selection Workflow" : "Workflow Pemilihan Plot"} icon={BarChart3} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Choose a Boxplot Option" : "Pilih Boxplot Option"}
            description={isEn
              ? "Choose how the boxplot is displayed: none, factor levels together, dependents together, or dependents separately."
              : "Tentukan tampilan boxplot: none, factor levels together, dependents together, atau dependents separately."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose Descriptive Plots" : "Pilih Descriptive Plots"}
            description={isEn
              ? "Add a stem-and-leaf plot and/or a histogram for a more detailed distribution analysis."
              : "Tambahkan stem-and-leaf dan/atau histogram untuk analisis distribusi yang lebih detail."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Evaluate the Combination" : "Evaluasi Kombinasi"}
            description={isEn
              ? "Consider a combination of plots that gives comprehensive insight into the data and outliers."
              : "Pertimbangkan kombinasi plot yang memberikan insight komprehensif tentang data dan outliers."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Boxplot Options" : "Opsi Boxplots"} icon={BarChart3} variant="feature">
        <div className="space-y-4 mt-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isEn
              ? "The boxplot is the main visualization in Explore analysis, using Tukey's Hinges for outlier detection. Choose one option to suit your analysis goal."
              : "Boxplot adalah visualisasi utama dalam analisis Explore menggunakan Tukey's Hinges untuk outlier detection. Pilih satu opsi sesuai tujuan analisis."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-200 dark:border-slate-800">
              <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">None</h4>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {isEn
                  ? "Shows no boxplot. Choose this if you only want to focus on the numeric statistics without a visual representation of the distribution."
                  : "Tidak menampilkan boxplot. Pilih ini jika hanya ingin fokus pada statistik numerik tanpa representasi visual distribusi."}
              </p>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Factor levels together</h4>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {isEn ? (
                  <>
                    Shows a boxplot for each level of the factor variable in one chart.{' '}
                    <strong>Ideal for:</strong> Comparing the distribution of the dependent variable across category groups.
                  </>
                ) : (
                  <>
                    Menampilkan boxplot untuk setiap level factor variable dalam satu chart.{' '}
                    <strong>Ideal untuk:</strong> Membandingkan distribusi dependent variable antar kelompok kategori.
                  </>
                )}
              </p>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-medium text-emerald-800 dark:text-emerald-200 mb-2">Dependents together</h4>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {isEn ? (
                  <>
                    Shows all dependent variables in one boxplot chart.{' '}
                    <strong>Ideal for:</strong> Comparing the distributions of multiple variables on a similar scale.
                  </>
                ) : (
                  <>
                    Menampilkan semua dependent variables dalam satu boxplot chart.{' '}
                    <strong>Ideal untuk:</strong> Membandingkan distribusi multiple variables dengan scale serupa.
                  </>
                )}
              </p>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Dependents separately</h4>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                {isEn ? (
                  <>
                    Creates a separate boxplot for each dependent variable.{' '}
                    <strong>Ideal for:</strong> Variables on different scales or a detailed per-variable analysis.
                  </>
                ) : (
                  <>
                    Membuat boxplot terpisah untuk setiap dependent variable.{' '}
                    <strong>Ideal untuk:</strong> Variables dengan scale berbeda atau analisis detail per variable.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-2">
              {isEn ? "Boxplot Components in Explore" : "Komponen Boxplot dalam Explore"}
            </h4>
            <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
              {isEn ? (
                <>
                  <li>• <strong>Box:</strong> Q1 to Q3 using Tukey&apos;s Hinges (not percentiles)</li>
                  <li>• <strong>Median line:</strong> The middle value, robust to outliers</li>
                  <li>• <strong>Whiskers:</strong> Extend up to 1.5×IQR from the box edges</li>
                  <li>• <strong>Outlier points:</strong> Values beyond the whiskers (mild outliers)</li>
                  <li>• <strong>Extreme outliers:</strong> Values beyond 3×IQR (extreme outliers)</li>
                </>
              ) : (
                <>
                  <li>• <strong>Box:</strong> Q1 hingga Q3 menggunakan Tukey&apos;s Hinges (bukan percentile)</li>
                  <li>• <strong>Median line:</strong> Nilai tengah yang robust terhadap outlier</li>
                  <li>• <strong>Whiskers:</strong> Extend hingga 1.5×IQR dari box edges</li>
                  <li>• <strong>Outlier points:</strong> Nilai di luar whiskers (mild outliers)</li>
                  <li>• <strong>Extreme outliers:</strong> Nilai di luar 3×IQR (extreme outliers)</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Descriptive Plot Options" : "Opsi Descriptive Plots"} icon={TrendingUp} variant="feature">
        <div className="space-y-4 mt-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isEn
              ? "Individual checkboxes for visualizations that give in-depth insight into the shape and characteristics of the data distribution."
              : "Checkbox individual untuk visualisasi yang memberikan insight mendalam tentang bentuk dan karakteristik distribusi data."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Stem-and-leaf</h4>
              <div className="space-y-2 text-xs text-blue-600 dark:text-blue-400">
                {isEn ? (
                  <>
                    <p><strong>Purpose:</strong> Shows a detailed distribution while keeping the actual data values</p>
                    <p><strong>Advantage:</strong> You can see the exact values, patterns, and clustering of the data</p>
                    <p><strong>Ideal for:</strong> Small-to-medium datasets (N &lt; 100) with a limited range of values</p>
                    <p><strong>Interpretation:</strong> Row length shows frequency; leaf digits show the actual values</p>
                  </>
                ) : (
                  <>
                    <p><strong>Fungsi:</strong> Menampilkan distribusi detail sambil mempertahankan nilai data aktual</p>
                    <p><strong>Keunggulan:</strong> Dapat melihat exact values, pattern, dan clustering data</p>
                    <p><strong>Ideal untuk:</strong> Dataset kecil-menengah (N &lt; 100) dengan range nilai terbatas</p>
                    <p><strong>Interpretasi:</strong> Panjang baris menunjukkan frekuensi, digit leaf menunjukkan nilai aktual</p>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-medium text-emerald-800 dark:text-emerald-200 mb-2">Histogram</h4>
              <div className="space-y-2 text-xs text-emerald-600 dark:text-emerald-400">
                {isEn ? (
                  <>
                    <p><strong>Purpose:</strong> Shows the frequency distribution to understand the shape of the distribution</p>
                    <p><strong>Advantage:</strong> Clearly shows normality, skewness, modality, and gaps</p>
                    <p><strong>Ideal for:</strong> Datasets of any size, especially for assessing the distribution</p>
                    <p><strong>Interpretation:</strong> Bell curve = normal, skewed = asymmetric, multiple peaks = multimodal</p>
                  </>
                ) : (
                  <>
                    <p><strong>Fungsi:</strong> Menampilkan distribusi frekuensi untuk memahami bentuk (shape) distribusi</p>
                    <p><strong>Keunggulan:</strong> Jelas menunjukkan normality, skewness, modality, dan gaps</p>
                    <p><strong>Ideal untuk:</strong> Semua ukuran dataset, terutama untuk assessment distribusi</p>
                    <p><strong>Interpretasi:</strong> Bell curve = normal, skewed = asymmetric, multiple peaks = multimodal</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-2">
              {isEn ? "Effective Plot Combinations" : "Kombinasi Plot yang Efektif"}
            </h4>
            <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
              {isEn ? (
                <>
                  <li>• <strong>Boxplot + Histogram:</strong> A comprehensive view of the distribution shape and outliers</li>
                  <li>• <strong>Stem-and-leaf + Boxplot:</strong> Detailed values with robust summary statistics</li>
                  <li>• <strong>Histogram for a normality check:</strong> Before choosing statistical tests</li>
                  <li>• <strong>Factor boxplots for group comparison:</strong> Identify distribution differences between groups</li>
                </>
              ) : (
                <>
                  <li>• <strong>Boxplot + Histogram:</strong> Comprehensive view tentang distribution shape dan outliers</li>
                  <li>• <strong>Stem-and-leaf + Boxplot:</strong> Detail values dengan robust summary statistics</li>
                  <li>• <strong>Histogram untuk normality check:</strong> Sebelum menentukan statistical tests</li>
                  <li>• <strong>Factor boxplots untuk group comparison:</strong> Identifikasi perbedaan distribusi antar kelompok</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Plot Selection Strategy" : "Strategi Pemilihan Plot"} icon={Layers} variant="step">
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h5 className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-2">Data Exploration</h5>
              <ul className="text-xs space-y-1 text-blue-600 dark:text-blue-400">
                {isEn ? (
                  <>
                    <li>• Start with a Histogram to assess the shape</li>
                    <li>• Add a Boxplot to identify outliers</li>
                    <li>• Use Factor levels together if there is a grouping variable</li>
                    <li>• Stem-and-leaf for small datasets with detailed analysis</li>
                  </>
                ) : (
                  <>
                    <li>• Start dengan Histogram untuk shape assessment</li>
                    <li>• Add Boxplot untuk outlier identification</li>
                    <li>• Gunakan Factor levels together jika ada grouping variable</li>
                    <li>• Stem-and-leaf untuk dataset kecil dengan detail analysis</li>
                  </>
                )}
              </ul>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <h5 className="font-medium text-sm text-emerald-800 dark:text-emerald-200 mb-2">Group Comparison</h5>
              <ul className="text-xs space-y-1 text-emerald-600 dark:text-emerald-400">
                {isEn ? (
                  <>
                    <li>• Factor levels together for direct comparison</li>
                    <li>• A histogram per group for distribution shape differences</li>
                    <li>• Focus on median differences in the boxplots</li>
                    <li>• Identify group-specific outlier patterns</li>
                  </>
                ) : (
                  <>
                    <li>• Factor levels together untuk direct comparison</li>
                    <li>• Histogram per group untuk distribution shape differences</li>
                    <li>• Focus pada median differences di boxplots</li>
                    <li>• Identify group-specific outlier patterns</li>
                  </>
                )}
              </ul>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h5 className="font-medium text-sm text-purple-800 dark:text-purple-200 mb-2">Multiple Variables</h5>
              <ul className="text-xs space-y-1 text-purple-600 dark:text-purple-400">
                {isEn ? (
                  <>
                    <li>• Dependents separately if the scales are very different</li>
                    <li>• Dependents together for direct comparison</li>
                    <li>• Individual histograms for a normality check</li>
                    <li>• Consistent outlier patterns across variables</li>
                  </>
                ) : (
                  <>
                    <li>• Dependents separately jika scale sangat berbeda</li>
                    <li>• Dependents together untuk comparison direct</li>
                    <li>• Individual histograms untuk normality check</li>
                    <li>• Consistent outlier patterns across variables</li>
                  </>
                )}
              </ul>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <h5 className="font-medium text-sm text-amber-800 dark:text-amber-200 mb-2">Robust Analysis Focus</h5>
              <ul className="text-xs space-y-1 text-amber-600 dark:text-amber-400">
                {isEn ? (
                  <>
                    <li>• A boxplot is essential for Tukey outlier detection</li>
                    <li>• Compare the positions of the median vs the trimmed mean</li>
                    <li>• Assess the impact of outliers on central tendency</li>
                    <li>• Visual validation of M-estimator robustness</li>
                  </>
                ) : (
                  <>
                    <li>• Boxplot essential untuk Tukey outlier detection</li>
                    <li>• Compare median vs trimmed mean positioning</li>
                    <li>• Assess impact of outliers pada central tendency</li>
                    <li>• Visual validation of M-estimator robustness</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Explore Visualization Tips" : "Tips Visualisasi Explore"}>
        <div className="text-sm space-y-2 mt-2">
          {isEn ? (
            <>
              <p>• <strong>Always include a boxplot:</strong> Essential for visually validating Tukey outlier detection</p>
              <p>• <strong>Histogram for distribution shape:</strong> Helps interpret robust vs classical statistics</p>
              <p>• <strong>Factor comparisons:</strong> Use "factor levels together" for group analysis</p>
              <p>• <strong>Scale considerations:</strong> "Dependents separately" if the variables have different units</p>
              <p>• <strong>Outlier focus:</strong> Combine boxplot + stem-and-leaf for detailed outlier investigation</p>
            </>
          ) : (
            <>
              <p>• <strong>Always include boxplot:</strong> Essential untuk Tukey outlier detection visual validation</p>
              <p>• <strong>Histogram for distribution shape:</strong> Membantu interpretasi robust vs classical statistics</p>
              <p>• <strong>Factor comparisons:</strong> Gunakan "factor levels together" untuk group analysis</p>
              <p>• <strong>Scale considerations:</strong> "Dependents separately" jika variables memiliki unit berbeda</p>
              <p>• <strong>Outlier focus:</strong> Kombinasi boxplot + stem-and-leaf untuk detailed outlier investigation</p>
            </>
          )}
        </div>
      </HelpAlert>

    </div>
  );
};
