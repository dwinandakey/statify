import React from 'react';
import { Calculator, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const StatisticsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Statistics in Frequencies Analysis" : "Statistik dalam Analisis Frequencies"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Check <strong>"Display statistics"</strong> to enable the statistical calculations. The system uses a
              <strong> weighted calculation</strong> with weight W for every formula. The available statistics depend on the variable's measurement level.
            </>
          ) : (
            <>
              Centang <strong>"Display statistics"</strong> untuk mengaktifkan perhitungan statistik. Sistem menggunakan
              <strong> weighted calculation</strong> dengan bobot W untuk semua formula. Statistik tersedia sesuai level measurement variabel.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title="Central Tendency" icon={Calculator} variant="feature">
        <div className="space-y-4 mt-2">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Mean</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'\\bar{x} = \\dfrac{S}{W} = \\dfrac{\\sum w_i x_i}{\\sum w_i}'} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {isEn
                ? "The weighted mean. Only available for scale variables (numeric/date)."
                : "Rata-rata berbobot. Hanya tersedia untuk variabel scale (numeric/date)."}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {isEn
                ? "Uses the same DescriptiveCalculator implementation as Descriptives"
                : "Menggunakan implementasi DescriptiveCalculator yang sama dengan Descriptives"}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Median</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <InlineMath math={'\\text{Median}'} />
              <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
                {isEn ? "= the 50th percentile using the weighted method" : "= persentil ke-50 dengan metode weighted"}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {isEn
                ? "Uses linear interpolation to handle weighted data. Available for scale and ordinal."
                : "Menggunakan interpolasi linear untuk menangani weighted data. Tersedia untuk scale dan ordinal."}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {isEn
                ? "Method: 'waverage' (SPSS Definition 1), 'tukey', or 'haverage'"
                : "Metode: 'waverage' (SPSS Definition 1) atau 'tukey' atau 'haverage'"}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Mode</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={isEn ? '\\text{Mode} = \\text{the value with the highest frequency}' : '\\text{Mode} = \\text{nilai dengan frekuensi tertinggi}'} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {isEn
                ? "The most frequent value. Available for all measurement levels (nominal, ordinal, scale)."
                : "Nilai yang paling sering muncul. Tersedia untuk semua level measurement (nominal, ordinal, scale)."}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {isEn
                ? "For date variables, the value is shown in dd-mm-yyyy format"
                : "Untuk date variables, nilai ditampilkan dalam format dd-mm-yyyy"}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Sum</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'\\text{Sum} = S = \\sum w_i x_i'} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {isEn
                ? "The weighted total. Only available for scale variables (numeric/date)."
                : "Total berbobot. Hanya tersedia untuk variabel scale (numeric/date)."}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {isEn
                ? "Uses the same DescriptiveCalculator implementation as Descriptives"
                : "Menggunakan implementasi DescriptiveCalculator yang sama dengan Descriptives"}
            </p>
          </div>
        </div>
      </HelpCard>

      <HelpCard title="Dispersion" icon={Calculator} variant="default">
        <div className="space-y-4 mt-2">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Std. deviation</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'s = \\sqrt{\\dfrac{M_2}{W-1}}'} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {isEn
                ? "Uses the DescriptiveCalculator implementation. Only available for scale variables."
                : "Menggunakan implementasi DescriptiveCalculator. Hanya tersedia untuk variabel scale."}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {isEn ? "Sample-corrected formula with divisor (W-1)" : "Sample-corrected formula dengan pembagi (W-1)"}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Variance</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'s^2 = \\dfrac{M_2}{W-1}'} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isEn
                ? "The square of the standard deviation. Only available for scale variables."
                : "Kuadrat dari standard deviation. Hanya tersedia untuk variabel scale."}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Range</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'\\text{Range} = \\max(x) - \\min(x)'} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isEn
                ? "The difference between the maximum and minimum values. Only available for scale variables."
                : "Selisih nilai maksimum dan minimum. Hanya tersedia untuk variabel scale."}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Minimum & Maximum</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <InlineMath math={'\\min(x), \\max(x)'} />
              <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
                {isEn ? "= the extreme values in the dataset" : "= nilai ekstrem dalam dataset"}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isEn
                ? "The smallest and largest values. Only available for scale variables."
                : "Nilai terkecil dan terbesar. Hanya tersedia untuk variabel scale."}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">S.E. mean</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'\\text{SE}_{\\bar{x}} = \\dfrac{s}{\\sqrt{W}}'} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isEn
                ? "Standard error of the mean. Only available for scale variables."
                : "Standard error of the mean. Hanya tersedia untuk variabel scale."}
            </p>
          </div>
        </div>
      </HelpCard>

      <HelpCard title="Distribution" icon={Calculator} variant="default">
        <div className="space-y-4 mt-2">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Skewness</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'g_1 = \\dfrac{W \\cdot M_3}{(W-1)(W-2) \\; s^3}'} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isEn
                ? "Measures the asymmetry of the distribution. Only available for scale variables."
                : "Mengukur asimetri distribusi. Hanya tersedia untuk variabel scale."}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Kurtosis</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <BlockMath math={'g_2 = \\dfrac{W(W+1) M_4 - 3 M_2^2 (W-1)}{(W-1)(W-2)(W-3) \\; s^4}'} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isEn
                ? "Measures the peakedness of the distribution. Only available for scale variables."
                : "Mengukur ketajaman puncak distribusi. Hanya tersedia untuk variabel scale."}
            </p>
          </div>
        </div>
      </HelpCard>

      <HelpCard title="Percentiles & Quartiles" icon={TrendingUp} variant="default">
        <div className="space-y-4 mt-2">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Quartiles</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <InlineMath math={'Q1 = P_{25}, \\quad Q2 = P_{50}, \\quad Q3 = P_{75}'} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {isEn
                ? "Splits the data into 4 equal parts. Available for scale and ordinal."
                : "Membagi data menjadi 4 bagian sama besar. Tersedia untuk scale dan ordinal."}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {isEn
                ? "Uses the same method as the percentile implementation"
                : "Menggunakan metode yang sama dengan implementasi persentil"}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Cut points for equal groups</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <InlineMath
                math={isEn
                  ? 'P_i = \\text{the } \\frac{100i}{n} \\text{-th percentile for } i = 1, 2, ..., n-1'
                  : 'P_i = \\text{persentil ke-} \\frac{100i}{n} \\text{ untuk } i = 1, 2, ..., n-1'}
              />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {isEn
                ? "Splits the data into n groups of equal size. Input: the number of groups you want."
                : "Membagi data menjadi n grup dengan ukuran sama. Input: jumlah grup yang diinginkan."}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {isEn ? "Available for scale and ordinal variables" : "Tersedia untuk scale dan ordinal variables"}
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
              <h4 className="font-medium text-slate-800 dark:text-slate-200">Percentiles</h4>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded border mb-2">
              <InlineMath math={'P_k'} />
              <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
                {isEn ? "= the value below which k% of the data lies" : "= nilai di mana k% data berada di bawahnya"}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {isEn
                ? "Specific values that can be added manually (0-100)."
                : "Nilai spesifik yang dapat ditambahkan secara manual (0-100)."}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {isEn
                ? "Supports multiple percentiles. Method: waverage, tukey, or haverage"
                : "Mendukung multiple percentiles. Metode: waverage, tukey, atau haverage"}
            </p>
          </div>
        </div>
      </HelpCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HelpCard title={isEn ? "Measurement Level Restrictions" : "Pembatasan Level Measurement"} variant="default" icon={AlertTriangle}>
          <ul className="text-sm space-y-1 list-disc list-inside">
            {isEn ? (
              <>
                <li><strong>Nominal:</strong> Only the mode is available</li>
                <li><strong>Ordinal:</strong> Mode, median, quartiles, percentiles</li>
                <li><strong>Scale:</strong> All statistics available (using DescriptiveCalculator)</li>
                <li><strong>Extreme Values:</strong> Only for scale variables, showing the 5 highest and lowest values</li>
              </>
            ) : (
              <>
                <li><strong>Nominal:</strong> Hanya mode yang tersedia</li>
                <li><strong>Ordinal:</strong> Mode, median, quartiles, percentiles</li>
                <li><strong>Scale:</strong> Semua statistik tersedia (menggunakan DescriptiveCalculator)</li>
                <li><strong>Extreme Values:</strong> Hanya untuk scale variables, menampilkan 5 nilai tertinggi dan terendah</li>
              </>
            )}
          </ul>
        </HelpCard>

        <HelpCard title={isEn ? "Practical Tips" : "Tips Praktis"} variant="default" icon={Lightbulb}>
          <ul className="text-sm space-y-1 list-disc list-inside">
            {isEn ? (
              <>
                <li><strong>Percentile Method:</strong> Default 'waverage' for consistency with SPSS</li>
                <li><strong>Weighted Calculation:</strong> All statistics use weights when available</li>
                <li><strong>Date Variables:</strong> Automatically handled as a scale measurement</li>
                <li><strong>Missing Values:</strong> Separated out in the valid percent and cumulative percent calculations</li>
              </>
            ) : (
              <>
                <li><strong>Metode Persentil:</strong> Default 'waverage' untuk konsistensi dengan SPSS</li>
                <li><strong>Weighted Calculation:</strong> Semua statistik menggunakan weights jika tersedia</li>
                <li><strong>Date Variables:</strong> Otomatis ditangani sebagai scale measurement</li>
                <li><strong>Missing Values:</strong> Dipisahkan dalam perhitungan valid percent dan cumulative percent</li>
              </>
            )}
          </ul>
        </HelpCard>
      </div>
    </div>
  );
};
