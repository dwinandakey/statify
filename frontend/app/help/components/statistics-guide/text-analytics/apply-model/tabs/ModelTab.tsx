import React from 'react';
import { FileInput, ShieldAlert } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const ModelTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? 'Model Source' : 'Sumber Model'} icon={FileInput} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Upload file (.json)"
            description={
              isEn
                ? 'Press Choose file and select a model file exported from Analyze > Classify > Naive Bayes (Export Model button in the Output Viewer). Only .json files up to 10 MB are accepted.'
                : 'Tekan Choose file lalu pilih file model hasil ekspor dari Analyze > Classify > Naive Bayes (tombol Export Model di Output Viewer). Hanya file .json berukuran maksimal 10 MB yang diterima.'
            }
          />
          <HelpStep
            number={2}
            title="From Output Viewer"
            description={
              isEn
                ? 'Every successful Naive Bayes run places its model in the Output Viewer. This option lists those models, newest first, so you can apply a model without downloading a file. If the list is empty, run Naive Bayes first.'
                : 'Setiap run Naive Bayes yang berhasil menyimpan modelnya di Output Viewer. Opsi ini menampilkan daftar model tersebut (terbaru di atas), sehingga model dapat diterapkan tanpa mengunduh file. Bila daftar kosong, jalankan Naive Bayes terlebih dahulu.'
            }
          />
          <HelpStep
            number={3}
            title="Statify built-in model"
            description={
              isEn
                ? 'Models shipped with Statify. The catalog is currently empty, so the list is disabled.'
                : 'Model bawaan yang disertakan Statify. Saat ini katalognya masih kosong, sehingga daftar pilihan dinonaktifkan.'
            }
          />
          <HelpStep
            number={4}
            title={isEn ? 'Model Summary' : 'Ringkasan Model'}
            description={
              isEn
                ? 'After a model is loaded, a summary card shows its source, algorithm, format version, training time, target, classes, features with their roles (categorical or numerical), and the text features if any. Check it before mapping variables.'
                : 'Setelah model dimuat, kartu ringkasan menampilkan sumber, algoritma, versi format, waktu pelatihan, target, kelas, fitur beserta perannya (categorical atau numerical), dan fitur teks bila ada. Periksa ringkasan ini sebelum memetakan variabel.'
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? 'Model File Validation' : 'Validasi File Model'} icon={ShieldAlert} variant="default">
        <div className="space-y-3 text-sm mt-2">
          <p className="text-muted-foreground">
            {isEn
              ? 'Every model, whatever its source, is checked before it is used. If the check fails, the errors are listed under the source controls and the previously loaded model (if any) stays unchanged. The main situations are:'
              : 'Setiap model, dari sumber mana pun, diperiksa sebelum dipakai. Bila pemeriksaan gagal, daftar kesalahan ditampilkan di bawah kontrol sumber dan model yang sudah dimuat sebelumnya (bila ada) tidak berubah. Situasi utamanya:'}
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {isEn ? (
              <>
                <li>The file is larger than 10 MB, or its content is not valid JSON.</li>
                <li>The file is not a model, or its model type is not supported by Apply Model.</li>
                <li>The model format version is not supported (supported: 1.0, 1.1, and 2.0).</li>
                <li>A required part of the model is missing or has the wrong form (for example the class list or feature list).</li>
                <li>The numbers inside the model are inconsistent, for example class probabilities that do not add up to 1, a non-positive variance, or a feature order that does not match the feature list.</li>
                <li>The text-feature part of the model is incomplete or its sizes do not match.</li>
              </>
            ) : (
              <>
                <li>File lebih besar dari 10 MB, atau isinya bukan JSON yang valid.</li>
                <li>File bukan model, atau jenis modelnya belum didukung Apply Model.</li>
                <li>Versi format model tidak didukung (yang didukung: 1.0, 1.1, dan 2.0).</li>
                <li>Bagian wajib model hilang atau bentuknya salah (misalnya daftar kelas atau daftar fitur).</li>
                <li>Angka di dalam model tidak konsisten, misalnya probabilitas kelas yang jumlahnya bukan 1, variansi yang tidak positif, atau urutan fitur yang tidak sesuai dengan daftar fitur.</li>
                <li>Bagian fitur teks pada model tidak lengkap atau ukurannya tidak cocok.</li>
              </>
            )}
          </ul>
        </div>
      </HelpCard>

      <HelpAlert variant="warning" title={isEn ? 'Older Model Files' : 'File Model Lama'}>
        <p className="text-sm mt-2">
          {isEn
            ? 'Model files exported by earlier versions of Statify remain usable. Models in the oldest format (1.0) show a yellow warning: categories that the model has never seen are skipped during prediction. Export the model again from the Naive Bayes menu for fully consistent results.'
            : 'File model hasil ekspor Statify versi sebelumnya tetap dapat digunakan. Model berformat paling lama (1.0) menampilkan peringatan kuning: kategori yang tidak pernah dilihat model dilewati saat prediksi. Ekspor ulang model dari menu Naive Bayes untuk hasil yang sepenuhnya konsisten.'}
        </p>
      </HelpAlert>
    </div>
  );
};
