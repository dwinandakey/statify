import React from 'react';
import { FileText, Table2, Calculator } from 'lucide-react';
import { HelpCard, HelpStep, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

const EXAMPLE_TERMS = ['makan', 'nasi', 'saya', 'suka', 'tidak'];

/** Korpus mini contoh; nilai dihitung dengan opsi default dan dengan Standard IDF (ln). */
const EXAMPLE_ROWS: Array<{ text: string; raw: number[]; idf: string[] }> = [
  { text: 'saya suka makan nasi', raw: [1, 1, 1, 1, 0], idf: ['0.4055', '0.4055', '0.4055', '0.4055', '0.0000'] },
  { text: 'saya tidak suka nasi', raw: [0, 1, 1, 1, 1], idf: ['0.0000', '0.4055', '0.4055', '0.4055', '1.0986'] },
  { text: 'makan makan makan', raw: [3, 0, 0, 0, 0], idf: ['1.2164', '0.0000', '0.0000', '0.0000', '0.0000'] },
];

/** Tabel matriks dokumen × term untuk contoh. */
const ExampleMatrix: React.FC<{ values: Array<Array<number | string>>; docLabel: string }> = ({ values, docLabel }) => (
  <div className="mt-2 overflow-x-auto">
    <table className="w-full text-xs border rounded-lg">
      <thead className="bg-muted/50">
        <tr>
          <th className="p-2 text-left font-semibold">{docLabel}</th>
          {EXAMPLE_TERMS.map((term) => (
            <th key={term} className="p-2 text-right font-mono font-semibold">VEC_{term}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {EXAMPLE_ROWS.map((row, i) => (
          <tr key={row.text} className="border-t">
            <td className="p-2 text-muted-foreground">
              d{i + 1}: <span className="italic">&quot;{row.text}&quot;</span>
            </td>
            {values[i].map((v, j) => (
              <td key={EXAMPLE_TERMS[j]} className="p-2 text-right font-mono">{v}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const OutputTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Results in the Dataset" : "Hasil pada Dataset"} icon={Table2} variant="feature">
        <div className="space-y-2 text-sm text-muted-foreground mt-2">
          <p>
            {isEn
              ? "After OK, one numeric column per kept term is added after the last variable of the dataset. Columns are sorted alphabetically by term, have the measure Scale, and are labelled Vector of \"term\". A notification shows how many columns were added."
              : "Setelah OK, satu kolom numerik untuk setiap term yang disimpan ditambahkan setelah variabel terakhir dataset. Kolom diurutkan alfabetis menurut term, berukuran Scale, dan berlabel Vector of \"term\". Notifikasi menampilkan jumlah kolom yang ditambahkan."}
          </p>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Output Viewer Tables" : "Tabel di Output Viewer"} icon={FileText} variant="feature">
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            {isEn
              ? "The Output Viewer gets a String to Word Vector entry with a short summary sentence followed by the tables below. Each table comes with an interpretation text."
              : "Output Viewer mendapat entri String to Word Vector berisi kalimat ringkasan diikuti tabel-tabel di bawah ini. Setiap tabel disertai teks interpretasi."}
          </p>
          <HelpStep
            number={1}
            title="Processing Summary"
            description={
              isEn
                ? "Source Variable, Documents (Rows), Documents with Zero Vector (empty texts or texts whose tokens were all removed), Vocabulary Size, Columns Added to Dataset, Column Name Prefix, First – Last Column, and Processing Time (ms)."
                : "Source Variable (variabel sumber), Documents (Rows) (jumlah dokumen), Documents with Zero Vector (teks kosong atau teks yang semua tokennya terbuang), Vocabulary Size (ukuran kosakata), Columns Added to Dataset, Column Name Prefix, First – Last Column (kolom pertama dan terakhir), dan Processing Time (ms)."
            }
          />
          <HelpStep
            number={2}
            title="Settings"
            description={
              isEn
                ? "Records every option used: Term Frequency (TF), Inverse Document Frequency (IDF), Normalization, Convert to Lowercase, Stopwords, Stemming, Tokenizer, Delimiters (Regex), Words to Keep (All when 0), and Minimum Term Frequency."
                : "Mencatat semua opsi yang dipakai: Term Frequency (TF), Inverse Document Frequency (IDF), Normalization, Convert to Lowercase, Stopwords, Stemming, Tokenizer, Delimiters (Regex), Words to Keep (All bila 0), dan Minimum Term Frequency."
            }
          />
          <HelpStep
            number={3}
            title="Vocabulary"
            description={
              isEn
                ? "One row per term: No, Term, Dataset Column (the column name in the dataset), and Documents (Non-zero), the number of documents in which the term has a non-zero value. At most the first 200 terms are shown; the dataset still receives every column. The table is omitted when the vocabulary is empty."
                : "Satu baris per term: No, Term, Dataset Column (nama kolom di dataset), dan Documents (Non-zero), yaitu jumlah dokumen yang nilai term-nya bukan nol. Paling banyak 200 term pertama yang ditampilkan; dataset tetap menerima semua kolom. Tabel tidak ditampilkan bila kosakata kosong."
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Worked Example" : "Contoh Perhitungan"} icon={Calculator} variant="default">
        <div className="space-y-3 text-sm mt-2">
          <p className="text-muted-foreground">
            {isEn
              ? "A mini corpus of three documents (rows) is processed with the default options: Lowercase on, no stopwords, no stemming, Word tokenizer, Raw count / Raw frequency, IDF None, Normalization None. The vocabulary has 5 terms, so 5 columns are added in alphabetical order. Each cell is the number of times the term appears in the document."
              : "Korpus mini berisi tiga dokumen (baris) diproses dengan opsi default: Lowercase aktif, tanpa stopwords, tanpa stemming, tokenizer Word, Raw count / Raw frequency, IDF None, Normalization None. Kosakata berisi 5 term, sehingga 5 kolom ditambahkan secara alfabetis. Setiap sel berisi jumlah kemunculan term pada dokumen."}
          </p>
          <ExampleMatrix values={EXAMPLE_ROWS.map((r) => r.raw)} docLabel={isEn ? "Document" : "Dokumen"} />
          <p className="text-muted-foreground">
            {isEn
              ? "Now change only IDF to Standard IDF. With N = 3 documents, makan, nasi, saya, and suka each appear in df = 2 documents and tidak in df = 1 document:"
              : "Sekarang ubah hanya IDF menjadi Standard IDF. Dengan N = 3 dokumen, makan, nasi, saya, dan suka masing-masing muncul di df = 2 dokumen, sedangkan tidak muncul di df = 1 dokumen:"}
          </p>
          <div className="overflow-x-auto rounded-md bg-muted/40 px-3 py-1 text-sm">
            <BlockMath math={String.raw`\mathrm{idf}_{\text{makan}} = \mathrm{idf}_{\text{nasi}} = \mathrm{idf}_{\text{saya}} = \mathrm{idf}_{\text{suka}} = \ln\tfrac{3}{2} \approx 0.4055, \qquad \mathrm{idf}_{\text{tidak}} = \ln\tfrac{3}{1} \approx 1.0986`} />
          </div>
          <p className="text-muted-foreground">
            {isEn
              ? "Each cell becomes tf × idf, shown with 4 decimals. For example makan in d3 = 3 × 0.4055 = 1.2164."
              : "Setiap sel menjadi tf × idf, ditampilkan dengan 4 desimal. Misalnya makan pada d3 = 3 × 0,4055 = 1,2164."}
          </p>
          <ExampleMatrix values={EXAMPLE_ROWS.map((r) => r.idf)} docLabel={isEn ? "Document" : "Dokumen"} />
          <p className="text-muted-foreground">
            {isEn
              ? "The rare word tidak, which only occurs in d2, gets the highest weight, while words shared by several documents are weighted down. A word found in all three documents would get ln(3/3) = 0 under Standard IDF."
              : "Kata langka tidak, yang hanya muncul di d2, mendapat bobot tertinggi, sedangkan kata yang dimiliki beberapa dokumen diturunkan bobotnya. Kata yang muncul di ketiga dokumen akan bernilai ln(3/3) = 0 pada Standard IDF."}
          </p>
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? "Reusing the Vectors" : "Memakai Ulang Vektor"}>
        <p className="text-sm mt-2">
          {isEn
            ? "The vocabulary and any IDF or normalization values come from the whole active dataset and are not saved. Running the menu on another dataset builds a new vocabulary, so the columns may differ. To train on one dataset and predict on another, use the Raw Text Variable of Naive Bayes and then Apply Model."
            : "Kosakata serta nilai IDF atau normalisasi berasal dari seluruh dataset aktif dan tidak disimpan. Menjalankan menu pada dataset lain membentuk kosakata baru, sehingga kolomnya dapat berbeda. Untuk melatih pada satu dataset dan memprediksi dataset lain, gunakan Raw Text Variable pada Naive Bayes lalu Apply Model."}
        </p>
      </HelpAlert>
    </div>
  );
};
