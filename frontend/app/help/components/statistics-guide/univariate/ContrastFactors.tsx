import React from "react";
import { HelpContentWrapper } from "../../HelpContentWrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    HelpCircle,
    Calculator,
    BarChart3,
    TrendingUp,
    Target,
} from "lucide-react";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

export const ContrastFactors: React.FC = () => {
    const { language } = useHelpLanguageStore();
    const isEn = language === "en";
    const where = isEn ? "Where:" : "Di mana:";
    const noReference = isEn ? "No reference required" : "Tidak memerlukan referensi";
    const contrastsK1 = isEn ? "Number of contrasts: k-1" : "Jumlah kontras: k-1";

    return (
        <HelpContentWrapper
            title="GLM Univariate: Contrast Factors"
            description={
                isEn
                    ? "Complete explanation of contrast factors, contrast methods, and hypothesis testing in GLM Univariate analysis."
                    : "Penjelasan lengkap contrast factors, metode kontras, dan pengujian hipotesis dalam analisis GLM Univariate."
            }
        >
            <Alert className="mb-6 bg-blue-50 border-blue-100 text-blue-800">
                <div className="flex">
                    <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <AlertTitle className="text-blue-800 font-medium mb-1">
                            Contrast Factors
                        </AlertTitle>
                        <AlertDescription className="text-blue-700">
                            {isEn
                                ? "Contrast factors enable specific hypothesis testing about differences between factor levels. Different contrast methods provide different ways to compare levels within factors."
                                : "Contrast factors memungkinkan pengujian hipotesis yang spesifik tentang perbedaan antar level faktor. Metode kontras yang berbeda memberikan cara berbeda untuk membandingkan level dalam suatu faktor."}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>

            <div className="prose max-w-none">
                <h2 className="flex items-center gap-2">
                    <Target className="h-6 w-6" />
                    {isEn ? "Basic Concepts of Contrast Factors" : "Konsep Dasar Contrast Factors"}
                </h2>

                <p>
                    {isEn
                        ? "Contrast factors are techniques for testing specific hypotheses about differences between levels within a factor. Contrasts allow us to test theoretically meaningful comparisons rather than just testing general differences."
                        : "Contrast factors adalah teknik untuk menguji hipotesis spesifik tentang perbedaan antar level dalam suatu faktor. Kontras memungkinkan kita menguji perbandingan yang bermakna secara teoretis, bukan sekadar menguji perbedaan umum."}
                </p>

                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold mb-2">{isEn ? "General Contrast Model:" : "Model Kontras Umum:"}</h4>
                    <div className="text-center text-lg font-mono">
                        <strong>ψ = L'β</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>ψ</strong> = {isEn ? "contrast value" : "nilai kontras"}
                        </li>
                        <li>
                            <strong>L'</strong> = {isEn ? "contrast coefficient vector" : "vektor koefisien kontras"}
                        </li>
                        <li>
                            <strong>β</strong> = {isEn ? "model parameter vector" : "vektor parameter model"}
                        </li>
                    </ul>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <Calculator className="h-6 w-6" />
                    {isEn ? "Contrast Methods" : "Metode Kontras"}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2">
                            Deviation
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Compare levels with grand mean</li>
                                    <li>Coefficients: 1 for target level, -1/k for others</li>
                                    <li>Reference: First or Last</li>
                                </>
                            ) : (
                                <>
                                    <li>Membandingkan level dengan grand mean</li>
                                    <li>Koefisien: 1 untuk level target, -1/k untuk lainnya</li>
                                    <li>Referensi: First atau Last</li>
                                </>
                            )}
                            <li>{contrastsK1}</li>
                        </ul>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-2">Simple</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Compare levels with reference level</li>
                                    <li>Coefficients: 1 for target level, -1 for reference</li>
                                    <li>Reference: First or Last</li>
                                </>
                            ) : (
                                <>
                                    <li>Membandingkan level dengan level referensi</li>
                                    <li>Koefisien: 1 untuk level target, -1 untuk referensi</li>
                                    <li>Referensi: First atau Last</li>
                                </>
                            )}
                            <li>{contrastsK1}</li>
                        </ul>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-2">
                            Difference
                        </h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Level_i vs mean of previous levels</li>
                                    <li>Coefficients: 1 for level_i, -1/i for levels 1..i-1</li>
                                </>
                            ) : (
                                <>
                                    <li>Level_i vs rata-rata level sebelumnya</li>
                                    <li>Koefisien: 1 untuk level_i, -1/i untuk level 1..i-1</li>
                                </>
                            )}
                            <li>{noReference}</li>
                            <li>{contrastsK1}</li>
                        </ul>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-bold text-red-800 mb-2">Helmert</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Level_i vs mean of subsequent levels</li>
                                    <li>Coefficients: 1 for level_i, -1/(k-i) for levels i+1..k</li>
                                </>
                            ) : (
                                <>
                                    <li>Level_i vs rata-rata level sesudahnya</li>
                                    <li>Koefisien: 1 untuk level_i, -1/(k-i) untuk level i+1..k</li>
                                </>
                            )}
                            <li>{noReference}</li>
                            <li>{contrastsK1}</li>
                        </ul>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h4 className="font-bold text-purple-800 mb-2">
                            Repeated
                        </h4>
                        <ul className="text-sm text-purple-700 space-y-1">
                            <li>Level_i vs level_{`i + 1`}</li>
                            <li>
                                {isEn ? "Coefficients: 1 for level_i, -1 for level_" : "Koefisien: 1 untuk level_i, -1 untuk level_"}
                                {`i + 1`}
                            </li>
                            <li>{noReference}</li>
                            <li>{contrastsK1}</li>
                        </ul>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <h4 className="font-bold text-indigo-800 mb-2">
                            Polynomial
                        </h4>
                        <ul className="text-sm text-indigo-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Linear trend (degree 1 only)</li>
                                    <li>Coefficients: centered and normalized values</li>
                                </>
                            ) : (
                                <>
                                    <li>Tren linear (hanya derajat 1)</li>
                                    <li>Koefisien: nilai yang dipusatkan dan dinormalisasi</li>
                                </>
                            )}
                            <li>{noReference}</li>
                            <li>{isEn ? "Number of contrasts: 1 (if k ≥ 2)" : "Jumlah kontras: 1 (jika k ≥ 2)"}</li>
                        </ul>
                    </div>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <BarChart3 className="h-6 w-6" />
                    {isEn ? "L-Matrix Construction" : "Konstruksi Matriks L"}
                </h2>

                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn
                            ? "Steps in generate_l_matrix_and_descriptions:"
                            : "Langkah-langkah dalam generate_l_matrix_and_descriptions:"}
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-2">
                        {isEn ? (
                            <>
                                <li><strong>Parse Specification:</strong> Extract factor name, method, and reference</li>
                                <li><strong>Determine Number of Contrasts:</strong>{" "}Based on method and number of levels</li>
                                <li><strong>Initialize L Matrix:</strong> Empty matrix with appropriate dimensions</li>
                                <li><strong>Generate Coefficients:</strong> For each contrast based on method</li>
                                <li><strong>Averaging Logic:</strong> For other factors in parameters</li>
                                <li><strong>Generate Descriptions:</strong> Labels and descriptions for each contrast</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Parsing Spesifikasi:</strong> Mengambil nama faktor, metode, dan referensi</li>
                                <li><strong>Menentukan Jumlah Kontras:</strong>{" "}Berdasarkan metode dan jumlah level</li>
                                <li><strong>Inisialisasi Matriks L:</strong> Matriks kosong dengan dimensi yang sesuai</li>
                                <li><strong>Membentuk Koefisien:</strong> Untuk setiap kontras berdasarkan metodenya</li>
                                <li><strong>Logika Perataan:</strong> Untuk faktor lain dalam parameter</li>
                                <li><strong>Membentuk Deskripsi:</strong> Label dan deskripsi untuk setiap kontras</li>
                            </>
                        )}
                    </ol>
                </div>

                <h3>{isEn ? "Contrast Coefficient Formulas" : "Rumus Koefisien Kontras"}</h3>

                <h4>Deviation Contrast</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        {isEn ? (
                            <>
                                <div><strong>For k = 2:</strong></div>
                                <div>Target level: 0.5 (if ref = Last) or -0.5 (if ref = First)</div>
                                <div>Other level: -0.5 or 0.5</div>
                                <div><strong>For k {">"} 2:</strong></div>
                                <div>Target level: 1 - 1/k</div>
                                <div>Other levels: -1/k</div>
                            </>
                        ) : (
                            <>
                                <div><strong>Untuk k = 2:</strong></div>
                                <div>Level target: 0.5 (jika ref = Last) atau -0.5 (jika ref = First)</div>
                                <div>Level lain: -0.5 atau 0.5</div>
                                <div><strong>Untuk k {">"} 2:</strong></div>
                                <div>Level target: 1 - 1/k</div>
                                <div>Level lain: -1/k</div>
                            </>
                        )}
                    </div>
                </div>

                <h4>Simple Contrast</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        {isEn ? (
                            <>
                                <div><strong>Coefficients:</strong></div>
                                <div>Target level: 1.0</div>
                                <div>Reference level: -1.0</div>
                                <div>Other levels: 0.0</div>
                            </>
                        ) : (
                            <>
                                <div><strong>Koefisien:</strong></div>
                                <div>Level target: 1.0</div>
                                <div>Level referensi: -1.0</div>
                                <div>Level lain: 0.0</div>
                            </>
                        )}
                    </div>
                </div>

                <h4>Difference Contrast</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>{isEn ? "For level_" : "Untuk level_"}{`i + 1`}:</strong>
                        </div>
                        <div>Level_{`i + 1`}: 1.0</div>
                        <div>{isEn ? "Levels" : "Level"} 1..i: -1/i</div>
                        <div>{isEn ? "Levels" : "Level"} i+2..k: 0.0</div>
                    </div>
                </div>

                <h4>Helmert Contrast</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>{isEn ? "For level_i:" : "Untuk level_i:"}</strong>
                        </div>
                        <div>Level_i: 1.0</div>
                        <div>{isEn ? "Levels" : "Level"} i+1..k: -1/(k-i)</div>
                        <div>{isEn ? "Levels" : "Level"} 1..i-1: 0.0</div>
                    </div>
                </div>

                <h4>Repeated Contrast</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>{isEn ? "For level_i vs level_" : "Untuk level_i vs level_"}{`i + 1`}:</strong>
                        </div>
                        <div>Level_i: 1.0</div>
                        <div>Level_{`i + 1`}: -1.0</div>
                        <div>{isEn ? "Other levels: 0.0" : "Level lain: 0.0"}</div>
                    </div>
                </div>

                <h4>Polynomial Contrast</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>{isEn ? "Linear Trend:" : "Tren Linear:"}</strong>
                        </div>
                        <div>{isEn ? "x_i = i - (k-1)/2 (centered values)" : "x_i = i - (k-1)/2 (nilai terpusat)"}</div>
                        <div>{isEn ? "Normalized: x_i / √(Σx_i²)" : "Dinormalisasi: x_i / √(Σx_i²)"}</div>
                    </div>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <TrendingUp className="h-6 w-6" />
                    {isEn ? "Contrast Hypothesis Testing" : "Pengujian Hipotesis Kontras"}
                </h2>

                <h3>{isEn ? "Contrast Estimation" : "Estimasi Kontras"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>ψ̂ = L'β̂</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Contrast estimation using parameter estimates from the model"
                            : "Estimasi kontras menggunakan estimasi parameter dari model"}
                    </p>
                </div>

                <h3>Standard Error</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>SE(ψ̂) = √(L'G⁻¹L × MSE)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Standard error of contrast using generalized inverse and MSE"
                            : "Standard error kontras menggunakan invers tergeneralisasi dan MSE"}
                    </p>
                </div>

                <h3>{isEn ? "t-Statistic" : "Statistik t"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>t = ψ̂ / SE(ψ̂)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "t-statistic for testing H₀: ψ = 0" : "Statistik t untuk menguji H₀: ψ = 0"}
                    </p>
                </div>

                <h3>Confidence Interval</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>CI = ψ̂ ± t_critical × SE(ψ̂)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Confidence interval for the true contrast value"
                            : "Selang kepercayaan untuk nilai kontras yang sebenarnya"}
                    </p>
                </div>

                <h2 className="mt-8">{isEn ? "F-Test for Contrast Sets" : "Uji F untuk Himpunan Kontras"}</h2>

                <h3>Sum of Squares Hypothesis (SSH)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>SSH = (Lβ̂)'(LG⁻¹L')⁻¹(Lβ̂)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "Sum of squares for contrast set" : "Sum of squares untuk himpunan kontras"}
                    </p>
                </div>

                <h3>Mean Square Hypothesis (MSH)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>MSH = SSH / df_hypothesis</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Where df_hypothesis = number of contrasts"
                            : "Di mana df_hypothesis = jumlah kontras"}
                    </p>
                </div>

                <h3>{isEn ? "F-Statistic" : "Statistik F"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>F = MSH / MSE</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "F-statistic for testing significance of contrast set"
                            : "Statistik F untuk menguji signifikansi himpunan kontras"}
                    </p>
                </div>

                <h2 className="mt-8">{isEn ? "Effect Size and Power" : "Ukuran Efek dan Power"}</h2>

                <h3>Partial Eta Squared</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>η²ₚ = SSH / (SSH + SSE)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "Effect size for contrast set" : "Ukuran efek untuk himpunan kontras"}
                    </p>
                </div>

                <h3>Noncentrality Parameter</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>λ = F × df_hypothesis</strong>
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
                        <strong>Power = P(F {">"} F_critical | λ)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "Observed power for contrast set" : "Observed power untuk himpunan kontras"}
                    </p>
                </div>

                <h2 className="mt-8">{isEn ? "Practical Applications" : "Aplikasi Praktis"}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2">
                            {isEn ? "When to Use Deviation" : "Kapan Menggunakan Deviation"}
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Want to compare with overall average</li>
                                    <li>Reference level has no special meaning</li>
                                    <li>Focus on deviations from grand mean</li>
                                </>
                            ) : (
                                <>
                                    <li>Ingin membandingkan dengan rata-rata keseluruhan</li>
                                    <li>Level referensi tidak memiliki makna khusus</li>
                                    <li>Fokus pada deviasi dari grand mean</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-2">
                            {isEn ? "When to Use Simple" : "Kapan Menggunakan Simple"}
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>There is a control or baseline level</li>
                                    <li>Want to compare with specific level</li>
                                    <li>Reference level has theoretical meaning</li>
                                </>
                            ) : (
                                <>
                                    <li>Ada level kontrol atau baseline</li>
                                    <li>Ingin membandingkan dengan level tertentu</li>
                                    <li>Level referensi memiliki makna teoretis</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-2">
                            {isEn ? "When to Use Helmert" : "Kapan Menggunakan Helmert"}
                        </h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Levels have natural ordering</li>
                                    <li>Want to compare with subsequent levels</li>
                                    <li>Suitable for ordinal variables</li>
                                </>
                            ) : (
                                <>
                                    <li>Level memiliki urutan alami</li>
                                    <li>Ingin membandingkan dengan level sesudahnya</li>
                                    <li>Cocok untuk variabel ordinal</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-bold text-red-800 mb-2">
                            {isEn ? "When to Use Polynomial" : "Kapan Menggunakan Polynomial"}
                        </h4>
                        <ul className="text-sm text-red-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Levels have numerical ordering</li>
                                    <li>Want to test linear trends</li>
                                    <li>Interval or ratio variables</li>
                                </>
                            ) : (
                                <>
                                    <li>Level memiliki urutan numerik</li>
                                    <li>Ingin menguji tren linear</li>
                                    <li>Variabel interval atau rasio</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="mt-8">{isEn ? "Interpreting Results" : "Interpretasi Hasil"}</h2>

                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn ? "Contrast Result Table:" : "Tabel Hasil Kontras:"}
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        {isEn ? (
                            <>
                                <li><strong>Contrast Estimate:</strong> Estimated contrast value</li>
                                <li><strong>Standard Error:</strong> Standard error of estimate</li>
                                <li><strong>Significance:</strong> p-value for t-test</li>
                                <li><strong>Confidence Interval:</strong> Confidence interval</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Contrast Estimate:</strong> Nilai estimasi kontras</li>
                                <li><strong>Standard Error:</strong> Standard error dari estimasi</li>
                                <li><strong>Significance:</strong> p-value untuk uji t</li>
                                <li><strong>Confidence Interval:</strong> Selang kepercayaan</li>
                            </>
                        )}
                    </ul>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-yellow-800 mb-2">
                        {isEn ? "Contrast Test Table:" : "Tabel Uji Kontras:"}
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        {isEn ? (
                            <>
                                <li><strong>Sum of Squares:</strong> SSH for contrast set</li>
                                <li><strong>F Value:</strong> F-statistic for contrast set</li>
                                <li><strong>Significance:</strong> p-value for F-test</li>
                                <li><strong>Partial Eta Squared:</strong> Effect size</li>
                                <li><strong>Observed Power:</strong> Observed power</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Sum of Squares:</strong> SSH untuk himpunan kontras</li>
                                <li><strong>F Value:</strong> Statistik F untuk himpunan kontras</li>
                                <li><strong>Significance:</strong> p-value untuk uji F</li>
                                <li><strong>Partial Eta Squared:</strong> Ukuran efek</li>
                                <li><strong>Observed Power:</strong> Power yang teramati</li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </HelpContentWrapper>
    );
};
