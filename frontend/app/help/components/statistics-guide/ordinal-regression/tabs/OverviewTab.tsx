import React from 'react';
import { HelpCircleIcon } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "What is Ordinal Regression Analysis?" : "Apa itu Analisis Regresi Ordinal?"}>
        <p className="text-sm mt-2">
          {isEn
            ? "Ordinal Regression is a statistical method for modeling the relationship between one target/dependent variable (Y) that is an ordered rank/category with one or more predictor/independent variables (X)."
            : "Regresi Ordinal merupakan metode statistik untuk memodelkan hubungan antara satu variabel target/dependen (Y) yang berbentuk tingkatan/kategori berurutan dengan satu atau beberapa variabel prediktor/independen (X)."}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "Introduction to Ordinal Regression Analysis" : "Pengenalan Analisis Regresi Ordinal"} icon={HelpCircleIcon} variant="feature">
        <div className="space-y-4 text-sm mt-2">
          <div>
            <p className="font-semibold text-primary">{isEn ? "Data and Variable Usage" : "Penggunaan Data dan Variabel"}</p>
            <p className="text-muted-foreground mt-1">
              {isEn
                ? "The dependent variable is assumed ordinal and can be numeric or string, and must have more than 2 categories."
                : "Variabel dependen diasumsikan ordinal dan dapat berupa angka atau string dan wajib memiliki >2 kategori."}
            </p>
            <p className="text-muted-foreground mt-1">
              {isEn
                ? "Order is determined by sorting the dependent variable's values in ascending order, so the lowest value defines the first category."
                : "Urutan ditentukan dengan mengurutkan nilai variabel dependen dalam urutan menaik sehingga nilai terendah mendefinisikan kategori pertama."}
            </p>
            <p className="text-muted-foreground mt-1">
              {isEn ? (
                <>
                  <strong>Factor variables</strong> are assumed categorical and <strong>covariate variables</strong> must
                  be numeric.
                </>
              ) : (
                <>
                  <strong>Variabel faktor</strong> diasumsikan kategorikal dan <strong>variabel kovariat</strong> harus
                  berupa angka/numerik.
                </>
              )}
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="font-semibold text-primary">{isEn ? "Ordinal Regression Use Cases" : "Kasus Regresi Ordinal"}</p>
            <p className="text-muted-foreground mt-1">
              {isEn
                ? "Ordinal regression can model tiered categorical data without forcing the assumption that the distance between categories is equal, yielding far more accurate probability estimates than linear regression."
                : "Regresi ordinal mampu memodelkan data kategorikal berjenjang tanpa memaksakan asumsi bahwa jarak antar kategori bernilai sama, sehingga menghasilkan estimasi peluang yang jauh lebih akurat dibanding regresi linier."}
            </p>
            <p className="text-muted-foreground mt-1">
              {isEn ? "Example applications of ordinal regression (Indonesian-language studies):" : "Contoh penggunaan regresi ordinal:"}
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
              <li>
                <a href="https://journal.iteba.ac.id/index.php/jurnalsintak/article/download/723/308" target="_blank" rel="noopener noreferrer">
                  Regresi Logistik Ordinal untuk Pemodelan Indeks Pembangunan Manusia
                </a>
              </li>
              <li>
                <a href="http://dx.doi.org/10.11594/jesi.02.03.06" target="_blank" rel="noopener noreferrer">
                  Regresi Logistik Ordinal Determinan Tingkat Kebahagiaan di Provinsi Yogyakarta
                </a>
              </li>
            </ul>
          </div>
          <hr className="border-border" />
          <div>
            <p className="font-semibold text-primary">{isEn ? "Assumptions" : "Asumsi"}</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
              {isEn ? (
                <>
                  <li>There is only <strong>one dependent variable</strong> (Y) and its categories must be ordered.</li>
                  <li>Responses across respondents are assumed independent of one another.</li>
                </>
              ) : (
                <>
                  <li>Hanya ada <strong>satu variabel dependen</strong> (Y) dan kategorinya harus terurut.</li>
                  <li>Respon antar responden diasumsikan bersifat independen satu sama lain.</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </HelpCard>
    </div>
  );
};
