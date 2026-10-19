import React from 'react';
import { SlidersHorizontal, Calculator, Filter, Tag } from 'lucide-react';
import { HelpCard, HelpStep, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

/** Daftar rumus: nama opsi dan penjelasan di kiri, rumus (notasi LaTeX, KaTeX) di kanan. */
const FormulaList = ({ items }: { items: Array<{ name: string; formula: string; note: string }> }) => (
  <div className="mt-2 divide-y rounded-lg border">
    {items.map((item) => (
      <div key={item.name} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center">
        <div className="text-sm">
          <p className="font-semibold">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.note}</p>
        </div>
        <div className="overflow-x-auto text-sm">
          <BlockMath math={item.formula} />
        </div>
      </div>
    ))}
  </div>
);

export const OptionsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title="Vector Column Name" icon={Tag} variant="feature">
        <div className="space-y-2 text-sm text-muted-foreground mt-2">
          <p>
            {isEn
              ? "The prefix of the new column names. Column name = prefix + term, for example VEC_food. The default is VEC_."
              : "Awalan nama kolom baru. Nama kolom = awalan + term, misalnya VEC_makan. Nilai default VEC_."}
          </p>
          <ul className="list-disc list-inside space-y-1">
            {isEn ? (
              <>
                <li>At most 32 characters, no spaces.</li>
                <li>Must start with a letter, @, # or $, and may only contain letters, digits, periods, underscores, @, # and $.</li>
                <li>Characters of a term that are not allowed in a variable name (for example the space in an n-gram) become an underscore; if a name is already used, a suffix _1, _2, ... is added.</li>
              </>
            ) : (
              <>
                <li>Maksimal 32 karakter, tanpa spasi.</li>
                <li>Diawali huruf, @, # atau $, dan hanya berisi huruf, angka, titik, garis bawah, @, # dan $.</li>
                <li>Karakter term yang tidak sah untuk nama variabel (misalnya spasi pada n-gram) menjadi garis bawah; bila nama sudah dipakai, ditambahkan akhiran _1, _2, dan seterusnya.</li>
              </>
            )}
          </ul>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Text Preprocessing" : "Pra-pemrosesan Teks"} icon={SlidersHorizontal} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Lowercase"
            description={
              isEn
                ? "When checked (default), all letters are converted to lowercase before the text is split, so \"Food\" and \"food\" become the same term. When unchecked, upper and lower case are kept apart."
                : "Bila dicentang (default), semua huruf diubah menjadi huruf kecil sebelum teks dipecah, sehingga \"Makan\" dan \"makan\" menjadi term yang sama. Bila tidak dicentang, huruf besar dan kecil dibedakan."
            }
          />
          <HelpStep
            number={2}
            title="Stopwords Removal"
            description={
              isEn
                ? "Removes common words that carry little meaning. None = remove nothing (default); Indonesian or English = the built-in list, shown in the text box; Custom = your own list, one word per line. Editing the text box switches to Custom automatically. Matching ignores upper and lower case."
                : "Membuang kata umum yang kurang bermakna. None = tidak ada yang dibuang (default); Indonesian atau English = daftar bawaan yang ditampilkan di kotak teks; Custom = daftar sendiri, satu kata per baris. Mengubah isi kotak teks otomatis memilih Custom. Pencocokan tidak membedakan huruf besar dan kecil."
            }
          />
          <HelpStep
            number={3}
            title="Stemming"
            description={
              isEn
                ? "Reduces each word to its root so that word variations count as one term. None (default), Indonesian (Sastrawi), or English (Porter). Stemming always converts words to lowercase, so the Lowercase option has no effect while stemming is on."
                : "Mengubah setiap kata ke bentuk dasarnya sehingga variasi kata dihitung sebagai satu term. None (default), Indonesian (Sastrawi), atau English (Porter). Stemming selalu mengubah kata menjadi huruf kecil, sehingga opsi Lowercase tidak berpengaruh saat stemming aktif."
            }
          />
          <HelpStep
            number={4}
            title="Tokenizer"
            description={
              isEn
                ? "Word (default) = each word is one term. N-gram = terms are runs of consecutive words from min size to max size (whole numbers 1 to 5, min not greater than max), joined by a space. For example, min 1 and max 2 on \"fried rice\" give \"fried\", \"rice\", and \"fried rice\"."
                : "Word (default) = setiap kata menjadi satu term. N-gram = term berupa rangkaian kata berurutan dari min size sampai max size (bilangan bulat 1 sampai 5, min tidak lebih besar dari max), digabung dengan spasi. Misalnya min 1 dan max 2 pada \"nasi goreng\" menghasilkan \"nasi\", \"goreng\", dan \"nasi goreng\"."
            }
          />
          <HelpStep
            number={5}
            title="Delimiters"
            description={
              isEn
                ? "A regular expression (regex) that marks where the text is split into words. The default [\\s.,;:'\"()?!]+ splits on spaces and common punctuation. It cannot be empty, and an invalid pattern shows an error message."
                : "Regular expression (regex) yang menandai tempat teks dipecah menjadi kata. Nilai default [\\s.,;:'\"()?!]+ memecah pada spasi dan tanda baca umum. Tidak boleh kosong, dan pola yang tidak sah menampilkan pesan galat."
            }
          />
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          {isEn
            ? "Processing order: lowercase and split by the delimiters, remove stopwords, stem, then form n-grams."
            : "Urutan proses: huruf kecil dan pemecahan dengan delimiter, pembuangan stopwords, stemming, lalu pembentukan n-gram."}
        </p>
      </HelpCard>

      <HelpCard title={isEn ? "Vectorization Method" : "Metode Vektorisasi"} icon={Calculator} variant="feature">
        <div className="space-y-4 mt-2 text-sm">
          <p className="text-muted-foreground">
            {isEn ? (
              <>
                The value of a term in a document is <InlineMath math={String.raw`\mathrm{tf} \times \mathrm{idf}`} />, after which the whole
                row can be normalized. Notation: <InlineMath math="f" /> = number of times the term appears
                in the document, <InlineMath math="N" /> = number of documents,
                 <InlineMath math={String.raw`\mathrm{df}`} /> = number of documents that contain the term, <InlineMath math={String.raw`\lvert d \rvert`} /> = number of tokens in the document, <InlineMath math="v" /> = the row vector of a document. TF, IDF, and
                normalization can be combined freely.
              </>
            ) : (
              <>
                Nilai sebuah term pada satu dokumen adalah <InlineMath math={String.raw`\mathrm{tf} \times \mathrm{idf}`} />, lalu seluruh
                baris dapat dinormalisasi. Notasi: <InlineMath math="f" /> = jumlah kemunculan term pada
                dokumen, <InlineMath math="N" /> = jumlah dokumen, <InlineMath math={String.raw`\mathrm{df}`} /> =
                jumlah dokumen yang memuat term, <InlineMath math={String.raw`\lvert d \rvert`} /> = jumlah token dokumen, <InlineMath math="v" /> = vektor baris sebuah dokumen. TF, IDF, dan normalisasi dapat dikombinasikan secara bebas.
              </>
            )}
          </p>
          <div>
            <p className="font-semibold text-primary">Term Frequency (TF)</p>
            <FormulaList
              items={[
                { name: 'Binary / Boolean', formula: String.raw`\mathrm{tf} = \begin{cases} 1, & f > 0 \\ 0, & f = 0 \end{cases}`, note: isEn ? 'whether the term appears' : 'apakah term muncul' },
                { name: 'Raw count / Raw frequency', formula: String.raw`\mathrm{tf} = f`, note: isEn ? 'number of occurrences (default)' : 'jumlah kemunculan (default)' },
                { name: 'Logarithmic / Log-scaled', formula: String.raw`\mathrm{tf} = \ln(1 + f)`, note: isEn ? 'dampens large counts' : 'meredam jumlah yang besar' },
                { name: 'Sublinear', formula: String.raw`\mathrm{tf} = \begin{cases} 1 + \ln f, & f > 0 \\ 0, & f = 0 \end{cases}`, note: isEn ? 'dampens large counts, 0 when absent' : 'meredam jumlah yang besar, 0 bila tidak muncul' },
                { name: 'Relative frequency / Length-normalized', formula: String.raw`\mathrm{tf} = \dfrac{f}{\lvert d \rvert}`, note: isEn ? 'share of the document taken by the term' : 'proporsi term dalam dokumen' },
              ]}
            />
          </div>
          <div>
            <p className="font-semibold text-primary">Inverse Document Frequency (IDF)</p>
            <FormulaList
              items={[
                { name: 'None', formula: String.raw`\mathrm{idf} = 1`, note: isEn ? 'no IDF weighting (default)' : 'tanpa pembobotan IDF (default)' },
                { name: 'Standard IDF', formula: String.raw`\mathrm{idf} = \ln \dfrac{N}{\mathrm{df}}`, note: isEn ? 'a term found in every document gets 0' : 'term yang ada di semua dokumen bernilai 0' },
                { name: 'Smooth IDF', formula: String.raw`\mathrm{idf} = \ln \dfrac{1 + N}{1 + \mathrm{df}} + 1`, note: isEn ? 'always at least 1' : 'selalu minimal 1' },
                { name: 'IDF + 1', formula: String.raw`\mathrm{idf} = \ln \dfrac{N}{\mathrm{df}} + 1`, note: isEn ? 'like Standard IDF, shifted up by 1' : 'seperti Standard IDF, ditambah 1' },
              ]}
            />
          </div>
          <div>
            <p className="font-semibold text-primary">Normalization</p>
            <FormulaList
              items={[
                { name: 'None', formula: String.raw`v' = v`, note: isEn ? 'no normalization (default)' : 'tanpa normalisasi (default)' },
                { name: 'L2 / Cosine / Euclidean', formula: String.raw`v' = \dfrac{v}{\lVert v \rVert_2}`, note: isEn ? 'each row gets Euclidean length 1' : 'setiap baris memiliki panjang Euklides 1' },
                { name: 'L1 / Manhattan', formula: String.raw`v' = \dfrac{v}{\lVert v \rVert_1}`, note: isEn ? 'the absolute values of each row sum to 1' : 'jumlah nilai mutlak tiap baris menjadi 1' },
                { name: 'Document length / Average-length', formula: String.raw`v' = v \cdot \dfrac{\overline{\lVert v \rVert_2}}{\lVert v \rVert_2}`, note: isEn ? 'each row is scaled to the average L2 length of the non-empty documents' : 'setiap baris diskalakan ke rata-rata panjang L2 dokumen yang tidak kosong' },
              ]}
            />
          </div>
          <p className="text-muted-foreground">
            {isEn
              ? "With Binary / Boolean or Raw count / Raw frequency, IDF None, and Normalization None the columns are whole numbers (0 decimals); any other combination is shown with 4 decimals."
              : "Dengan Binary / Boolean atau Raw count / Raw frequency, IDF None, dan Normalization None, kolom berisi bilangan bulat (0 desimal); kombinasi lain ditampilkan dengan 4 desimal."}
          </p>
        </div>
      </HelpCard>

      <HelpCard title={isEn ? "Vocabulary Size" : "Ukuran Kosakata"} icon={Filter} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Min term frequency"
            description={
              isEn
                ? "Terms whose total count across all documents is below this value are dropped. Whole number of 1 or more; the default 1 drops nothing. This filter is applied before Words to Keep."
                : "Term yang total kemunculannya di semua dokumen lebih kecil dari nilai ini dibuang. Bilangan bulat 1 atau lebih; nilai default 1 tidak membuang apa pun. Penyaringan ini dilakukan sebelum Words to Keep."
            }
          />
          <HelpStep
            number={2}
            title="Words to Keep"
            description={
              isEn
                ? "The maximum number of terms (columns) to keep. Whole number of 0 or more; the default is 1000 and 0 keeps all terms. For most combinations terms are ranked by their total count across all documents; for the remaining combinations they are ranked by the sum of TF × IDF. The note under the field shows which ranking applies. Ties are broken alphabetically."
                : "Jumlah maksimum term (kolom) yang disimpan. Bilangan bulat 0 atau lebih; nilai default 1000 dan 0 menyimpan semua term. Pada sebagian besar kombinasi, term dirangking menurut total kemunculan di semua dokumen; pada kombinasi lainnya dirangking menurut jumlah TF × IDF. Catatan di bawah kolom isian menunjukkan cara yang berlaku. Nilai seri diurutkan alfabetis."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Tip: Help Button" : "Tips: Tombol Bantuan"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Invalid options are listed in red under the tabs and the OK button stays disabled until they are fixed. The help button (?) at the bottom left of the dialog explains every tab and field step by step."
            : "Opsi yang tidak sah ditampilkan dengan warna merah di bawah tab dan tombol OK tetap nonaktif sampai diperbaiki. Tombol bantuan (?) di kiri bawah dialog menjelaskan setiap tab dan kolom isian secara bertahap."}
        </p>
      </HelpAlert>
    </div>
  );
};
