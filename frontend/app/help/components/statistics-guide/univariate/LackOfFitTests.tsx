import React from "react";
import { HelpContentWrapper } from "../../HelpContentWrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    HelpCircle,
    Calculator,
    BarChart3,
    TrendingUp,
    CheckCircle,
} from "lucide-react";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

export const LackOfFitTests: React.FC = () => {
    const { language } = useHelpLanguageStore();
    const isEn = language === "en";
    const where = isEn ? "Where:" : "Di mana:";

    return (
        <HelpContentWrapper
            title="GLM Univariate: Lack of Fit Tests"
            description={
                isEn
                    ? "Complete explanation of lack of fit tests for evaluating model adequacy in GLM Univariate analysis."
                    : "Penjelasan lengkap uji lack of fit untuk mengevaluasi kecukupan model dalam analisis GLM Univariate."
            }
        >
            <Alert className="mb-6 bg-blue-50 border-blue-100 text-blue-800">
                <div className="flex">
                    <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <AlertTitle className="text-blue-800 font-medium mb-1">
                            Lack of Fit Tests
                        </AlertTitle>
                        <AlertDescription className="text-blue-700">
                            {isEn
                                ? "Lack of fit tests determine whether the chosen model adequately explains the relationship between predictors and response. These tests compare total error with pure error."
                                : "Uji lack of fit menentukan apakah model yang dipilih cukup menjelaskan hubungan antara prediktor dan respons. Uji ini membandingkan total error dengan pure error."}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>

            <div className="prose max-w-none">
                <h2 className="flex items-center gap-2">
                    <CheckCircle className="h-6 w-6" />
                    {isEn ? "Basic Concepts of Lack of Fit" : "Konsep Dasar Lack of Fit"}
                </h2>

                <p>
                    {isEn
                        ? "Lack of fit test is a test to determine whether the chosen model adequately explains the relationship between predictor variables (X) and response variable (Y). This test compares variation around the model mean with pure variation in the data."
                        : "Uji lack of fit adalah uji untuk menentukan apakah model yang dipilih cukup menjelaskan hubungan antara variabel prediktor (X) dan variabel respons (Y). Uji ini membandingkan variasi di sekitar rata-rata model dengan variasi murni dalam data."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2">
                            {isEn ? "Adequate Model (H₀)" : "Model Memadai (H₀)"}
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Model fits the data well</li>
                                    <li>No lack of fit</li>
                                    <li>Error is only random error</li>
                                    <li>F-value not significant</li>
                                </>
                            ) : (
                                <>
                                    <li>Model sesuai dengan data</li>
                                    <li>Tidak ada lack of fit</li>
                                    <li>Error hanya berupa error acak</li>
                                    <li>Nilai F tidak signifikan</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-bold text-red-800 mb-2">
                            {isEn ? "Inadequate Model (H₁)" : "Model Tidak Memadai (H₁)"}
                        </h4>
                        <ul className="text-sm text-red-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Model does not fit the data well</li>
                                    <li>Lack of fit present</li>
                                    <li>Error includes systematic error</li>
                                    <li>F-value significant</li>
                                </>
                            ) : (
                                <>
                                    <li>Model tidak sesuai dengan data</li>
                                    <li>Terdapat lack of fit</li>
                                    <li>Error mencakup error sistematis</li>
                                    <li>Nilai F signifikan</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <Calculator className="h-6 w-6" />
                    {isEn ? "Lack of Fit Test Components" : "Komponen Uji Lack of Fit"}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-2">
                            Total Error
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>{isEn ? "Variation not explained by model" : "Variasi yang tidak dijelaskan model"}</li>
                            <li>SSE = Σ(yᵢ - ŷᵢ)²</li>
                            <li>df = n - p</li>
                            <li>{isEn ? "Contains random + systematic error" : "Berisi error acak + sistematis"}</li>
                        </ul>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-2">
                            Pure Error
                        </h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            <li>{isEn ? "Pure variation in data" : "Variasi murni dalam data"}</li>
                            <li>SS_PE = ΣΣ(yᵢⱼ - ȳᵢ)²</li>
                            <li>df = n - c</li>
                            <li>{isEn ? "Only random error" : "Hanya error acak"}</li>
                        </ul>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h4 className="font-bold text-purple-800 mb-2">
                            Lack of Fit
                        </h4>
                        <ul className="text-sm text-purple-700 space-y-1">
                            <li>{isEn ? "Systematic variation" : "Variasi sistematis"}</li>
                            <li>SS_LOF = SS_Error - SS_PE</li>
                            <li>df = c - p</li>
                            <li>{isEn ? "Measures model inadequacy" : "Mengukur ketidakcukupan model"}</li>
                        </ul>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-bold text-red-800 mb-2">
                            {isEn ? "Replication" : "Replikasi"}
                        </h4>
                        <ul className="text-sm text-red-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Observations with same X</li>
                                    <li>Required for pure error</li>
                                    <li>At least 2 observations per combination</li>
                                    <li>Without replication, test invalid</li>
                                </>
                            ) : (
                                <>
                                    <li>Observasi dengan nilai X yang sama</li>
                                    <li>Diperlukan untuk pure error</li>
                                    <li>Minimal 2 observasi per kombinasi</li>
                                    <li>Tanpa replikasi, uji tidak valid</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <BarChart3 className="h-6 w-6" />
                    {isEn ? "Lack of Fit Test Algorithm" : "Algoritma Uji Lack of Fit"}
                </h2>

                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn ? "Steps in calculate_lack_of_fit_tests:" : "Langkah-langkah dalam calculate_lack_of_fit_tests:"}
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-2">
                        {isEn ? (
                            <>
                                <li><strong>1. Fit Main Model:</strong> Create design matrix and perform sweep</li>
                                <li><strong>2. Calculate Total Error:</strong> SSE = Σ(yᵢ - ŷᵢ)²</li>
                                <li><strong>3. Group Data:</strong> Based on unique X combinations</li>
                                <li><strong>4. Calculate Pure Error:</strong> SS_PE = ΣΣ(yᵢⱼ - ȳᵢ)²</li>
                                <li><strong>5. Calculate Lack of Fit:</strong> SS_LOF = SSE - SS_PE</li>
                                <li><strong>6. Calculate F Statistic:</strong> F = MS_LOF / MS_PE</li>
                                <li><strong>7. Test Significance:</strong> Compare with F(df_LOF, df_PE)</li>
                            </>
                        ) : (
                            <>
                                <li><strong>1. Estimasi Model Utama:</strong> Membuat matriks desain dan melakukan sweep</li>
                                <li><strong>2. Hitung Total Error:</strong> SSE = Σ(yᵢ - ŷᵢ)²</li>
                                <li><strong>3. Kelompokkan Data:</strong> Berdasarkan kombinasi X yang unik</li>
                                <li><strong>4. Hitung Pure Error:</strong> SS_PE = ΣΣ(yᵢⱼ - ȳᵢ)²</li>
                                <li><strong>5. Hitung Lack of Fit:</strong> SS_LOF = SSE - SS_PE</li>
                                <li><strong>6. Hitung Statistik F:</strong> F = MS_LOF / MS_PE</li>
                                <li><strong>7. Uji Signifikansi:</strong> Bandingkan dengan F(df_LOF, df_PE)</li>
                            </>
                        )}
                    </ol>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <TrendingUp className="h-6 w-6" />
                    {isEn ? "Mathematical Calculations" : "Perhitungan Matematis"}
                </h2>

                <h3>Total Error (SSE)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>SSE = Σ(yᵢ - ŷᵢ)²</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>yᵢ</strong> = {isEn ? "observed value i" : "nilai observasi ke-i"}
                        </li>
                        <li>
                            <strong>ŷᵢ</strong> = {isEn ? "predicted value i" : "nilai prediksi ke-i"}
                        </li>
                        <li>
                            <strong>df_error</strong> = {isEn
                                ? "n - p (n = number of observations, p = number of parameters)"
                                : "n - p (n = jumlah observasi, p = jumlah parameter)"}
                        </li>
                    </ul>
                </div>

                <h3>Pure Error (SS_PE)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>SS_PE = ΣΣ(yᵢⱼ - ȳᵢ)²</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>yᵢⱼ</strong> = {isEn ? "observation j in group i" : "observasi ke-j dalam kelompok i"}
                        </li>
                        <li>
                            <strong>ȳᵢ</strong> = {isEn ? "mean of group i" : "rata-rata kelompok i"}
                        </li>
                        <li>
                            <strong>df_pure_error</strong> = {isEn
                                ? "n - c (c = number of unique X combinations)"
                                : "n - c (c = jumlah kombinasi X yang unik)"}
                        </li>
                    </ul>
                </div>

                <h3>Lack of Fit (SS_LOF)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>SS_LOF = SSE - SS_PE</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>df_lack_of_fit</strong> = c - p
                        </li>
                        <li>
                            <strong>MS_LOF</strong> = SS_LOF / df_lack_of_fit
                        </li>
                        <li>
                            <strong>MS_PE</strong> = SS_PE / df_pure_error
                        </li>
                    </ul>
                </div>

                <h3>{isEn ? "F Statistic" : "Statistik F"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>F = MS_LOF / MS_PE</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>df₁</strong> = df_lack_of_fit = c - p
                        </li>
                        <li>
                            <strong>df₂</strong> = df_pure_error = n - c
                        </li>
                        <li>
                            <strong>F ~ F(df₁, df₂)</strong> {isEn ? "under H₀" : "di bawah H₀"}
                        </li>
                    </ul>
                </div>

                <h2 className="mt-8">{isEn ? "Data Grouping" : "Pengelompokan Data"}</h2>

                <p>
                    {isEn
                        ? "Grouping data based on unique combinations of predictor values is a critical step in lack of fit test. Each unique X combination forms one group."
                        : "Pengelompokan data berdasarkan kombinasi nilai prediktor yang unik adalah langkah penting dalam uji lack of fit. Setiap kombinasi X yang unik membentuk satu kelompok."}
                </p>

                <h3>{isEn ? "Grouping Algorithm" : "Algoritma Pengelompokan"}</h3>
                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn ? "Grouping steps:" : "Langkah pengelompokan:"}
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-2">
                        {isEn ? (
                            <>
                                <li><strong>Hash X Rows:</strong> Each X row is hashed for unique identification</li>
                                <li><strong>Group Y:</strong> Y values with same X hash are grouped</li>
                                <li><strong>Calculate Means:</strong> ȳᵢ for each group</li>
                                <li><strong>Calculate Pure Error:</strong> Deviations from group means</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Hash Baris X:</strong> Setiap baris X di-hash untuk identifikasi unik</li>
                                <li><strong>Kelompokkan Y:</strong> Nilai Y dengan hash X yang sama dikelompokkan</li>
                                <li><strong>Hitung Rata-rata:</strong> ȳᵢ untuk setiap kelompok</li>
                                <li><strong>Hitung Pure Error:</strong> Deviasi dari rata-rata kelompok</li>
                            </>
                        )}
                    </ol>
                </div>

                <h3>{isEn ? "Grouping Example" : "Contoh Pengelompokan"}</h3>
                <div className="bg-yellow-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-yellow-800 mb-2">
                        {isEn ? "Example data with replication:" : "Contoh data dengan replikasi:"}
                    </h4>
                    <div className="text-sm text-yellow-700 space-y-2">
                        <div>
                            <strong>{isEn ? "Group 1" : "Kelompok 1"} (X = [1, 2]):</strong> Y = [10, 12,
                            11] → ȳ₁ = 11
                        </div>
                        <div>
                            <strong>{isEn ? "Group 2" : "Kelompok 2"} (X = [1, 3]):</strong> Y = [15, 16]
                            → ȳ₂ = 15.5
                        </div>
                        <div>
                            <strong>{isEn ? "Group 3" : "Kelompok 3"} (X = [2, 2]):</strong> Y = [20, 21,
                            19] → ȳ₃ = 20
                        </div>
                        <div>
                            <strong>SS_PE:</strong> ΣΣ(yᵢⱼ - ȳᵢ)²
                        </div>
                    </div>
                </div>

                <h2 className="mt-8">{isEn ? "Effect Size and Power" : "Ukuran Efek dan Power"}</h2>

                <h3>Partial Eta Squared</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>η²ₚ = SS_LOF / (SS_LOF + SS_PE)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Effect size for lack of fit, showing proportion of variance in total error caused by model inadequacy"
                            : "Ukuran efek untuk lack of fit, yang menunjukkan proporsi varians dalam total error yang disebabkan oleh ketidakcukupan model"}
                    </p>
                </div>

                <h3>Noncentrality Parameter</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>λ = df_lack_of_fit × F</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Noncentrality parameter for power calculation"
                            : "Parameter nonsentralitas untuk perhitungan power"}
                    </p>
                </div>

                <h3>Observed Power</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>
                            Power = P(F(df₁, df₂, λ) {">"} F_critical)
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "Observed power to detect lack of fit" : "Observed power untuk mendeteksi lack of fit"}
                    </p>
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
                                    <li>Model is adequate</li>
                                    <li>No lack of fit</li>
                                    <li>Model can be used</li>
                                </>
                            ) : (
                                <>
                                    <li>Gagal menolak H₀</li>
                                    <li>Model memadai</li>
                                    <li>Tidak ada lack of fit</li>
                                    <li>Model dapat digunakan</li>
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
                                    <li>Model is inadequate</li>
                                    <li>Lack of fit present</li>
                                    <li>Consider alternative models</li>
                                </>
                            ) : (
                                <>
                                    <li>Tolak H₀</li>
                                    <li>Model tidak memadai</li>
                                    <li>Terdapat lack of fit</li>
                                    <li>Pertimbangkan model alternatif</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="mt-8">{isEn ? "Validity Conditions" : "Syarat Validitas"}</h2>

                <div className="bg-yellow-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-yellow-800 mb-2">
                        {isEn ? "Lack of Fit test requires:" : "Uji Lack of Fit memerlukan:"}
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-2">
                        <li>
                            <strong>{isEn ? "1. Replication:" : "1. Replikasi:"}</strong> {isEn
                                ? "At least 2 observations with same X"
                                : "Minimal 2 observasi dengan nilai X yang sama"}
                        </li>
                        <li>
                            <strong>2. df_lack_of_fit {">"} 0:</strong> c {">"}{" "}
                            p ({isEn ? "combinations" : "kombinasi"} {">"} {isEn ? "parameters" : "parameter"})
                        </li>
                        <li>
                            <strong>3. df_pure_error {">"} 0:</strong> n {">"} c
                            ({isEn ? "observations" : "observasi"} {">"} {isEn ? "combinations" : "kombinasi"})
                        </li>
                        <li>
                            <strong>4. MS_PE {">"} 0:</strong> {isEn
                                ? "Variation exists in replication"
                                : "Terdapat variasi dalam replikasi"}
                        </li>
                    </ul>
                </div>

                <h3>{isEn ? "Special Cases" : "Kasus Khusus"}</h3>
                <div className="bg-red-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-red-800 mb-2">
                        {isEn ? "When test is invalid:" : "Ketika uji tidak valid:"}
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                        {isEn ? (
                            <>
                                <li>No replication (c = n)</li>
                                <li>Saturated model (p ≥ c)</li>
                                <li>MS_PE = 0 (no variation in replication)</li>
                                <li>df_lack_of_fit ≤ 0</li>
                            </>
                        ) : (
                            <>
                                <li>Tidak ada replikasi (c = n)</li>
                                <li>Model jenuh (p ≥ c)</li>
                                <li>MS_PE = 0 (tidak ada variasi dalam replikasi)</li>
                                <li>df_lack_of_fit ≤ 0</li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </HelpContentWrapper>
    );
};
