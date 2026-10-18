import React from "react";
import { HelpContentWrapper } from "../../HelpContentWrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    HelpCircle,
    Calculator,
    BarChart3,
    Layers,
} from "lucide-react";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

export const EMMeans: React.FC = () => {
    const { language } = useHelpLanguageStore();
    const isEn = language === "en";
    const where = isEn ? "Where:" : "Di mana:";

    return (
        <HelpContentWrapper
            title="GLM Univariate: Estimated Marginal Means (EM Means)"
            description={
                isEn
                    ? "Complete explanation of Estimated Marginal Means calculation in GLM Univariate analysis."
                    : "Penjelasan lengkap perhitungan Estimated Marginal Means dalam analisis GLM Univariate."
            }
        >
            <Alert className="mb-6 bg-blue-50 border-blue-100 text-blue-800">
                <div className="flex">
                    <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <AlertTitle className="text-blue-800 font-medium mb-1">
                            Estimated Marginal Means (EM Means)
                        </AlertTitle>
                        <AlertDescription className="text-blue-700">
                            {isEn
                                ? "EM Means are adjusted means for each factor level, controlling for the effects of other variables in the model. They provide fair comparisons between groups by removing bias from unbalanced designs."
                                : "EM Means adalah rata-rata terkoreksi untuk setiap level faktor, dengan mengendalikan efek variabel lain dalam model. EM Means memberikan perbandingan yang adil antar kelompok dengan menghilangkan bias dari desain yang tidak seimbang."}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>

            <div className="prose max-w-none">
                <h2 className="flex items-center gap-2">
                    <Calculator className="h-6 w-6" />
                    {isEn ? "Basic Concepts of EM Means" : "Konsep Dasar EM Means"}
                </h2>

                <p>
                    {isEn
                        ? "Estimated Marginal Means (EM Means) are predicted means for each combination of factor levels after controlling for the effects of other variables in the model. EM Means are calculated as linear combinations of model parameters using L-vectors."
                        : "Estimated Marginal Means (EM Means) adalah rata-rata prediksi untuk setiap kombinasi level faktor setelah mengendalikan efek variabel lain dalam model. EM Means dihitung sebagai kombinasi linear dari parameter model menggunakan vektor L."}
                </p>

                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold mb-2">
                        {isEn ? "General EM Means Formula:" : "Rumus Umum EM Means:"}
                    </h4>
                    <div className="text-center text-lg font-mono">
                        <strong>EM Mean = L' × β̂</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>L'</strong> = {isEn
                                ? "transpose of L-vector (linear combination coefficients)"
                                : "transpose dari vektor L (koefisien kombinasi linear)"}
                        </li>
                        <li>
                            <strong>β̂</strong> = {isEn
                                ? "vector of estimated parameters from the model"
                                : "vektor parameter hasil estimasi model"}
                        </li>
                        <li>
                            <strong>EM Mean</strong> = {isEn
                                ? "Estimated Marginal Mean for specific level combination"
                                : "Estimated Marginal Mean untuk kombinasi level tertentu"}
                        </li>
                    </ul>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <Layers className="h-6 w-6" />
                    {isEn ? "EM Means Calculation Process" : "Proses Perhitungan EM Means"}
                </h2>

                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn ? "Steps in calculate_EM Means:" : "Langkah-langkah dalam calculate_EM Means:"}
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-2">
                        {isEn ? (
                            <>
                                <li><strong>Design Preparation:</strong> Create design matrix, response vector, and weights</li>
                                <li><strong>Extract Model Information:</strong> Get parameter names and prepare covariate data</li>
                                <li><strong>Matrix Calculation:</strong> Create cross-product matrix (Z'Z)</li>
                                <li><strong>Model Solution:</strong> Perform SWEEP to obtain β̂, G⁻¹, and SSE</li>
                                <li><strong>Basic Statistics Calculation:</strong>{" "}Calculate MSE and df_error</li>
                                <li><strong>Extract Factors:</strong> Identify all factors and their levels</li>
                                <li><strong>Iteration & EM Means Calculation:</strong>{" "}For each requested effect</li>
                                <li><strong>Aggregate Results:</strong> Collect all results into EM MeansResult structure</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Persiapan Desain:</strong> Membuat matriks desain, vektor respons, dan bobot</li>
                                <li><strong>Ekstraksi Informasi Model:</strong> Mengambil nama parameter dan menyiapkan data kovariat</li>
                                <li><strong>Perhitungan Matriks:</strong> Membuat matriks cross-product (Z'Z)</li>
                                <li><strong>Solusi Model:</strong> Melakukan SWEEP untuk memperoleh β̂, G⁻¹, dan SSE</li>
                                <li><strong>Perhitungan Statistik Dasar:</strong>{" "}Menghitung MSE dan df_error</li>
                                <li><strong>Ekstraksi Faktor:</strong> Mengidentifikasi semua faktor dan levelnya</li>
                                <li><strong>Iterasi & Perhitungan EM Means:</strong>{" "}Untuk setiap efek yang diminta</li>
                                <li><strong>Agregasi Hasil:</strong> Mengumpulkan semua hasil ke struktur EM MeansResult</li>
                            </>
                        )}
                    </ol>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <BarChart3 className="h-6 w-6" />
                    {isEn ? "L-Vector Construction for EM Means" : "Konstruksi Vektor L untuk EM Means"}
                </h2>

                <p>
                    {isEn
                        ? "The L-vector defines how to calculate one specific EM Mean. Each L-vector has the same length as the number of model parameters and determines coefficients for each parameter."
                        : "Vektor L menentukan cara menghitung satu EM Mean tertentu. Setiap vektor L memiliki panjang yang sama dengan jumlah parameter model dan menentukan koefisien untuk setiap parameter."}
                </p>

                <h3>{isEn ? "L-Vector Construction Rules" : "Aturan Konstruksi Vektor L"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        {isEn ? (
                            <>
                                <div><strong>Intercept:</strong> Coefficient always 1.0</div>
                                <div><strong>Covariates:</strong> Coefficient is covariate mean</div>
                                <div><strong>Specified factors:</strong> Coefficient 1.0 if level matches, 0.0 if not</div>
                                <div><strong>Averaged factors:</strong> Coefficient is 1.0 / number of levels</div>
                                <div><strong>Interactions:</strong> Coefficient is product of component coefficients</div>
                            </>
                        ) : (
                            <>
                                <div><strong>Intercept:</strong> Koefisien selalu 1.0</div>
                                <div><strong>Kovariat:</strong> Koefisien adalah rata-rata kovariat</div>
                                <div><strong>Faktor yang ditentukan:</strong> Koefisien 1.0 jika level cocok, 0.0 jika tidak</div>
                                <div><strong>Faktor yang dirata-ratakan:</strong> Koefisien adalah 1.0 / jumlah level</div>
                                <div><strong>Interaksi:</strong> Koefisien adalah hasil kali koefisien komponennya</div>
                            </>
                        )}
                    </div>
                </div>

                <h2 className="mt-8">{isEn ? "EM Means Statistics Calculation" : "Perhitungan Statistik EM Means"}</h2>

                <h3>Estimated Marginal Mean (EM Mean)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>EM Mean = L' × β̂</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Predicted marginal mean value for specific level combination"
                            : "Nilai rata-rata marginal prediksi untuk kombinasi level tertentu"}
                    </p>
                </div>

                <h3>{isEn ? "Standard Error (SE) of EM Mean" : "Standard Error (SE) EM Mean"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>SE = √(L' × G⁻¹ × L × MSE)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>G⁻¹</strong> = {isEn ? "generalized inverse of matrix" : "invers tergeneralisasi dari matriks"}
                            {" "}(X'X)
                        </li>
                        <li>
                            <strong>MSE</strong> = Mean Squared Error
                        </li>
                        <li>
                            <strong>SE</strong> = {isEn
                                ? "measures variability or uncertainty of EM Mean estimate"
                                : "mengukur variabilitas atau ketidakpastian estimasi EM Mean"}
                        </li>
                    </ul>
                </div>

                <h3>Confidence Interval (CI)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>CI = EM Mean ± (t_critical × SE)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>t_critical</strong> = {isEn ? "critical t-value from t-distribution" : "nilai t kritis dari distribusi t"}
                        </li>
                        <li>
                            <strong>df</strong> = {isEn ? "degrees of freedom error" : "derajat bebas error"}
                        </li>
                        <li>
                            <strong>α</strong> = {isEn ? "significance level" : "tingkat signifikansi"}
                        </li>
                    </ul>
                </div>

                <h2 className="mt-8">Pairwise Comparisons</h2>

                <p>
                    {isEn
                        ? "Pairwise comparisons compare EM Means of each pair of levels within a main effect to determine if there are significant differences."
                        : "Pairwise comparisons membandingkan EM Means setiap pasangan level dalam suatu efek utama untuk menentukan apakah ada perbedaan yang signifikan."}
                </p>

                <h3>Mean Difference</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>
                            Mean Difference = EM Meanᵢ - EM Meanⱼ = (Lᵢ - Lⱼ)' ×
                            β̂
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Difference in estimated means between two levels"
                            : "Selisih rata-rata estimasi antara dua level"}
                    </p>
                </div>

                <h3>{isEn ? "Standard Error of the Difference" : "Standard Error Selisih"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>
                            SE_diff = √((Lᵢ - Lⱼ)' × G⁻¹ × (Lᵢ - Lⱼ) × MSE)
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Measures uncertainty of mean difference"
                            : "Mengukur ketidakpastian selisih rata-rata"}
                    </p>
                </div>

                <h3>{isEn ? "Significance (p-value)" : "Signifikansi (p-value)"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>
                                t-statistic = Mean Difference / SE_diff
                            </strong>
                        </div>
                        <div>
                            <strong>
                                p-value = P(|t| {">"} t_observed | H₀)
                            </strong>
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Adjustment for multiple comparisons using Bonferroni, Sidak, or LSD methods"
                            : "Penyesuaian untuk perbandingan berganda menggunakan metode Bonferroni, Sidak, atau LSD"}
                    </p>
                </div>

                <h3>{isEn ? "Multiple Comparison Adjustments" : "Penyesuaian Perbandingan Berganda"}</h3>
                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn ? "Adjustment Methods:" : "Metode Penyesuaian:"}
                    </h4>
                    <div className="text-sm text-blue-700 space-y-2">
                        <div>
                            <strong>Bonferroni:</strong> α' = α / C (C = {isEn ? "number of comparisons" : "jumlah perbandingan"})
                        </div>
                        <div>
                            <strong>Sidak:</strong> α' = 1 - (1 - α)^(1/C)
                        </div>
                        <div>
                            <strong>{isEn ? "LSD (No adjustment):" : "LSD (Tanpa penyesuaian):"}</strong> α' = α
                        </div>
                    </div>
                </div>

                <h2 className="mt-8">Univariate Tests</h2>

                <p>
                    {isEn
                        ? "Univariate tests perform F-tests for main effects, testing the null hypothesis that all EM Means for levels of that effect are equal."
                        : "Univariate tests melakukan uji F untuk efek utama, dengan menguji hipotesis nol bahwa semua EM Means untuk level efek tersebut sama."}
                </p>

                <h3>Sum of Squares for Hypothesis (SSH)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>SSH = (Lβ̂)' × (L × G⁻¹ × L')⁻¹ × (Lβ̂)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "L is the contrast matrix testing differences between EM Means"
                            : "L adalah matriks kontras yang menguji perbedaan antar EM Means"}
                    </p>
                </div>

                <h3>Mean Square for Hypothesis (MSH)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>MSH = SSH / df_hypothesis</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "df_hypothesis = number of levels - 1" : "df_hypothesis = jumlah level - 1"}
                    </p>
                </div>

                <h3>{isEn ? "F-value" : "Nilai F"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>F = MSH / MSE</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Test statistic comparing between-group variation with within-group variation"
                            : "Statistik uji yang membandingkan variasi antar kelompok dengan variasi dalam kelompok"}
                    </p>
                </div>

                <h3>Partial Eta Squared (η²ₚ)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>η²ₚ = SSH / (SSH + SSE)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Effect size measure showing proportion of variation explained by main effect"
                            : "Ukuran efek yang menunjukkan proporsi variasi yang dijelaskan oleh efek utama"}
                    </p>
                </div>

                <h3>Observed Power</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>
                            Power = P(F {">"} F_critical | F ~ F(df₁, df₂, λ))
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>λ</strong> = {isEn ? "noncentrality parameter" : "parameter nonsentralitas"} = F ×
                            df_hypothesis
                        </li>
                        <li>
                            <strong>F_critical</strong> = {isEn ? "critical F-value for α and df" : "nilai F kritis untuk α dan df"}
                        </li>
                    </ul>
                </div>

                <h2 className="mt-8">Grand Mean</h2>

                <p>
                    {isEn
                        ? "Grand Mean is the overall mean calculated by averaging all factor effects and using covariate means."
                        : "Grand Mean adalah rata-rata keseluruhan yang dihitung dengan merata-ratakan semua efek faktor dan menggunakan rata-rata kovariat."}
                </p>

                <div className="bg-yellow-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-yellow-800 mb-2">
                        {isEn ? "L-Vector Construction for Grand Mean:" : "Konstruksi Vektor L untuk Grand Mean:"}
                    </h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                        {isEn ? (
                            <>
                                <div>Intercept: 1.0</div>
                                <div>Covariates: covariate means</div>
                                <div>Factors: 1.0 / number of levels (for averaging)</div>
                                <div>Interactions: product of component coefficients</div>
                            </>
                        ) : (
                            <>
                                <div>Intercept: 1.0</div>
                                <div>Kovariat: rata-rata kovariat</div>
                                <div>Faktor: 1.0 / jumlah level (untuk perataan)</div>
                                <div>Interaksi: hasil kali koefisien komponen</div>
                            </>
                        )}
                    </div>
                </div>

                <h2 className="mt-8">Non-Estimable EM Means</h2>

                <p>
                    {isEn
                        ? "Non-estimable EM Means occur when the L-vector contains all zeros, meaning that level combination cannot be uniquely calculated from the data."
                        : "EM Means yang non-estimable terjadi ketika vektor L berisi nol semua, artinya kombinasi level tersebut tidak dapat dihitung secara unik dari data."}
                </p>

                <div className="bg-red-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-red-800 mb-2">
                        {isEn ? "Non-Estimable Conditions:" : "Kondisi Non-Estimable:"}
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                        {isEn ? (
                            <>
                                <li>Level combinations not present in data (missing cells)</li>
                                <li>Unbalanced design with empty cells</li>
                                <li>Overparameterized model</li>
                                <li>Covariates with invalid values</li>
                            </>
                        ) : (
                            <>
                                <li>Kombinasi level yang tidak ada dalam data (sel hilang)</li>
                                <li>Desain tidak seimbang dengan sel kosong</li>
                                <li>Model yang overparameterized</li>
                                <li>Kovariat dengan nilai tidak valid</li>
                            </>
                        )}
                    </ul>
                </div>

                <h2 className="mt-8">{isEn ? "Interpreting Results" : "Interpretasi Hasil"}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2">
                            {isEn ? "Significant EM Mean" : "EM Mean yang Signifikan"}
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>CI does not contain 0</li>
                                    <li>SE relatively small</li>
                                    <li>Stable estimate</li>
                                </>
                            ) : (
                                <>
                                    <li>CI tidak memuat 0</li>
                                    <li>SE relatif kecil</li>
                                    <li>Estimasi stabil</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-bold text-red-800 mb-2">
                            {isEn ? "Non-Estimable EM Mean" : "EM Mean Non-Estimable"}
                        </h4>
                        <ul className="text-sm text-red-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Displayed as NaN</li>
                                    <li>L-vector all zeros</li>
                                    <li>Level combination not in data</li>
                                </>
                            ) : (
                                <>
                                    <li>Ditampilkan sebagai NaN</li>
                                    <li>Vektor L bernilai nol semua</li>
                                    <li>Kombinasi level tidak ada dalam data</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-2">
                            Pairwise Comparison
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>p-value {"<"} 0.05: significant</li>
                                    <li>CI does not contain 0</li>
                                    <li>Practically important difference</li>
                                </>
                            ) : (
                                <>
                                    <li>p-value {"<"} 0.05: signifikan</li>
                                    <li>CI tidak memuat 0</li>
                                    <li>Perbedaan yang penting secara praktis</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-2">
                            Univariate Test
                        </h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            <li>F-value {">"} F_critical</li>
                            <li>p-value {"<"} 0.05</li>
                            <li>{isEn ? "η²ₚ shows effect size" : "η²ₚ menunjukkan ukuran efek"}</li>
                        </ul>
                    </div>
                </div>

                <h2 className="mt-8">{isEn ? "Practical Applications" : "Aplikasi Praktis"}</h2>

                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold mb-2">{isEn ? "When to Use EM Means:" : "Kapan Menggunakan EM Means:"}</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        {isEn ? (
                            <>
                                <li><strong>Unbalanced design:</strong> When number of observations differs across cells</li>
                                <li><strong>Models with covariates:</strong> To control for continuous variable effects</li>
                                <li><strong>Significant interactions:</strong> To understand main effects in interaction context</li>
                                <li><strong>Missing cells:</strong> When some level combinations are not present in data</li>
                                <li><strong>Fair comparisons:</strong> To compare groups in a fair manner</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Desain tidak seimbang:</strong> Ketika jumlah observasi berbeda antar sel</li>
                                <li><strong>Model dengan kovariat:</strong> Untuk mengendalikan efek variabel kontinu</li>
                                <li><strong>Interaksi signifikan:</strong> Untuk memahami efek utama dalam konteks interaksi</li>
                                <li><strong>Sel yang hilang:</strong> Ketika beberapa kombinasi level tidak ada dalam data</li>
                                <li><strong>Perbandingan yang adil:</strong> Untuk membandingkan kelompok secara adil</li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </HelpContentWrapper>
    );
};
