import React from "react";
import { HelpContentWrapper } from "../../HelpContentWrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    HelpCircle,
    Calculator,
    BarChart3,
} from "lucide-react";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

export const LevenesTest: React.FC = () => {
    const { language } = useHelpLanguageStore();
    const isEn = language === "en";
    const where = isEn ? "Where:" : "Di mana:";

    return (
        <HelpContentWrapper
            title="GLM Univariate: Levene's Test"
            description={
                isEn
                    ? "Complete explanation of Levene's test for homogeneity of variances in GLM Univariate analysis."
                    : "Penjelasan lengkap uji Levene untuk homogenitas varians dalam analisis GLM Univariate."
            }
        >
            <Alert className="mb-6 bg-blue-50 border-blue-100 text-blue-800">
                <div className="flex">
                    <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <AlertTitle className="text-blue-800 font-medium mb-1">
                            Levene's Test
                        </AlertTitle>
                        <AlertDescription className="text-blue-700">
                            {isEn
                                ? "Levene's test is used to check whether the variances of the dependent variable are equal across all groups. The assumption of homogeneity of variances is important for ANOVA."
                                : "Uji Levene digunakan untuk memeriksa apakah varians variabel dependen sama di semua kelompok. Asumsi homogenitas varians penting untuk ANOVA."}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>

            <div className="prose max-w-none">
                <h2 className="flex items-center gap-2">
                    <Calculator className="h-6 w-6" />
                    {isEn ? "Basic Concepts of Levene's Test" : "Konsep Dasar Uji Levene"}
                </h2>

                <p>
                    {isEn
                        ? "Levene's Test tests the null hypothesis that population variances are equal across all groups. This is an important assumption for parametric analyses such as ANOVA."
                        : "Uji Levene menguji hipotesis nol bahwa varians populasi sama di semua kelompok. Ini adalah asumsi penting untuk analisis parametrik seperti ANOVA."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2">
                            {isEn ? "Null Hypothesis (H₀)" : "Hipotesis Nol (H₀)"}
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            <li>• σ₁² = σ₂² = ... = σₖ²</li>
                            {isEn ? (
                                <>
                                    <li>• Variances equal across all groups</li>
                                    <li>• Homogeneity assumption satisfied</li>
                                </>
                            ) : (
                                <>
                                    <li>• Varians sama di semua kelompok</li>
                                    <li>• Asumsi homogenitas terpenuhi</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-bold text-red-800 mb-2">
                            {isEn ? "Alternative Hypothesis (H₁)" : "Hipotesis Alternatif (H₁)"}
                        </h4>
                        <ul className="text-sm text-red-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>• σᵢ² ≠ σⱼ² for at least one pair</li>
                                    <li>• Variances not equal across all groups</li>
                                    <li>• Homogeneity assumption violated</li>
                                </>
                            ) : (
                                <>
                                    <li>• σᵢ² ≠ σⱼ² untuk setidaknya satu pasangan</li>
                                    <li>• Varians tidak sama di semua kelompok</li>
                                    <li>• Asumsi homogenitas dilanggar</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <BarChart3 className="h-6 w-6" />
                    {isEn ? "Levene's Test Variations" : "Variasi Uji Levene"}
                </h2>

                <p>
                    {isEn
                        ? "Levene's Test has several variations that differ in how they calculate the center point for absolute deviations:"
                        : "Uji Levene memiliki beberapa variasi yang berbeda dalam cara menghitung titik pusat untuk deviasi absolut:"}
                </p>

                <h3>1. Based on Mean</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>Zᵢⱼ = |Yᵢⱼ - Ȳᵢ|</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "Uses mean as substitute for median" : "Menggunakan mean sebagai pengganti median"}
                    </p>
                </div>

                <h3>2. Based on Median</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>Zᵢⱼ = |Yᵢⱼ - Mᵢ|</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Uses median (same as standard Levene's Test)"
                            : "Menggunakan median (sama dengan uji Levene standar)"}
                    </p>
                </div>

                <h3>3. Based on Median with Adjusted df</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>Zᵢⱼ = |Yᵢⱼ - Mᵢ|</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Uses median with adjusted degrees of freedom (Brown-Forsythe)"
                            : "Menggunakan median dengan derajat bebas yang disesuaikan (Brown-Forsythe)"}
                    </p>
                </div>

                <h3>4. Based on Trimmed Mean</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>Zᵢⱼ = |Yᵢⱼ - Ȳᵢ(trimmed)|</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Uses trimmed mean (mean after removing outliers)"
                            : "Menggunakan trimmed mean (rata-rata setelah membuang outlier)"}
                    </p>
                </div>

                <h2 className="mt-8">{isEn ? "Calculation Steps" : "Langkah Perhitungan"}</h2>

                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn ? "Levene's Test Algorithm:" : "Algoritma Uji Levene:"}
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-2">
                        <li>
                            <strong>{isEn ? "Calculate Group Medians" : "Hitung Median Kelompok"}</strong>
                            <br />
                            {isEn ? "Mᵢ = median of group i" : "Mᵢ = median kelompok i"}
                        </li>
                        <li>
                            <strong>{isEn ? "Calculate Absolute Deviations" : "Hitung Deviasi Absolut"}</strong>
                            <br />
                            Zᵢⱼ = |Yᵢⱼ - Mᵢ|
                        </li>
                        <li>
                            <strong>{isEn ? "Calculate Mean Deviations" : "Hitung Rata-rata Deviasi"}</strong>
                            <br />
                            {isEn ? "Z̄ᵢ = mean of Zᵢⱼ for group i" : "Z̄ᵢ = rata-rata Zᵢⱼ untuk kelompok i"}
                        </li>
                        <li>
                            <strong>{isEn ? "Calculate F Statistic" : "Hitung Statistik F"}</strong>
                            <br />{isEn ? "F = MSB / MSW for Zᵢⱼ" : "F = MSB / MSW untuk Zᵢⱼ"}
                        </li>
                    </ol>
                </div>

                <h2 className="mt-8">{isEn ? "Mathematical Formulas" : "Rumus Matematis"}</h2>

                <h3>{isEn ? "F Statistic" : "Statistik F"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>F = MSB / MSW</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>MSB</strong> = Mean Square Between ({isEn ? "between groups" : "antar kelompok"})
                        </li>
                        <li>
                            <strong>MSW</strong> = Mean Square Within ({isEn ? "within groups" : "dalam kelompok"})
                        </li>
                    </ul>
                </div>

                <h3>Sum of Squares</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>SSB = Σnᵢ(Z̄ᵢ - Z̄)²</strong>
                        </div>
                        <div>
                            <strong>SSW = ΣΣ(Zᵢⱼ - Z̄ᵢ)²</strong>
                        </div>
                        <div>
                            <strong>SST = SSB + SSW</strong>
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>nᵢ</strong> = {isEn ? "number of observations in group i" : "jumlah observasi dalam kelompok i"}
                        </li>
                        <li>
                            <strong>Z̄ᵢ</strong> = {isEn ? "mean absolute deviation of group i" : "rata-rata deviasi absolut kelompok i"}
                        </li>
                        <li>
                            <strong>Z̄</strong> = {isEn ? "overall mean absolute deviation" : "rata-rata deviasi absolut keseluruhan"}
                        </li>
                        <li>
                            <strong>Zᵢⱼ</strong> = {isEn ? "absolute deviation of observation j in group i" : "deviasi absolut observasi j dalam kelompok i"}
                        </li>
                    </ul>
                </div>

                <h3>{isEn ? "Degrees of Freedom" : "Derajat Bebas"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>df₁ = k - 1</strong> ({isEn ? "between groups" : "antar kelompok"})
                        </div>
                        <div>
                            <strong>df₂ = N - k</strong> ({isEn ? "within groups" : "dalam kelompok"})
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>k</strong> = {isEn ? "number of groups" : "jumlah kelompok"}
                        </li>
                        <li>
                            <strong>N</strong> = {isEn ? "total observations" : "total observasi"}
                        </li>
                    </ul>
                </div>

                <h2 className="mt-8">{isEn ? "Interpreting Results" : "Interpretasi Hasil"}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2">
                            p-value {">"} 0.05
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>• Fail to reject H₀</li>
                                    <li>• Homogeneous variances</li>
                                    <li>• ANOVA can be used</li>
                                    <li>• Assumption satisfied</li>
                                </>
                            ) : (
                                <>
                                    <li>• Gagal menolak H₀</li>
                                    <li>• Varians homogen</li>
                                    <li>• ANOVA dapat digunakan</li>
                                    <li>• Asumsi terpenuhi</li>
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
                                    <li>• Reject H₀</li>
                                    <li>• Non-homogeneous variances</li>
                                    <li>• Consider alternatives</li>
                                    <li>• Assumption violated</li>
                                </>
                            ) : (
                                <>
                                    <li>• Tolak H₀</li>
                                    <li>• Varians tidak homogen</li>
                                    <li>• Pertimbangkan alternatif</li>
                                    <li>• Asumsi dilanggar</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="mt-8">
                    {isEn
                        ? "Alternatives When Variances Are Not Homogeneous"
                        : "Alternatif Ketika Varians Tidak Homogen"}
                </h2>
                <div className="bg-yellow-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-yellow-800 mb-2">
                        {isEn ? "Solutions for Heteroscedasticity:" : "Solusi untuk Heteroskedastisitas:"}
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-2">
                        {isEn ? (
                            <>
                                <li><strong>1. Welch's ANOVA:</strong> Does not require homogeneity of variances assumption</li>
                                <li><strong>2. Data Transformation:</strong> Log, square root, or other transformations</li>
                                <li><strong>3. Robust Methods:</strong> Use methods resistant to assumption violations</li>
                                <li><strong>4. Non-parametric Tests:</strong>{" "}Kruskal-Wallis or Mann-Whitney U</li>
                            </>
                        ) : (
                            <>
                                <li><strong>1. Welch's ANOVA:</strong> Tidak memerlukan asumsi homogenitas varians</li>
                                <li><strong>2. Transformasi Data:</strong> Log, akar kuadrat, atau transformasi lain</li>
                                <li><strong>3. Metode Robust:</strong> Gunakan metode yang tahan terhadap pelanggaran asumsi</li>
                                <li><strong>4. Uji Non-parametrik:</strong>{" "}Kruskal-Wallis atau Mann-Whitney U</li>
                            </>
                        )}
                    </ul>
                </div>

                <h2 className="mt-8">{isEn ? "Results Table" : "Tabel Hasil"}</h2>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2 text-left">
                                    {isEn ? "Function" : "Fungsi"}
                                </th>
                                <th className="border p-2 text-left">
                                    Levene Statistic
                                </th>
                                <th className="border p-2 text-left">df1</th>
                                <th className="border p-2 text-left">df2</th>
                                <th className="border p-2 text-left">Sig.</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b">
                                <td className="text-left p-2">Based on Mean</td>
                                <td className="text-left p-2">F-value</td>
                                <td className="text-left p-2">k-1</td>
                                <td className="text-left p-2">N-k</td>
                                <td className="text-left p-2">p-value</td>
                            </tr>
                            <tr className="border-b">
                                <td className="text-left p-2">
                                    Based on Median
                                </td>
                                <td className="text-left p-2">F-value</td>
                                <td className="text-left p-2">k-1</td>
                                <td className="text-left p-2">N-k</td>
                                <td className="text-left p-2">p-value</td>
                            </tr>
                            <tr className="border-b">
                                <td className="text-left p-2">
                                    Based on Median and with adjusted df
                                </td>
                                <td className="text-left p-2">F-value</td>
                                <td className="text-left p-2">k-1</td>
                                <td className="text-left p-2">adjusted df</td>
                                <td className="text-left p-2">p-value</td>
                            </tr>
                            <tr className="border-b">
                                <td className="text-left p-2">
                                    Based on trimmed mean
                                </td>
                                <td className="text-left p-2">F-value</td>
                                <td className="text-left p-2">k-1</td>
                                <td className="text-left p-2">N-k</td>
                                <td className="text-left p-2">p-value</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </HelpContentWrapper>
    );
};
