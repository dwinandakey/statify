import React from 'react';
import { Table, Calculator, Database, Type, Calendar, Lightbulb } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const VariablesTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Choosing Variables for Frequencies Analysis" : "Pemilihan Variabel untuk Analisis Frequencies"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              Frequencies analysis supports <strong>all variable types</strong> (NUMERIC, STRING, DATE) with
              nominal, ordinal, and scale measurement levels. The system automatically detects and handles various data formats.
            </>
          ) : (
            <>
              Analisis Frequencies mendukung <strong>semua jenis variabel</strong> (NUMERIC, STRING, DATE) dengan
              level measurement nominal, ordinal, dan scale. Sistem otomatis mendeteksi dan menangani berbagai format data.
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
              ? "Choose one or more variables of any type (NUMERIC, STRING, DATE). Frequencies supports all measurement levels: nominal, ordinal, and scale."
              : "Pilih satu atau lebih variabel dari semua tipe (NUMERIC, STRING, DATE). Frequencies mendukung semua level measurement: nominal, ordinal, dan scale."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Add to the Analysis" : "Tambahkan ke Analisis"}
            description={isEn
              ? "Drag variables into the analysis box or use the arrow button to add them to your frequency analysis."
              : "Seret variabel ke kotak analisis atau gunakan tombol panah untuk menambahkannya ke analisis frekuensi Anda."}
          />
          <HelpStep
            number={3}
            title="Display Frequency Tables"
            description={isEn
              ? "Check 'Display frequency tables' to show the full frequency table with frequency, percent, valid percent, and cumulative percent."
              : "Centang 'Display frequency tables' untuk menampilkan tabel frekuensi lengkap dengan frequency, percent, valid percent, dan cumulative percent."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Supported Data Types" : "Tipe Data yang Didukung"} icon={Database} variant="feature">
        <div className="space-y-4 mt-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">
              {isEn ? "Measurement Levels and Output" : "Level Pengukuran dan Output"}
            </h4>
            <div className="text-sm space-y-2 text-slate-700 dark:text-slate-300">
              {isEn ? (
                <>
                  <p>• <strong>Nominal & Ordinal:</strong> Frequency tables, mode, limited descriptive statistics</p>
                  <p>• <strong>Scale (Numeric):</strong> All statistics available + quartiles, percentiles, extreme values</p>
                  <p>• <strong>Date Variables:</strong> Automatically converted to SPSS seconds and treated as scale</p>
                </>
              ) : (
                <>
                  <p>• <strong>Nominal & Ordinal:</strong> Tabel frekuensi, mode, statistik deskriptif terbatas</p>
                  <p>• <strong>Scale (Numeric):</strong> Semua statistik tersedia + quartiles, percentiles, extreme values</p>
                  <p>• <strong>Date Variables:</strong> Otomatis dikonversi ke SPSS seconds, diperlakukan sebagai scale</p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <li>• Continuous data (height, weight, scores)</li>
                    <li>• Discrete counts (number of children, age)</li>
                    <li>• Rating scales (1-10)</li>
                  </>
                ) : (
                  <>
                    <li>• Continuous data (tinggi, berat, skor)</li>
                    <li>• Discrete counts (jumlah anak, umur)</li>
                    <li>• Rating scales (1-10)</li>
                  </>
                )}
              </ul>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">STRING</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">{isEn ? "Type" : "Tipe"}: STRING</p>
              <ul className="text-xs space-y-1 text-blue-600 dark:text-blue-400">
                {isEn ? (
                  <>
                    <li>• Nominal categories (gender, city)</li>
                    <li>• Ordinal categories (low, medium, high)</li>
                    <li>• Labels and codes</li>
                  </>
                ) : (
                  <>
                    <li>• Kategori nominal (jenis kelamin, kota)</li>
                    <li>• Kategori ordinal (rendah, sedang, tinggi)</li>
                    <li>• Labels dan kode</li>
                  </>
                )}
              </ul>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">DATE</span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mb-2">
                {isEn ? "Types" : "Tipe"}: DATE, ADATE, EDATE, SDATE, JDATE, QYR, MOYR, WKYR, DATETIME, TIME, DTIME
              </p>
              <div className="text-xs space-y-1 text-purple-600 dark:text-purple-400">
                {isEn ? (
                  <>
                    <li>• dd-mm-yyyy strings are converted automatically</li>
                    <li>• Treated as a scale measurement</li>
                  </>
                ) : (
                  <>
                    <li>• Format dd-mm-yyyy string otomatis dikonversi</li>
                    <li>• Diperlakukan sebagai scale measurement</li>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </HelpCard>

      <HelpCard title="Missing Values & Weights" icon={Calculator} variant="default">
        <div className="space-y-3 mt-2">
          <div className="text-sm space-y-2 text-slate-700 dark:text-slate-300">
            {isEn ? (
              <>
                <p>• <strong>Missing Values:</strong> The system detects missing values based on the variable definition and separates them in the frequency table</p>
                <p>• <strong>Weights:</strong> If there is a weight variable, frequencies are calculated with weighted counts. Default weight = 1</p>
                <p>• <strong>Valid Percent:</strong> A percentage based only on valid cases (excluding missing)</p>
                <p>• <strong>Cumulative Percent:</strong> The cumulative percentage of valid cases</p>
              </>
            ) : (
              <>
                <p>• <strong>Missing Values:</strong> Sistem mendeteksi missing values berdasarkan definisi variabel dan memisahkannya dalam tabel frekuensi</p>
                <p>• <strong>Weights:</strong> Jika ada weight variable, frekuensi dihitung dengan weighted counts. Default weight = 1</p>
                <p>• <strong>Valid Percent:</strong> Persentase berdasarkan valid cases saja (tanpa missing)</p>
                <p>• <strong>Cumulative Percent:</strong> Persentase kumulatif dari valid cases</p>
              </>
            )}
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Usage Tips" : "Tips Penggunaan"} icon={Lightbulb} variant="step">
        <div className="space-y-3 mt-2">
          <div className="text-sm space-y-2 text-slate-700 dark:text-slate-300">
            {isEn ? (
              <>
                <p>• <strong>Multiple Variables:</strong> You can analyze several variables at once</p>
                <p>• <strong>Value Labels:</strong> The system automatically applies value labels when available</p>
                <p>• <strong>Sorting:</strong> Numeric variables are sorted numerically. Strings are sorted alphabetically</p>
                <p>• <strong>Date Handling:</strong> dd-mm-yyyy strings are automatically converted to SPSS seconds</p>
              </>
            ) : (
              <>
                <p>• <strong>Multiple Variables:</strong> Dapat menganalisis beberapa variabel sekaligus</p>
                <p>• <strong>Value Labels:</strong> Sistem otomatis menerapkan value labels jika tersedia</p>
                <p>• <strong>Sorting:</strong> Untuk numeric variables, nilai diurutkan numerik. Untuk string, diurutkan alfabetis</p>
                <p>• <strong>Date Handling:</strong> String format dd-mm-yyyy otomatis dikonversi ke SPSS seconds</p>
              </>
            )}
          </div>
        </div>
      </HelpCard>
    </div>
  );
};
