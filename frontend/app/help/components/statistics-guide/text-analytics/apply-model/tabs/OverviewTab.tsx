import React from 'react';
import { HelpCircleIcon, ListOrdered } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? 'What is Apply Model?' : 'Apa itu Apply Model?'}>
        <p className="text-sm mt-2">
          {isEn
            ? 'Apply Model uses a classification model that has already been trained (currently Naive Bayes) to predict the class of every row in the active dataset. No training happens here: the model is only read and applied. The predictions are written to the dataset as new variables, and a summary appears in the Output Viewer.'
            : 'Apply Model memakai model klasifikasi yang sudah dilatih (saat ini Naive Bayes) untuk memprediksi kelas setiap baris pada dataset aktif. Di menu ini tidak ada pelatihan: model hanya dibaca lalu diterapkan. Hasil prediksi ditulis ke dataset sebagai variabel baru, dan ringkasannya tampil di Output Viewer.'}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? 'Introduction to Apply Model' : 'Pengenalan Apply Model'} icon={HelpCircleIcon} variant="feature">
        <div className="space-y-4 text-sm mt-2">
          <div>
            <p className="font-semibold text-primary">{isEn ? 'Opening the Menu' : 'Membuka Menu'}</p>
            <p className="text-muted-foreground mt-1">
              {isEn ? (
                <>
                  Choose <strong>Analyze &gt; Classify &gt; Apply Model</strong>. The dialog opens in the right-hand panel
                  and has four tabs: Model, Variables, Save, and Output.
                </>
              ) : (
                <>
                  Pilih <strong>Analyze &gt; Classify &gt; Apply Model</strong>. Dialog terbuka di panel sebelah kanan dan
                  memiliki empat tab: Model, Variables, Save, dan Output.
                </>
              )}
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="font-semibold text-primary">{isEn ? 'When to Use It' : 'Kapan Digunakan'}</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
              {isEn ? (
                <>
                  <li>Classifying new data (for example new survey answers or new texts) with a model trained earlier.</li>
                  <li>Testing a trained model on a separate test dataset by also mapping the actual target to get evaluation tables.</li>
                  <li>Reusing the same model on several datasets without training it again.</li>
                </>
              ) : (
                <>
                  <li>Mengklasifikasikan data baru (misalnya jawaban survei atau teks baru) dengan model yang dilatih sebelumnya.</li>
                  <li>Menguji model terlatih pada dataset uji terpisah dengan memetakan juga target sebenarnya untuk memperoleh tabel evaluasi.</li>
                  <li>Memakai ulang model yang sama pada beberapa dataset tanpa melatih ulang.</li>
                </>
              )}
            </ul>
          </div>
          <hr className="border-border" />
          <div>
            <p className="font-semibold text-primary">{isEn ? 'Things to Know' : 'Hal yang Perlu Diketahui'}</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
              {isEn ? (
                <>
                  <li>The model is applied to <strong>all rows</strong> of the active dataset, up to the last row that has data in the mapped variables.</li>
                  <li>Apply Model <strong>always creates new variables</strong>; existing variables are never overwritten.</li>
                  <li>Rows in which <strong>all predictors are empty</strong> are not predicted: their new columns stay empty and they are counted in the Case Processing Summary.</li>
                  <li>Rows with only some empty predictors are still predicted; the empty predictors are simply left out of the calculation.</li>
                  <li>Model files exported by earlier versions of Statify can still be loaded and applied.</li>
                </>
              ) : (
                <>
                  <li>Model diterapkan ke <strong>semua baris</strong> dataset aktif, sampai baris terakhir yang berisi data pada variabel yang dipetakan.</li>
                  <li>Apply Model <strong>selalu membuat variabel baru</strong>; variabel yang sudah ada tidak pernah ditimpa.</li>
                  <li>Baris yang <strong>seluruh prediktornya kosong</strong> tidak diprediksi: kolom barunya dibiarkan kosong dan baris itu dihitung di Case Processing Summary.</li>
                  <li>Baris yang hanya sebagian prediktornya kosong tetap diprediksi; prediktor yang kosong dilewati dalam perhitungan.</li>
                  <li>File model hasil ekspor Statify versi sebelumnya tetap dapat dimuat dan diterapkan.</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? 'Steps at a Glance' : 'Langkah Singkat'} icon={ListOrdered} variant="step">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? 'Load a model (Model tab)' : 'Muat model (Tab Model)'}
            description={
              isEn
                ? 'Upload a .json model file, pick a model from the Output Viewer, or pick a Statify built-in model. The other tabs become available after a valid model is loaded.'
                : 'Unggah file model .json, pilih model dari Output Viewer, atau pilih model bawaan Statify. Tab lain baru aktif setelah model yang valid berhasil dimuat.'
            }
          />
          <HelpStep
            number={2}
            title={isEn ? 'Map the variables (Variables tab)' : 'Petakan variabel (Tab Variables)'}
            description={
              isEn
                ? 'Connect every model feature to a dataset variable. Optionally choose the actual target to get evaluation tables.'
                : 'Hubungkan setiap fitur model dengan variabel dataset. Secara opsional pilih target sebenarnya untuk mendapatkan tabel evaluasi.'
            }
          />
          <HelpStep
            number={3}
            title={isEn ? 'Choose the new columns (Save tab)' : 'Pilih kolom baru (Tab Save)'}
            description={
              isEn
                ? 'Decide which prediction columns are added and how they are named.'
                : 'Tentukan kolom prediksi yang ditambahkan dan nama kolomnya.'
            }
          />
          <HelpStep
            number={4}
            title={isEn ? 'Choose the tables (Output tab) and press OK' : 'Pilih tabel (Tab Output) lalu tekan OK'}
            description={
              isEn
                ? 'OK is enabled only when the settings are valid. The settings are remembered for the next time; Reset restores the defaults.'
                : 'Tombol OK hanya aktif bila pengaturan sudah valid. Pengaturan diingat untuk pemakaian berikutnya; Reset mengembalikan pengaturan bawaan.'
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? 'Interactive Help' : 'Bantuan Interaktif'}>
        <p className="text-sm mt-2">
          {isEn
            ? 'Press the help button (?) at the bottom left of the dialog to get pop-ups that explain each tab and field. Without a loaded model the tour covers only the Model tab; after a model is loaded it covers all tabs.'
            : 'Tekan tombol bantuan (?) di kiri bawah dialog untuk menampilkan pop-up yang menjelaskan setiap tab dan kolom. Sebelum model dimuat, tur hanya mencakup Tab Model; setelah model dimuat, tur mencakup semua tab.'}
        </p>
      </HelpAlert>
    </div>
  );
};
