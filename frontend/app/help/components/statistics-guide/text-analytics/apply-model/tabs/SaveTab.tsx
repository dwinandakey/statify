import React from 'react';
import { Save, PenLine } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const SaveTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? 'Columns Added to the Dataset' : 'Kolom yang Ditambahkan ke Dataset'} icon={Save} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title="Predicted value"
            description={
              isEn
                ? 'Always saved. Contains the predicted class of each row (default name NB_PredictedValue). The column is numeric when every class name is a number, otherwise it is a string; its measurement level is nominal.'
                : 'Selalu disimpan. Berisi kelas prediksi setiap baris (nama bawaan NB_PredictedValue). Kolom bertipe numerik bila semua nama kelas berupa angka, selain itu bertipe string; measurement level-nya nominal.'
            }
          />
          <HelpStep
            number={2}
            title="Predicted probability (predicted class)"
            description={
              isEn
                ? 'On by default. The probability of the predicted class, i.e. the highest class probability (default name NB_PredictedProbability, 4 decimals).'
                : 'Aktif secara bawaan. Probabilitas kelas yang diprediksi, yaitu probabilitas kelas tertinggi (nama bawaan NB_PredictedProbability, 4 desimal).'
            }
          />
          <HelpStep
            number={3}
            title="Predicted probability for each class"
            description={
              isEn
                ? 'Off by default. Adds one probability column for every class, in the class order of the model (default name NB_Probability_<class>, 4 decimals).'
                : 'Nonaktif secara bawaan. Menambahkan satu kolom probabilitas untuk setiap kelas, sesuai urutan kelas pada model (nama bawaan NB_Probability_<kelas>, 4 desimal).'
            }
          />
        </div>
      </HelpCard>

      <HelpCard title={isEn ? 'Naming the Columns' : 'Penamaan Kolom'} icon={PenLine} variant="default">
        <div className="space-y-3 text-sm mt-2">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {isEn ? (
              <>
                <li><strong>Name prefix</strong> replaces the default prefix NB in every default name. Leave it empty to keep NB.</li>
                <li><strong>Use custom names</strong> lets you type the name of each column in the table. An empty custom name is an error (it is not replaced by the default).</li>
                <li>Names must start with a letter or @, # or $, may contain letters, digits, ., _, @, # and $, must be at most 64 characters, must not be a reserved word (such as AND, OR, NOT, ALL), and must be different from each other.</li>
                <li>The <strong>Final name</strong> column shows the name that will really be used. If a name is already used by another variable or contains invalid characters, it is adjusted automatically (for example a _1 suffix is added) and a warning icon appears.</li>
              </>
            ) : (
              <>
                <li><strong>Name prefix</strong> menggantikan prefix bawaan NB pada setiap nama bawaan. Kosongkan untuk tetap memakai NB.</li>
                <li><strong>Use custom names</strong> memungkinkan nama setiap kolom diketik di tabel. Nama kustom yang kosong dianggap error (tidak diganti nama bawaan).</li>
                <li>Nama harus diawali huruf atau @, # atau $, boleh berisi huruf, angka, ., _, @, # dan $, maksimal 64 karakter, bukan kata cadangan (seperti AND, OR, NOT, ALL), dan tidak boleh sama satu sama lain.</li>
                <li>Kolom <strong>Final name</strong> menampilkan nama yang benar-benar dipakai. Bila nama sudah dipakai variabel lain atau berisi karakter tidak valid, nama disesuaikan otomatis (misalnya diberi akhiran _1) dan ikon peringatan muncul.</li>
              </>
            )}
          </ul>
        </div>
      </HelpCard>

      <HelpAlert variant="info" title={isEn ? 'Rows That Are Not Predicted' : 'Baris yang Tidak Diprediksi'}>
        <p className="text-sm mt-2">
          {isEn
            ? 'For rows in which all predictors are empty, every new column stays empty. Loading a different model resets the Save settings to their defaults.'
            : 'Untuk baris yang seluruh prediktornya kosong, semua kolom baru dibiarkan kosong. Memuat model lain mengembalikan pengaturan Save ke nilai bawaan.'}
        </p>
      </HelpAlert>
    </div>
  );
};
