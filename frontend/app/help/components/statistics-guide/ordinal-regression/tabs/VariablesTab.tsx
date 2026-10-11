import React from 'react';
import { ArrowRightLeft, SlidersHorizontal } from 'lucide-react';
import { HelpCard, HelpAlert, HelpStep } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const VariablesTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpCard title={isEn ? "Choosing Variables" : "Pemilihan Variabel"} icon={ArrowRightLeft} variant="feature">
        <div className="space-y-4 mt-2">
          <HelpStep
            number={1}
            title={isEn ? "Dependent Variable" : "Variabel Dependen"}
            description={
              isEn
                ? "Enter 1 ordinal variable (numeric or text/string) with more than 2 categories. The system automatically sorts values from smallest to largest. The lowest value becomes the first baseline category."
                : "Masukkan 1 variabel ordinal (dapat berupa angka atau teks/string) dengan >2 kategori. Sistem secara otomatis mengurutkan nilai dari terkecil ke terbesar. Nilai terendah akan menjadi kategori dasar pertama."
            }
          />
          <HelpStep
            number={2}
            title={isEn ? "Categorical Independent Variables" : "Variabel Independen Kategorik"}
            description={
              isEn
                ? "Enter independent variables that are grouped/categorical (e.g. Sex, Education Level, or Treatment Group) into the factor(s) column."
                : "Masukkan variabel independen yang berupa kelompok/kategori (misalnya: Jenis Kelamin, Tingkat Pendidikan, atau Kelompok Perlakuan) ke kolom faktor/factors."
            }
          />
          <HelpStep
            number={3}
            title={isEn ? "Numeric Independent Variables" : "Variabel Independen Numerik"}
            description={
              isEn
                ? "Enter continuous numeric independent variables (e.g. Age, Income, or Drug Dose) into the covariate(s) column. Note: using too many continuous covariates can enlarge the cell-probability table."
                : "Masukkan variabel independen yang bersifat angka kontinu (misalnya: Usia, Pendapatan, atau Dosis Obat) ke kolom kovariat/covariates. Catatan: Menggunakan terlalu banyak kovariat kontinu dapat memperbesar tabel peluang sel."
            }
          />
        </div>
      </HelpCard>

      <HelpAlert variant="tip" title={isEn ? "Tip: Drag and Drop" : "Tips: Drag and Drop"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              You can drag and drop variables to move them. Click a variable in the list on the left, then drag it
              into the Dependent or Covariates box on the right. Use <strong>Ctrl/Cmd + click</strong> to select
              multiple variables at once, then drag once to move them all.
            </>
          ) : (
            <>
              Anda dapat menggunakan fitur drag and drop untuk memindahkan variabel. Klik variabel di daftar
              sebelah kiri, lalu seret (drag) ke kotak Dependent atau Covariates di sebelah kanan.
              Gunakan <strong>Ctrl/Cmd + klik</strong> untuk memilih beberapa variabel sekaligus,
              lalu drag sekali untuk memindahkan semuanya.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Choosing the Link Function / Model Transformation" : "Pemilihan Link Function/Transformasi Model"} icon={SlidersHorizontal} variant="feature">
        <p className="text-sm text-muted-foreground mb-4">
          {isEn
            ? "The link function transforms the cumulative probability so the model can be estimated properly. Choose based on the distribution characteristics of your dependent variable's (Y) categories:"
            : "Fungsi link digunakan untuk mentransformasikan peluang kumulatif agar model dapat diestimasi dengan tepat. Pilih berdasarkan karakteristik sebaran kategori variabel terikat (Y) Anda:"}
        </p>
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">1. Logit</p>
            <p className="text-muted-foreground text-xs mt-1">
              <strong>{isEn ? "Use case:" : "Penggunaan:"}</strong>{' '}
              {isEn ? "The standard choice when data is spread evenly/balanced across categories (normal data)." : "Pilihan standar ketika sebaran data antar kategori terbagi secara merata/seimbang (data normal)."}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">2. Complementary Log-log</p>
            <p className="text-muted-foreground text-xs mt-1">
              <strong>{isEn ? "Use case:" : "Penggunaan:"}</strong>{' '}
              {isEn ? "Suitable when higher-value categories are more dominant or more likely to occur (left-skewed data)." : "Cocok jika kategori bernilai tinggi lebih dominan atau memiliki peluang lebih besar untuk terjadi (data menceng kiri)."}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">3. Negative Log-log</p>
            <p className="text-muted-foreground text-xs mt-1">
              <strong>{isEn ? "Use case:" : "Penggunaan:"}</strong>{' '}
              {isEn ? "Suitable when lower-value categories are more dominant or more likely to occur (right-skewed data)." : "Cocok jika kategori bernilai rendah lebih dominan atau memiliki peluang lebih besar untuk terjadi (data menceng kanan)."}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">4. Probit</p>
            <p className="text-muted-foreground text-xs mt-1">
              <strong>{isEn ? "Use case:" : "Penggunaan:"}</strong>{' '}
              {isEn ? "Suitable when there's a latent (hidden) variable assumed to be normally distributed." : "Cocok jika terdapat variabel laten (tersembunyi) yang diasumsikan terdistribusi normal."}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold">5. Cauchit</p>
            <p className="text-muted-foreground text-xs mt-1">
              <strong>{isEn ? "Use case:" : "Penggunaan:"}</strong>{' '}
              {isEn ? "Suitable when your variable has many extreme values at the ends of its categories." : "Cocok jika variabel Anda memiliki banyak nilai ekstrim pada ujung-ujung kategorinya."}
            </p>
          </div>
        </div>
      </HelpCard>
    </div>
  );
};
