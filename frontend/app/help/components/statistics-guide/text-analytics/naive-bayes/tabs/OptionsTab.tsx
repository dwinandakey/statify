import React from 'react';
import { SlidersHorizontal, Sigma } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

/** Rumus blok dengan notasi matematika (KaTeX), seperti penulisan di buku. */
const Formula: React.FC<{ math: string }> = ({ math }) => (
  <div className="mt-2 overflow-x-auto rounded-md bg-muted/40 px-3 py-1 text-sm">
    <BlockMath math={math} />
  </div>
);

export const OptionsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Likelihood per Feature Group" : "Likelihood per Kelompok Fitur"} icon={SlidersHorizontal} variant="feature">
        <p className="text-sm text-muted-foreground mb-4">
          {isEn
            ? "The Options tab sets how each group of predictors is modeled. Every group has its own block:"
            : "Tab Options menentukan cara setiap kelompok prediktor dimodelkan. Setiap kelompok memiliki bloknya sendiri:"}
        </p>
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">Numeric</p>
            <ul className="text-muted-foreground text-xs mt-1 space-y-1 list-disc list-inside">
              {isEn ? (
                <>
                  <li>Likelihood is always <strong>Gaussian</strong>: uses the mean and variance of the variable in each class.</li>
                </>
              ) : (
                <>
                  <li>Likelihood selalu <strong>Gaussian</strong>: memakai mean dan varians variabel di setiap kelas.</li>
                </>
              )}
            </ul>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">Categorical</p>
            <ul className="text-muted-foreground text-xs mt-1 space-y-1 list-disc list-inside">
              {isEn ? (
                <>
                  <li>Likelihood is always <strong>Categorical</strong> (category frequencies per class).</li>
                  <li><strong>Smoothing Alpha</strong> (Laplace smoothing): greater than 0 and at most 999, decimals allowed, default 1. It keeps categories that never appear in a class from getting a probability of zero.</li>
                </>
              ) : (
                <>
                  <li>Likelihood selalu <strong>Categorical</strong> (frekuensi kategori per kelas).</li>
                  <li><strong>Smoothing Alpha</strong> (Laplace smoothing): lebih dari 0 dan paling besar 999, boleh desimal, bawaan 1. Nilai ini mencegah kategori yang tidak pernah muncul di suatu kelas mendapat peluang nol.</li>
                </>
              )}
            </ul>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">Text</p>
            <ul className="text-muted-foreground text-xs mt-1 space-y-1 list-disc list-inside">
              {isEn ? (
                <>
                  <li>Available only when Text Features are set on the Variables tab.</li>
                  <li><strong>Multinomial</strong> (default): uses the word counts or weights of each document.</li>
                  <li><strong>Bernoulli</strong>: only uses whether each word is present or absent, including absent words.</li>
                  <li><strong>Complement</strong>: estimates each class from the documents of all other classes; often more stable for unbalanced classes. It is only allowed when the model contains Text Features only (no numeric or categorical predictors); otherwise it is disabled and a saved Complement choice blocks OK.</li>
                  <li><strong>Text Alpha (smoothing)</strong>: greater than 0 and at most 999, default 1.</li>
                </>
              ) : (
                <>
                  <li>Hanya aktif bila Text Features diisi di tab Variables.</li>
                  <li><strong>Multinomial</strong> (bawaan): memakai jumlah atau bobot kata di setiap dokumen.</li>
                  <li><strong>Bernoulli</strong>: hanya memakai ada/tidaknya setiap kata, termasuk kata yang tidak muncul.</li>
                  <li><strong>Complement</strong>: menaksir setiap kelas dari dokumen semua kelas lain; sering lebih stabil untuk kelas yang tidak seimbang. Hanya boleh dipakai bila model hanya berisi Text Features (tanpa prediktor numerik atau kategorik); selain itu pilihan ini nonaktif dan pilihan Complement yang tersimpan akan memblokir tombol OK.</li>
                  <li><strong>Text Alpha (smoothing)</strong>: lebih dari 0 dan paling besar 999, bawaan 1.</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Key Formulas" : "Rumus Utama"} icon={Sigma} variant="feature">
        <div className="space-y-4 text-sm mt-2">
          <div>
            <p className="font-semibold text-primary">{isEn ? "Class score" : "Skor kelas"}</p>
            <p className="text-muted-foreground mt-1">
              {isEn
                ? "For each class c the model adds the log prior and the log likelihood of every predictor; the class with the highest score is predicted, and the scores are converted to posterior probabilities."
                : "Untuk setiap kelas c, model menjumlahkan log prior dan log likelihood setiap prediktor; kelas dengan skor tertinggi menjadi prediksi, dan skor diubah menjadi peluang posterior."}
            </p>
            <Formula math={String.raw`\operatorname{score}(c) = \ln P(c) + \sum_{i=1}^{p} \ln P(x_i \mid c), \qquad \hat{y} = \arg\max_{c}\ \operatorname{score}(c)`} />
            <p className="text-muted-foreground mt-1 text-xs">
              {isEn
                ? "P(c) is the proportion of class c in the training data. With Complement likelihood and two or more classes, the prior is not added."
                : "P(c) adalah proporsi kelas c di data latih. Pada likelihood Complement dengan dua kelas atau lebih, prior tidak ditambahkan."}
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="font-semibold text-primary">{isEn ? "Categorical (Laplace smoothing)" : "Kategorik (Laplace smoothing)"}</p>
            <Formula math={String.raw`P(x = k \mid c) = \frac{\mathrm{count}_{k,c} + \alpha}{\mathrm{class\_total}_c + \alpha K}`} />
            <p className="text-muted-foreground mt-1 text-xs">
              {isEn
                ? "count = rows of class c with that category, class_total = rows of class c, K = number of categories of the variable, α = Smoothing Alpha. A category never seen in training gets α / (class_total + α · K)."
                : "count = jumlah baris kelas c dengan kategori itu, class_total = jumlah baris kelas c, K = jumlah kategori variabel, α = Smoothing Alpha. Kategori yang tidak pernah muncul saat latih mendapat α / (class_total + α · K)."}
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="font-semibold text-primary">{isEn ? "Numeric (Gaussian density)" : "Numerik (densitas Gaussian)"}</p>
            <Formula math={String.raw`f(x \mid c) = \frac{1}{\sqrt{2\pi\sigma_c^{2}}}\, \exp\!\left( -\frac{(x - \mu_c)^{2}}{2\sigma_c^{2}} \right)`} />
            <p className="text-muted-foreground mt-1 text-xs">
              {isEn
                ? "μ_c and σ²_c are the mean and variance of the variable in class c. A very small fixed variance floor (1e-9) avoids division by zero."
                : "μ_c dan σ²_c adalah mean dan varians variabel di kelas c. Batas bawah varians tetap yang sangat kecil (1e-9) mencegah pembagian dengan nol."}
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="font-semibold text-primary">{isEn ? "Text" : "Teks"}</p>
            <p className="mt-2 text-xs font-medium">Multinomial</p>
            <Formula math={String.raw`\theta_{ct} = \frac{N_{ct} + \alpha}{N_c + \alpha V}`} />
            <p className="mt-2 text-xs font-medium">Bernoulli</p>
            <Formula math={String.raw`p_{ct} = \frac{n_{ct} + \alpha}{n_c + 2\alpha}`} />
            <p className="mt-2 text-xs font-medium">Complement</p>
            <Formula math={String.raw`\tilde{\theta}_{ct} = \frac{C_{ct} + \alpha}{\sum_{t} C_{ct} + \alpha V}, \qquad w_{ct} = -\ln \tilde{\theta}_{ct}`} />
            <p className="text-muted-foreground mt-1 text-xs">
              {isEn
                ? "N_ct = total value of term t in class c, N_c = Σ_t N_ct, V = number of terms, n_ct = documents of class c containing t, n_c = documents of class c, C_ct = total value of term t in all classes other than c, α = Text Alpha."
                : "N_ct = total nilai term t di kelas c, N_c = Σ_t N_ct, V = jumlah term, n_ct = jumlah dokumen kelas c yang memuat t, n_c = jumlah dokumen kelas c, C_ct = total nilai term t di semua kelas selain c, α = Text Alpha."}
            </p>
          </div>
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Missing values" : "Nilai kosong (missing)"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Missing categorical values are counted as their own category, \"(Missing)\", and are smoothed like other categories. Missing numeric values are skipped only for that variable, so the row is still used for the other predictors."
            : "Nilai kategorik yang kosong dihitung sebagai kategori tersendiri, \"(Missing)\", dan ikut di-smoothing seperti kategori lain. Nilai numerik yang kosong hanya dilewati untuk variabel tersebut, sehingga baris tetap dipakai untuk prediktor lainnya."}
        </p>
      </HelpAlert>
    </div>
  );
};
