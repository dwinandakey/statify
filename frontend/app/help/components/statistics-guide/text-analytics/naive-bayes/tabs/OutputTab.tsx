import React from 'react';
import { FileText, Download, ListChecks, Sigma } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

/** Rumus blok dengan notasi matematika (KaTeX). */
const MetricFormula: React.FC<{ math: string }> = ({ math }) => (
  <div className="mt-2 overflow-x-auto rounded-md bg-muted/40 px-3 py-1 text-sm">
    <BlockMath math={math} />
  </div>
);

/** Rumus metrik evaluasi, sama dengan perhitungan di classification_table.rs. */
const MetricFormulasCard: React.FC<{ isEn: boolean }> = ({ isEn }) => (
  <HelpCard title={isEn ? 'Evaluation Metric Formulas' : 'Rumus Metrik Evaluasi'} icon={Sigma} variant="feature">
    <div className="space-y-4 text-sm mt-2">
      <p className="text-muted-foreground">
        {isEn ? (
          <>
            All metrics come from the confusion matrix. <InlineMath math="n_{ij}" /> = number of cases with actual class{' '}
            <InlineMath math="i" /> predicted as class <InlineMath math="j" />, <InlineMath math="N" /> = grand total,{' '}
            <InlineMath math="K" /> = number of classes. Each class <InlineMath math="c" /> is treated one-vs-rest:
          </>
        ) : (
          <>
            Semua metrik dihitung dari confusion matrix. <InlineMath math="n_{ij}" /> = jumlah kasus berkelas aktual{' '}
            <InlineMath math="i" /> yang diprediksi sebagai kelas <InlineMath math="j" />, <InlineMath math="N" /> = total
            keseluruhan, <InlineMath math="K" /> = jumlah kelas. Setiap kelas <InlineMath math="c" /> diperlakukan one-vs-rest:
          </>
        )}
      </p>
      <MetricFormula math={String.raw`TP_c = n_{cc}, \quad FP_c = \sum_{i \neq c} n_{ic}, \quad FN_c = \sum_{j \neq c} n_{cj}, \quad TN_c = N - TP_c - FP_c - FN_c`} />

      <hr className="border-border" />
      <div>
        <p className="font-semibold text-primary">{isEn ? 'Per class' : 'Per kelas'}</p>
        <MetricFormula math={String.raw`\text{Accuracy}_c = \frac{TP_c + TN_c}{N}, \qquad \text{Precision}_c = \frac{TP_c}{TP_c + FP_c}, \qquad \text{Recall}_c = \frac{TP_c}{TP_c + FN_c}`} />
        <MetricFormula math={String.raw`F1_c = \frac{2 \cdot \text{Precision}_c \cdot \text{Recall}_c}{\text{Precision}_c + \text{Recall}_c}`} />
        <p className="text-muted-foreground mt-1 text-xs">
          {isEn
            ? 'When a denominator is 0 (for example a class that is never predicted), the metric is reported as 0 instead of being undefined.'
            : 'Bila penyebutnya 0 (misalnya kelas yang tidak pernah diprediksi), metrik dilaporkan 0, bukan tidak terdefinisi.'}
        </p>
      </div>

      <hr className="border-border" />
      <div>
        <p className="font-semibold text-primary">{isEn ? 'Averages and overall accuracy' : 'Rata-rata dan akurasi keseluruhan'}</p>
        <MetricFormula math={String.raw`\text{Macro} = \frac{1}{K} \sum_{c=1}^{K} M_c, \qquad \text{Weighted} = \frac{\sum_{c} s_c\, M_c}{\sum_{c} s_c}, \quad s_c = TP_c + FN_c`} />
        <MetricFormula math={String.raw`\text{Precision}_{\mu} = \frac{\sum_c TP_c}{\sum_c (TP_c + FP_c)}, \quad \text{Recall}_{\mu} = \frac{\sum_c TP_c}{\sum_c (TP_c + FN_c)}, \quad F1_{\mu} = \frac{2\,\text{Precision}_{\mu}\,\text{Recall}_{\mu}}{\text{Precision}_{\mu} + \text{Recall}_{\mu}}`} />
        <MetricFormula math={String.raw`\text{Overall Accuracy} = \frac{\sum_{c} n_{cc}}{N}`} />
        <p className="text-muted-foreground mt-1 text-xs">
          {isEn
            ? 'M_c is the Precision, Recall, or F1 of class c, and s_c (support) is the number of actual cases of class c. Because every case has exactly one actual and one predicted class, the micro averages (μ) are always equal to the Overall Accuracy.'
            : 'M_c adalah Precision, Recall, atau F1 kelas c, dan s_c (support) adalah jumlah kasus aktual kelas c. Karena setiap kasus memiliki tepat satu kelas aktual dan satu kelas prediksi, rata-rata micro (μ) selalu sama dengan Overall Accuracy.'}
        </p>
      </div>

      <hr className="border-border" />
      <div>
        <p className="font-semibold text-primary">Cohen&apos;s Kappa</p>
        <MetricFormula math={String.raw`p_o = \frac{\sum_{c} n_{cc}}{N}, \qquad p_e = \sum_{c} \frac{n_{c\cdot}}{N} \cdot \frac{n_{\cdot c}}{N}, \qquad \kappa = \frac{p_o - p_e}{1 - p_e}`} />
        <p className="text-muted-foreground mt-1 text-xs">
          {isEn
            ? 'p_o is the observed agreement (the Overall Accuracy), n_c· is the row total (actual) and n_·c the column total (predicted) of class c, so p_e is the agreement expected by chance. If p_e = 1, Kappa is reported as 0. Kappa is one overall value, not per class.'
            : 'p_o adalah kesesuaian teramati (Overall Accuracy), n_c· adalah total baris (aktual) dan n_·c total kolom (prediksi) kelas c, sehingga p_e adalah kesesuaian yang diharapkan secara kebetulan. Bila p_e = 1, Kappa dilaporkan 0. Kappa adalah satu nilai keseluruhan, bukan per kelas.'}
        </p>
      </div>

      <hr className="border-border" />
      <div>
        <p className="font-semibold text-primary">{isEn ? 'How to read them' : 'Cara membacanya'}</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
          {isEn ? (
            <>
              <li><strong>Confusion Matrix:</strong> rows = actual class, columns = predicted class. The diagonal cells are correct predictions; an off-diagonal cell in row A, column B counts cases of A that were predicted as B. The percentage in each cell is relative to the grand total N.</li>
              <li>Reading along a row gives Recall (how many cases of that class were found); reading down a column gives Precision (how many predictions of that class were right).</li>
              <li><strong>Kappa:</strong> 1 = perfect agreement, 0 = no better than chance, below 0 = worse than chance. A common rule of thumb reads 0.01–0.20 as slight, 0.21–0.40 fair, 0.41–0.60 moderate, 0.61–0.80 substantial, and 0.81–1.00 almost perfect agreement; these bands are conventions, not strict limits.</li>
              <li>With unbalanced classes, prefer the Macro F1 and Kappa over the Overall Accuracy, because a model can reach a high accuracy by mostly predicting the largest class.</li>
            </>
          ) : (
            <>
              <li><strong>Confusion Matrix:</strong> baris = kelas aktual, kolom = kelas prediksi. Sel diagonal adalah prediksi yang benar; sel di luar diagonal pada baris A, kolom B menghitung kasus A yang diprediksi sebagai B. Persentase setiap sel dihitung terhadap total keseluruhan N.</li>
              <li>Membaca sepanjang baris memberi Recall (berapa banyak kasus kelas itu yang ditemukan); membaca ke bawah sepanjang kolom memberi Precision (berapa banyak prediksi kelas itu yang benar).</li>
              <li><strong>Kappa:</strong> 1 = kesesuaian sempurna, 0 = tidak lebih baik dari kebetulan, di bawah 0 = lebih buruk dari kebetulan. Patokan umum yang sering dipakai: 0,01–0,20 sangat lemah (slight), 0,21–0,40 lemah (fair), 0,41–0,60 sedang (moderate), 0,61–0,80 kuat (substantial), dan 0,81–1,00 hampir sempurna; rentang ini konvensi, bukan batas mutlak.</li>
              <li>Pada kelas yang tidak seimbang, utamakan Macro F1 dan Kappa dibanding Overall Accuracy, karena model dapat mencapai akurasi tinggi hanya dengan sering menebak kelas terbesar.</li>
            </>
          )}
        </ul>
      </div>
    </div>
  </HelpCard>
);

