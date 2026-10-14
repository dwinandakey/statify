import React from 'react';
import { Target, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';
import {
  IntroSection,
  FeatureGrid,
  ConceptSection
} from '../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const TipsTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "Statistical Analysis Tips & Tricks" : "Tips & Trik Analisis Statistik"}
        description={isEn
          ? "A collection of best practices, practical tips, and ways to avoid common mistakes in statistical analysis."
          : "Kumpulan praktik terbaik, tips praktis, dan cara menghindari kesalahan umum dalam analisis statistik."}
        variant="tip"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "Effective Data Preparation" : "Persiapan Data yang Efektif",
            icon: CheckCircle,
            items: isEn
              ? [
                  "Data Cleaning - Identify and handle missing values",
                  "Outlier Detection - Use boxplots and z-scores",
                  "Data Transformation - Log, sqrt for normalization",
                  "Variable Coding - Be consistent when coding categories",
                  "Documentation - Record every preprocessing step"
                ]
              : [
                  "Data Cleaning - Identifikasi dan tangani missing values",
                  "Outlier Detection - Gunakan boxplot dan z-score",
                  "Data Transformation - Log, sqrt untuk normalisasi",
                  "Variable Coding - Konsisten dalam pengkodean kategori",
                  "Documentation - Catat semua langkah preprocessing"
                ]
          },
          {
            title: isEn ? "Meaningful Visualization" : "Visualisasi yang Bermakna",
            icon: Lightbulb,
            items: isEn
              ? [
                  "Chart Selection - Choose a chart that fits the data type",
                  "Color Usage - Use accessible colors",
                  "Scale Appropriateness - Start bar charts at zero",
                  "Annotation - Add labels and captions",
                  "Simplicity - Avoid chart junk and 3D effects"
                ]
              : [
                  "Chart Selection - Pilih grafik sesuai tipe data",
                  "Color Usage - Gunakan warna yang accessible",
                  "Scale Appropriateness - Mulai dari nol untuk bar chart",
                  "Annotation - Tambahkan label dan keterangan",
                  "Simplicity - Hindari chart junk dan 3D effects"
                ]
          }
        ]}
      />

      <ConceptSection
        title={isEn ? "Common Mistakes to Avoid" : "Kesalahan Umum yang Harus Dihindari"}
        icon={AlertTriangle}
        concepts={[
          {
            title: "Multiple Testing Problem",
            description: isEn
              ? "Running many statistical tests without correction inflates the Type I error. Use the Bonferroni correction or FDR for multiple comparisons."
              : "Melakukan banyak uji statistik tanpa koreksi meningkatkan Type I error. Gunakan Bonferroni correction atau FDR untuk multiple comparisons."
          },
          {
            title: "Correlation vs Causation",
            description: isEn
              ? "Correlation does not imply causation. An experimental design or causal analysis is needed to establish cause-and-effect relationships."
              : "Korelasi tidak berarti kausalitas. Perlu desain eksperimental atau analisis kausal untuk menetapkan hubungan sebab-akibat."
          },
          {
            title: "Sample Size Issues",
            description: isEn
              ? "A sample that is too small (underpowered) or too large (overpowered). Run a power analysis before collecting data."
              : "Sampel terlalu kecil (underpowered) atau terlalu besar (overpowered). Lakukan power analysis sebelum pengumpulan data."
          },
          {
            title: "P-Hacking",
            description: isEn
              ? "Manipulating the analysis to get significant results. Pre-register the analysis plan and report every analysis performed."
              : "Manipulasi analisis untuk mendapatkan hasil signifikan. Pre-register analysis plan dan laporkan semua analisis yang dilakukan."
          },
          {
            title: "Assumption Violations",
            description: isEn
              ? "Ignoring statistical assumptions (normality, homoscedasticity). Always check the assumptions and use nonparametric alternatives when needed."
              : "Mengabaikan asumsi statistik (normalitas, homoskedastisitas). Selalu periksa asumsi dan gunakan alternatif non-parametrik jika perlu."
          },
          {
            title: "Cherry Picking",
            description: isEn
              ? "Reporting only the results that support the hypothesis. Report all results, including those that are non-significant or contradictory."
              : "Melaporkan hanya hasil yang mendukung hipotesis. Laporkan semua hasil, termasuk yang tidak signifikan atau bertentangan."
          }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-muted/50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Best Practices
          </h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-background rounded border">
              <h4 className="font-medium mb-1">Reproducible Research</h4>
              <p className="text-muted-foreground">
                {isEn
                  ? "Code documentation, version control, and data sharing for transparency."
                  : "Dokumentasi kode, version control, dan data sharing untuk transparansi."}
              </p>
            </div>
            <div className="p-3 bg-background rounded border">
              <h4 className="font-medium mb-1">Effect Size Reporting</h4>
              <p className="text-muted-foreground">
                {isEn
                  ? "Always report the effect size along with significance testing."
                  : "Selalu laporkan effect size bersama dengan significance testing."}
              </p>
            </div>
            <div className="p-3 bg-background rounded border">
              <h4 className="font-medium mb-1">Confidence Intervals</h4>
              <p className="text-muted-foreground">
                {isEn
                  ? "Use CIs to give information about the precision of estimates."
                  : "Gunakan CI untuk memberikan informasi tentang precision estimates."}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            {isEn ? "Proper Interpretation" : "Interpretasi yang Tepat"}
          </h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-background rounded border">
              <h4 className="font-medium mb-1">Statistical vs Practical Significance</h4>
              <p className="text-muted-foreground">
                {isEn
                  ? "A statistically significant result is not necessarily practically meaningful."
                  : "Hasil signifikan secara statistik belum tentu bermakna praktis."}
              </p>
            </div>
            <div className="p-3 bg-background rounded border">
              <h4 className="font-medium mb-1">Context Matters</h4>
              <p className="text-muted-foreground">
                {isEn
                  ? "Interpretation must consider the domain and research context."
                  : "Interpretasi harus mempertimbangkan konteks domain dan penelitian."}
              </p>
            </div>
            <div className="p-3 bg-background rounded border">
              <h4 className="font-medium mb-1">Uncertainty Communication</h4>
              <p className="text-muted-foreground">
                {isEn
                  ? "Communicate the uncertainty and limitations of the results."
                  : "Komunikasikan ketidakpastian dan limitasi dalam hasil."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-muted/50 p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          {isEn ? "Quick Tips for Everyday Analysis" : "Quick Tips untuk Analisis Harian"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium">{isEn ? "Before the Analysis:" : "Sebelum Analisis:"}</h4>
            <ul className="space-y-1 text-muted-foreground">
              {isEn ? (
                <>
                  <li>• Define a specific research question</li>
                  <li>• Choose the alpha level before looking at the data</li>
                  <li>• Check the distribution and outliers</li>
                </>
              ) : (
                <>
                  <li>• Tentukan research question yang spesifik</li>
                  <li>• Pilih alpha level sebelum melihat data</li>
                  <li>• Periksa distribusi dan outliers</li>
                </>
              )}
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">{isEn ? "During the Analysis:" : "Saat Analisis:"}</h4>
            <ul className="space-y-1 text-muted-foreground">
              {isEn ? (
                <>
                  <li>• Validate the statistical assumptions</li>
                  <li>• Use visualizations for exploration</li>
                  <li>• Document every step</li>
                </>
              ) : (
                <>
                  <li>• Validasi asumsi statistik</li>
                  <li>• Gunakan visualisasi untuk eksplorasi</li>
                  <li>• Dokumentasi setiap langkah</li>
                </>
              )}
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">{isEn ? "After the Analysis:" : "Setelah Analisis:"}</h4>
            <ul className="space-y-1 text-muted-foreground">
              {isEn ? (
                <>
                  <li>• Interpret in a practical context</li>
                  <li>• Discuss limitations and biases</li>
                  <li>• Replicate with independent data</li>
                </>
              ) : (
                <>
                  <li>• Interpretasi dalam konteks praktis</li>
                  <li>• Diskusikan limitasi dan bias</li>
                  <li>• Replikasi dengan data independen</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
