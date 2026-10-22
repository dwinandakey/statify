import React from 'react';
import { Shield, Search, AlertTriangle, CheckCircle, ListOrdered, BarChart3 } from 'lucide-react';
import { HelpGuideTemplate } from '../../../ui/HelpGuideTemplate';
import { HelpAlert, HelpCard, HelpStep } from '../../../ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

const DataQualityTab: React.FC = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'how-to-check-quality',
      title: isEn ? 'How to Check Data Quality' : 'Cara Memeriksa Kualitas Data',
      description: isEn ? 'A step-by-step guide to assessing data quality' : 'Panduan langkah demi langkah untuk assessment kualitas data',
      icon: ListOrdered,
      content: (
        <div className="space-y-4">
          <HelpStep number={1} title={isEn ? "Audit Data Completeness" : "Audit Kelengkapan Data"}>
            <p className="text-sm">
              {isEn ? "Check for missing values and dataset completeness:" : "Periksa missing values dan kelengkapan dataset:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Use <strong>Analyze → Descriptive Statistics → Frequencies</strong></li>
                  <li>Check the "Missing" column for each variable</li>
                  <li>Identify missing-data patterns (MCAR, MAR, MNAR)</li>
                  <li>Document the findings and the handling strategy</li>
                </>
              ) : (
                <>
                  <li>Gunakan <strong>Analyze → Descriptive Statistics → Frequencies</strong></li>
                  <li>Periksa kolom "Missing" untuk setiap variabel</li>
                  <li>Identifikasi pola missing data (MCAR, MAR, MNAR)</li>
                  <li>Dokumentasikan temuan dan strategi penanganan</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={2} title={isEn ? "Detect Outliers" : "Deteksi Outlier"}>
            <p className="text-sm">
              {isEn
                ? "Identify extreme values that may be errors or anomalies:"
                : "Identifikasi nilai ekstrem yang mungkin error atau anomali:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Use <strong>Analyze → Descriptive Statistics → Explore</strong></li>
                  <li>Create boxplots to visualize outliers</li>
                  <li>Check for implausible minimum and maximum values</li>
                  <li>Investigate the cause before removing outliers</li>
                </>
              ) : (
                <>
                  <li>Gunakan <strong>Analyze → Descriptive Statistics → Explore</strong></li>
                  <li>Buat boxplot untuk visualisasi outlier</li>
                  <li>Periksa nilai minimum dan maksimum yang tidak wajar</li>
                  <li>Investigasi penyebab sebelum menghapus outlier</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={3} title={isEn ? "Validate Consistency" : "Validasi Konsistensi"}>
            <p className="text-sm">
              {isEn
                ? "Check consistency across variables and business rules:"
                : "Periksa konsistensi antar variabel dan aturan bisnis:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Use <strong>Analyze → Descriptive Statistics → Crosstabs</strong></li>
                  <li>Check for illogical combinations of values</li>
                  <li>Validate the range and format of each variable</li>
                  <li>Test domain-specific business rules</li>
                </>
              ) : (
                <>
                  <li>Gunakan <strong>Analyze → Descriptive Statistics → Crosstabs</strong></li>
                  <li>Periksa kombinasi nilai yang tidak logis</li>
                  <li>Validasi range dan format setiap variabel</li>
                  <li>Test aturan bisnis domain-specific</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={4} title={isEn ? "Profiling and Documentation" : "Profiling dan Dokumentasi"}>
            <p className="text-sm">
              {isEn ? "Create a data profile and quality documentation:" : "Buat profil data dan dokumentasi kualitas:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Use <strong>Analyze → Descriptive Statistics → Descriptives</strong></li>
                  <li>Document the distribution and characteristics of the data</li>
                  <li>Create a comprehensive data quality report</li>
                  <li>Keep an audit trail for reference</li>
                </>
              ) : (
                <>
                  <li>Gunakan <strong>Analyze → Descriptive Statistics → Descriptives</strong></li>
                  <li>Dokumentasikan distribusi dan karakteristik data</li>
                  <li>Buat report kualitas data komprehensif</li>
                  <li>Simpan audit trail untuk reference</li>
                </>
              )}
            </ul>
          </HelpStep>
        </div>
      )
    },
    {
      id: 'quality-dimensions',
      title: isEn ? 'Data Quality Dimensions' : 'Dimensi Kualitas Data',
      description: isEn ? 'Important aspects of assessing data quality' : 'Aspek-aspek penting dalam menilai kualitas data',
      icon: Shield,
      content: (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <HelpCard title={isEn ? "Accuracy" : "Akurasi"} icon={CheckCircle} variant="feature">
            <p className="text-sm">
              {isEn ? "How correctly the data reflects reality" : "Seberapa benar data mencerminkan realitas yang sebenarnya"}
            </p>
            <ul className="text-sm mt-2 space-y-1">
              {isEn ? (
                <>
                  <li>• Validate against external sources</li>
                  <li>• Cross-check with other data</li>
                  <li>• Check logical consistency</li>
                </>
              ) : (
                <>
                  <li>• Validasi dengan sumber eksternal</li>
                  <li>• Cross-check dengan data lain</li>
                  <li>• Periksa logical consistency</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title={isEn ? "Completeness" : "Kelengkapan"} icon={BarChart3} variant="feature">
            <p className="text-sm">
              {isEn ? "The proportion of data that is not missing or empty" : "Proporsi data yang tidak hilang atau kosong"}
            </p>
            <ul className="text-sm mt-2 space-y-1">
              {isEn ? (
                <>
                  <li>• Calculate the percentage of missing values</li>
                  <li>• Identify missing-data patterns</li>
                  <li>• Evaluate the impact on the analysis</li>
                </>
              ) : (
                <>
                  <li>• Hitung persentase missing values</li>
                  <li>• Identifikasi pola missing data</li>
                  <li>• Evaluasi impact pada analisis</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title={isEn ? "Consistency" : "Konsistensi"} icon={Shield} variant="feature">
            <p className="text-sm">
              {isEn ? "Uniformity of data formats, values, and structure" : "Keseragaman format, nilai, dan struktur data"}
            </p>
            <ul className="text-sm mt-2 space-y-1">
              {isEn ? (
                <>
                  <li>• Standardized data formats</li>
                  <li>• Unified coding schemes</li>
                  <li>• Consistent naming conventions</li>
                </>
              ) : (
                <>
                  <li>• Standardisasi format data</li>
                  <li>• Unified coding schemes</li>
                  <li>• Consistent naming conventions</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title={isEn ? "Validity" : "Validitas"} icon={CheckCircle} variant="feature">
            <p className="text-sm">
              {isEn ? "Conformance with business and domain rules" : "Kesesuaian dengan aturan bisnis dan domain"}
            </p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• Range validation rules</li>
              <li>• Business logic checks</li>
              <li>• Referential integrity</li>
            </ul>
          </HelpCard>

          <HelpCard title={isEn ? "Timeliness" : "Ketepatan Waktu"} icon={AlertTriangle} variant="feature">
            <p className="text-sm">
              {isEn ? "How up to date and relevant the data is" : "Seberapa up-to-date dan relevan data tersebut"}
            </p>
            <ul className="text-sm mt-2 space-y-1">
              {isEn ? (
                <>
                  <li>• Check the data timestamps</li>
                  <li>• Validate data currency</li>
                  <li>• Assess data freshness</li>
                </>
              ) : (
                <>
                  <li>• Periksa timestamp data</li>
                  <li>• Validasi currency data</li>
                  <li>• Assess data freshness</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title={isEn ? "Relevance" : "Relevansi"} icon={Search} variant="feature">
            <p className="text-sm">
              {isEn ? "Fit with the goals and scope of the analysis" : "Kesesuaian dengan tujuan dan scope analisis"}
            </p>
            <ul className="text-sm mt-2 space-y-1">
              {isEn ? (
                <>
                  <li>• Evaluate fitness for purpose</li>
                  <li>• Assess coverage requirements</li>
                  <li>• Validate analytical needs</li>
                </>
              ) : (
                <>
                  <li>• Evaluasi fitness for purpose</li>
                  <li>• Assess coverage requirements</li>
                  <li>• Validate analytical needs</li>
                </>
              )}
            </ul>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'quality-concepts',
      title: isEn ? 'Key Concepts' : 'Konsep Penting',
      description: isEn ? 'An in-depth understanding of data quality aspects' : 'Pemahaman mendalam tentang aspek kualitas data',
      icon: Search,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="warning" title={isEn ? "No Dedicated Menu" : "Tidak Ada Menu Khusus"}>
            <p className="text-sm mt-2">
              {isEn
                ? "There is currently no dedicated menu under Data for Missing Values/Outliers/Validation/Profiling/Audit Trail/Quality Metrics. Use a combination of descriptive analysis features for manual quality checks."
                : "Saat ini tidak ada menu khusus di Data untuk Missing Values/Outliers/Validation/Profiling/Audit Trail/Quality Metrics. Gunakan kombinasi fitur analisis deskriptif untuk pemeriksaan kualitas manual."}
            </p>
          </HelpAlert>

          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <HelpCard title="Missing Data Patterns" icon={AlertTriangle} variant="step">
              <ul className="text-sm space-y-1">
                <li>• <strong>MCAR:</strong> Missing Completely at Random</li>
                <li>• <strong>MAR:</strong> Missing at Random {isEn ? "(depends on observed variables)" : "(bergantung pada variabel yang teramati)"}</li>
                <li>• <strong>MNAR:</strong> Missing Not at Random {isEn ? "(depends on unobserved)" : "(bergantung pada yang tidak teramati)"}</li>
                <li>• {isEn ? "Analyze the patterns before imputing" : "Analisis pola sebelum imputasi"}</li>
                <li>• {isEn ? "Document the assumed missing mechanism" : "Dokumentasikan asumsi missing mechanism"}</li>
              </ul>
            </HelpCard>

            <HelpCard title="Outlier Detection" icon={Search} variant="step">
              <ul className="text-sm space-y-1">
                {isEn ? (
                  <>
                    <li>• Use multiple methods (IQR, Z-score, Mahalanobis)</li>
                    <li>• Visualize with boxplots and scatterplots</li>
                    <li>• Investigate the cause before handling</li>
                    <li>• Consider robust statistics</li>
                    <li>• Document the handling decisions</li>
                  </>
                ) : (
                  <>
                    <li>• Gunakan multiple metode (IQR, Z-score, Mahalanobis)</li>
                    <li>• Visualisasi dengan boxplot dan scatterplot</li>
                    <li>• Investigasi penyebab sebelum penanganan</li>
                    <li>• Pertimbangkan robust statistics</li>
                    <li>• Dokumentasikan keputusan penanganan</li>
                  </>
                )}
              </ul>
            </HelpCard>
          </div>
        </div>
      )
    }
  ];

  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Check Step by Step' : 'Pemeriksaan Bertahap',
      content: isEn
        ? 'Check data quality step by step: completeness → accuracy → consistency → validity for systematic results.'
        : 'Lakukan pemeriksaan kualitas data secara bertahap: completeness → accuracy → consistency → validity untuk hasil yang sistematis.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Document Findings' : 'Dokumentasi Temuan',
      content: isEn
        ? 'Always document data quality findings and handling decisions for the audit trail and reproducibility.'
        : 'Selalu dokumentasikan temuan kualitas data dan keputusan penanganan untuk audit trail dan reproducibility.'
    },
    {
      type: 'warning' as const,
      title: 'Outlier Investigation',
      content: isEn
        ? "Don't delete outliers right away. First investigate whether they are data errors or important information worth analyzing."
        : 'Jangan langsung hapus outlier. Investigasi dulu apakah itu error data atau informasi penting yang perlu dianalisis.'
    },
    {
      type: 'tip' as const,
      title: 'Multiple Methods',
      content: isEn
        ? 'Use several validation methods to cross-check findings and increase confidence in the quality assessment.'
        : 'Gunakan berbagai metode validasi untuk cross-check temuan dan meningkatkan confidence dalam assessment kualitas.'
    }
  ];

  const relatedTopics = [
    { title: 'Descriptive Statistics', href: '/help/statistics-guide/descriptive' },
    { title: 'Missing Values Analysis', href: '/help/data-guide/missing-values' },
    { title: 'Outlier Detection', href: '/help/data-guide/outliers' },
    { title: 'Data Validation', href: '/help/data-guide/validation' },
    { title: 'Explore Analysis', href: '/help/statistics-guide/explore' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Data Quality" : "Kualitas Data"}
      description={isEn
        ? "Practices for checking and assessing data quality to ensure the validity and reliability of statistical analysis"
        : "Praktik pemeriksaan dan assessment kualitas data untuk memastikan validitas dan reliability analisis statistik"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};

export default DataQualityTab;
