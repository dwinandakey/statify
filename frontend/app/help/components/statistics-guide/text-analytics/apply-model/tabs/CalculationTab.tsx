import React from 'react';
import { Sigma, Percent, HelpCircle, Type, Calculator } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

/** Rumus blok dengan notasi matematika (KaTeX). */
const Formula: React.FC<{ math: string }> = ({ math }) => (
  <div className="mt-2 overflow-x-auto rounded-md bg-muted/40 px-3 py-1 text-sm">
    <BlockMath math={math} />
  </div>
);

/** Cara Apply Model menghitung prediksi (AGENTS.md §5 Apply Model, revisi v2 untuk fitur teks). */
export const CalculationTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? 'Same Formulas as in Training' : 'Rumus yang Sama dengan Saat Pelatihan'}>
        <p className="text-sm mt-2">
          {isEn
            ? 'Apply Model does not learn anything. It reads the parameters stored in the model (priors, category probabilities, means and variances, text weights) and uses the same Naive Bayes formulas as the Naive Bayes menu to score every row of the active dataset.'
            : 'Apply Model tidak mempelajari apa pun. Menu ini membaca parameter yang tersimpan di model (prior, peluang kategori, mean dan varians, bobot teks) lalu memakai rumus Naive Bayes yang sama dengan menu Naive Bayes untuk menilai setiap baris dataset aktif.'}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? '1. Log Score per Class' : '1. Skor Log per Kelas'} icon={Sigma} variant="feature">
        <div className="space-y-4 text-sm mt-2">
          <p className="text-muted-foreground">
            {isEn
              ? 'For each row and each class c of the model, the scores of all predictors are added on the logarithmic scale:'
              : 'Untuk setiap baris dan setiap kelas c pada model, skor semua prediktor dijumlahkan dalam skala logaritma:'}
          </p>
          <Formula math={String.raw`s_c = \ln P(c) + \sum_{\text{numerical}} \ln f(x_i \mid c) + \sum_{\text{categorical}} \ln P(x_i \mid c) + T_c`} />
          <div>
            <p className="font-semibold text-primary">{isEn ? 'Numerical feature (Gaussian)' : 'Fitur numerical (Gaussian)'}</p>
            <Formula math={String.raw`\ln f(x \mid c) = -\tfrac{1}{2}\ln\!\left(2\pi\sigma_c^{2}\right) - \frac{(x - \mu_c)^{2}}{2\sigma_c^{2}}`} />
            <p className="text-muted-foreground mt-1 text-xs">
              {isEn
                ? 'μ_c and σ²_c are the mean and variance stored in the model for class c. An empty value skips this feature for the row.'
                : 'μ_c dan σ²_c adalah mean dan varians kelas c yang tersimpan di model. Nilai kosong membuat fitur ini dilewati untuk baris tersebut.'}
            </p>
          </div>
          <div>
            <p className="font-semibold text-primary">{isEn ? 'Categorical feature' : 'Fitur categorical'}</p>
            <p className="text-muted-foreground mt-1">
              {isEn
                ? 'P(x | c) is read from the category distribution stored in the model. An empty value is looked up as the category "(Missing)". Category labels are compared exactly (case-sensitive, after trimming spaces).'
                : 'P(x | c) dibaca dari distribusi kategori yang tersimpan di model. Nilai kosong dicari sebagai kategori "(Missing)". Label kategori dibandingkan persis (huruf besar/kecil dibedakan, setelah spasi di tepi dibuang).'}
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            {isEn ? (
              <>
                <InlineMath math={String.raw`T_c`} /> is the text contribution (see below; 0 when the model has no text feature). A probability of 0
                is replaced by the smallest positive number the computer can represent before the logarithm is taken, so
                the score never becomes <InlineMath math={String.raw`-\infty`} />. With the Complement text likelihood and two or more classes,
                the prior term <InlineMath math={String.raw`\ln P(c)`} /> is not added.
              </>
            ) : (
              <>
                <InlineMath math={String.raw`T_c`} /> adalah kontribusi teks (lihat di bawah; 0 bila model tidak memiliki fitur teks). Peluang 0
                diganti dengan bilangan positif terkecil yang dapat dinyatakan komputer sebelum logaritma diambil, sehingga
                skor tidak pernah menjadi <InlineMath math={String.raw`-\infty`} />. Pada likelihood teks Complement dengan dua kelas atau lebih,
                suku prior <InlineMath math={String.raw`\ln P(c)`} /> tidak ditambahkan.
              </>
            )}
          </p>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? 'Categories the Model Has Never Seen' : 'Kategori yang Belum Pernah Dilihat Model'} icon={HelpCircle} variant="feature">
        <div className="space-y-3 text-sm mt-2">
          <p className="text-muted-foreground">
            {isEn
              ? 'A category that is not in the model (including "(Missing)" when it did not occur in training) is handled according to the model format version:'
              : 'Kategori yang tidak ada di model (termasuk "(Missing)" bila tidak muncul saat pelatihan) ditangani menurut versi format model:'}
          </p>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">{isEn ? 'Format 1.1 and 2.0 — smoothing' : 'Format 1.1 dan 2.0 — smoothing'}</p>
            <Formula math={String.raw`P(x_{\text{unseen}} \mid c) = \frac{\alpha}{\mathrm{class\_total}_c + \alpha K}`} />
            <p className="text-muted-foreground text-xs mt-1">
              {isEn
                ? 'α = Smoothing Alpha of the model, class_total_c = training rows of class c, K = number of categories of the feature. The row is counted under "unseen category" in the Case Processing Summary.'
                : 'α = Smoothing Alpha model, class_total_c = jumlah baris latih kelas c, K = jumlah kategori fitur. Baris ini dihitung sebagai "unseen category" di Case Processing Summary.'}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">{isEn ? 'Format 1.0 (old files) — skipped' : 'Format 1.0 (file lama) — dilewati'}</p>
            <p className="text-muted-foreground text-xs mt-1">
              {isEn
                ? 'The old format does not store class totals, so the feature is left out of the score of that row for every class. Export the model again to get the smoothing behavior.'
                : 'Format lama tidak menyimpan total kelas, sehingga fitur tersebut dikeluarkan dari skor baris itu untuk semua kelas. Ekspor ulang model untuk mendapatkan perilaku smoothing.'}
            </p>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? 'Text Features' : 'Fitur Teks'} icon={Type} variant="feature">
        <div className="space-y-3 text-sm mt-2">
          <p className="text-muted-foreground">
            {isEn
              ? 'For a model trained on a Raw Text Variable, each new text is processed with the recipe stored in the model: the same lowercase, stopword, stemming, and tokenizer settings, the vocabulary learned from the training data, the training IDF values, and the same normalization. Words that are not in the training vocabulary are ignored. For a model trained on word-vector columns, the columns are read by name and missing columns count as 0.'
              : 'Untuk model yang dilatih dengan Raw Text Variable, setiap teks baru diolah dengan resep yang tersimpan di model: pengaturan lowercase, stopwords, stemming, dan tokenizer yang sama, kosakata yang dipelajari dari data latih, nilai IDF data latih, dan normalisasi yang sama. Kata yang tidak ada di kosakata latih diabaikan. Untuk model yang dilatih dengan kolom vektor kata, kolom dibaca berdasarkan nama dan kolom yang tidak ada dihitung 0.'}
          </p>
          <p className="text-muted-foreground">
            {isEn ? (
              <>
                With <InlineMath math={String.raw`x_t`} /> = value of term <InlineMath math="t" /> in the row and the stored weights{' '}
                <InlineMath math={String.raw`L_{ct}`} />:
              </>
            ) : (
              <>
                Dengan <InlineMath math={String.raw`x_t`} /> = nilai term <InlineMath math="t" /> pada baris dan bobot tersimpan{' '}
                <InlineMath math={String.raw`L_{ct}`} />:
              </>
            )}
          </p>
          <Formula math={String.raw`\text{Multinomial, Complement:}\quad T_c = \sum_{t} x_t\, L_{ct}`} />
          <Formula math={String.raw`\text{Bernoulli:}\quad T_c = \sum_{t} A_{ct} + \sum_{t:\, x_t > 0} \left(L_{ct} - A_{ct}\right), \qquad A_{ct} = \ln(1 - p_{ct})`} />
          <p className="text-muted-foreground text-xs">
            {isEn
              ? 'L_ct = ln θ_ct (Multinomial), ln p_ct (Bernoulli), or −ln θ̃_ct (Complement), exactly as described in the Naive Bayes guide. An empty text gives a zero vector: the row is still scored when other predictors have values (Multinomial and Complement then add 0, Bernoulli still adds Σ A_ct).'
              : 'L_ct = ln θ_ct (Multinomial), ln p_ct (Bernoulli), atau −ln θ̃_ct (Complement), persis seperti dijelaskan di panduan Naive Bayes. Teks kosong menghasilkan vektor nol: baris tetap dinilai bila prediktor lain memiliki nilai (Multinomial dan Complement lalu menambah 0, Bernoulli tetap menambah Σ A_ct).'}
          </p>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? '2. From Scores to Probabilities' : '2. Dari Skor ke Probabilitas'} icon={Percent} variant="feature">
        <div className="space-y-3 text-sm mt-2">
          <p className="text-muted-foreground">
            {isEn
              ? 'The scores are turned into posterior probabilities with a numerically stable softmax (log-sum-exp): the largest score m is subtracted first so that very negative scores do not underflow to zero.'
              : 'Skor diubah menjadi peluang posterior dengan softmax yang stabil secara numerik (log-sum-exp): skor terbesar m dikurangkan lebih dahulu agar skor yang sangat negatif tidak menjadi nol karena keterbatasan presisi.'}
          </p>
          <Formula math={String.raw`m = \max_{j} s_j, \qquad P(c \mid \mathbf{x}) = \frac{e^{\,s_c - m}}{\sum_{j} e^{\,s_j - m}}`} />
          <Formula math={String.raw`\hat{y} = \arg\max_{c}\ s_c`} />
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {isEn ? (
              <>
                <li><strong>Ties:</strong> classes are checked in ascending byte-wise order of their names (digits before capital letters, capital letters before lowercase letters) and a later class replaces the winner only when its score is strictly higher, so a tie goes to the class that comes first in that order.</li>
                <li><strong>Rounding:</strong> the saved probabilities are rounded to 4 decimals. The predicted class is decided from the unrounded scores, so two classes may both show 0.5000.</li>
                <li><strong>Predicted probability</strong> = the probability of the predicted class (the highest one).</li>
              </>
            ) : (
              <>
                <li><strong>Nilai seri:</strong> kelas diperiksa menurut urutan byte nama kelas secara menaik (angka sebelum huruf kapital, huruf kapital sebelum huruf kecil) dan kelas berikutnya hanya menggantikan pemenang bila skornya lebih besar, sehingga nilai seri jatuh ke kelas yang berada lebih dulu pada urutan itu.</li>
                <li><strong>Pembulatan:</strong> probabilitas yang disimpan dibulatkan ke 4 desimal. Kelas prediksi ditentukan dari skor sebelum dibulatkan, sehingga dua kelas bisa sama-sama tampil 0,5000.</li>
                <li><strong>Predicted probability</strong> = probabilitas kelas yang diprediksi (yang tertinggi).</li>
              </>
            )}
          </ul>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? 'Worked Example' : 'Contoh Perhitungan'} icon={Calculator} variant="default">
        <div className="space-y-3 text-sm mt-2">
          <p className="text-muted-foreground">
            {isEn
              ? 'A model with classes No and Yes (prior 0.5 each), a categorical feature Outlook (P(Sunny | No) = 1/3, P(Sunny | Yes) = 1/2) and a numerical feature Temp (No: μ = 84, σ² = 56/3; Yes: μ = 72, σ² = 8/3). Row: Outlook = Sunny, Temp = 71.'
              : 'Model dengan kelas No dan Yes (prior masing-masing 0,5), fitur categorical Outlook (P(Sunny | No) = 1/3, P(Sunny | Yes) = 1/2) dan fitur numerical Temp (No: μ = 84, σ² = 56/3; Yes: μ = 72, σ² = 8/3). Baris: Outlook = Sunny, Temp = 71.'}
          </p>
          <Formula math={String.raw`s_{\text{No}} = \ln 0.5 + \ln \tfrac{1}{3} + \ln f(71 \mid \text{No}) \approx -8.7009, \qquad s_{\text{Yes}} = \ln 0.5 + \ln \tfrac{1}{2} + \ln f(71 \mid \text{Yes}) \approx -2.9831`} />
          <Formula math={String.raw`P(\text{Yes} \mid \mathbf{x}) = \frac{1}{1 + e^{-8.7009 + 2.9831}} \approx 0.9967, \qquad P(\text{No} \mid \mathbf{x}) \approx 0.0033`} />
          <p className="text-muted-foreground">
            {isEn
              ? 'The row is predicted as Yes with a predicted probability of 0.9967.'
              : 'Baris diprediksi sebagai Yes dengan predicted probability 0,9967.'}
          </p>
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? 'Rows That Are Not Scored' : 'Baris yang Tidak Dinilai'}>
        <p className="text-sm mt-2">
          {isEn
            ? 'A row is not scored when all of its predictors are empty, including the text (empty or whitespace-only text, or no value in any mapped word-vector column). Its new columns stay empty and it is counted as not scored. A row with only some empty predictors is still scored using the predictors that have values.'
            : 'Baris tidak dinilai bila semua prediktornya kosong, termasuk teksnya (teks kosong atau hanya spasi, atau tidak ada nilai pada kolom vektor kata yang dipetakan). Kolom barunya dibiarkan kosong dan baris dihitung sebagai tidak diprediksi. Baris yang hanya sebagian prediktornya kosong tetap dinilai dengan prediktor yang memiliki nilai.'}
        </p>
      </HelpAlert>
    </div>
  );
};
