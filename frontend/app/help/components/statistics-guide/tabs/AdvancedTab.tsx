import React from 'react';
import { Zap, Brain, TrendingUp, Target } from 'lucide-react';
import {
  IntroSection,
  FeatureGrid,
  ConceptSection,
  ExampleGrid
} from '../shared/StandardizedContentLayout';
import { useHelpLanguageStore } from '@/stores/useHelpLanguageStore';

export const AdvancedTab = () => {
  const { language } = useHelpLanguageStore();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      <IntroSection
        title={isEn ? "Advanced Statistical Analysis" : "Analisis Statistik Lanjutan"}
        description={isEn
          ? "Explore more complex statistical analysis techniques for in-depth research and more accurate decision making."
          : "Eksplorasi teknik-teknik analisis statistik yang lebih kompleks untuk penelitian mendalam dan pengambilan keputusan yang lebih akurat."}
        variant="warning"
      />

      <FeatureGrid
        features={[
          {
            title: isEn ? "Multivariate Analysis" : "Analisis Multivariat",
            icon: Brain,
            items: isEn
              ? [
                  "Principal Component Analysis (PCA)",
                  "Factor Analysis - Exploratory and Confirmatory",
                  "Cluster Analysis - K-means, Hierarchical",
                  "MANOVA - Multivariate Analysis of Variance",
                  "Discriminant Analysis - Group classification"
                ]
              : [
                  "Principal Component Analysis (PCA)",
                  "Factor Analysis - Eksploratori dan Konfirmatori",
                  "Cluster Analysis - K-means, Hierarchical",
                  "MANOVA - Multivariate Analysis of Variance",
                  "Discriminant Analysis - Klasifikasi grup"
                ]
          },
          {
            title: isEn ? "Time Series & Forecasting" : "Deret Waktu & Peramalan",
            icon: TrendingUp,
            items: isEn
              ? [
                  "Trend Analysis - Identifying long-term patterns",
                  "Seasonality Detection - Seasonal patterns",
                  "ARIMA Models - Autoregressive Integrated Moving Average",
                  "Exponential Smoothing - Adaptive forecasting",
                  "Forecasting Accuracy - MAE, RMSE, MAPE"
                ]
              : [
                  "Trend Analysis - Identifikasi pola jangka panjang",
                  "Seasonality Detection - Pola musiman",
                  "ARIMA Models - Autoregressive Integrated Moving Average",
                  "Exponential Smoothing - Peramalan adaptif",
                  "Forecasting Accuracy - MAE, RMSE, MAPE"
                ]
          }
        ]}
      />

      <ConceptSection
        title={isEn ? "Machine Learning with a Statistical Approach" : "Pembelajaran Mesin dengan Pendekatan Statistik"}
        icon={Target}
        concepts={[
          {
            title: "Supervised Learning",
            description: isEn
              ? "Algorithms that learn from labeled data to predict an output. Includes linear/logistic regression, decision trees, and simple neural networks."
              : "Algoritma yang belajar dari data berlabel untuk memprediksi output. Termasuk regresi linear/logistik, decision trees, dan neural networks sederhana."
          },
          {
            title: "Unsupervised Learning",
            description: isEn
              ? "Finding hidden patterns in unlabeled data. Clustering, dimensionality reduction, and association rule mining."
              : "Menemukan pola tersembunyi dalam data tanpa label. Clustering, dimensionality reduction, dan association rule mining."
          },
          {
            title: "Model Validation",
            description: isEn
              ? "Cross-validation, train-test splits, and bootstrap sampling to evaluate model performance and avoid overfitting."
              : "Cross-validation, train-test split, bootstrap sampling untuk mengevaluasi performa model dan menghindari overfitting."
          },
          {
            title: "Feature Selection",
            description: isEn
              ? "Techniques for choosing the most relevant variables: forward/backward selection, LASSO regression, information gain."
              : "Teknik memilih variabel yang paling relevan: forward/backward selection, LASSO regression, information gain."
          }
        ]}
      />

      <ExampleGrid
        title={isEn ? "Advanced Experimental Design" : "Desain Eksperimental Lanjutan"}
        icon={Zap}
        examples={[
          {
            title: "Factorial Design",
            description: isEn
              ? "Experiments with multiple factors to analyze the main effects and interaction effects between variables."
              : "Eksperimen dengan multiple factors untuk menganalisis main effects dan interaction effects antar variabel."
          },
          {
            title: "Randomized Controlled Trials",
            description: isEn
              ? "The gold standard for causal research, randomizing subjects to treatment and control groups."
              : "Gold standard untuk penelitian kausal dengan randomisasi subjek ke treatment dan control groups."
          },
          {
            title: "A/B Testing",
            description: isEn
              ? "Experiments comparing two versions (A vs B) in a business or digital product context."
              : "Eksperimen untuk membandingkan dua versi (A vs B) dalam konteks bisnis atau produk digital."
          },
          {
            title: "Quasi-Experimental Design",
            description: isEn
              ? "Experimental designs used when full randomization isn't possible, using natural experiments."
              : "Desain eksperimen ketika randomisasi penuh tidak memungkinkan, menggunakan natural experiments."
          }
        ]}
        columns={2}
      />

      <div className="bg-muted/50 p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5" />
          {isEn ? "Special Considerations for Advanced Analysis" : "Pertimbangan Khusus untuk Analisis Lanjutan"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-3">
            <div className="p-3 bg-background rounded border">
              <h4 className="font-medium mb-2">{isEn ? "Sample Size" : "Ukuran Sampel"}</h4>
              <p className="text-muted-foreground">
                {isEn
                  ? "Multivariate analysis needs larger samples. Rule of thumb: at least 10-20 observations per variable."
                  : "Analisis multivariat memerlukan sampel yang lebih besar. Rule of thumb: minimal 10-20 observasi per variabel."}
              </p>
            </div>
            <div className="p-3 bg-background rounded border">
              <h4 className="font-medium mb-2">{isEn ? "Complex Assumptions" : "Asumsi Kompleks"}</h4>
              <p className="text-muted-foreground">
                {isEn
                  ? "Multivariate normality, homoscedasticity, and the absence of multicollinearity become more critical."
                  : "Multivariate normality, homoscedasticity, dan absence of multicollinearity menjadi lebih kritis."}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-background rounded border">
              <h4 className="font-medium mb-2">{isEn ? "Interpretation" : "Interpretasi"}</h4>
              <p className="text-muted-foreground">
                {isEn
                  ? "The results are more complex and require a deep understanding of the domain context and methodology."
                  : "Hasil lebih kompleks dan memerlukan pemahaman mendalam tentang konteks domain dan metodologi."}
              </p>
            </div>
            <div className="p-3 bg-background rounded border">
              <h4 className="font-medium mb-2">{isEn ? "Validation" : "Validasi"}</h4>
              <p className="text-muted-foreground">
                {isEn
                  ? "Cross-validation and replication studies become very important to ensure robust results."
                  : "Cross-validation dan replication studies menjadi sangat penting untuk memastikan robustness hasil."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
