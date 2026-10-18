import React from 'react';
import { BarChart3, Target, Settings, FileText, ListOrdered } from 'lucide-react';
import { HelpGuideTemplate } from '../../../ui/HelpGuideTemplate';
import { HelpCard, HelpAlert, HelpStep } from '../../../ui/HelpLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const QuickStartGuide = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  const sections = [
    {
      id: 'how-to-analyze',
      title: isEn ? 'How to Run a Statistical Analysis' : 'Cara Melakukan Analisis Statistik',
      description: isEn ? 'A step-by-step guide to effective statistical analysis' : 'Panduan langkah demi langkah untuk analisis statistik yang efektif',
      icon: ListOrdered,
      content: (
        <div className="space-y-4">
          <HelpStep number={1} title={isEn ? "Choose the Type of Analysis" : "Pilih Jenis Analisis"}>
            <p className="text-sm">
              {isEn
                ? "Determine the type of analysis that fits your data type and research goal:"
                : "Tentukan jenis analisis yang sesuai dengan tipe data dan tujuan penelitian Anda:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li><strong>Descriptive</strong>: Mean, median, standard deviation to summarize data</li>
                  <li><strong>Frequencies</strong>: Distribution of categorical data</li>
                  <li><strong>Crosstabs</strong>: Relationships between categorical variables</li>
                  <li><strong>Regression</strong>: Linear relationships between variables</li>
                </>
              ) : (
                <>
                  <li><strong>Deskriptif</strong>: Mean, median, standar deviasi untuk ringkasan data</li>
                  <li><strong>Frekuensi</strong>: Distribusi data kategorikal</li>
                  <li><strong>Crosstabs</strong>: Hubungan antar variabel kategorikal</li>
                  <li><strong>Regression</strong>: Hubungan linear antar variabel</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={2} title={isEn ? "Set Up the Analysis Variables" : "Atur Variabel Analisis"}>
            <p className="text-sm">
              {isEn ? "Choose and set up the variables for the analysis:" : "Pilih dan atur variabel untuk analisis:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Drag variables from the list to the analysis area</li>
                  <li>Define each variable's role (dependent/independent)</li>
                  <li>Set the analysis options as needed</li>
                  <li>Preview the settings before running</li>
                </>
              ) : (
                <>
                  <li>Drag variabel dari daftar ke area analisis</li>
                  <li>Tentukan peran variabel (dependent/independent)</li>
                  <li>Atur opsi analisis sesuai kebutuhan</li>
                  <li>Preview pengaturan sebelum menjalankan</li>
                </>
              )}
            </ul>
          </HelpStep>

          <HelpStep number={3} title={isEn ? "Run and Interpret" : "Jalankan dan Interpretasi"}>
            <p className="text-sm">
              {isEn
                ? "Understand the analysis output and connect it to the research context:"
                : "Pahami output analisis dan hubungkan dengan konteks penelitian:"}
            </p>
            <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
              {isEn ? (
                <>
                  <li>Check the required statistical assumptions</li>
                  <li>Interpret the results in the research context</li>
                  <li>Document the findings and analysis decisions</li>
                  <li>Export the results for reporting</li>
                </>
              ) : (
                <>
                  <li>Periksa asumsi statistik yang diperlukan</li>
                  <li>Interpretasi hasil dalam konteks penelitian</li>
                  <li>Dokumentasikan temuan dan keputusan analisis</li>
                  <li>Export hasil untuk pelaporan</li>
                </>
              )}
            </ul>
          </HelpStep>
        </div>
      )
    },
    {
      id: 'analysis-types',
      title: isEn ? 'Available Analysis Types' : 'Jenis Analisis Tersedia',
      description: isEn ? 'The types of statistical analysis you can run' : 'Berbagai jenis analisis statistik yang dapat dilakukan',
      icon: BarChart3,
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <HelpCard title="Descriptive Statistics" icon={BarChart3} variant="feature">
            <ul className="text-sm space-y-1">
              {isEn ? (
                <>
                  <li>• Frequencies - Frequency distribution</li>
                  <li>• Descriptives - Descriptive statistics</li>
                  <li>• Explore - Exploratory analysis</li>
                  <li>• Crosstabs - Cross tabulation</li>
                </>
              ) : (
                <>
                  <li>• Frequencies - Distribusi frekuensi</li>
                  <li>• Descriptives - Statistik deskriptif</li>
                  <li>• Explore - Analisis eksploratori</li>
                  <li>• Crosstabs - Tabulasi silang</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title="Regression & Correlation" icon={Target} variant="feature">
            <ul className="text-sm space-y-1">
              {isEn ? (
                <>
                  <li>• Linear Regression - Linear regression</li>
                  <li>• Curve Estimation - Curve estimation</li>
                  <li>• Bivariate Correlation - Bivariate correlation</li>
                </>
              ) : (
                <>
                  <li>• Linear Regression - Regresi linear</li>
                  <li>• Curve Estimation - Estimasi kurva</li>
                  <li>• Bivariate Correlation - Korelasi bivariat</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title="General Linear Model" icon={Settings} variant="feature">
            <ul className="text-sm space-y-1">
              {isEn ? (
                <>
                  <li>• Univariate - One-way ANOVA</li>
                  <li>• Multivariate - MANOVA</li>
                  <li>• Repeated Measures - Repeated measurements</li>
                </>
              ) : (
                <>
                  <li>• Univariate - ANOVA satu arah</li>
                  <li>• Multivariate - MANOVA</li>
                  <li>• Repeated Measures - Pengukuran berulang</li>
                </>
              )}
            </ul>
          </HelpCard>

          <HelpCard title="Classification" icon={FileText} variant="feature">
            <ul className="text-sm space-y-1">
              {isEn ? (
                <>
                  <li>• K-Means Clustering - Grouping data</li>
                  <li>• Hierarchical Clustering - Hierarchical clusters</li>
                  <li>• Discriminant Analysis - Discriminant analysis</li>
                </>
              ) : (
                <>
                  <li>• K-Means Clustering - Pengelompokan data</li>
                  <li>• Hierarchical Clustering - Kluster hierarkis</li>
                  <li>• Discriminant Analysis - Analisis diskriminan</li>
                </>
              )}
            </ul>
          </HelpCard>
        </div>
      )
    },
    {
      id: 'quick-tips',
      title: isEn ? 'Tips for Effective Analysis' : 'Tips Analisis Efektif',
      description: isEn ? 'Best practices for accurate statistical analysis' : 'Praktik terbaik untuk analisis statistik yang akurat',
      icon: Target,
      content: (
        <div className="space-y-4">
          <HelpAlert variant="info" title={isEn ? "Data Preparation" : "Persiapan Data"}>
            <p className="text-sm mt-2">
              {isEn
                ? "Make sure the data is clean and meets the analysis assumptions before you start. Check for missing values, outliers, and the data distribution."
                : "Pastikan data sudah bersih dan sesuai dengan asumsi analisis sebelum memulai. Periksa missing values, outlier, dan distribusi data."}
            </p>
          </HelpAlert>

          <div className="grid gap-4 md:grid-cols-2">
            <HelpCard title={isEn ? "Check Assumptions" : "Periksa Asumsi"} icon={Settings} variant="step">
              <p className="text-sm">
                {isEn
                  ? "Validate the statistical assumptions before running the analysis for accurate results"
                  : "Validasi asumsi statistik sebelum menjalankan analisis untuk hasil yang akurat"}
              </p>
            </HelpCard>

            <HelpCard title={isEn ? "Visualize the Data" : "Visualisasi Data"} icon={BarChart3} variant="step">
              <p className="text-sm">
                {isEn
                  ? "Use charts and plots to understand the patterns and distribution of the data before analysis"
                  : "Gunakan grafik dan plot untuk memahami pola dan distribusi data sebelum analisis"}
              </p>
            </HelpCard>

            <HelpCard title={isEn ? "Contextual Interpretation" : "Interpretasi Kontekstual"} icon={Target} variant="step">
              <p className="text-sm">
                {isEn
                  ? "Connect the statistical results to the research context and domain knowledge"
                  : "Hubungkan hasil statistik dengan konteks penelitian dan domain knowledge"}
              </p>
            </HelpCard>

            <HelpCard title={isEn ? "Complete Documentation" : "Dokumentasi Lengkap"} icon={FileText} variant="step">
              <p className="text-sm">
                {isEn
                  ? "Record every analysis step and decision for reproducibility"
                  : "Catat semua langkah analisis dan keputusan untuk reproducibility"}
              </p>
            </HelpCard>
          </div>
        </div>
      )
    }
  ];

  const tips = [
    {
      type: 'tip' as const,
      title: isEn ? 'Start with Exploration' : 'Mulai dengan Eksplorasi',
      content: isEn
        ? 'Always start with descriptive and exploratory analysis to understand the characteristics of the data before advanced analysis.'
        : 'Selalu mulai dengan analisis deskriptif dan eksploratori untuk memahami karakteristik data sebelum analisis lanjutan.'
    },
    {
      type: 'info' as const,
      title: isEn ? 'Validate Assumptions' : 'Validasi Asumsi',
      content: isEn
        ? 'Check statistical assumptions such as normality, homoscedasticity, and independence before running inferential analyses.'
        : 'Periksa asumsi statistik seperti normalitas, homoskedastisitas, dan independensi sebelum menjalankan analisis inferensial.'
    },
    {
      type: 'warning' as const,
      title: isEn ? 'Interpret Carefully' : 'Interpretasi Hati-hati',
      content: isEn
        ? 'A statistically significant result is not always practically significant. Consider the effect size and the research context.'
        : 'Hasil statistik signifikan tidak selalu berarti signifikan secara praktis. Pertimbangkan ukuran efek dan konteks penelitian.'
    },
    {
      type: 'tip' as const,
      title: isEn ? 'Visualization Matters' : 'Visualisasi Penting',
      content: isEn
        ? 'Use graphs and charts to validate statistical findings and communicate the results more effectively.'
        : 'Gunakan grafik dan chart untuk memvalidasi temuan statistik dan mengkomunikasikan hasil dengan lebih efektif.'
    }
  ];

  const relatedTopics = [
    { title: 'Descriptive Statistics', href: '/help/statistics-guide/descriptives' },
    { title: 'Frequencies Analysis', href: '/help/statistics-guide/frequencies' },
    { title: 'Linear Regression', href: '/help/statistics-guide/linear' },
    { title: 'Data Preparation', href: '/help/data-guide' }
  ];

  return (
    <HelpGuideTemplate
      title={isEn ? "Quick Start - Statistical Analysis" : "Quick Start - Analisis Statistik"}
      description={isEn
        ? "A quick guide to getting started with statistical analysis in Statify in minutes"
        : "Panduan cepat untuk memulai analisis statistik di Statify dalam hitungan menit"}
      lastUpdated="2024-01-15"
      sections={sections}
      tips={tips}
      relatedTopics={relatedTopics}
    />
  );
};
