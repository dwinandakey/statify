import React from 'react';
import { HelpCircleIcon, ListOrdered } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "What is Naive Bayes?" : "Apa itu Naive Bayes?"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Naive Bayes is a classification method based on Bayes' theorem. It estimates the probability of each class from the class proportion (prior) and the likelihood of every predictor within that class, assuming the predictors are independent given the class. The class with the highest probability becomes the prediction."
            : "Naive Bayes adalah metode klasifikasi berbasis teorema Bayes. Metode ini menaksir peluang setiap kelas dari proporsi kelas (prior) dan likelihood setiap prediktor di dalam kelas tersebut, dengan asumsi antarprediktor saling bebas bila kelasnya diketahui. Kelas dengan peluang terbesar menjadi hasil prediksi."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "What This Menu Does" : "Fungsi Menu Ini"} icon={HelpCircleIcon} variant="feature">
        <div className="space-y-4 text-sm mt-2">
          <div>
            <p className="font-semibold text-primary">{isEn ? "Menu Location" : "Lokasi Menu"}</p>
            <p className="text-muted-foreground mt-1">
              <strong>Analyze &gt; Classify &gt; Naive Bayes</strong>.{' '}
              {isEn
                ? "The dialog opens in the right sidebar so the data stays visible."
                : "Dialog terbuka di sidebar kanan sehingga data tetap terlihat."}
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="font-semibold text-primary">{isEn ? "One Mixed Model" : "Satu Model Campuran"}</p>
            <p className="text-muted-foreground mt-1">
              {isEn
                ? "The menu trains and evaluates a single Naive Bayes model that can combine three kinds of predictors at once:"
                : "Menu ini melatih dan mengevaluasi satu model Naive Bayes yang dapat menggabungkan tiga jenis prediktor sekaligus:"}
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
              {isEn ? (
                <>
                  <li><strong>Categorical</strong> (nominal/ordinal variables): category frequencies per class with Laplace smoothing.</li>
                  <li><strong>Numeric</strong> (scale variables): a Gaussian (normal) distribution per class.</li>
                  <li><strong>Text</strong>: a raw text variable processed inside the analysis, or word-vector columns, modeled with Multinomial, Bernoulli, or Complement likelihood.</li>
                </>
              ) : (
                <>
                  <li><strong>Kategorik</strong> (variabel nominal/ordinal): frekuensi kategori per kelas dengan Laplace smoothing.</li>
                  <li><strong>Numerik</strong> (variabel scale): distribusi Gaussian (normal) per kelas.</li>
                  <li><strong>Teks</strong>: variabel teks mentah yang diolah di dalam analisis, atau kolom vektor kata, dimodelkan dengan likelihood Multinomial, Bernoulli, atau Complement.</li>
                </>
              )}
            </ul>
            <p className="text-muted-foreground mt-2">
              {isEn
                ? "The target may have two or more classes. Performance is measured with a holdout split or k-fold cross-validation, and the final model is retrained on all valid data so it can be exported."
                : "Target boleh memiliki dua kelas atau lebih. Performa diukur dengan pembagian holdout atau k-fold cross-validation, lalu model akhir dilatih ulang pada seluruh data valid agar dapat diekspor."}
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="font-semibold text-primary">{isEn ? "Assumptions and Notes" : "Asumsi dan Catatan"}</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
              {isEn ? (
                <>
                  <li>Predictors are assumed <strong>conditionally independent</strong> given the class.</li>
                  <li>The measurement level (Measure in Variable View) decides whether a variable is treated as categorical or numeric. Variables with an <em>unknown</em> measure are not used.</li>
                  <li>Rows with a missing target are excluded. A missing categorical value becomes its own category; a missing numeric value is skipped only for that variable.</li>
                </>
              ) : (
                <>
                  <li>Prediktor diasumsikan <strong>saling bebas bersyarat</strong> terhadap kelas.</li>
                  <li>Tingkat pengukuran (Measure di Variable View) menentukan apakah variabel diperlakukan sebagai kategorik atau numerik. Variabel dengan measure <em>unknown</em> tidak dipakai.</li>
                  <li>Baris dengan target kosong dibuang. Nilai kategorik yang kosong menjadi kategori tersendiri; nilai numerik yang kosong hanya dilewati untuk variabel tersebut.</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Quick Steps" : "Langkah Singkat"} icon={ListOrdered} variant="step">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Choose the variables" : "Pilih variabel"}
            description={
              isEn
                ? "On the Variables tab, set the Target and the predictors (Exclude mode or Candidate Factors/Covariates), and optionally Text Features."
                : "Di tab Variables, tentukan Target dan prediktor (mode Exclude atau Candidate Factors/Covariates), serta Text Features bila perlu."
            }
          />
          <HelpStep
            number={2}
            title={isEn ? "Set text preprocessing (if any)" : "Atur pengolahan teks (bila ada)"}
            description={
              isEn
                ? "If a Raw Text Variable is used, set the Text Preprocessing tab (cleaning, tokenizer, TF, IDF, normalization, vocabulary size)."
                : "Bila memakai Raw Text Variable, atur tab Text Preprocessing (pembersihan, tokenizer, TF, IDF, normalisasi, ukuran kosakata)."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Choose likelihoods and validation" : "Pilih likelihood dan validasi"}
            description={
              isEn
                ? "Adjust the Options tab (likelihood and smoothing per group) and the Validation tab (holdout or k-fold, random seed)."
                : "Sesuaikan tab Options (likelihood dan smoothing per kelompok) dan tab Validation (holdout atau k-fold, random seed)."
            }
          />
          <HelpStep
            number={4}
            title={isEn ? "Run and export" : "Jalankan dan ekspor"}
            description={
              isEn
                ? "Pick the output tables, click OK, read the results in the Output Viewer, then use Export Model to save the model as JSON for Apply Model."
                : "Pilih tabel output, klik OK, baca hasil di Output Viewer, lalu gunakan Export Model untuk menyimpan model sebagai JSON bagi Apply Model."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Tip: Interactive Help" : "Tips: Bantuan Interaktif"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Click the help button (?) at the bottom left of the Naive Bayes dialog to start a guided tour that explains every tab and field."
            : "Klik tombol bantuan (?) di kiri bawah dialog Naive Bayes untuk memulai tur yang menjelaskan setiap tab dan kolom."}
        </p>
      </HelpAlert>
    </div>
  );
};
