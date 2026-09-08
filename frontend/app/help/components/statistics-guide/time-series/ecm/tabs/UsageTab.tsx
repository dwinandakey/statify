import React from 'react';
import { Settings, BarChart2, Lightbulb } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const UsageTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "How to Use ECM (Error Correction Model) in Statify" : "Cara Menggunakan ECM (Error Correction Model) di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Access via Analyze → Time Series → ECM (Error Correction Model). Select dependent variable (Y) and independent variables (X), then adjust lag options if needed."
            : "Akses melalui Analyze → Time Series → ECM (Error Correction Model). Pilih variabel terikat (Y) dan variabel bebas (X), lalu sesuaikan opsi lag jika diperlukan."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Step-by-Step Instructions" : "Langkah-Langkah Penggunaan"} icon={Settings} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Open ECM Dialog" : "Buka Dialog ECM"}
            description={isEn ? "Click Analyze → Time Series → ECM (Error Correction Model)." : "Klik menu Analyze → Time Series → ECM (Error Correction Model)."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Select Variables (Variables Tab)" : "Pilih Variabel (Tab Variables)"}
            description={isEn ? "Select 1 dependent variable and 1 or more independent variables. Ensure all variables are numeric and verified I(1)." : "Pilih 1 variabel terikat (Dependent) dan 1 atau lebih variabel bebas (Independent). Pastikan seluruh variabel bertipe numerik dan sudah diuji I(1)."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Set Lag Options (Options Tab)" : "Atur Opsi Lag (Tab Options)"}
            description={isEn ? "Set Max Lag ADF for residual cointegration test and Max Lag ECM for short-run adjustment (default: 1-2 lags)." : "Atur Max Lag ADF untuk uji kointegrasi residual dan Max Lag ECM untuk penyesuaian jangka pendek (default: 1-2 lag)."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Save Residual Options (Options Tab)" : "Opsi Menyimpan Residual (Tab Options)"}
            description={isEn ? "Check 'Save Long-Run Residuals' or 'Save Short-Run Residuals' to save residuals as new dataset variables for further testing." : "Centang opsi 'Save Long-Run Residuals' atau 'Save Short-Run Residuals' jika ingin menyimpan residual ke variabel baru untuk analisis lanjutan."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Click Estimate" : "Klik Estimate"}
            description={isEn ? "Results appear in the Output panel, including Long-Run Regression, ADF Cointegration Test, Short-Run ECM, and Classical Assumption Tests." : "Hasil akan ditampilkan di panel Output, mencakup Long-Run Regression, ADF Cointegration Test, Short-Run ECM, dan Uji Asumsi Klasik."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Interpreting ECM Output" : "Membaca Output ECM"} icon={BarChart2} variant="default">
        <div className="space-y-3 mt-2 text-sm text-slate-700 dark:text-slate-300">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <p className="font-medium mb-2">{isEn ? "1. Long-Run Regression Table:" : "1. Long-Run Regression Table:"}</p>
            <p>• <strong>Coefficient:</strong> {isEn ? "Shows magnitude of long-run impact of X on Y in equilibrium." : "Menunjukkan besarnya dampak jangka panjang dari variabel X terhadap Y dalam kondisi keseimbangan."}</p>
            <p>• <strong>Prob.:</strong> {isEn ? "If p-value < 0.05, long-run impact is statistically significant." : "Jika p-value < 0.05, variabel bebas berpengaruh signifikan secara jangka panjang."}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <p className="font-medium mb-2">{isEn ? "2. Cointegration Test (ADF on Residuals):" : "2. Cointegration Test (ADF pada Residual):"}</p>
            <p>• <strong>p-value &lt; 0.05:</strong> {isEn ? "Residuals are stationary → Long-run cointegration relationship confirmed (ECM procedure is valid)." : "Residual stasioner → Terbukti ada hubungan kointegrasi jangka panjang (prosedur ECM valid)."}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <p className="font-medium mb-2">{isEn ? "3. Short-Run ECM Table & ECT(-1):" : "3. Short-Run ECM Table & ECT(-1):"}</p>
            <p>• <strong>ECT(-1) Coefficient:</strong> {isEn ? "Speed of adjustment. Must be negative and statistically significant (p < 0.05)." : "Kecepatan penyesuaian. Wajib ber-tanda negatif dan signifikan (p < 0.05)."}</p>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Tips & Recommendations" : "Tips & Rekomendasi"} icon={Lightbulb} variant="step">
        <div className="space-y-2 mt-2 text-sm text-slate-700 dark:text-slate-300">
          <p>• <strong>{isEn ? "Run Unit Root Test first:" : "Lakukan Unit Root Test terlebih dahulu:"}</strong> {isEn ? "Engle-Granger ECM requires all series to be I(1). If I(0) series exist, use ARDL." : "ECM Engle-Granger mensyaratkan semua variabel I(1). Jika ada variabel I(0), gunakan model ARDL."}</p>
        </div>
      </HelpCard>
    </div>
  );
};
