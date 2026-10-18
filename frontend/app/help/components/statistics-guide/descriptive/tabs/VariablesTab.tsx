import React from 'react';
import { Table, Calculator, Type, Calendar, Lightbulb } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const VariablesTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Choosing Variables for Descriptives Analysis" : "Pemilihan Variabel untuk Analisis Descriptives"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Descriptives analysis <strong>only supports numeric variables</strong> (NUMERIC types) with the
              scale measurement level. The UI automatically filters and shows the suitable variables.
            </>
          ) : (
            <>
              Analisis Descriptives <strong>hanya mendukung variabel numerik</strong> (NUMERIC types) dengan
              level measurement scale. UI otomatis memfilter dan menampilkan variabel yang sesuai.
            </>
          )}
        </p>
      </HelpAlert>
      <HelpCard title={isEn ? "Variable Selection Workflow" : "Workflow Pemilihan Variabel"} icon={Table} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Choose Variables" : "Pilih Variabel"}
            description={isEn
              ? "Choose one or more numeric variables. The UI only shows NUMERIC variables (including COMMA, DOT, SCIENTIFIC, DOLLAR, RESTRICTED_NUMERIC) for Descriptives analysis."
              : "Pilih satu atau lebih variabel numerik. UI hanya menampilkan variabel bertipe NUMERIC (termasuk COMMA, DOT, SCIENTIFIC, DOLLAR, RESTRICTED_NUMERIC) untuk analisis Descriptives."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Add to the Analysis" : "Tambahkan ke Analisis"}
            description={isEn
              ? "Drag variables into the analysis box or use the arrow button to add them to your descriptive analysis."
              : "Seret variabel ke kotak analisis atau gunakan tombol panah untuk menambahkannya ke analisis deskriptif Anda."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Standardized Values Option" : "Opsi Standardized Values"}
            description={isEn
              ? 'Check "Save standardized values as variables" to save the z-score of each variable (valid cases only).'
              : 'Centang "Save standardized values as variables" untuk menyimpan z-score tiap variabel (hanya kasus valid).'}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Supported Data Types" : "Tipe Data yang Didukung"} icon={Calculator} variant="feature">
        <div className="space-y-4 mt-2">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <h4 className="font-medium text-emerald-800 dark:text-emerald-200 mb-2">
              {isEn ? "Measurement Levels and Available Statistics" : "Level Pengukuran dan Statistik yang Tersedia"}
            </h4>
            <div className="text-sm space-y-2 text-emerald-700 dark:text-emerald-300">
              {isEn ? (
                <>
                  <p>• <strong>Scale (Interval/Ratio):</strong> All statistics available - mean, median, std deviation, variance, skewness, kurtosis, etc.</p>
                  <p>• <strong>Ordinal:</strong> Median, percentiles (Q1, Q3), IQR, mode, but no mean or std deviation</p>
                  <p>• <strong>Nominal:</strong> Only the mode and frequencies are meaningful</p>
                </>
              ) : (
                <>
                  <p>• <strong>Scale (Interval/Ratio):</strong> Semua statistik tersedia - mean, median, std deviation, variance, skewness, kurtosis, dll.</p>
                  <p>• <strong>Ordinal:</strong> Median, persentil (Q1, Q3), IQR, mode, tetapi tidak ada mean atau std deviation</p>
                  <p>• <strong>Nominal:</strong> Hanya mode dan frekuensi yang bermakna</p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">NUMERIC</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
                {isEn ? "Types" : "Tipe"}: NUMERIC, COMMA, DOT, SCIENTIFIC, DOLLAR, RESTRICTED_NUMERIC
              </p>
              <ul className="text-xs space-y-1 text-emerald-600 dark:text-emerald-400">
                {isEn ? (
                  <>
                    <li>• Scale/Interval (age, height, weight)</li>
                    <li>• Ratio (income, distance, time)</li>
                    <li>• Numeric ordinal (ratings 1-10)</li>
                  </>
                ) : (
                  <>
                    <li>• Scale/Interval (umur, tinggi, berat)</li>
                    <li>• Ratio (pendapatan, jarak, waktu)</li>
                    <li>• Ordinal numerik (rating 1-10)</li>
                  </>
                )}
              </ul>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">DATE</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                {isEn ? "Types" : "Tipe"}: DATE, ADATE, EDATE, SDATE, JDATE, QYR, MOYR, WKYR, DATETIME, TIME, DTIME
              </p>
              <div className="text-xs space-y-1 text-blue-600 dark:text-blue-400">
                {isEn ? (
                  <>
                    <li>• Automatically converted to SPSS seconds for calculation</li>
                    <li>• dd-mm-yyyy strings are converted first</li>
                    <li>• Treated as a scale measurement for statistical analysis</li>
                  </>
                ) : (
                  <>
                    <li>• Secara otomatis dikonversi ke SPSS seconds untuk perhitungan</li>
                    <li>• Format string dd-mm-yyyy akan dikonversi terlebih dahulu</li>
                    <li>• Diperlakukan sebagai scale measurement untuk analisis statistik</li>
                  </>
                )}
              </div>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <Type className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">STRING ✗</span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mb-2">{isEn ? "Type" : "Tipe"}: STRING</p>
              <ul className="text-xs space-y-1 text-red-600 dark:text-red-400">
                {isEn ? (
                  <>
                    <li>• Text categorical variables</li>
                    <li>• Use Frequencies to analyze STRING variables</li>
                  </>
                ) : (
                  <>
                    <li>• Variabel kategorikal text</li>
                    <li>• Gunakan Frequencies untuk analisis STRING</li>
                  </>
                )}
              </ul>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">{isEn ? "Caution" : "Perhatian"}</span>
              </div>
              <ul className="text-xs space-y-1 text-amber-600 dark:text-amber-400">
                {isEn ? (
                  <>
                    <li>• Data with many missing values</li>
                    <li>• Nominal data with numeric codes (1=male, 2=female)</li>
                    <li>• Pay attention to the appropriate measurement level</li>
                  </>
                ) : (
                  <>
                    <li>• Data dengan banyak missing values</li>
                    <li>• Nominal dengan kode numerik (1=pria, 2=wanita)</li>
                    <li>• Perhatikan level measurement yang sesuai</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </HelpCard>

      <HelpCard title="Missing Values & Weights" icon={Calculator} variant="default">
        <div className="space-y-3 mt-2">
          <div className="text-sm space-y-2 text-slate-700 dark:text-slate-300">
            {isEn ? (
              <>
                <p>• <strong>Missing Values:</strong> The system detects missing values based on the variable definition and excludes them from the calculation</p>
                <p>• <strong>Weights:</strong> When available, the system uses a weighted calculation. The default weight = 1 for all cases</p>
                <p>• <strong>Valid N:</strong> The number of valid (non-missing) cases used in the calculation</p>
              </>
            ) : (
              <>
                <p>• <strong>Missing Values:</strong> Sistem mendeteksi missing values berdasarkan definisi variabel dan mengecualikannya dari perhitungan</p>
                <p>• <strong>Weights (Bobot):</strong> Jika tersedia, sistem menggunakan weighted calculation. Nilai default weight = 1 untuk semua kasus</p>
                <p>• <strong>Valid N:</strong> Jumlah kasus valid (bukan missing) yang digunakan dalam perhitungan</p>
              </>
            )}
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Variable Selection Tips" : "Tips Pemilihan Variabel"} icon={Lightbulb} variant="step">
        <div className="space-y-3 mt-2">
          <div className="text-sm space-y-2 text-slate-700 dark:text-slate-300">
            {isEn ? (
              <>
                <p>• <strong>For Descriptives analysis:</strong> Use continuous numeric variables</p>
                <p>• <strong>For Frequencies analysis:</strong> Suitable for every type of variable</p>
                <p>• <strong>For Explore analysis:</strong> Ideal for exploring numeric data with outlier detection</p>
              </>
            ) : (
              <>
                <p>• <strong>Untuk analisis Descriptives:</strong> Gunakan variabel numerik kontinu</p>
                <p>• <strong>Untuk analisis Frequencies:</strong> Cocok untuk semua jenis variabel</p>
                <p>• <strong>Untuk analisis Explore:</strong> Ideal untuk eksplorasi data numerik dengan outlier detection</p>
              </>
            )}
          </div>
        </div>
      </HelpCard>
    </div>
  );
};
