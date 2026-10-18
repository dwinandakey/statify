import React from "react";
import { HelpContentWrapper } from "../../HelpContentWrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    HelpCircle,
    Calculator,
    BarChart3,
    TrendingUp,
    TestTube,
} from "lucide-react";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

export const HeteroscedasticityTests: React.FC = () => {
    const { language } = useHelpLanguageStore();
    const isEn = language === "en";
    const where = isEn ? "Where:" : "Di mana:";

    return (
        <HelpContentWrapper
            title="GLM Univariate: Heteroscedasticity Tests"
            description={
                isEn
                    ? "Complete explanation of heteroscedasticity tests in GLM Univariate analysis."
                    : "Penjelasan lengkap uji heteroskedastisitas dalam analisis GLM Univariate."
            }
        >
            <Alert className="mb-6 bg-blue-50 border-blue-100 text-blue-800">
                <div className="flex">
                    <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <AlertTitle className="text-blue-800 font-medium mb-1">
                            Heteroscedasticity Tests
                        </AlertTitle>
                        <AlertDescription className="text-blue-700">
                            {isEn
                                ? "Heteroscedasticity tests check whether error variance is constant across all predictor levels. Violation of this assumption can affect the validity of statistical inference."
                                : "Uji heteroskedastisitas memeriksa apakah varians error konstan di semua level prediktor. Pelanggaran asumsi ini dapat memengaruhi validitas inferensi statistik."}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>

            <div className="prose max-w-none">
                <h2 className="flex items-center gap-2">
                    <TestTube className="h-6 w-6" />
                    {isEn ? "Basic Concepts of Heteroscedasticity" : "Konsep Dasar Heteroskedastisitas"}
                </h2>

                <p>
                    {isEn
                        ? "Heteroscedasticity is a condition where error variance is not constant across all predictor levels. This violates the homoscedasticity assumption required for valid statistical inference in linear models."
                        : "Heteroskedastisitas adalah kondisi ketika varians error tidak konstan di semua level prediktor. Hal ini melanggar asumsi homoskedastisitas yang diperlukan untuk inferensi statistik yang valid pada model linear."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2">
                            {isEn ? "Homoscedasticity (H₀)" : "Homoskedastisitas (H₀)"}
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Constant error variance</li>
                                    <li>Var(εᵢ) = σ² for all i</li>
                                    <li>Assumption satisfied</li>
                                    <li>Valid statistical inference</li>
                                </>
                            ) : (
                                <>
                                    <li>Varians error konstan</li>
                                    <li>Var(εᵢ) = σ² untuk semua i</li>
                                    <li>Asumsi terpenuhi</li>
                                    <li>Inferensi statistik valid</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-bold text-red-800 mb-2">
                            {isEn ? "Heteroscedasticity (H₁)" : "Heteroskedastisitas (H₁)"}
                        </h4>
                        <ul className="text-sm text-red-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Non-constant error variance</li>
                                    <li>Var(εᵢ) ≠ σ² for some i</li>
                                    <li>Assumption violated</li>
                                    <li>Biased statistical inference</li>
                                </>
                            ) : (
                                <>
                                    <li>Varians error tidak konstan</li>
                                    <li>Var(εᵢ) ≠ σ² untuk sebagian i</li>
                                    <li>Asumsi dilanggar</li>
                                    <li>Inferensi statistik bias</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <Calculator className="h-6 w-6" />
                    {isEn ? "Heteroscedasticity Test Methods" : "Metode Uji Heteroskedastisitas"}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-2">
                            White Test
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>General heteroscedasticity detection</li>
                                    <li>No form assumption required</li>
                                    <li>Uses squares and interactions</li>
                                    <li>Statistic: LM = n × R²</li>
                                </>
                            ) : (
                                <>
                                    <li>Deteksi heteroskedastisitas secara umum</li>
                                    <li>Tidak memerlukan asumsi bentuk</li>
                                    <li>Menggunakan kuadrat dan interaksi</li>
                                    <li>Statistik: LM = n × R²</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-2">
                            Breusch-Pagan Test
                        </h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Linear heteroscedasticity detection</li>
                                    <li>Based on predicted values</li>
                                    <li>Assumes normality</li>
                                    <li>Statistic: BP = ESS / (2 × σ̂⁴)</li>
                                </>
                            ) : (
                                <>
                                    <li>Deteksi heteroskedastisitas linear</li>
                                    <li>Berbasis nilai prediksi</li>
                                    <li>Mengasumsikan normalitas</li>
                                    <li>Statistik: BP = ESS / (2 × σ̂⁴)</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h4 className="font-bold text-purple-800 mb-2">
                            Modified Breusch-Pagan
                        </h4>
                        <ul className="text-sm text-purple-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Robust version of BP test</li>
                                    <li>Robust to non-normality</li>
                                    <li>Koenker-Bassett version</li>
                                    <li>Statistic: LM = n × R²</li>
                                </>
                            ) : (
                                <>
                                    <li>Versi robust dari uji BP</li>
                                    <li>Tahan terhadap ketidaknormalan</li>
                                    <li>Versi Koenker-Bassett</li>
                                    <li>Statistik: LM = n × R²</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-bold text-red-800 mb-2">F-Test</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Alternative to Chi-square test</li>
                                    <li>Better performance on small samples</li>
                                    <li>Based on predicted values</li>
                                    <li>Statistic: F = (R²/df₁) / ((1-R²)/df₂)</li>
                                </>
                            ) : (
                                <>
                                    <li>Alternatif dari uji Chi-square</li>
                                    <li>Performa lebih baik pada sampel kecil</li>
                                    <li>Berbasis nilai prediksi</li>
                                    <li>Statistik: F = (R²/df₁) / ((1-R²)/df₂)</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <BarChart3 className="h-6 w-6" />
                    {isEn ? "General Algorithm" : "Algoritma Umum"}
                </h2>

                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn
                            ? "Steps in calculate_heteroscedasticity_tests:"
                            : "Langkah-langkah dalam calculate_heteroscedasticity_tests:"}
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-2">
                        {isEn ? (
                            <>
                                <li><strong>Fit Main Model:</strong> Create design matrix and perform sweep</li>
                                <li><strong>Calculate Residuals:</strong> ε = y - ŷ</li>
                                <li><strong>Square Residuals:</strong> ε² as dependent variable</li>
                                <li><strong>Create Auxiliary Model:</strong> Regress ε² on predictors</li>
                                <li><strong>Calculate Statistics:</strong> Based on selected method</li>
                                <li><strong>Test Significance:</strong> Compare with theoretical distribution</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Estimasi Model Utama:</strong> Membuat matriks desain dan melakukan sweep</li>
                                <li><strong>Hitung Residual:</strong> ε = y - ŷ</li>
                                <li><strong>Kuadratkan Residual:</strong> ε² sebagai variabel dependen</li>
                                <li><strong>Buat Model Bantu:</strong> Meregresikan ε² terhadap prediktor</li>
                                <li><strong>Hitung Statistik:</strong> Berdasarkan metode yang dipilih</li>
                                <li><strong>Uji Signifikansi:</strong> Membandingkan dengan distribusi teoretis</li>
                            </>
                        )}
                    </ol>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <TrendingUp className="h-6 w-6" />
                    White Test
                </h2>

                <p>
                    {isEn
                        ? "White test is the most commonly used heteroscedasticity test because it requires no assumptions about the specific form of heteroscedasticity."
                        : "Uji White adalah uji heteroskedastisitas yang paling umum digunakan karena tidak memerlukan asumsi tentang bentuk spesifik heteroskedastisitas."}
                </p>

                <h3>{isEn ? "Auxiliary Model Construction" : "Konstruksi Model Bantu"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold mb-2">{isEn ? "White Auxiliary Matrix:" : "Matriks Bantu White:"}</h4>
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>1. Intercept:</strong> {isEn ? "Column with value 1" : "Kolom bernilai 1"}
                        </div>
                        <div>
                            <strong>{isEn ? "2. Original Predictors:" : "2. Prediktor Asli:"}</strong> X₁, X₂,
                            ..., Xₚ
                        </div>
                        <div>
                            <strong>{isEn ? "3. Squared Predictors:" : "3. Prediktor Kuadrat:"}</strong> X₁², X₂²,
                            ..., Xₚ²
                        </div>
                        <div>
                            <strong>{isEn ? "4. Interactions:" : "4. Interaksi:"}</strong> X₁×X₂, X₁×X₃, ...,
                            Xₚ₋₁×Xₚ
                        </div>
                    </div>
                </div>

                <h3>{isEn ? "White Test Statistic" : "Statistik Uji White"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>LM = n × R²</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>n</strong> = {isEn ? "number of observations" : "jumlah observasi"}
                        </li>
                        <li>
                            <strong>R²</strong> = {isEn
                                ? "coefficient of determination from auxiliary regression"
                                : "koefisien determinasi dari regresi bantu"}
                        </li>
                        <li>
                            <strong>df</strong> = {isEn
                                ? "number of predictors in auxiliary model - 1"
                                : "jumlah prediktor dalam model bantu - 1"}
                        </li>
                    </ul>
                </div>

                <h3>{isEn ? "Distribution and Interpretation" : "Distribusi dan Interpretasi"}</h3>
                <div className="bg-yellow-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-yellow-800 mb-2">
                        {isEn ? "White Test follows Chi-square distribution:" : "Uji White mengikuti distribusi Chi-square:"}
                    </h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                        {isEn ? (
                            <>
                                <li>LM ~ χ²(df) under H₀</li>
                                <li>p-value = P(χ²(df) {">"} LM)</li>
                                <li>p {"<"} 0.05: Reject H₀, heteroscedasticity present</li>
                                <li>p ≥ 0.05: Fail to reject H₀, homoscedasticity</li>
                            </>
                        ) : (
                            <>
                                <li>LM ~ χ²(df) di bawah H₀</li>
                                <li>p-value = P(χ²(df) {">"} LM)</li>
                                <li>p {"<"} 0.05: Tolak H₀, terdapat heteroskedastisitas</li>
                                <li>p ≥ 0.05: Gagal menolak H₀, homoskedastisitas</li>
                            </>
                        )}
                    </div>
                </div>

                <h2 className="mt-8">Breusch-Pagan Test</h2>

                <p>
                    {isEn
                        ? "Breusch-Pagan test assumes that error variance is a linear function of explanatory variables."
                        : "Uji Breusch-Pagan mengasumsikan bahwa varians error merupakan fungsi linear dari variabel penjelas."}
                </p>

                <h3>{isEn ? "BP Auxiliary Model" : "Model Bantu BP"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold mb-2">{isEn ? "Auxiliary Regression:" : "Regresi Bantu:"}</h4>
                    <div className="text-center text-lg font-mono">
                        <strong>ε² = α₀ + α₁ŷ + u</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Where ε² is squared residuals and ŷ is predicted values"
                            : "Di mana ε² adalah residual kuadrat dan ŷ adalah nilai prediksi"}
                    </p>
                </div>

                <h3>{isEn ? "Breusch-Pagan Statistic" : "Statistik Breusch-Pagan"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>BP = ESS / (2 × σ̂⁴)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>ESS</strong> = {isEn
                                ? "Explained Sum of Squares from auxiliary regression"
                                : "Explained Sum of Squares dari regresi bantu"}
                        </li>
                        <li>
                            <strong>σ̂²</strong> = {isEn
                                ? "RSS/n (error variance estimate from main model)"
                                : "RSS/n (estimasi varians error dari model utama)"}
                        </li>
                        <li>
                            <strong>df</strong> = {isEn ? "1 (since only ŷ as predictor)" : "1 (karena hanya ŷ sebagai prediktor)"}
                        </li>
                    </ul>
                </div>

                <h2 className="mt-8">Modified Breusch-Pagan Test</h2>

                <p>
                    {isEn
                        ? "Modified Breusch-Pagan test (Koenker-Bassett) is a more robust version against normality assumption violations."
                        : "Uji Modified Breusch-Pagan (Koenker-Bassett) adalah versi yang lebih robust terhadap pelanggaran asumsi normalitas."}
                </p>

                <h3>{isEn ? "Modified BP Statistic" : "Statistik Modified BP"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>LM = n × R²</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Same as White test, but auxiliary model only uses ŷ"
                            : "Sama dengan uji White, tetapi model bantu hanya menggunakan ŷ"}
                    </p>
                </div>

                <h3>{isEn ? "Advantages of Modified BP" : "Keunggulan Modified BP"}</h3>
                <div className="bg-green-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-green-800 mb-2">
                        {isEn ? "Advantages over classical BP:" : "Keunggulan dibanding BP klasik:"}
                    </h4>
                    <ul className="text-sm text-green-700 space-y-1">
                        {isEn ? (
                            <>
                                <li>More robust to non-normality</li>
                                <li>No distributional assumptions required</li>
                                <li>Better performance on small samples</li>
                                <li>More asymptotically consistent</li>
                            </>
                        ) : (
                            <>
                                <li>Lebih robust terhadap ketidaknormalan</li>
                                <li>Tidak memerlukan asumsi distribusi</li>
                                <li>Performa lebih baik pada sampel kecil</li>
                                <li>Lebih konsisten secara asimtotik</li>
                            </>
                        )}
                    </ul>
                </div>

                <h2 className="mt-8">{isEn ? "F-Test for Heteroscedasticity" : "Uji F untuk Heteroskedastisitas"}</h2>

                <p>
                    {isEn
                        ? "F-test is an alternative to Chi-square test that often performs better on small samples."
                        : "Uji F adalah alternatif dari uji Chi-square yang sering kali berperforma lebih baik pada sampel kecil."}
                </p>

                <h3>{isEn ? "F-Statistic" : "Statistik F"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>F = (R²/df₁) / ((1-R²)/df₂)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>df₁</strong> = {isEn
                                ? "number of predictors in auxiliary model - 1"
                                : "jumlah prediktor dalam model bantu - 1"}
                        </li>
                        <li>
                            <strong>df₂</strong> = {isEn
                                ? "n - number of predictors in auxiliary model"
                                : "n - jumlah prediktor dalam model bantu"}
                        </li>
                        <li>
                            <strong>R²</strong> = {isEn
                                ? "coefficient of determination from auxiliary regression"
                                : "koefisien determinasi dari regresi bantu"}
                        </li>
                    </ul>
                </div>

                <h3>{isEn ? "F Distribution" : "Distribusi F"}</h3>
                <div className="bg-yellow-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-yellow-800 mb-2">
                        {isEn ? "F-test follows F distribution:" : "Uji F mengikuti distribusi F:"}
                    </h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                        {isEn ? (
                            <>
                                <li>F ~ F(df₁, df₂) under H₀</li>
                                <li>p-value = P(F(df₁, df₂) {">"} F_observed)</li>
                                <li>p {"<"} 0.05: Reject H₀, heteroscedasticity present</li>
                                <li>p ≥ 0.05: Fail to reject H₀, homoscedasticity</li>
                            </>
                        ) : (
                            <>
                                <li>F ~ F(df₁, df₂) di bawah H₀</li>
                                <li>p-value = P(F(df₁, df₂) {">"} F_observed)</li>
                                <li>p {"<"} 0.05: Tolak H₀, terdapat heteroskedastisitas</li>
                                <li>p ≥ 0.05: Gagal menolak H₀, homoskedastisitas</li>
                            </>
                        )}
                    </div>
                </div>

                <h2 className="mt-8">{isEn ? "Interpreting Results" : "Interpretasi Hasil"}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2">
                            p-value ≥ 0.05
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Fail to reject H₀</li>
                                    <li>Homoscedasticity</li>
                                    <li>Assumption satisfied</li>
                                    <li>Valid statistical inference</li>
                                </>
                            ) : (
                                <>
                                    <li>Gagal menolak H₀</li>
                                    <li>Homoskedastisitas</li>
                                    <li>Asumsi terpenuhi</li>
                                    <li>Inferensi statistik valid</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-bold text-red-800 mb-2">
                            p-value {"<"} 0.05
                        </h4>
                        <ul className="text-sm text-red-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Reject H₀</li>
                                    <li>Heteroscedasticity</li>
                                    <li>Assumption violated</li>
                                    <li>Consider solutions</li>
                                </>
                            ) : (
                                <>
                                    <li>Tolak H₀</li>
                                    <li>Heteroskedastisitas</li>
                                    <li>Asumsi dilanggar</li>
                                    <li>Pertimbangkan solusi</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </HelpContentWrapper>
    );
};
