import React from 'react';
import { FileText, BarChart3 } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OutputTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? 'Output Viewer Tables' : 'Tabel di Output Viewer'} icon={FileText} variant="feature">
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            {isEn
              ? 'The Output tab has five checkboxes that choose which tables appear under "Apply Model" in the Output Viewer. All are on by default.'
              : 'Tab Output memiliki lima checkbox untuk memilih tabel yang tampil di bawah "Apply Model" pada Output Viewer. Semuanya aktif secara bawaan.'}
          </p>
          <HelpStep
            number={1}
            title="Model Summary"
            description={
              isEn
                ? 'The model source, algorithm, format version, training time, target, classes, each feature with the dataset variable it was mapped to, and the main model parameters (including text-feature information when present).'
                : 'Sumber model, algoritma, versi format, waktu pelatihan, target, kelas, setiap fitur beserta variabel dataset yang dipetakan, dan parameter utama model (termasuk informasi fitur teks bila ada).'
            }
          />
          <HelpStep
            number={2}
            title="Case Processing Summary"
            description={
              isEn
                ? 'Total rows, rows scored, rows not scored because all predictors are empty, rows scored with at least one empty predictor, and rows scored with at least one category the model has never seen. With an actual target it also shows the evaluated rows and the rows excluded because the actual value is empty or is a class unknown to the model.'
                : 'Jumlah baris total, baris yang diprediksi, baris yang tidak diprediksi karena seluruh prediktornya kosong, baris yang diprediksi dengan minimal satu prediktor kosong, dan baris yang diprediksi dengan minimal satu kategori yang tidak pernah dilihat model. Bila ada target sebenarnya, tabel ini juga menampilkan baris yang dievaluasi dan baris yang dikecualikan karena nilai aktualnya kosong atau kelasnya tidak dikenal model.'
            }
          />
          <HelpStep
            number={3}
            title="Prediction Distribution"
            description={
              isEn
                ? 'For each class: how many rows were predicted into it and the percentage of scored rows, plus a Not scored row and a Total row.'
                : 'Untuk setiap kelas: jumlah baris yang diprediksi ke kelas tersebut dan persentasenya terhadap baris yang diprediksi, ditambah baris Not scored dan Total.'
            }
          />
          <HelpStep
            number={4}
            title="Saved Variables"
            description={
              isEn
                ? 'Always shown. Lists each new column with its final name, type, and measurement level.'
                : 'Selalu ditampilkan. Mendaftar setiap kolom baru beserta nama akhir, tipe, dan measurement level-nya.'
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? 'Evaluation Tables' : 'Tabel Evaluasi'} icon={BarChart3} variant="default">
        <div className="space-y-3 text-sm mt-2">
          <p className="text-muted-foreground">
            {isEn
              ? 'The Evaluation metrics and Confusion matrix checkboxes are available only when an actual target is chosen in the Variables tab. The comparison uses only rows that were predicted and have an actual value that is one of the model classes.'
              : 'Checkbox Evaluation metrics dan Confusion matrix hanya aktif bila actual target dipilih di Tab Variables. Perbandingan hanya memakai baris yang diprediksi dan memiliki nilai aktual yang termasuk kelas model.'}
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {isEn ? (
              <>
                <li><strong>Model Evaluation Metrics</strong>: precision, recall, and F1 per class, macro, weighted, and micro averages, and overall accuracy.</li>
                <li><strong>Cohen&apos;s Kappa</strong>: agreement between predicted and actual classes beyond chance (overall value).</li>
                <li><strong>Confusion Matrix</strong>: actual classes in the rows against predicted classes in the columns.</li>
              </>
            ) : (
              <>
                <li><strong>Model Evaluation Metrics</strong>: precision, recall, dan F1 per kelas, rata-rata macro, weighted, dan micro, serta akurasi keseluruhan.</li>
                <li><strong>Cohen&apos;s Kappa</strong>: tingkat kesesuaian antara kelas prediksi dan kelas aktual di luar faktor kebetulan (nilai keseluruhan).</li>
                <li><strong>Confusion Matrix</strong>: kelas aktual pada baris terhadap kelas prediksi pada kolom.</li>
              </>
            )}
          </ul>
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? 'Tip' : 'Tips'}>
        <p className="text-sm mt-2">
          {isEn
            ? 'After you press OK, a notification reports how many rows were predicted and the final names of the new columns.'
            : 'Setelah OK ditekan, notifikasi menampilkan jumlah baris yang diprediksi dan nama akhir kolom baru.'}
        </p>
      </HelpAlert>
    </div>
  );
};
