import React from 'react';
import { ArrowRightLeft, Type, Wand2 } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const VariablesTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Variables Tab" : "Tab Variables"} icon={ArrowRightLeft} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Available Variables" : "Daftar Variabel (Available Variables)"}
            description={
              isEn
                ? "Lists the dataset variables that are not used yet. Type in the Filter box to search by name or label (e.g. VEC_), sort by Name or Measurement, and use Select All (filtered), Select All Nominal, or Select All Continuous to highlight many variables. Shift+click selects a range and Ctrl+click adds or removes a variable. Move highlighted variables with drag and drop or the arrow button next to each box."
                : "Menampilkan variabel dataset yang belum dipakai. Ketik di kotak Filter untuk mencari berdasarkan nama atau label (mis. VEC_), urutkan menurut Name atau Measurement, dan gunakan Select All (filtered), Select All Nominal, atau Select All Continuous untuk menyorot banyak variabel. Shift+klik memilih rentang dan Ctrl+klik menambah atau mengurangi variabel. Pindahkan variabel yang disorot dengan drag and drop atau tombol panah di samping setiap kotak."
            }
          />
          <HelpStep
            number={2}
            title="Target / Label"
            description={
              isEn
                ? "Exactly one class variable with a nominal or ordinal measure. Ordinal targets are treated as plain categories, and more than two classes are supported. While Target is empty, double-clicking a variable on the left fills it."
                : "Tepat satu variabel kelas dengan measure nominal atau ordinal. Target ordinal diperlakukan sebagai kategori biasa, dan lebih dari dua kelas didukung. Selama Target kosong, klik ganda variabel di daftar kiri akan mengisinya."
            }
          />
          <HelpStep
            number={3}
            title="Variables to Exclude"
            description={
              isEn
                ? "The default mode. Every other usable variable becomes a predictor automatically, except the ones you put here (for example an ID column). Scale variables are treated as numeric and nominal/ordinal variables as categorical."
                : "Mode bawaan. Semua variabel lain yang dapat dipakai otomatis menjadi prediktor, kecuali yang Anda masukkan ke sini (misalnya kolom ID). Variabel scale diperlakukan sebagai numerik dan variabel nominal/ordinal sebagai kategorik."
            }
          />
          <HelpStep
            number={4}
            title="Candidate Factors / Candidate Covariates"
            description={
              isEn
                ? "The alternative mode: only the variables listed here are used. Candidate Factors accepts nominal/ordinal variables (categorical features) and Candidate Covariates accepts scale variables (numeric features)."
                : "Mode alternatif: hanya variabel yang dicantumkan di sini yang dipakai. Candidate Factors menerima variabel nominal/ordinal (fitur kategorik) dan Candidate Covariates menerima variabel scale (fitur numerik)."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Exclude vs. Candidates Are Mutually Exclusive" : "Exclude dan Candidates Saling Eksklusif"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Putting a variable into Variables to Exclude empties Candidate Factors/Covariates, and vice versa; the removed variables return to the list on the left. A variable can only be in one place at a time (Target, Exclude, Factors, Covariates, Raw Text, or Word-Vector). Variables whose measure is unknown are never used as predictors, so set their Measure in Variable View first."
            : "Memasukkan variabel ke Variables to Exclude akan mengosongkan Candidate Factors/Covariates, dan sebaliknya; variabel yang dikeluarkan kembali ke daftar kiri. Satu variabel hanya boleh berada di satu tempat (Target, Exclude, Factors, Covariates, Raw Text, atau Word-Vector). Variabel dengan measure unknown tidak pernah dipakai sebagai prediktor, jadi atur Measure-nya di Variable View terlebih dahulu."}
        </p>
      </HelpAlert>

      <HelpCard title="Text Features" icon={Type} variant="feature">
        <p className="text-sm text-muted-foreground mb-3">
          {isEn
            ? "Text features are optional and can be combined with either mode above. There are two mutually exclusive sources; filling one empties the other:"
            : "Fitur teks bersifat opsional dan dapat digabungkan dengan kedua mode di atas. Ada dua sumber yang saling eksklusif; mengisi salah satu akan mengosongkan yang lain:"}
        </p>
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">Raw Text Variable</p>
            <p className="text-muted-foreground text-xs mt-1">
              {isEn
                ? "At most one STRING variable containing raw text (for example tweets or reviews). The text is converted into word vectors inside the analysis using the Text Preprocessing tab. Empty text is treated as an empty document."
                : "Maksimal satu variabel STRING berisi teks mentah (misalnya tweet atau ulasan). Teks diubah menjadi vektor kata di dalam analisis menurut pengaturan tab Text Preprocessing. Teks kosong diperlakukan sebagai dokumen kosong."}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">Word-Vector Variables</p>
            <p className="text-muted-foreground text-xs mt-1">
              {isEn
                ? "Any number of NUMERIC columns that already contain word vectors, for example the output of Transform > String to Word Vector. Values must be zero or positive (decimals such as TF-IDF are allowed; empty cells count as 0). Each column name is used as the term name."
                : "Sejumlah kolom NUMERIC yang sudah berisi vektor kata, misalnya hasil Transform > String to Word Vector. Nilai harus nol atau positif (desimal seperti TF-IDF diperbolehkan; sel kosong dihitung 0). Nama setiap kolom dipakai sebagai nama term."}
            </p>
          </div>
        </div>
      </HelpCard>

      <HelpAlert variant="info" title={isEn ? "Non-Blocking Warnings" : "Peringatan yang Tidak Memblokir"}>
        <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
          {isEn ? (
            <>
              <li>Many numeric predictors that look like word vectors (non-negative and mostly zero): move them to Word-Vector Variables.</li>
              <li>A string predictor in which at least half of the values are unique looks like free text or an ID: exclude it or use it as text.</li>
              <li>Word-Vector Variables: their vocabulary/IDF was computed outside Naive Bayes on all data, so the evaluation can be slightly optimistic.</li>
            </>
          ) : (
            <>
              <li>Banyak prediktor numerik yang tampak seperti vektor kata (tidak negatif dan sebagian besar nol): pindahkan ke Word-Vector Variables.</li>
              <li>Prediktor string yang minimal separuh nilainya unik tampak seperti teks bebas atau ID: keluarkan atau pakai sebagai teks.</li>
              <li>Word-Vector Variables: kosakata/IDF-nya dihitung di luar Naive Bayes dari seluruh data, sehingga hasil evaluasi dapat sedikit optimis.</li>
            </>
          )}
        </ul>
      </HelpAlert>

      <HelpCard title={isEn ? "Text Preprocessing Tab" : "Tab Text Preprocessing"} icon={Wand2} variant="feature">
        <p className="text-sm text-muted-foreground mb-3">
          {isEn
            ? "This tab is only available when a Raw Text Variable is set. It uses the same settings as Transform > String to Word Vector:"
            : "Tab ini hanya aktif bila Raw Text Variable terisi. Pengaturannya sama dengan Transform > String to Word Vector:"}
        </p>
        <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
          {isEn ? (
            <>
              <li><strong>Cleaning:</strong> lowercase, stopword removal (Indonesian, English, or a custom list), and stemming (Indonesian or English).</li>
              <li><strong>Tokenizer:</strong> single words or n-grams (min and max size 1–5), split by the Delimiters pattern.</li>
              <li><strong>Vectorization:</strong> choose Term Frequency (TF), Inverse Document Frequency (IDF), and Normalization freely.</li>
              <li><strong>Words to Keep:</strong> maximum vocabulary size (0 = keep all words).</li>
              <li><strong>Min term frequency:</strong> words whose total count is below this value are dropped before Words to Keep is applied.</li>
            </>
          ) : (
            <>
              <li><strong>Pembersihan:</strong> huruf kecil (lowercase), penghapusan stopwords (Indonesia, Inggris, atau daftar sendiri), dan stemming (Indonesia atau Inggris).</li>
              <li><strong>Tokenizer:</strong> kata tunggal atau n-gram (ukuran minimum dan maksimum 1–5), dipisah menurut pola Delimiters.</li>
              <li><strong>Vektorisasi:</strong> pilih Term Frequency (TF), Inverse Document Frequency (IDF), dan Normalization secara bebas.</li>
              <li><strong>Words to Keep:</strong> ukuran kosakata maksimum (0 = semua kata dipakai).</li>
              <li><strong>Min term frequency:</strong> kata yang total kemunculannya di bawah nilai ini dibuang sebelum Words to Keep diterapkan.</li>
            </>
          )}
        </ul>
        <p className="text-sm text-muted-foreground mt-3">
          {isEn
            ? "To avoid data leakage, the vocabulary and IDF are learned from the training data of each holdout split or fold only, then applied to the test data. The final model learns its vocabulary from all valid rows, and that recipe is stored in the exported model."
            : "Untuk mencegah kebocoran data (leakage), kosakata dan IDF dipelajari hanya dari data latih setiap pembagian holdout atau fold, lalu diterapkan ke data uji. Model akhir mempelajari kosakatanya dari seluruh baris valid, dan resep tersebut disimpan di model yang diekspor."}
        </p>
      </HelpCard>
    </div>
  );
};
