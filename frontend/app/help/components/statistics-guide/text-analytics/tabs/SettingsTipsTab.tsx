import React from "react";
import { Eraser, Scissors, Calculator, SlidersHorizontal, ShieldCheck } from "lucide-react";
import { HelpAlert, HelpCard } from "@/app/help/ui/HelpLayout";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

/** Satu baris tips: nama pengaturan di kiri, saran di kanan. */
const TipRow: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
  <div className="grid gap-1 p-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] sm:gap-3">
    <p className="text-sm font-semibold">{name}</p>
    <div className="text-sm text-muted-foreground">{children}</div>
  </div>
);

/** Tips praktis memilih pengaturan Text Analytics (STWV dan Text Preprocessing Naive Bayes). */
export const SettingsTipsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === "en";

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "There Is No Single Best Setting" : "Tidak Ada Satu Pengaturan Terbaik"}>
        <p className="text-sm mt-2">
          {isEn
            ? "The tips below are starting points, not rules. The best combination depends on the language, the length of the texts, and the classes. Change one setting at a time, keep the same random seed, and compare the evaluation metrics. The same options exist in Transform > String to Word Vector and in the Text Preprocessing tab of Naive Bayes."
            : "Tips berikut adalah titik awal, bukan aturan baku. Kombinasi terbaik bergantung pada bahasa, panjang teks, dan kelasnya. Ubah satu pengaturan setiap kali, pertahankan random seed yang sama, lalu bandingkan metrik evaluasinya. Opsi yang sama tersedia di Transform > String to Word Vector dan di tab Text Preprocessing pada Naive Bayes."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Cleaning: Stopwords and Stemming" : "Pembersihan: Stopwords dan Stemming"} icon={Eraser} variant="feature">
        <div className="mt-2 divide-y rounded-lg border">
          <TipRow name="Lowercase">
            {isEn
              ? "Keep it on (default) in almost all cases, so that \"Good\" and \"good\" are one word. Turn it off only when capital letters carry meaning."
              : "Biarkan aktif (bawaan) pada hampir semua kasus, agar \"Bagus\" dan \"bagus\" menjadi satu kata. Matikan hanya bila huruf kapital memiliki makna."}
          </TipRow>
          <TipRow name="Stopwords">
            {isEn ? (
              <>
                Choose the list that matches the language of the texts (Indonesian or English). Removing very common words
                usually makes the vocabulary smaller and the top terms easier to read. <strong>Caution for sentiment:</strong>{" "}
                the built-in lists contain negation words such as <em>tidak</em>, <em>bukan</em>, <em>belum</em>, <em>not</em>,
                and <em>no</em>. If negation matters for your classes, edit the list (it switches to Custom) and delete those
                words, or compare the results with and without stopword removal.
              </>
            ) : (
              <>
                Pilih daftar yang sesuai bahasa teks (Indonesian atau English). Membuang kata yang sangat umum biasanya
                memperkecil kosakata dan membuat term teratas lebih mudah dibaca. <strong>Hati-hati untuk sentimen:</strong>{" "}
                daftar bawaan memuat kata negasi seperti <em>tidak</em>, <em>bukan</em>, <em>belum</em>, <em>not</em>, dan{" "}
                <em>no</em>. Bila negasi penting bagi kelas Anda, ubah daftarnya (otomatis menjadi Custom) dan hapus kata-kata
                tersebut, atau bandingkan hasil dengan dan tanpa penghapusan stopwords.
              </>
            )}
          </TipRow>
          <TipRow name="Stemming">
            {isEn
              ? "Indonesian (Sastrawi) removes Indonesian affixes (for example makanan → makan); English (Porter) removes English suffixes (for example running → run). Use the stemmer that matches the language. Stemming merges word variants, which helps small datasets, but it can also merge words with different meanings; compare with None if in doubt. Stemming makes processing slower on large datasets."
              : "Indonesian (Sastrawi) membuang imbuhan bahasa Indonesia (misalnya makanan → makan); English (Porter) membuang akhiran bahasa Inggris (misalnya running → run). Gunakan stemmer yang sesuai bahasa teks. Stemming menggabungkan variasi kata sehingga membantu dataset kecil, tetapi dapat juga menggabungkan kata yang maknanya berbeda; bandingkan dengan None bila ragu. Stemming membuat proses lebih lambat pada dataset besar."}
          </TipRow>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Tokenizer and Vocabulary Size" : "Tokenizer dan Ukuran Kosakata"} icon={Scissors} variant="feature">
        <div className="mt-2 divide-y rounded-lg border">
          <TipRow name="N-gram">
            {isEn
              ? "Word (unigram) is the usual start. N-gram with min 1 and max 2 adds word pairs such as \"tidak suka\" or \"not good\", which can capture negation and short phrases. Larger n quickly creates many rare terms, so keep max at 2 or 3 and limit Words to Keep."
              : "Word (unigram) adalah awal yang lazim. N-gram dengan min 1 dan max 2 menambahkan pasangan kata seperti \"tidak suka\", yang dapat menangkap negasi dan frasa pendek. Nilai n yang besar cepat menghasilkan banyak term langka, jadi batasi max pada 2 atau 3 dan batasi Words to Keep."}
          </TipRow>
          <TipRow name="Words to Keep">
            {isEn
              ? "Default 1000; 0 keeps every term. A limit removes the rarest terms (lowest total count, or lowest TF × IDF sum for some combinations) and keeps the dataset and the model small. For short texts and a few thousand documents, 1000–5000 is a common range; check the Vocabulary Size in the output to see how many terms exist."
              : "Bawaan 1000; 0 menyimpan semua term. Pembatasan membuang term paling langka (total kemunculan terendah, atau jumlah TF × IDF terendah pada sebagian kombinasi) dan menjaga dataset serta model tetap kecil. Untuk teks pendek dan beberapa ribu dokumen, 1000–5000 adalah rentang yang umum; periksa Vocabulary Size di output untuk melihat jumlah term yang ada."}
          </TipRow>
          <TipRow name="Min term frequency">
            {isEn
              ? "Default 1 (drop nothing). Values of 2–5 remove typos and words that appear only once, which often cannot help the classifier. It is applied before Words to Keep. Too high a value can leave short documents with no words at all (zero vectors)."
              : "Bawaan 1 (tidak ada yang dibuang). Nilai 2–5 membuang salah ketik dan kata yang hanya muncul sekali, yang biasanya tidak membantu klasifikasi. Diterapkan sebelum Words to Keep. Nilai yang terlalu tinggi dapat membuat dokumen pendek tidak memiliki kata sama sekali (vektor nol)."}
          </TipRow>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Weighting: TF, IDF, and Normalization" : "Pembobotan: TF, IDF, dan Normalisasi"} icon={Calculator} variant="feature">
        <div className="mt-2 divide-y rounded-lg border">
          <TipRow name="Term Frequency (TF)">
            {isEn ? (
              <>
                <strong>Raw count / Raw frequency</strong> (default) is the natural input of Multinomial Naive Bayes.{" "}
                <strong>Binary / Boolean</strong> only records presence and suits very short texts or the Bernoulli likelihood.{" "}
                <strong>Logarithmic / Log-scaled</strong> and <strong>Sublinear</strong> dampen words repeated many times in one
                document. <strong>Relative frequency / Length-normalized</strong> divides by document length, which helps when
                document lengths differ a lot.
              </>
            ) : (
              <>
                <strong>Raw count / Raw frequency</strong> (bawaan) adalah masukan alami Multinomial Naive Bayes.{" "}
                <strong>Binary / Boolean</strong> hanya mencatat ada/tidaknya kata dan cocok untuk teks sangat pendek atau
                likelihood Bernoulli. <strong>Logarithmic / Log-scaled</strong> dan <strong>Sublinear</strong> meredam kata yang
                diulang berkali-kali dalam satu dokumen. <strong>Relative frequency / Length-normalized</strong> membagi dengan
                panjang dokumen, berguna bila panjang dokumen sangat bervariasi.
              </>
            )}
          </TipRow>
          <TipRow name="Inverse Document Frequency (IDF)">
            {isEn ? (
              <>
                IDF lowers the weight of words found in many documents. <strong>Standard IDF</strong> gives exactly 0 to a word
                that appears in every document, so that word disappears from the vector. <strong>Smooth IDF</strong> and{" "}
                <strong>IDF + 1</strong> never give 0 and are safer choices. None (default) is fine when stopwords are already
                removed.
              </>
            ) : (
              <>
                IDF menurunkan bobot kata yang muncul di banyak dokumen. <strong>Standard IDF</strong> memberi nilai tepat 0
                pada kata yang muncul di semua dokumen, sehingga kata itu hilang dari vektor. <strong>Smooth IDF</strong> dan{" "}
                <strong>IDF + 1</strong> tidak pernah bernilai 0 dan lebih aman. None (bawaan) cukup bila stopwords sudah
                dibuang.
              </>
            )}
          </TipRow>
          <TipRow name="Normalization">
            {isEn ? (
              <>
                <strong>L2 / Cosine / Euclidean</strong> gives every document the same length and is the usual partner of TF-IDF.{" "}
                <strong>L1 / Manhattan</strong> makes each row sum to 1. <strong>Document length / Average-length</strong>{" "}
                rescales rows to the average length, keeping values on a scale closer to counts. Normalization turns counts into
                small decimals; with a text likelihood this makes the Text Alpha relatively large, so a smaller Text Alpha (for
                example 0.1) is worth trying.
              </>
            ) : (
              <>
                <strong>L2 / Cosine / Euclidean</strong> membuat setiap dokumen memiliki panjang yang sama dan lazim dipasangkan
                dengan TF-IDF. <strong>L1 / Manhattan</strong> membuat jumlah setiap baris menjadi 1.{" "}
                <strong>Document length / Average-length</strong> menskalakan baris ke panjang rata-rata sehingga nilainya
                tetap mendekati skala jumlah kata. Normalisasi mengubah jumlah kata menjadi desimal kecil; pada likelihood teks
                hal ini membuat Text Alpha relatif besar, sehingga Text Alpha yang lebih kecil (misalnya 0,1) layak dicoba.
              </>
            )}
          </TipRow>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Choosing the Text Likelihood" : "Memilih Likelihood Teks"} icon={SlidersHorizontal} variant="feature">
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm border rounded-lg">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left font-semibold">Likelihood</th>
                <th className="p-2 text-left font-semibold">{isEn ? "Natural TF pairing" : "Pasangan TF yang alami"}</th>
                <th className="p-2 text-left font-semibold">{isEn ? "When to try it" : "Kapan dicoba"}</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-t">
                <td className="p-2 font-medium text-foreground">Multinomial</td>
                <td className="p-2">{isEn ? "Raw count; TF-IDF weights also work" : "Raw count; bobot TF-IDF juga dapat dipakai"}</td>
                <td className="p-2">{isEn ? "The default and a strong baseline for most text classification." : "Bawaan dan pembanding yang kuat untuk sebagian besar klasifikasi teks."}</td>
              </tr>
              <tr className="border-t">
                <td className="p-2 font-medium text-foreground">Bernoulli</td>
                <td className="p-2">Binary / Boolean</td>
                <td className="p-2">
                  {isEn
                    ? "Short texts (tweets, titles) where presence matters more than repetition. It only uses whether a value is greater than 0, so other TF/IDF choices change nothing except values that become 0."
                    : "Teks pendek (tweet, judul) yang lebih bergantung pada ada/tidaknya kata daripada pengulangannya. Hanya memakai apakah nilainya lebih dari 0, sehingga pilihan TF/IDF lain tidak berpengaruh kecuali nilai yang menjadi 0."}
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-2 font-medium text-foreground">Complement</td>
                <td className="p-2">{isEn ? "Raw count or TF-IDF (often with L2)" : "Raw count atau TF-IDF (sering dengan L2)"}</td>
                <td className="p-2">
                  {isEn
                    ? "Unbalanced classes. Only available when the model has text features only (no numeric or categorical predictors); it does not use class priors."
                    : "Kelas yang tidak seimbang. Hanya tersedia bila model hanya berisi fitur teks (tanpa prediktor numerik atau kategorik); tidak memakai prior kelas."}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Validation and Reproducibility" : "Validasi dan Keterulangan"} icon={ShieldCheck} variant="feature">
        <div className="mt-2 divide-y rounded-lg border">
          <TipRow name="Holdout">
            {isEn
              ? "Fast and easy to explain (default 70% training / 30% holdout). Good for large datasets. With small datasets the result depends a lot on which rows end up in the holdout part."
              : "Cepat dan mudah dijelaskan (bawaan 70% latih / 30% holdout). Cocok untuk dataset besar. Pada dataset kecil hasilnya sangat bergantung pada baris mana yang masuk ke bagian holdout."}
          </TipRow>
          <TipRow name="K-fold">
            {isEn
              ? "Every row is tested once, so the estimate is more stable; better for small or medium datasets. 5 or 10 folds are common. It takes about k times longer, and k must not exceed the number of valid cases (a warning appears if it exceeds the smallest class)."
              : "Setiap baris diuji tepat sekali, sehingga estimasinya lebih stabil; lebih baik untuk dataset kecil atau sedang. 5 atau 10 fold lazim dipakai. Waktunya kira-kira k kali lebih lama, dan k tidak boleh melebihi jumlah kasus valid (peringatan muncul bila melebihi ukuran kelas terkecil)."}
          </TipRow>
          <TipRow name="Random seed">
            {isEn
              ? "Tick Use random seed and keep the same number (for example 42) while comparing settings. Then differences in the metrics come from the settings, not from a different random split. Report the seed together with the results."
              : "Centang Use random seed dan pertahankan angka yang sama (misalnya 42) selama membandingkan pengaturan. Dengan begitu perbedaan metrik berasal dari pengaturan, bukan dari pembagian acak yang berbeda. Cantumkan seed bersama hasilnya."}
          </TipRow>
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "A Simple Starting Recipe" : "Resep Awal yang Sederhana"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Raw Text Variable → Lowercase on, stopwords for the text language (keep negation words for sentiment), stemming for the same language, Word tokenizer, Raw count, IDF None, Normalization None, Words to Keep 1000, Min term frequency 2 → Multinomial, Text Alpha 1 → 10-fold cross-validation with a fixed seed. Then try one change at a time, for example N-gram 1–2 or TF-IDF with L2."
            : "Raw Text Variable → Lowercase aktif, stopwords sesuai bahasa teks (pertahankan kata negasi untuk sentimen), stemming bahasa yang sama, tokenizer Word, Raw count, IDF None, Normalization None, Words to Keep 1000, Min term frequency 2 → Multinomial, Text Alpha 1 → 10-fold cross-validation dengan seed tetap. Lalu coba satu perubahan setiap kali, misalnya N-gram 1–2 atau TF-IDF dengan L2."}
        </p>
      </HelpAlert>
    </div>
  );
};
