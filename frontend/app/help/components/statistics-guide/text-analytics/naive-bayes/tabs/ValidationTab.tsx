import React from 'react';
import { ShieldCheck, RefreshCcw } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ValidationTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Validation Tab" : "Tab Validation"} icon={ShieldCheck} variant="feature">
        <p className="text-sm text-muted-foreground mb-4">
          {isEn
            ? "Validation Method offers two mutually exclusive options. The settings of the method that is not selected are dimmed and ignored."
            : "Validation Method menyediakan dua pilihan yang saling eksklusif. Pengaturan metode yang tidak dipilih tampil redup dan diabaikan."}
        </p>
        <div className="space-y-4">
          <HelpStep
            number={1}
            title="Training and Holdout Partition"
            description={
              isEn
                ? "Enter the Training Percentage (whole number 1–99, default 70). The Holdout Percentage is filled in automatically as 100 − training. The split is stratified, so each class keeps roughly the same proportion in the training and holdout parts. The model is trained on the training part and the metrics are computed on the holdout part."
                : "Isi Training Percentage (bilangan bulat 1–99, bawaan 70). Holdout Percentage terisi otomatis sebagai 100 − training. Pembagian dilakukan secara stratified sehingga setiap kelas memiliki proporsi yang kurang lebih sama di bagian latih dan holdout. Model dilatih pada bagian latih dan metrik dihitung pada bagian holdout."
            }
          />
          <HelpStep
            number={2}
            title="Cross-Validation Folds"
            description={
              isEn
                ? "Enter the Number of Folds (default 10, at least 1). The valid rows are split into stratified folds; each fold is predicted once by a model trained on the other folds, and the metrics are computed from the pooled predictions of all folds. The number of folds must not exceed the number of valid cases. If it exceeds the size of the smallest class, the analysis still runs but shows a warning because that class cannot appear in every fold."
                : "Isi Number of Folds (bawaan 10, minimal 1). Baris valid dibagi menjadi fold yang stratified; setiap fold diprediksi sekali oleh model yang dilatih pada fold lainnya, dan metrik dihitung dari gabungan prediksi semua fold. Jumlah fold tidak boleh melebihi jumlah kasus valid. Bila melebihi ukuran kelas terkecil, analisis tetap berjalan tetapi menampilkan peringatan karena kelas tersebut tidak dapat hadir di setiap fold."
            }
          />
          <HelpStep
            number={3}
            title="Use random seed"
            description={
              isEn
                ? "Tick this box and enter a Seed (whole number from 0 to 4294967295) to make the random split reproducible. The same seed is used for every random step of the run (holdout split and fold assignment). Without a seed, each run may give a slightly different split."
                : "Centang kotak ini dan isi Seed (bilangan bulat 0 sampai 4294967295) agar pembagian acak dapat diulang dengan hasil yang sama. Seed yang sama dipakai untuk semua langkah acak dalam satu run (pembagian holdout dan penentuan fold). Tanpa seed, setiap run dapat menghasilkan pembagian yang sedikit berbeda."
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Final Model" : "Model Akhir"} icon={RefreshCcw} variant="feature">
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "Validation is used only to measure performance (Model Evaluation Metrics and Confusion Matrix). After validation, the model is retrained on all valid rows. The Attribute Distribution Table, the Text Feature Table, and the exported model always come from this final model, not from a single split or fold."
            : "Validasi hanya dipakai untuk mengukur performa (Model Evaluation Metrics dan Confusion Matrix). Setelah validasi, model dilatih ulang pada seluruh baris valid. Attribute Distribution Table, Text Feature Table, dan model yang diekspor selalu berasal dari model akhir ini, bukan dari satu pembagian atau fold tertentu."}
        </p>
      </HelpCard>

      <HelpAlert variant="info" title={isEn ? "Text and Data Leakage" : "Teks dan Kebocoran Data"}>
        <p className="text-sm mt-2">
          {isEn
            ? "With a Raw Text Variable, the vocabulary and IDF are learned again from the training rows of every holdout split or fold, so words that only appear in the test rows do not influence training. If a split leaves no words after preprocessing, the analysis stops with a message naming the fold; relax the Text Preprocessing settings or use fewer folds."
            : "Dengan Raw Text Variable, kosakata dan IDF dipelajari ulang dari baris latih setiap pembagian holdout atau fold, sehingga kata yang hanya muncul di baris uji tidak memengaruhi pelatihan. Bila suatu pembagian tidak menyisakan kata setelah preprocessing, analisis berhenti dengan pesan yang menyebut nomor fold-nya; longgarkan pengaturan Text Preprocessing atau kurangi jumlah fold."}
        </p>
      </HelpAlert>
    </div>
  );
};