export const OutputTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Output Tab Settings" : "Pengaturan Tab Output"} icon={ListChecks} variant="feature">
        <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground mt-2">
          {isEn ? (
            <>
              <li><strong>Viewer Output:</strong> four checkboxes (all ticked by default) choose which tables appear: Case Processing Summary, Attribute Distribution Table, Model Evaluation Metrics, and Confusion Matrix.</li>
              <li><strong>Text Feature Table:</strong> available when Text Features are set (ticked by default). <strong>Top-k terms per class</strong> is a whole number from 1 to 1000 (default 100).</li>
              <li>Click <strong>OK</strong> to run. OK is enabled once a Target and at least one predictor or Text Feature are set.</li>
            </>
          ) : (
            <>
              <li><strong>Viewer Output:</strong> empat kotak centang (semua tercentang secara bawaan) menentukan tabel yang tampil: Case Processing Summary, Attribute Distribution Table, Model Evaluation Metrics, dan Confusion Matrix.</li>
              <li><strong>Text Feature Table:</strong> aktif bila Text Features terisi (tercentang secara bawaan). <strong>Top-k terms per class</strong> adalah bilangan bulat 1 sampai 1000 (bawaan 100).</li>
              <li>Klik <strong>OK</strong> untuk menjalankan. OK aktif setelah Target dan minimal satu prediktor atau Text Feature terisi.</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpCard title={isEn ? "Tables in the Output Viewer" : "Tabel di Output Viewer"} icon={FileText} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Case Processing Summary"
            description={
              isEn
                ? "Total and valid instances, rows excluded because the target is missing, the target variable, the attribute variables, and the validation scenario. With text features it also shows the text source (raw text with its number of terms, or the number of word-vector columns), the text likelihood and alpha, and notes such as the leakage warning for word vectors."
                : "Jumlah instance total dan valid, baris yang dibuang karena target kosong, variabel target, variabel atribut, dan skenario validasi. Bila ada fitur teks, tabel ini juga menampilkan sumber teks (teks mentah beserta jumlah term-nya, atau jumlah kolom vektor kata), likelihood dan alpha teks, serta catatan seperti peringatan leakage untuk vektor kata."
            }
          />
          <HelpStep
            number={2}
            title="Attribute Distribution Table"
            description={
              isEn
                ? "Parameters of the final model for numeric and categorical predictors. For each category of a categorical variable and each class: raw count / smoothed count (count + α), the probability as a percentage, and the class total. For numeric variables: the Mean and Std. Dev. per class."
                : "Parameter model akhir untuk prediktor numerik dan kategorik. Untuk setiap kategori variabel kategorik dan setiap kelas: raw count / smoothed count (count + α), peluangnya dalam persen, dan total kelas. Untuk variabel numerik: Mean dan Std. Dev. per kelas."
            }
          />
          <HelpStep
            number={3}
            title="Text Feature Table"
            description={
              isEn
                ? "For each class, the top-k most influential terms with Rank, Term, Score, Log weight, and Count. Score = log weight of the term in that class minus the mean log weight of the same term in the other classes, so high scores mark words typical of the class. Download CSV saves the full table (all terms × classes) and Copy (TSV) copies it to the clipboard; very large tables should be downloaded instead."
                : "Untuk setiap kelas, top-k term paling berpengaruh beserta Rank, Term, Score, Log weight, dan Count. Score = log weight term di kelas tersebut dikurangi rata-rata log weight term yang sama di kelas lain, sehingga skor tinggi menandai kata yang khas untuk kelas itu. Download CSV menyimpan tabel lengkap (semua term × kelas) dan Copy (TSV) menyalinnya ke clipboard; tabel yang sangat besar sebaiknya diunduh."
            }
          />
          <HelpStep
            number={4}
            title="Model Evaluation Metrics & Cohen's Kappa"
            description={
              isEn
                ? "Computed from the holdout or pooled k-fold predictions. Per class: Accuracy (one-vs-rest), Precision, Recall, and F1-Score, followed by the Macro Average (simple mean over classes), Weighted Average (weighted by class size), Micro Average (from the pooled counts), and Overall Accuracy. Cohen's Kappa is reported as one overall value: the agreement between actual and predicted classes after removing the agreement expected by chance (1 = perfect, 0 = no better than chance)."
                : "Dihitung dari prediksi holdout atau gabungan prediksi k-fold. Per kelas: Accuracy (one-vs-rest), Precision, Recall, dan F1-Score, lalu Macro Average (rata-rata sederhana antarkelas), Weighted Average (dibobot ukuran kelas), Micro Average (dari jumlah gabungan), dan Overall Accuracy. Cohen's Kappa dilaporkan sebagai satu nilai keseluruhan: kesesuaian antara kelas aktual dan prediksi setelah dikurangi kesesuaian yang diharapkan secara kebetulan (1 = sempurna, 0 = tidak lebih baik dari kebetulan)."
            }
          />
          <HelpStep
            number={5}
            title="Confusion Matrix"
            description={
              isEn
                ? "Rows are the actual classes and columns are the predicted classes. Each cell shows the count and its percentage, with row totals, column totals, and the grand total. The diagonal holds the correct predictions."
                : "Baris adalah kelas aktual dan kolom adalah kelas prediksi. Setiap sel menampilkan jumlah dan persentasenya, beserta total baris, total kolom, dan total keseluruhan. Diagonal berisi prediksi yang benar."
            }
          />
        </div>
      </HelpCard>

      <MetricFormulasCard isEn={isEn} />

      <HelpCard title="Export Model" icon={Download} variant="feature">
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "Export Model is not a checkbox. After a successful run, an Export Model section appears in the Output Viewer. Type a file name (default Naive_Bayes_Model_Export.json) and click Export Model to download the trained final model as a JSON file. The file contains the classes and priors, every feature's parameters, the smoothing values, the validation settings, and, for raw text, the text preprocessing recipe and vocabulary."
            : "Export Model bukan kotak centang. Setelah run berhasil, bagian Export Model muncul di Output Viewer. Ketik nama file (bawaan Naive_Bayes_Model_Export.json) lalu klik Export Model untuk mengunduh model akhir sebagai file JSON. File ini memuat kelas dan prior, parameter setiap fitur, nilai smoothing, pengaturan validasi, serta untuk teks mentah, resep preprocessing teks dan kosakatanya."}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {isEn
            ? "Use the file in Analyze > Classify > Apply Model to predict the classes of new data. The JSON stores the original category labels of your dataset, so treat it as data that may be sensitive."
            : "Gunakan file tersebut di Analyze > Classify > Apply Model untuk memprediksi kelas data baru. JSON ini menyimpan label kategori asli dataset Anda, jadi perlakukan sebagai data yang mungkin sensitif."}
        </p>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Reading the results" : "Membaca hasil"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Compare Overall Accuracy with the share of the largest class: a model that is not much better than always guessing the largest class is weak, and Cohen's Kappa will be close to 0. Check per-class Recall in the Confusion Matrix to see which classes are confused with each other."
            : "Bandingkan Overall Accuracy dengan proporsi kelas terbesar: model yang tidak jauh lebih baik daripada selalu menebak kelas terbesar tergolong lemah, dan Cohen's Kappa akan mendekati 0. Periksa Recall per kelas dan Confusion Matrix untuk melihat kelas mana yang sering tertukar."}
        </p>
      </HelpAlert>
    </div>
  );
};
