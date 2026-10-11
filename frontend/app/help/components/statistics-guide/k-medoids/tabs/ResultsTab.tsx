import React from 'react';
import { ClipboardList, BarChart3 } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ResultsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Core Outputs (Recommended)" : "Core Outputs (Direkomendasikan)"} icon={ClipboardList} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Cluster Membership"
            description={isEn ? "A table showing which cluster each case belongs to, along with its distance to that medoid." : "Tabel yang menunjukkan cluster tempat setiap kasus berada, lengkap dengan jarak ke medoidnya."}
          />
          <HelpStep
            number={2}
            title="Number of Cases per Cluster"
            description={isEn ? "A summary of case counts per cluster. Useful for checking whether any cluster is too small or lopsided." : "Ringkasan jumlah kasus pada setiap cluster. Berguna untuk memeriksa apakah ada cluster yang terlalu kecil atau timpang."}
          />
          <HelpStep
            number={3}
            title="Cluster Medoids"
            description={isEn ? "Shows the case that is the medoid of each cluster along with its variable values — the representative case you can interpret as a group profile." : "Menampilkan kasus yang menjadi medoid setiap cluster beserta nilai variabelnya. Inilah kasus perwakilan yang dapat Anda tafsirkan sebagai profil kelompok."}
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Additional Information (Optional)" : "Additional Information (Opsional)"} icon={BarChart3} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Algorithm Convergence" : "Konvergensi Algoritma"}
            description={isEn ? "A convergence-status panel plus an iteration-history table (cost per iteration). Enabling this option automatically includes the detailed iteration history." : "Panel status konvergensi beserta tabel histori iterasi (cost per iterasi). Mengaktifkan opsi ini otomatis menyertakan detail histori iterasi."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Algorithm Convergence Chart" : "Grafik Konvergensi Algoritma"}
            description={isEn ? "A chart of cost decrease and improvement size per iteration as a standalone section. Can be enabled without the table above, or vice versa." : "Grafik penurunan cost dan besar perbaikan per iterasi sebagai section tersendiri. Dapat diaktifkan tanpa tabel di atasnya, atau sebaliknya."}
          />
          <HelpStep
            number={3}
            title={isEn ? "Sampling History (CLARA only)" : "Histori Sampling (khusus CLARA)"}
            description={isEn ? "A chart and table of cost for every sample CLARA draws. This option replaces both convergence options above when the CLARA method is selected." : "Grafik dan tabel cost untuk setiap sampel yang diambil CLARA. Opsi ini menggantikan kedua opsi konvergensi di atas ketika metode CLARA dipilih."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="info" title={isEn ? "Options Adapt to the Method" : "Opsi Menyesuaikan Metode"}>
        <p className="text-sm mt-2">
          {isEn
            ? "The content of the Results tab changes with the method on the Iterate tab. PAM and CLARANS show convergence options (iteration table and chart), while CLARA shows Sampling History instead, since CLARA works per-sample rather than per-swap iteration."
            : "Isi tab Results berubah mengikuti metode pada tab Iterate. Untuk PAM dan CLARANS akan muncul opsi konvergensi (tabel dan grafik iterasi), sedangkan untuk CLARA yang muncul adalah Histori Sampling, karena CLARA bekerja per sampel dan bukan per iterasi swap."}
        </p>
      </HelpAlert>
    </div>
  );
};
