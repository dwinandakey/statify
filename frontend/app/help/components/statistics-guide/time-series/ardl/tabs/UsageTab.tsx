import React from 'react';
import { Settings, BarChart2, Lightbulb } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const UsageTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "How to Use ARDL in Statify" : "Cara Menggunakan ARDL di Statify"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Access via Analyze → Time Series → ARDL. Set dependent variable (Y), independent variables (X), and lag orders p and q."
            : "Akses melalui Analyze → Time Series → ARDL. Tentukan variabel dependen (Y), variabel independen (X), dan orde lag p dan q."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Step-by-Step Instructions" : "Langkah-Langkah Penggunaan"} icon={Settings} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Open ARDL Dialog" : "Buka Dialog ARDL"}
            description={isEn ? "Click Analyze → Time Series → ARDL." : "Klik Analyze → Time Series → ARDL."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Select Variables (Variables Tab)" : "Pilih Variabel (Tab Variables)"}
            description={isEn ? "Move one dependent variable (Y) to Dependent box. Move one or more independent variables (X) to Independent box." : "Seret satu variabel dependen (Y) ke kotak Dependent. Tambahkan satu atau lebih variabel independen (X) ke kotak Independent."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Set Lag Orders (Options Tab)" : "Atur Orde Lag (Tab Options)"}
            description={isEn ? "Set order p (lag for Y, typically 1–2) and order q for each X variable (typically 1–2). Each X has its own q order." : "Tentukan orde p (lag untuk Y, biasanya 1–2) dan orde q untuk tiap variabel X (biasanya 1–2). Setiap X memiliki orde q sendiri."}
          />
          <HelpStep
            number={4}
            title={isEn ? "Set Time Settings (Time Tab)" : "Atur Waktu (Tab Time)"}
            description={isEn ? "Optional: specify period range for model estimation." : "Opsional: tentukan rentang periode waktu yang digunakan untuk estimasi."}
          />
          <HelpStep
            number={5}
            title={isEn ? "Click OK" : "Klik OK"}
            description={isEn ? "Output includes: Long-Run Equation, Cointegration Test (ADF), Short-Run ARDL-ECM, and classical assumption tests (Jarque-Bera, Breusch-Godfrey, Breusch-Pagan)." : "Output mencakup: Long-Run Equation, Cointegration Test (ADF), Short-Run ARDL-ECM, dan uji asumsi klasik (Jarque-Bera, Breusch-Godfrey, Breusch-Pagan)."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Interpreting Long-Run Output" : "Membaca Output Long-Run"} icon={BarChart2} variant="default">
        <div className="space-y-3 mt-2 text-sm">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <p className="font-medium mb-2">{isEn ? "Long-Run Equation Table:" : "Tabel Long-Run Equation:"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>Coefficient:</strong> {isEn ? "Long-run elasticity — effect of 1 unit change in X on Y in long-run equilibrium" : "Elastisitas jangka panjang — pengaruh perubahan 1 unit X terhadap Y dalam jangka panjang"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>Prob.:</strong> {isEn ? "p-value of significance test. < 0.05 → significant" : "p-value uji signifikansi. < 0.05 → signifikan"}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <p className="font-medium mb-2">{isEn ? "Cointegration Test:" : "Cointegration Test:"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>ADF τ-statistic:</strong> {isEn ? "Test statistic on long-run residuals" : "Statistik uji pada residual"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>p-value &lt; 0.05:</strong> {isEn ? "Cointegration confirmed → ECM valid ✓" : "Kointegrasi terkonfirmasi → ECM valid ✓"}</p>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Interpreting Short-Run ECM Output" : "Membaca Output Short-Run ECM"} icon={BarChart2} variant="default">
        <div className="space-y-3 mt-2 text-sm">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
            <p className="font-medium mb-2">ECT(-1) — {isEn ? "ECM Validation Key:" : "Kunci Validasi ECM:"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>{isEn ? "Negative & significant coefficient:" : "Koefisien negatif dan signifikan:"}</strong> {isEn ? "ECM valid, error correction toward equilibrium exists" : "ECM valid, ada koreksi ke keseimbangan"}</p>
            <p className="text-slate-600 dark:text-slate-400">• <strong>{isEn ? "Magnitude:" : "Besaran:"}</strong> {isEn ? "e.g., δ = -0.45 → 45% of deviation corrected per period" : "Misalnya δ = -0.45 → 45% deviasi terkoreksi per periode"}</p>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Tips & Recommendations" : "Tips & Rekomendasi"} icon={Lightbulb} variant="step">
        <div className="space-y-2 mt-2 text-sm text-slate-700 dark:text-slate-300">
          <p>• <strong>{isEn ? "Lag orders:" : "Orde lag:"}</strong> {isEn ? "Start with p=1, q=1 for all variables as a baseline." : "Mulai dari p=1, q=1 untuk semua variabel sebagai titik awal."}</p>
          <p>• <strong>{isEn ? "Save residuals:" : "Simpan residual:"}</strong> {isEn ? "Use save residual option for further heteroscedasticity testing with ARCH-LM." : "Gunakan fitur simpan residual untuk menganalisis lebih lanjut dengan ARCH-LM."}</p>
        </div>
      </HelpCard>
    </div>
  );
};
