import React from 'react';
import { Table } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const CategoricalTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Categorical Variable Settings" : "Pengaturan Variabel Kategorikal"} icon={Table} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Automatic Categorical Detection" : "Variabel Kategorikal Otomatis"}
            description={
              isEn
                ? "Variables with a nominal or ordinal measurement level are automatically listed here once moved into Covariates."
                : "Variabel dengan tipe nominal atau ordinal akan otomatis dimasukkan ke daftar kategorikal saat dipindahkan ke Covariates."
            }
          />
          <HelpStep
            number={2}
            title={isEn ? "Choose the Contrast Type" : "Pilih Tipe Kontras"}
            description={
              isEn
                ? "Click a checked variable to select it, then choose its dummy-coding method: Indicator, Simple, Difference, Helmert, Repeated, Polynomial, or Deviation."
                : "Klik variabel yang sudah dicentang untuk memilihnya, lalu tentukan metode pengkodean dummy: Indicator, Simple, Difference, Helmert, Repeated, Polynomial, atau Deviation."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Set the Reference Category" : "Tentukan Kategori Referensi"}
            description={
              isEn
                ? "Choose whether the First (lowest value) or Last (highest value) category is used as the baseline for comparison. This is disabled for Difference, Helmert, Repeated, and Polynomial, which do not use a single reference category."
                : "Pilih apakah kategori First (nilai terkecil) atau Last (nilai terbesar) digunakan sebagai referensi (baseline). Opsi ini otomatis nonaktif untuk Difference, Helmert, Repeated, dan Polynomial karena metode tersebut tidak menggunakan satu kategori referensi tunggal."
            }
          />
          <HelpStep
            number={4}
            title={isEn ? "Apply with “Change”" : "Terapkan dengan “Change”"}
            description={
              isEn
                ? "After adjusting the contrast method or reference category, click Change to apply it to the selected variable. The active setting is shown next to the variable name, e.g. Indicator(Last)."
                : "Setelah mengubah metode kontras atau kategori referensi, klik Change untuk menerapkannya pada variabel yang dipilih. Pengaturan aktif ditampilkan di samping nama variabel, misalnya Indicator(Last)."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Tip: Choosing a Contrast" : "Tips: Pemilihan Kontras"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              For most analyses, the <strong>Indicator</strong> contrast (dummy coding) with a <strong>Last</strong>{' '}
              reference is the most common and easiest to interpret. Use another contrast when you have a specific
              hypothesis about comparisons between categories (e.g. Helmert for successive contrasts, Polynomial
              for trend components in an ordinal factor).
            </>
          ) : (
            <>
              Untuk kebanyakan analisis, kontras <strong>Indicator</strong> (dummy coding) dengan referensi{' '}
              <strong>Last</strong> adalah pilihan yang paling umum dan mudah diinterpretasikan. Gunakan kontras
              lain jika Anda memiliki hipotesis spesifik tentang perbandingan antar kategori (misalnya Helmert untuk
              kontras berurutan, Polynomial untuk komponen tren pada faktor ordinal).
            </>
          )}
        </p>
      </HelpAlert>
    </div>
  );
};
