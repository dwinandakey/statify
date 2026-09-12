import React from 'react';
import { HelpCircle, ClipboardList } from 'lucide-react';
import { HelpCard, HelpAlert } from '@/app/help/ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const OverviewTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <HelpAlert variant="info" title={isEn ? "What is GLM Multivariate?" : "Apa itu GLM Multivariate?"}>
        <p className="text-sm mt-2">
          {isEn ? (
            <>
              GLM Multivariate (MANOVA/MANCOVA) analyzes <strong>more than one dependent variable simultaneously</strong>,
              unlike GLM Univariate, which only analyzes a single dependent variable. It's ideal when several
              correlated outcomes need to be tested together against the same factors and covariates.
            </>
          ) : (
            <>
              GLM Multivariate (MANOVA/MANCOVA) menganalisis <strong>lebih dari satu variabel dependen secara simultan</strong>,
              berbeda dari GLM Univariate yang hanya menganalisis satu variabel dependen. Cocok dipakai ketika beberapa
              outcome yang berkorelasi ingin diuji bersamaan terhadap efek faktor dan kovariat yang sama.
            </>
          )}
        </p>
      </HelpAlert>

      <HelpCard title={isEn ? "When to Use GLM Multivariate?" : "Kapan Menggunakan GLM Multivariate?"} icon={HelpCircle} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>You have 2 or more dependent variables (outcomes) to analyze together</li>
              <li>You want to test the effect of one or more categorical factors on a combination of outcomes (One-Way / Two-Way MANOVA)</li>
              <li>You need to control for continuous covariates (MANCOVA)</li>
              <li>You want to compare a pair of measurements (pre/post) across several outcomes at once (paired Hotelling's T²)</li>
              <li>You need a custom model with specific terms, or a weighted analysis (WLS)</li>
            </>
          ) : (
            <>
              <li>Memiliki 2 atau lebih variabel dependen (outcome) yang ingin dianalisis bersamaan</li>
              <li>Ingin menguji efek satu atau lebih faktor kategorikal terhadap kombinasi beberapa outcome (One-Way / Two-Way MANOVA)</li>
              <li>Perlu mengontrol pengaruh kovariat kontinu (MANCOVA)</li>
              <li>Ingin membandingkan sepasang pengukuran (pre/post) pada beberapa outcome sekaligus (Hotelling&apos;s T² berpasangan)</li>
              <li>Membutuhkan model kustom dengan term tertentu, atau analisis berbobot (WLS)</li>
            </>
          )}
        </ul>
      </HelpCard>

      <HelpCard title={isEn ? "What You Will Learn" : "Yang Akan Anda Pelajari"} icon={ClipboardList} variant="feature">
        <ul className="text-sm space-y-2 mt-2 list-disc list-inside">
          {isEn ? (
            <>
              <li>Choosing dependent variables, fixed factors, and covariates</li>
              <li>Configuring the model specification (full factorial or custom)</li>
              <li>Using contrasts and post hoc tests</li>
              <li>Displaying estimated marginal means and plots</li>
              <li>Bootstrap options and saving results</li>
              <li>Paired T² mode for paired testing</li>
              <li>Reading the main output tables (Multivariate Tests, Box's M, SSCP, etc.)</li>
            </>
          ) : (
            <>
              <li>Memilih dependent variables, fixed factors, dan kovariat</li>
              <li>Mengatur spesifikasi model (full factorial atau custom)</li>
              <li>Menggunakan contrasts dan post hoc tests</li>
              <li>Menampilkan estimated marginal means dan plots</li>
              <li>Opsi bootstrap dan penyimpanan hasil</li>
              <li>Mode Paired T² untuk uji berpasangan</li>
              <li>Membaca tabel output utama (Multivariate Tests, Box&apos;s M, SSCP, dst.)</li>
            </>
          )}
        </ul>
      </HelpCard>
    </div>
  );
};
