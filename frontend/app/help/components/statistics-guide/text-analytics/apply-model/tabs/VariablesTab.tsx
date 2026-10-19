import React from 'react';
import { ArrowRightLeft, Type, Target } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const VariablesTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? 'Mapping Features to Variables' : 'Pemetaan Fitur ke Variabel'} icon={ArrowRightLeft} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? 'Every feature must be mapped' : 'Setiap fitur wajib dipetakan'}
            description={
              isEn
                ? 'The table lists each model feature with its role. Choose one dataset variable for every feature in the Dataset variable column. The Status column shows a check mark or the reason why the mapping is not valid yet. OK stays disabled until all features are mapped correctly.'
                : 'Tabel menampilkan setiap fitur model beserta perannya. Pilih satu variabel dataset untuk setiap fitur di kolom Dataset variable. Kolom Status menampilkan tanda centang atau alasan pemetaan belum valid. Tombol OK tetap nonaktif sampai semua fitur terpetakan dengan benar.'
            }
          />
          <HelpStep
            number={2}
            title={isEn ? 'Role and measurement level must match' : 'Peran dan measurement level harus cocok'}
            description={
              isEn
                ? 'A categorical feature accepts a nominal or ordinal variable. A numerical feature accepts a scale variable of numeric type. Variables with an unknown measurement level cannot be used, and one variable cannot be used for two features.'
                : 'Fitur categorical menerima variabel nominal atau ordinal. Fitur numerical menerima variabel scale bertipe numerik. Variabel dengan measurement level unknown tidak dapat dipakai, dan satu variabel tidak boleh dipakai untuk dua fitur.'
            }
          />
          <HelpStep
            number={3}
            title="Auto-map by name"
            description={
              isEn
                ? 'When a model is loaded, features are matched automatically to variables with the same name (exact match first, then ignoring upper/lower case if there is only one candidate). The Auto-map by name button repeats this and overwrites manual choices. If the dataset changes while the dialog is open, the mapping is rebuilt automatically.'
                : 'Saat model dimuat, fitur dicocokkan otomatis dengan variabel bernama sama (persis dulu, lalu tanpa membedakan huruf besar/kecil bila kandidatnya hanya satu). Tombol Auto-map by name mengulang proses ini dan menimpa pilihan manual. Bila dataset berubah saat dialog terbuka, pemetaan disusun ulang secara otomatis.'
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? 'Text Features' : 'Fitur Teks'} icon={Type} variant="default">
        <div className="space-y-3 text-sm mt-2">
          <p className="text-muted-foreground">
            {isEn
              ? 'If the model was trained with text features, an extra section appears. Its form depends on how the text was given to Naive Bayes during training:'
              : 'Bila model dilatih dengan fitur teks, muncul bagian tambahan. Bentuknya bergantung pada cara teks diberikan ke Naive Bayes saat pelatihan:'}
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {isEn ? (
              <>
                <li>
                  <strong>Raw Text Variable</strong>: choose the string variable that holds the text to classify (required).
                  The text is processed again using the text preprocessing settings stored in the model, so you do not need
                  to run String to Word Vector first. Empty text counts as a missing value.
                </li>
                <li>
                  <strong>Word-Vector Columns</strong>: the model&apos;s word-vector columns are matched to dataset variables by
                  name. Columns that are not found are filled with 0 and do not block the process; the summary shows how many
                  were found and the list of columns treated as 0 can be expanded. Found columns must be numeric. If none of
                  the columns are found and the model has no other features, no row can be predicted.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>Raw Text Variable</strong>: pilih variabel bertipe string yang berisi teks yang akan diklasifikasikan
                  (wajib). Teks diproses ulang dengan pengaturan pra-pemrosesan teks yang tersimpan di model, sehingga tidak
                  perlu menjalankan String to Word Vector terlebih dahulu. Teks kosong dianggap nilai kosong (missing).
                </li>
                <li>
                  <strong>Word-Vector Columns</strong>: kolom vektor kata pada model dicocokkan dengan variabel dataset
                  berdasarkan nama. Kolom yang tidak ditemukan diisi 0 dan tidak memblokir proses; ringkasan menampilkan
                  jumlah kolom yang ditemukan dan daftar kolom yang dianggap 0 dapat dibuka. Kolom yang ditemukan harus
                  numerik. Bila tidak ada satu pun kolom yang ditemukan dan model tidak punya fitur lain, tidak ada baris
                  yang dapat diprediksi.
                </li>
              </>
            )}
          </ul>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? 'Actual Target (optional)' : 'Target Sebenarnya (opsional)'} icon={Target} variant="default">
        <div className="space-y-3 text-sm mt-2">
          <p className="text-muted-foreground">
            {isEn
              ? 'If the dataset also contains the true class of each row, choose that variable as the actual target. It must be nominal or ordinal and must not be used as a predictor. When it is set, evaluation tables (metrics, Cohen\'s Kappa, and confusion matrix) can be added to the output. It is matched automatically when a variable has the same name as the model target.'
              : 'Bila dataset juga memuat kelas sebenarnya setiap baris, pilih variabel tersebut sebagai actual target. Variabel harus nominal atau ordinal dan tidak boleh dipakai sebagai prediktor. Bila diisi, tabel evaluasi (metrik, Cohen\'s Kappa, dan confusion matrix) dapat ditambahkan ke output. Variabel ini dipilih otomatis bila namanya sama dengan target model.'}
          </p>
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? 'Tip' : 'Tips'}>
        <p className="text-sm mt-2">
          {isEn
            ? 'Use the same variable names and measurement levels as in the training data, so that Auto-map can do all the mapping for you.'
            : 'Gunakan nama variabel dan measurement level yang sama seperti pada data latih, agar Auto-map dapat melakukan seluruh pemetaan secara otomatis.'}
        </p>
      </HelpAlert>
    </div>
  );
};
