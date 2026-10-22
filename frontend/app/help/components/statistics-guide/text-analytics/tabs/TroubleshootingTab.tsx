import React from "react";
import { Type, Brain, FileOutput, LifeBuoy } from "lucide-react";
import { HelpAlert, HelpCard } from "@/app/help/ui/HelpLayout";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

type Issue = {
  /** Gejala, sebaiknya memuat potongan pesan asli (bahasa Inggris) yang tampil di aplikasi. */
  symptom: string;
  cause: string;
  fix: string;
};

/** Daftar masalah: gejala, penyebab, dan solusi. */
const IssueList: React.FC<{ items: Issue[]; isEn: boolean }> = ({ items, isEn }) => (
  <div className="mt-2 divide-y rounded-lg border">
    {items.map((item) => (
      <div key={item.symptom} className="p-3 text-sm space-y-1">
        <p className="font-semibold">{item.symptom}</p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{isEn ? "Cause: " : "Penyebab: "}</span>
          {item.cause}
        </p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{isEn ? "Fix: " : "Solusi: "}</span>
          {item.fix}
        </p>
      </div>
    ))}
  </div>
);

/** Pemecahan masalah umum pada modul Text Analytics, diturunkan dari pesan validasi di aplikasi. */
export const TroubleshootingTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === "en";

  const stwvIssues: Issue[] = isEn
    ? [
        {
          symptom: "The text variable does not appear in the list",
          cause: "The list only shows variables of type String or with a Nominal measure.",
          fix: "In Variable View set the type to String or the Measure to Nominal.",
        },
        {
          symptom: "OK stays disabled / red messages under the tabs",
          cause: "No Target Variable is set, or an option is invalid (for example \"N-gram min size cannot be greater than max size.\", \"Vector column name cannot contain spaces.\", or an invalid Delimiters regex).",
          fix: "Move one text variable into Target Variable and correct every message shown in red.",
        },
        {
          symptom: "\"The selected variable has no text data.\"",
          cause: "Every cell of the chosen variable is empty.",
          fix: "Choose the column that actually contains the texts.",
        },
        {
          symptom: "\"The vocabulary is empty after text preprocessing.\" or \"... after applying the minimum term frequency.\"",
          cause: "Stopwords, stemming, or Min term frequency removed every word.",
          fix: "Use fewer stopwords, change the stemming setting, or lower Min term frequency.",
        },
        {
          symptom: "Many documents with a zero vector",
          cause: "The Processing Summary counts rows whose vector is all zeros: empty texts, or texts whose words were all removed by stopwords, Min term frequency, or Words to Keep. A note appears when this is more than 10% of the rows.",
          fix: "Relax the stopword list, lower Min term frequency, or raise Words to Keep (0 keeps all words).",
        },
      ]
    : [
        {
          symptom: "Variabel teks tidak muncul di daftar",
          cause: "Daftar hanya menampilkan variabel bertipe String atau ber-measure Nominal.",
          fix: "Di Variable View ubah tipenya menjadi String atau Measure-nya menjadi Nominal.",
        },
        {
          symptom: "Tombol OK tetap nonaktif / ada pesan merah di bawah tab",
          cause: "Target Variable belum diisi, atau ada opsi yang tidak sah (misalnya \"N-gram min size cannot be greater than max size.\", \"Vector column name cannot contain spaces.\", atau regex Delimiters yang tidak sah).",
          fix: "Pindahkan satu variabel teks ke Target Variable dan perbaiki setiap pesan berwarna merah.",
        },
        {
          symptom: "\"The selected variable has no text data.\"",
          cause: "Semua sel variabel yang dipilih kosong.",
          fix: "Pilih kolom yang benar-benar berisi teks.",
        },
        {
          symptom: "\"The vocabulary is empty after text preprocessing.\" atau \"... after applying the minimum term frequency.\"",
          cause: "Stopwords, stemming, atau Min term frequency membuang semua kata.",
          fix: "Kurangi stopwords, ubah pengaturan stemming, atau turunkan Min term frequency.",
        },
        {
          symptom: "Banyak dokumen dengan vektor nol (zero vector)",
          cause: "Processing Summary menghitung baris yang vektornya seluruhnya nol: teks kosong, atau teks yang semua katanya terbuang oleh stopwords, Min term frequency, atau Words to Keep. Catatan muncul bila jumlahnya lebih dari 10% baris.",
          fix: "Longgarkan daftar stopwords, turunkan Min term frequency, atau naikkan Words to Keep (0 menyimpan semua kata).",
        },
      ];

  const nbIssues: Issue[] = isEn
    ? [
        {
          symptom: "OK is disabled: \"Select a target variable.\"",
          cause: "Target / Label is empty. It needs one variable with a Nominal or Ordinal measure.",
          fix: "Move the label column into Target / Label. If the labels are numbers, set their Measure to Nominal first.",
        },
        {
          symptom: "OK is disabled: \"Select at least one predictor variable ... or add Text Features.\"",
          cause: "No usable predictor remains: all other variables are excluded, the Candidate lists are empty, their Measure is Unknown, or no text feature is set.",
          fix: "Set a Raw Text Variable or Word-Vector Variables, or add predictors. Variables with an Unknown measure are never used.",
        },
        {
          symptom: "The Text Preprocessing tab cannot be opened",
          cause: "The tab is only active when a Raw Text Variable is set (it is not used for Word-Vector Variables).",
          fix: "Move the text column into Raw Text Variable.",
        },
        {
          symptom: "Complement cannot be selected, or \"Complement Naive Bayes can only be used when the model contains Text Features only.\"",
          cause: "The model also has numeric or categorical predictors.",
          fix: "Choose Multinomial or Bernoulli, or remove the other predictors (put them in Variables to Exclude).",
        },
        {
          symptom: "\"Column '...' looks like free text or an ID.\"",
          cause: "A string predictor in which at least half of the values are unique, for example the text itself or an ID column, is being used as a categorical predictor.",
          fix: "Put it in Variables to Exclude, or move a text column to Raw Text Variable.",
        },
        {
          symptom: "\"... numeric columns look like word vectors.\"",
          cause: "Many numeric predictors (20 or more) are non-negative and mostly zero, such as String to Word Vector columns used as ordinary numeric predictors.",
          fix: "Move them to Word-Vector Variables so they are modeled with a text likelihood.",
        },
        {
          symptom: "Note: \"... computed outside Naive Bayes on all rows, so evaluation results may be slightly optimistic.\"",
          cause: "Word-Vector Variables were built from the whole dataset before the split.",
          fix: "This is only a note. For a strict evaluation use the Raw Text Variable instead.",
        },
        {
          symptom: "\"Text vector column '...' contains negative values.\"",
          cause: "A Word-Vector column contains values below 0 (for example a standardized column or a missing-value code such as -1).",
          fix: "Remove that column from Word-Vector Variables; text likelihoods need values of 0 or more.",
        },
        {
          symptom: "\"No words are left in the training data of fold ... after text preprocessing.\"",
          cause: "After preprocessing, a fold or the holdout training part has no words left.",
          fix: "Relax the Text Preprocessing settings (Words to Keep, Min term frequency, stopwords) or use fewer folds.",
        },
        {
          symptom: "Warning that the number of folds exceeds the smallest class size",
          cause: "A class has fewer rows than the number of folds, so it cannot appear in every fold. The analysis still runs.",
          fix: "Use fewer folds or the holdout method if you want balanced folds.",
        },
      ]
    : [
        {
          symptom: "OK nonaktif: \"Select a target variable.\"",
          cause: "Target / Label kosong. Isinya harus satu variabel ber-measure Nominal atau Ordinal.",
          fix: "Pindahkan kolom label ke Target / Label. Bila label berupa angka, ubah Measure-nya menjadi Nominal terlebih dahulu.",
        },
        {
          symptom: "OK nonaktif: \"Select at least one predictor variable ... or add Text Features.\"",
          cause: "Tidak ada prediktor yang dapat dipakai: semua variabel lain dikecualikan, daftar Candidate kosong, Measure-nya Unknown, atau belum ada fitur teks.",
          fix: "Isi Raw Text Variable atau Word-Vector Variables, atau tambahkan prediktor. Variabel ber-measure Unknown tidak pernah dipakai.",
        },
        {
          symptom: "Tab Text Preprocessing tidak dapat dibuka",
          cause: "Tab ini hanya aktif bila Raw Text Variable terisi (tidak dipakai untuk Word-Vector Variables).",
          fix: "Pindahkan kolom teks ke Raw Text Variable.",
        },
        {
          symptom: "Complement tidak dapat dipilih, atau \"Complement Naive Bayes can only be used when the model contains Text Features only.\"",
          cause: "Model juga memiliki prediktor numerik atau kategorik.",
          fix: "Pilih Multinomial atau Bernoulli, atau keluarkan prediktor lain (masukkan ke Variables to Exclude).",
        },
        {
          symptom: "\"Column '...' looks like free text or an ID.\"",
          cause: "Prediktor string yang minimal separuh nilainya unik, misalnya teks itu sendiri atau kolom ID, sedang dipakai sebagai prediktor kategorik.",
          fix: "Masukkan ke Variables to Exclude, atau pindahkan kolom teks ke Raw Text Variable.",
        },
        {
          symptom: "\"... numeric columns look like word vectors.\"",
          cause: "Banyak prediktor numerik (20 atau lebih) bernilai tidak negatif dan sebagian besar nol, misalnya kolom String to Word Vector yang dipakai sebagai prediktor numerik biasa.",
          fix: "Pindahkan ke Word-Vector Variables agar dimodelkan dengan likelihood teks.",
        },
        {
          symptom: "Catatan: \"... computed outside Naive Bayes on all rows, so evaluation results may be slightly optimistic.\"",
          cause: "Word-Vector Variables dibentuk dari seluruh dataset sebelum data dibagi.",
          fix: "Ini hanya catatan. Untuk evaluasi yang ketat gunakan Raw Text Variable.",
        },
        {
          symptom: "\"Text vector column '...' contains negative values.\"",
          cause: "Ada kolom Word-Vector yang bernilai di bawah 0 (misalnya kolom terstandardisasi atau kode missing seperti -1).",
          fix: "Keluarkan kolom tersebut dari Word-Vector Variables; likelihood teks memerlukan nilai 0 atau lebih.",
        },
        {
          symptom: "\"No words are left in the training data of fold ... after text preprocessing.\"",
          cause: "Setelah preprocessing, suatu fold atau bagian latih holdout tidak menyisakan kata.",
          fix: "Longgarkan pengaturan Text Preprocessing (Words to Keep, Min term frequency, stopwords) atau kurangi jumlah fold.",
        },
        {
          symptom: "Peringatan jumlah fold melebihi ukuran kelas terkecil",
          cause: "Ada kelas yang jumlah barisnya lebih kecil dari jumlah fold, sehingga tidak dapat hadir di setiap fold. Analisis tetap berjalan.",
          fix: "Kurangi jumlah fold atau gunakan metode holdout bila ingin fold yang seimbang.",
        },
      ];

  const amIssues: Issue[] = isEn
    ? [
        {
          symptom: "The From Output Viewer list is empty",
          cause: "\"No Naive Bayes models are saved in the Output Viewer yet.\"",
          fix: "Run Naive Bayes first, or upload an exported .json model file.",
        },
        {
          symptom: "The model file is rejected",
          cause: "The file is larger than 10 MB, is not valid JSON, is not a Statify Naive Bayes model, or has an unsupported format version (supported: 1.0, 1.1, 2.0).",
          fix: "Export the model again from Naive Bayes and upload the new file unchanged.",
        },
        {
          symptom: "Yellow warning: \"This model uses the old format (1.0).\"",
          cause: "Old model files skip categories the model has never seen instead of smoothing them.",
          fix: "The model still works. Export it again from Naive Bayes for fully consistent results.",
        },
        {
          symptom: "\"Feature \"...\" is not mapped to a dataset variable.\"",
          cause: "No dataset variable with the same name was found, so Auto-map left the feature empty.",
          fix: "Choose the variable manually in the Dataset variable column, or rename the variable to match the training data.",
        },
        {
          symptom: "\"Feature \"...\" does not match the measurement level of the selected variable.\"",
          cause: "A categorical feature needs a Nominal/Ordinal variable and a numerical feature needs a Scale numeric variable.",
          fix: "Change the Measure of the variable in Variable View to the same level as in the training data.",
        },
        {
          symptom: "\"The variable \"...\" has an Unknown measurement level\" or \"... is mapped to more than one feature.\"",
          cause: "Variables with an Unknown measure cannot be used, and one variable can feed only one feature.",
          fix: "Set the Measure in Variable View, and pick a different variable for each feature.",
        },
        {
          symptom: "\"The raw text variable \"...\" must be mapped to a string variable.\"",
          cause: "The model was trained on raw text, so it needs a String column with the new texts.",
          fix: "Choose the String text column in the Raw Text Variable field.",
        },
        {
          symptom: "\"None of the model's word-vector columns were found in the dataset ...\"",
          cause: "The model was trained on word-vector columns, but the new dataset has no columns with those names and the model has no other features, so no row can be scored.",
          fix: "Run String to Word Vector on the new data with the same prefix and settings, or retrain using the Raw Text Variable.",
        },
        {
          symptom: "\"Some rows were not scored because all of their predictor variables are empty.\"",
          cause: "In those rows every predictor (and the text) is empty, so there is nothing to predict from. Their new columns stay empty.",
          fix: "Check the data of those rows. Rows with only some empty predictors are still predicted.",
        },
        {
          symptom: "\"The actual target variable ... must have a nominal or ordinal measurement level\" or rows excluded from the evaluation",
          cause: "The actual target is not categorical, is also used as a predictor, or contains classes the model does not know (those rows are excluded from the evaluation).",
          fix: "Set its Measure to Nominal, do not map it as a predictor, and make sure the class labels are written exactly as in the training data.",
        },
      ]
    : [
        {
          symptom: "Daftar From Output Viewer kosong",
          cause: "\"No Naive Bayes models are saved in the Output Viewer yet.\"",
          fix: "Jalankan Naive Bayes terlebih dahulu, atau unggah file model .json hasil ekspor.",
        },
        {
          symptom: "File model ditolak",
          cause: "File lebih dari 10 MB, bukan JSON yang valid, bukan model Naive Bayes Statify, atau versi formatnya tidak didukung (yang didukung: 1.0, 1.1, 2.0).",
          fix: "Ekspor ulang model dari Naive Bayes dan unggah file baru tersebut tanpa diubah.",
        },
        {
          symptom: "Peringatan kuning: \"This model uses the old format (1.0).\"",
          cause: "File model lama melewati kategori yang belum pernah dilihat model alih-alih memberinya peluang smoothing.",
          fix: "Model tetap dapat dipakai. Ekspor ulang dari Naive Bayes untuk hasil yang sepenuhnya konsisten.",
        },
        {
          symptom: "\"Feature \"...\" is not mapped to a dataset variable.\"",
          cause: "Tidak ada variabel dataset dengan nama yang sama, sehingga Auto-map membiarkan fitur kosong.",
          fix: "Pilih variabelnya secara manual di kolom Dataset variable, atau samakan nama variabel dengan data latih.",
        },
        {
          symptom: "\"Feature \"...\" does not match the measurement level of the selected variable.\"",
          cause: "Fitur categorical memerlukan variabel Nominal/Ordinal dan fitur numerical memerlukan variabel numerik ber-measure Scale.",
          fix: "Ubah Measure variabel di Variable View agar sama dengan data latih.",
        },
        {
          symptom: "\"The variable \"...\" has an Unknown measurement level\" atau \"... is mapped to more than one feature.\"",
          cause: "Variabel ber-measure Unknown tidak dapat dipakai, dan satu variabel hanya boleh mengisi satu fitur.",
          fix: "Atur Measure di Variable View, dan pilih variabel berbeda untuk setiap fitur.",
        },
        {
          symptom: "\"The raw text variable \"...\" must be mapped to a string variable.\"",
          cause: "Model dilatih dengan teks mentah, sehingga memerlukan kolom String berisi teks baru.",
          fix: "Pilih kolom teks bertipe String pada isian Raw Text Variable.",
        },
        {
          symptom: "\"None of the model's word-vector columns were found in the dataset ...\"",
          cause: "Model dilatih dengan kolom vektor kata, tetapi dataset baru tidak memiliki kolom dengan nama tersebut dan model tidak punya fitur lain, sehingga tidak ada baris yang dapat diprediksi.",
          fix: "Jalankan String to Word Vector pada data baru dengan awalan dan pengaturan yang sama, atau latih ulang dengan Raw Text Variable.",
        },
        {
          symptom: "\"Some rows were not scored because all of their predictor variables are empty.\"",
          cause: "Pada baris tersebut semua prediktor (dan teksnya) kosong, sehingga tidak ada dasar untuk memprediksi. Kolom barunya dibiarkan kosong.",
          fix: "Periksa data baris tersebut. Baris yang hanya sebagian prediktornya kosong tetap diprediksi.",
        },
        {
          symptom: "\"The actual target variable ... must have a nominal or ordinal measurement level\" atau ada baris yang dikecualikan dari evaluasi",
          cause: "Actual target bukan kategorik, juga dipakai sebagai prediktor, atau berisi kelas yang tidak dikenal model (baris tersebut dikecualikan dari evaluasi).",
          fix: "Ubah Measure-nya menjadi Nominal, jangan petakan sebagai prediktor, dan pastikan penulisan label kelas sama persis dengan data latih.",
        },
      ];

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "How to Use This Page" : "Cara Memakai Halaman Ini"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Messages in the application are shown in English. Look for the message (or a part of it, shown in quotes below) to find its cause and fix. The \"...\" stands for the variable, column, or fold named in the real message."
            : "Pesan di aplikasi ditampilkan dalam bahasa Inggris. Cari pesan tersebut (atau potongannya, ditulis dalam tanda kutip di bawah) untuk menemukan penyebab dan solusinya. Tanda \"...\" mewakili nama variabel, kolom, atau fold yang disebut pada pesan sebenarnya."}
        </p>
      </HelpAlert>

      <HelpCard title="String to Word Vector" icon={Type} variant="feature">
        <IssueList items={stwvIssues} isEn={isEn} />
      </HelpCard>

      <HelpCard title="Naive Bayes" icon={Brain} variant="feature">
        <IssueList items={nbIssues} isEn={isEn} />
      </HelpCard>

      <HelpCard title="Apply Model" icon={FileOutput} variant="feature">
        <IssueList items={amIssues} isEn={isEn} />
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Still Stuck?" : "Masih Bermasalah?"}>
        <div className="text-sm mt-2 flex gap-2">
          <LifeBuoy className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            {isEn
              ? "Open the dialog again and press the help button (?) at the bottom left: the guided tour points to the field that needs attention. Error messages that end with a code in brackets, for example (EMPTY_VOCABULARY), can be quoted with that code when you report a problem."
              : "Buka kembali dialognya dan tekan tombol bantuan (?) di kiri bawah: tur terpandu menunjuk kolom yang perlu diperhatikan. Pesan galat yang diakhiri kode dalam kurung, misalnya (EMPTY_VOCABULARY), dapat dikutip beserta kodenya saat melaporkan masalah."}
          </p>
        </div>
      </HelpAlert>
    </div>
  );
};
