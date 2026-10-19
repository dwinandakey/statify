import React from "react";
import { FileInput, Route, GitBranch, Scale, Target } from "lucide-react";
import { HelpAlert, HelpCard, HelpStep } from "@/app/help/ui/HelpLayout";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

/** Tutorial langkah demi langkah klasifikasi teks di Statify (untuk pengguna awam). */
export const TutorialTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === "en";

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "Goal of This Tutorial" : "Tujuan Tutorial"}>
        <p className="text-sm mt-2">
          {isEn
            ? "You have a table of texts (for example product reviews or tweets) and each text already has a label (for example positive / negative). You want Statify to learn from these examples, measure how accurate it is, and then label new texts automatically. This tutorial walks through the whole process."
            : "Anda memiliki tabel berisi teks (misalnya ulasan produk atau tweet) dan setiap teks sudah memiliki label (misalnya positif / negatif). Anda ingin Statify belajar dari contoh tersebut, mengukur ketepatannya, lalu memberi label pada teks baru secara otomatis. Tutorial ini menjelaskan seluruh prosesnya."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Step 0: Prepare and Import the Data" : "Langkah 0: Siapkan dan Impor Data"} icon={FileInput} variant="step">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Prepare a CSV file" : "Siapkan file CSV"}
            description={
              isEn
                ? "One row per document with at least two columns: a text column (for example ulasan) and a label column (for example sentimen). Other columns such as an ID are allowed."
                : "Satu baris per dokumen dengan minimal dua kolom: kolom teks (misalnya ulasan) dan kolom label (misalnya sentimen). Kolom lain seperti ID boleh ada."
            }
          />
          <HelpStep
            number={2}
            title={isEn ? "Import it" : "Impor ke Statify"}
            description={
              isEn
                ? "Choose File > Import Data > CSV Data, select the file, check the preview (header row, delimiter), and confirm. The data appears in Data View."
                : "Pilih File > Import Data > CSV Data, pilih file, periksa pratinjau (baris judul, delimiter), lalu konfirmasi. Data tampil di Data View."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Check types and measurement levels" : "Periksa tipe dan measurement level"}
            description={
              isEn
                ? "Open Variable View. The text column must have the type String. The label column must have the measure Nominal (or Ordinal); if the labels are numbers such as 0/1, change Measure from Scale to Nominal. Set any column with an Unknown measure to the right level, because such columns cannot be used."
                : "Buka Variable View. Kolom teks harus bertipe String. Kolom label harus ber-measure Nominal (atau Ordinal); bila label berupa angka seperti 0/1, ubah Measure dari Scale menjadi Nominal. Atur kolom yang measure-nya Unknown ke tingkat yang benar, karena kolom seperti itu tidak dapat dipakai."
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Which Path Should I Use?" : "Jalur Mana yang Dipakai?"} icon={GitBranch} variant="feature">
        <div className="grid gap-3 sm:grid-cols-2 text-sm mt-2">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">{isEn ? "Path A — Raw Text in Naive Bayes (recommended)" : "Jalur A — Teks Mentah di Naive Bayes (disarankan)"}</p>
            <ul className="text-muted-foreground text-xs mt-1 space-y-1 list-disc list-inside">
              {isEn ? (
                <>
                  <li>The vocabulary and IDF are learned from the training rows only, in every holdout split or fold, so the evaluation is fair.</li>
                  <li>The preprocessing recipe (cleaning, vocabulary, IDF, normalization) is stored in the model, so Apply Model processes new texts in exactly the same way.</li>
                  <li>Choose this path when you want to classify new data later.</li>
                </>
              ) : (
                <>
                  <li>Kosakata dan IDF dipelajari hanya dari baris latih pada setiap pembagian holdout atau fold, sehingga evaluasi adil.</li>
                  <li>Resep preprocessing (pembersihan, kosakata, IDF, normalisasi) disimpan di model, sehingga Apply Model mengolah teks baru dengan cara yang persis sama.</li>
                  <li>Pilih jalur ini bila model akan dipakai untuk mengklasifikasikan data baru.</li>
                </>
              )}
            </ul>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">{isEn ? "Path B — String to Word Vector first" : "Jalur B — String to Word Vector terlebih dahulu"}</p>
            <ul className="text-muted-foreground text-xs mt-1 space-y-1 list-disc list-inside">
              {isEn ? (
                <>
                  <li>The word columns are added to the dataset, so you can inspect them, sort them, or reuse them in other analyses.</li>
                  <li>The vocabulary and IDF come from the whole dataset (training and test rows together), so the evaluation can be slightly optimistic; Naive Bayes shows a note about this.</li>
                  <li>The recipe is not saved: new data must contain columns with the same names, and missing columns are treated as 0 in Apply Model.</li>
                </>
              ) : (
                <>
                  <li>Kolom kata ditambahkan ke dataset, sehingga dapat diperiksa, diurutkan, atau dipakai ulang pada analisis lain.</li>
                  <li>Kosakata dan IDF berasal dari seluruh dataset (baris latih dan uji sekaligus), sehingga evaluasi dapat sedikit optimis; Naive Bayes menampilkan catatan tentang hal ini.</li>
                  <li>Resepnya tidak disimpan: data baru harus memiliki kolom dengan nama yang sama, dan kolom yang tidak ada dianggap 0 di Apply Model.</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Path A: Train with the Raw Text Variable" : "Jalur A: Latih dengan Raw Text Variable"} icon={Route} variant="step">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Open Naive Bayes" : "Buka Naive Bayes"}
            description={isEn ? "Choose Analyze > Classify > Naive Bayes." : "Pilih Analyze > Classify > Naive Bayes."}
          />
          <HelpStep
            number={2}
            title={isEn ? "Variables tab" : "Tab Variables"}
            description={
              isEn
                ? "Move the label column into Target / Label and the text column into Raw Text Variable. Put columns that must not be used as predictors (for example an ID) into Variables to Exclude, because in the default Exclude mode every other usable variable becomes a predictor."
                : "Pindahkan kolom label ke Target / Label dan kolom teks ke Raw Text Variable. Masukkan kolom yang tidak boleh menjadi prediktor (misalnya ID) ke Variables to Exclude, karena pada mode Exclude bawaan setiap variabel lain yang dapat dipakai otomatis menjadi prediktor."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Text Preprocessing tab" : "Tab Text Preprocessing"}
            description={
              isEn
                ? "This tab becomes active once a Raw Text Variable is set. The defaults (raw word counts, no stopwords, no stemming, up to 1000 words) are a reasonable start; see the Settings Tips tab for what to change."
                : "Tab ini aktif setelah Raw Text Variable terisi. Pengaturan bawaan (jumlah kata mentah, tanpa stopwords, tanpa stemming, maksimal 1000 kata) cukup baik sebagai awal; lihat tab Tips Pengaturan untuk hal yang dapat diubah."
            }
          />
          <HelpStep
            number={4}
            title={isEn ? "Options and Validation tabs" : "Tab Options dan Validation"}
            description={
              isEn
                ? "Keep the Multinomial text likelihood for a first run. On the Validation tab keep the 70/30 holdout split or choose k-fold cross-validation, and tick Use random seed so the result can be repeated."
                : "Gunakan likelihood teks Multinomial untuk percobaan pertama. Di tab Validation pertahankan pembagian holdout 70/30 atau pilih k-fold cross-validation, dan centang Use random seed agar hasilnya dapat diulang."
            }
          />
          <HelpStep
            number={5}
            title={isEn ? "Run and read the output" : "Jalankan dan baca output"}
            description={
              isEn
                ? "Click OK. In the Output Viewer read Model Evaluation Metrics, Cohen's Kappa, and the Confusion Matrix to judge the model, and the Text Feature Table to see the words that are typical for each class."
                : "Klik OK. Di Output Viewer baca Model Evaluation Metrics, Cohen's Kappa, dan Confusion Matrix untuk menilai model, serta Text Feature Table untuk melihat kata yang khas bagi setiap kelas."
            }
          />
          <HelpStep
            number={6}
            title={isEn ? "Save the model" : "Simpan model"}
            description={
              isEn
                ? "Click Export Model in the Output Viewer to download the model as a JSON file. The model is also available in Apply Model under From Output Viewer while the result is still in the Output Viewer."
                : "Klik Export Model di Output Viewer untuk mengunduh model sebagai file JSON. Model juga tersedia di Apply Model melalui From Output Viewer selama hasilnya masih ada di Output Viewer."
            }
          />
          <HelpStep
            number={7}
            title={isEn ? "Apply the model to new data" : "Terapkan model ke data baru"}
            description={
              isEn
                ? "Open the new data (it needs the same text column; a label column is optional). Choose Analyze > Classify > Apply Model, load the model (Upload file or From Output Viewer), check that the Raw Text Variable points to the text column, optionally set the actual target to get evaluation tables, and click OK. The predicted class and probabilities are added as new columns."
                : "Buka data baru (wajib memiliki kolom teks yang sama; kolom label opsional). Pilih Analyze > Classify > Apply Model, muat model (Upload file atau From Output Viewer), pastikan Raw Text Variable menunjuk ke kolom teks, isi actual target bila ingin tabel evaluasi, lalu klik OK. Kelas prediksi dan probabilitasnya ditambahkan sebagai kolom baru."
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Path B: Word Vectors First" : "Jalur B: Vektor Kata Terlebih Dahulu"} icon={Scale} variant="step">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="String to Word Vector"
            description={
              isEn
                ? "Choose Transform > String to Word Vector, move the text column into Target Variable, set the options, and click OK. Numeric columns named with the prefix (default VEC_) are added to the end of the dataset."
                : "Pilih Transform > String to Word Vector, pindahkan kolom teks ke Target Variable, atur opsi, lalu klik OK. Kolom numerik dengan awalan nama (bawaan VEC_) ditambahkan di akhir dataset."
            }
          />
          <HelpStep
            number={2}
            title={isEn ? "Naive Bayes with Word-Vector Variables" : "Naive Bayes dengan Word-Vector Variables"}
            description={
              isEn
                ? "In Naive Bayes, set the Target, then type VEC_ in the Filter box, use Select All (filtered), and move the columns into Word-Vector Variables. Move the original text column into Variables to Exclude so it is not used as a categorical predictor."
                : "Di Naive Bayes, isi Target, lalu ketik VEC_ di kotak Filter, gunakan Select All (filtered), dan pindahkan kolom-kolom itu ke Word-Vector Variables. Masukkan kolom teks asli ke Variables to Exclude agar tidak dipakai sebagai prediktor kategorik."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Run, then apply" : "Jalankan, lalu terapkan"}
            description={
              isEn
                ? "Continue as in Path A from step 4. To apply the model to new data, run String to Word Vector on the new data with the same settings first; Apply Model matches the word columns by name and fills columns that do not exist with 0."
                : "Lanjutkan seperti Jalur A mulai langkah 4. Untuk menerapkan model ke data baru, jalankan String to Word Vector pada data baru dengan pengaturan yang sama terlebih dahulu; Apply Model mencocokkan kolom kata berdasarkan nama dan mengisi kolom yang tidak ada dengan 0."
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Checking the Result" : "Memeriksa Hasil"} icon={Target} variant="feature">
        <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground mt-2">
          {isEn ? (
            <>
              <li>Compare Overall Accuracy with the share of the largest class: a useful model should clearly beat always guessing the largest class.</li>
              <li>Look at Recall per class: a class with low recall is often predicted as another class (see its row in the Confusion Matrix).</li>
              <li>Read the top terms in the Text Feature Table. If they look meaningless (for example very common words), try stopword removal or a different weighting.</li>
            </>
          ) : (
            <>
              <li>Bandingkan Overall Accuracy dengan proporsi kelas terbesar: model yang berguna harus jelas lebih baik daripada selalu menebak kelas terbesar.</li>
              <li>Perhatikan Recall per kelas: kelas dengan recall rendah sering diprediksi sebagai kelas lain (lihat barisnya di Confusion Matrix).</li>
              <li>Baca term teratas di Text Feature Table. Bila tampak tidak bermakna (misalnya kata yang sangat umum), coba penghapusan stopwords atau pembobotan lain.</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Help Inside Every Dialog" : "Bantuan di Setiap Dialog"}>
        <p className="text-sm mt-2">
          {isEn
            ? "String to Word Vector, Naive Bayes, and Apply Model each have a help button (?) at the bottom left of the dialog. It starts a guided tour that points to every tab and field while you work."
            : "String to Word Vector, Naive Bayes, dan Apply Model masing-masing memiliki tombol bantuan (?) di kiri bawah dialog. Tombol ini memulai tur terpandu yang menunjuk setiap tab dan kolom selama Anda bekerja."}
        </p>
      </HelpAlert>
    </div>
  );
};
