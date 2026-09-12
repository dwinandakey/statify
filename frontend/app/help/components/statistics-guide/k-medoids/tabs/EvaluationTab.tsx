import React from 'react';
import { BarChart3, SlidersHorizontal } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const EvaluationTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title="Silhouette" icon={BarChart3} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Silhouette Plot (per object)" : "Silhouette Plot (per objek)"}
            description={isEn ? "A bar chart of the silhouette score for each object, grouped by cluster. Negative bars flag cases that are likely misplaced." : "Grafik batang skor silhouette untuk setiap objek, dikelompokkan per cluster. Batang bernilai negatif menandakan kasus yang kemungkinan salah tempat."}
          />
          <HelpStep
            number={2}
            title="Overall Quality Assessment"
            description={isEn ? "A summary of the average silhouette score along with an interpretation of the overall cluster structure's strength." : "Ringkasan skor silhouette rata-rata beserta interpretasi kekuatan struktur cluster secara keseluruhan."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="info" title={isEn ? "Reading the Silhouette Score" : "Membaca Skor Silhouette"}>
        <div className="text-sm mt-2 space-y-1">
          <p>{isEn ? "The silhouette score ranges from -1 to +1, higher is better:" : "Skor silhouette berkisar dari -1 sampai +1, semakin tinggi semakin baik:"}</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>0.7 – 1.0</strong>: {isEn ? "very strong cluster structure" : "struktur cluster sangat kuat"}</li>
            <li><strong>0.5 – 0.7</strong>: {isEn ? "strong cluster structure" : "struktur cluster kuat"}</li>
            <li><strong>0.3 – 0.5</strong>: {isEn ? "moderate structure, consider another k" : "struktur moderat, pertimbangkan nilai k lain"}</li>
            <li>{isEn ? "below" : "di bawah"} <strong>0.3</strong>: {isEn ? "weak structure, groups aren't clearly separated" : "struktur lemah, kelompok belum terpisah jelas"}</li>
          </ul>
          <p className="mt-2">
            {isEn ? (
              <>The full formulas for a(i), b(i), and s(i) are on the <strong>Formula</strong> tab.</>
            ) : (
              <>Rumus lengkap a(i), b(i), dan s(i) dapat dilihat pada tab <strong>Rumus</strong>.</>
            )}
          </p>
        </div>
      </HelpAlert>

      <HelpCard title={isEn ? "Optimal K" : "K Optimal"} icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Optimal K Chart" : "Grafik K Optimal"}
            description={isEn ? "A silhouette or elbow curve for every candidate k, helping you visually see at which k cluster quality is best." : "Kurva silhouette atau elbow untuk setiap kandidat k, membantu Anda melihat secara visual pada k berapa kualitas cluster paling baik."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Optimal K Table" : "Tabel K Optimal"}
            description={isEn ? "Cost and silhouette-score values for each k in table form, as a companion to the numbers in the chart above." : "Nilai cost dan skor silhouette untuk setiap k dalam bentuk tabel, sebagai pendamping angka dari grafik di atas."}
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Tip: Optimal K in Manual Mode" : "Tips: K Optimal pada Mode Manual"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Both Optimal K options still work even when you've chosen manual k mode. If enabled, the system still evaluates a k range to produce comparison data, so you can check whether your chosen k is actually appropriate. The trade-off is a longer analysis run."
            : "Kedua opsi K Optimal tetap dapat digunakan meskipun Anda memilih mode k manual. Jika salah satunya diaktifkan, sistem tetap mengevaluasi rentang k untuk menghasilkan data pembanding, sehingga Anda bisa memeriksa apakah nilai k pilihan Anda sudah tepat. Konsekuensinya, proses analisis menjadi lebih lama."}
        </p>
      </HelpAlert>
    </div>
  );
};
