import React from 'react';
import { HelpCircleIcon, ListOrdered } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "What is String to Word Vector?" : "Apa itu String to Word Vector?"}>
        <p className="text-sm mt-2">
          {isEn
            ? "String to Word Vector turns a text variable into numbers. Each row of the dataset is treated as one document, each word (term) found in the texts becomes a new numeric column, and the value in that column shows how strongly the word is present in the row's text."
            : "String to Word Vector mengubah variabel teks menjadi angka. Setiap baris dataset dianggap satu dokumen, setiap kata (term) yang ditemukan pada teks menjadi kolom numerik baru, dan nilai pada kolom tersebut menunjukkan seberapa kuat kata itu muncul pada teks baris tersebut."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Introduction to String to Word Vector" : "Pengenalan String to Word Vector"} icon={HelpCircleIcon} variant="feature">
        <div className="space-y-4 text-sm mt-2">
          <div>
            <p className="font-semibold text-primary">{isEn ? "What the Menu Produces" : "Hasil Menu"}</p>
            <p className="text-muted-foreground mt-1">
              {isEn ? (
                <>
                  The new word-vector columns are <strong>added as the last variables of the active dataset</strong>.
                  Each column name is <strong>prefix + term</strong>, for example <span className="font-mono">VEC_food</span>,
                  and its label is <span className="font-mono">Vector of &quot;food&quot;</span>. The columns are sorted
                  alphabetically by term, and the rows stay aligned with the original rows.
                </>
              ) : (
                <>
                  Kolom vektor kata yang baru <strong>ditambahkan sebagai variabel terakhir pada dataset aktif</strong>.
                  Nama setiap kolom adalah <strong>awalan + term</strong>, misalnya <span className="font-mono">VEC_makan</span>,
                  dengan label <span className="font-mono">Vector of &quot;makan&quot;</span>. Kolom diurutkan
                  alfabetis menurut term, dan baris tetap sejajar dengan baris asli.
                </>
              )}
            </p>
            <p className="text-muted-foreground mt-1">
              {isEn
                ? "Example: the texts \"I like rice\" and \"rice, rice, rice\" with the default options give the columns VEC_i, VEC_like, and VEC_rice with the values 1, 1, 1 for the first row and 0, 0, 3 for the second row."
                : "Contoh: teks \"saya suka nasi\" dan \"nasi, nasi, nasi\" dengan opsi default menghasilkan kolom VEC_nasi, VEC_saya, dan VEC_suka dengan nilai 1, 1, 1 untuk baris pertama dan 3, 0, 0 untuk baris kedua."}
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="font-semibold text-primary">{isEn ? "When to Use It" : "Kapan Digunakan"}</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
              {isEn ? (
                <>
                  <li>To use text (reviews, comments, survey answers) as numeric features in other analyses.</li>
                  <li>To see which words appear most often in a collection of texts.</li>
                  <li>To prepare word-vector columns for Naive Bayes (Word-Vector features).</li>
                </>
              ) : (
                <>
                  <li>Untuk memakai teks (ulasan, komentar, jawaban survei) sebagai fitur numerik pada analisis lain.</li>
                  <li>Untuk melihat kata yang paling sering muncul pada sekumpulan teks.</li>
                  <li>Untuk menyiapkan kolom vektor kata bagi Naive Bayes (fitur Word-Vector).</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "How to Use" : "Cara Penggunaan"} icon={ListOrdered} variant="step">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Open the Menu" : "Buka Menu"}
            description={
              isEn
                ? "Choose Transform > String to Word Vector from the menu bar. The dialog opens in the side panel."
                : "Pilih Transform > String to Word Vector pada menu bar. Dialog terbuka di panel samping."
            }
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose the Text Variable" : "Pilih Variabel Teks"}
            description={
              isEn
                ? "On the Variables tab, click a text variable and press the arrow button to move it into Target Variable."
                : "Pada tab Variables, klik variabel teks lalu tekan tombol panah untuk memindahkannya ke Target Variable."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Set the Options" : "Atur Opsi"}
            description={
              isEn
                ? "On the Options tab, set the column name prefix, the preprocessing steps, and the TF, IDF, and normalization formulas. The defaults (Raw count / Raw frequency, IDF None, Normalization None) give plain word counts."
                : "Pada tab Options, atur awalan nama kolom, langkah pra-pemrosesan, serta rumus TF, IDF, dan normalisasi. Nilai default (Raw count / Raw frequency, IDF None, Normalization None) menghasilkan jumlah kemunculan kata biasa."
            }
          />
          <HelpStep
            number={4}
            title={isEn ? "Run" : "Jalankan"}
            description={
              isEn
                ? "Press OK. The columns are added to the dataset, a summary is written to the Output Viewer, and the dialog closes. Reset returns every choice to its default; Cancel closes the dialog without changes."
                : "Tekan OK. Kolom ditambahkan ke dataset, ringkasan ditulis ke Output Viewer, dan dialog tertutup. Reset mengembalikan semua pilihan ke default; Cancel menutup dialog tanpa perubahan."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Important Notes" : "Catatan Penting"}>
        <ul className="list-disc list-inside space-y-1 text-sm mt-2">
          {isEn ? (
            <>
              <li>The vocabulary and any IDF or normalization values are computed from the <strong>whole dataset</strong> and are <strong>not saved</strong> for reuse on new data.</li>
              <li>For a train/test workflow, put the text variable in the <strong>Raw Text Variable</strong> slot of Naive Bayes and use <strong>Apply Model</strong> on new data, so the same vocabulary is reused.</li>
              <li>Empty texts produce a row of zeros; if every text is empty the process stops with a message.</li>
            </>
          ) : (
            <>
              <li>Kosakata serta nilai IDF atau normalisasi dihitung dari <strong>seluruh dataset</strong> dan <strong>tidak disimpan</strong> untuk dipakai ulang pada data baru.</li>
              <li>Untuk alur data latih/uji, masukkan variabel teks ke slot <strong>Raw Text Variable</strong> pada Naive Bayes lalu gunakan <strong>Apply Model</strong> pada data baru, sehingga kosakata yang sama dipakai ulang.</li>
              <li>Teks kosong menghasilkan baris bernilai nol; bila semua teks kosong, proses berhenti dengan pesan.</li>
            </>
          )}
        </ul>
      </HelpAlert>
    </div>
  );
};
