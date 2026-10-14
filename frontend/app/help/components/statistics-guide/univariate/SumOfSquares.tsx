import React from "react";
import { HelpContentWrapper } from "../../HelpContentWrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    HelpCircle,
    Calculator,
    Layers,
} from "lucide-react";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

export const SumOfSquares: React.FC = () => {
    const { language } = useHelpLanguageStore();
    const isEn = language === "en";
    const where = isEn ? "Where:" : "Di mana:";

    return (
        <HelpContentWrapper
            title="GLM Univariate: Sum of Squares"
            description={
                isEn
                    ? "Complete explanation of Sum of Squares calculation in GLM Univariate analysis."
                    : "Penjelasan lengkap perhitungan Sum of Squares dalam analisis GLM Univariate."
            }
        >
            <Alert className="mb-6 bg-blue-50 border-blue-100 text-blue-800">
                <div className="flex">
                    <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <AlertTitle className="text-blue-800 font-medium mb-1">
                            {isEn ? "Sum of Squares in GLM" : "Sum of Squares dalam GLM"}
                        </AlertTitle>
                        <AlertDescription className="text-blue-700">
                            {isEn
                                ? "Sum of Squares is a fundamental component in analysis of variance that measures variability in data. GLM uses four different types of SS for various analysis purposes."
                                : "Sum of Squares adalah komponen fundamental dalam analisis varians yang mengukur variabilitas data. GLM menggunakan empat jenis SS yang berbeda untuk berbagai tujuan analisis."}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>

            <div className="prose max-w-none">
                <h2 className="flex items-center gap-2">
                    <Calculator className="h-6 w-6" />
                    {isEn ? "Basic Concepts of Sum of Squares" : "Konsep Dasar Sum of Squares"}
                </h2>

                <p>
                    {isEn
                        ? "Sum of Squares (SS) measures total variability in data and can be decomposed into several components. In GLM, SS is calculated using hypothesis matrix L:"
                        : "Sum of Squares (SS) mengukur total variabilitas data dan dapat diuraikan menjadi beberapa komponen. Dalam GLM, SS dihitung menggunakan matriks hipotesis L:"}
                </p>

                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold mb-2">
                        {isEn ? "General Sum of Squares Formula:" : "Rumus Umum Sum of Squares:"}
                    </h4>
                    <div className="text-center text-lg font-mono">
                        <strong>
                            SS(H) = (L × β̂)ᵀ × (L × G⁻¹ × Lᵀ)⁻¹ × (L × β̂)
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>L</strong> = {isEn
                                ? "hypothesis matrix (describes the hypothesis being tested)"
                                : "matriks hipotesis (menggambarkan hipotesis yang diuji)"}
                        </li>
                        <li>
                            <strong>β̂</strong> = {isEn ? "parameter estimate vector" : "vektor estimasi parameter"}
                        </li>
                        <li>
                            <strong>G⁻¹</strong> = {isEn ? "generalized inverse of matrix" : "invers tergeneralisasi dari matriks"}
                            {" "}(X'WX)
                        </li>
                        <li>
                            <strong>SS(H)</strong> = {isEn ? "Sum of Squares for hypothesis H" : "Sum of Squares untuk hipotesis H"}
                        </li>
                    </ul>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <Layers className="h-6 w-6" />
                    {isEn ? "Types of Sum of Squares" : "Jenis-jenis Sum of Squares"}
                </h2>

                <p>
                    {isEn
                        ? "GLM uses four different types of Sum of Squares, each with specific characteristics and uses:"
                        : "GLM menggunakan empat jenis Sum of Squares yang berbeda, masing-masing dengan karakteristik dan kegunaan tertentu:"}
                </p>

                <h3>{isEn ? "Type I Sum of Squares (Sequential)" : "Type I Sum of Squares (Sekuensial)"}</h3>
                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn ? "Type I SS Characteristics:" : "Karakteristik Type I SS:"}
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        {isEn ? (
                            <>
                                <li><strong>Sequential:</strong> Depends on order of terms in model</li>
                                <li><strong>Hierarchical:</strong> Each term evaluated after previous terms</li>
                                <li><strong>Cumulative:</strong> Effects of previous terms are controlled</li>
                                <li><strong>Application:</strong> Models with clear theoretical ordering</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Sekuensial:</strong> Bergantung pada urutan term dalam model</li>
                                <li><strong>Hierarkis:</strong> Setiap term dievaluasi setelah term sebelumnya</li>
                                <li><strong>Kumulatif:</strong> Efek term sebelumnya dikendalikan</li>
                                <li><strong>Penerapan:</strong> Model dengan urutan teoretis yang jelas</li>
                            </>
                        )}
                    </ul>
                </div>

                <h4>{isEn ? "L Matrix Construction for Type I" : "Konstruksi Matriks L untuk Type I"}</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        {isEn ? (
                            <>
                                <div><strong>1. Take L₀ = p×p submatrix from Z'WZ</strong></div>
                                <div><strong>2. Perform SWEEP on columns before term Fⱼ</strong></div>
                                <div><strong>3. Zero out rows and columns for effects before Fⱼ</strong></div>
                                <div><strong>4. Zero out rows for effects after Fⱼ</strong></div>
                                <div><strong>5. Remove zero-valued rows</strong></div>
                                <div><strong>6. Extract independent row basis</strong></div>
                            </>
                        ) : (
                            <>
                                <div><strong>1. Ambil L₀ = submatriks p×p dari Z'WZ</strong></div>
                                <div><strong>2. Lakukan SWEEP pada kolom sebelum term Fⱼ</strong></div>
                                <div><strong>3. Nolkan baris dan kolom untuk efek sebelum Fⱼ</strong></div>
                                <div><strong>4. Nolkan baris untuk efek setelah Fⱼ</strong></div>
                                <div><strong>5. Hapus baris yang bernilai nol</strong></div>
                                <div><strong>6. Ekstrak basis baris yang independen</strong></div>
                            </>
                        )}
                    </div>
                </div>

                <h4>{isEn ? "Type I SS Formula" : "Rumus Type I SS"}</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>SS₁(Fⱼ) = SS(Fⱼ | F₁, F₂, ..., Fⱼ₋₁)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Sum of Squares for term Fⱼ after controlling for effects of terms F₁ through Fⱼ₋₁"
                            : "Sum of Squares untuk term Fⱼ setelah mengendalikan efek term F₁ sampai Fⱼ₋₁"}
                    </p>
                </div>

                <h3>Type II Sum of Squares (Marginal)</h3>
                <div className="bg-green-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-green-800 mb-2">
                        {isEn ? "Type II SS Characteristics:" : "Karakteristik Type II SS:"}
                    </h4>
                    <ul className="text-sm text-green-700 space-y-1">
                        {isEn ? (
                            <>
                                <li><strong>Marginal:</strong> Tests term effect after other terms that don't contain it</li>
                                <li><strong>Marginality Principle:</strong> Respects model hierarchy</li>
                                <li><strong>Order Independent:</strong> Not dependent on order in model</li>
                                <li><strong>Application:</strong> Models without significant interactions</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Marginal:</strong> Menguji efek term setelah term lain yang tidak memuatnya</li>
                                <li><strong>Prinsip Marginalitas:</strong> Menghormati hierarki model</li>
                                <li><strong>Tidak Bergantung Urutan:</strong> Tidak dipengaruhi urutan dalam model</li>
                                <li><strong>Penerapan:</strong> Model tanpa interaksi yang signifikan</li>
                            </>
                        )}
                    </ul>
                </div>

                <h4>{isEn ? "L Matrix Construction for Type II" : "Konstruksi Matriks L untuk Type II"}</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>
                                L = [0 | C × (X₂ᵀ × W^½ × M₁ × W^½ × X₂) | C ×
                                (X₂ᵀ × W^½ × M₁ × W^½ × X₃)]
                            </strong>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{where}</p>
                        <ul className="text-sm text-gray-600 mt-1">
                            {isEn ? (
                                <>
                                    <li><strong>X₁:</strong> Columns for effects that don't contain F</li>
                                    <li><strong>X₂:</strong> Columns for effect F (term of interest)</li>
                                    <li><strong>X₃:</strong> Columns for effects that contain F</li>
                                    <li><strong>M₁:</strong> Orthogonal projection matrix to column space of X₁</li>
                                    <li><strong>C:</strong> Generalized inverse of (X₂ᵀ × W^½ × M₁ × W^½ × X₂)</li>
                                </>
                            ) : (
                                <>
                                    <li><strong>X₁:</strong> Kolom untuk efek yang tidak memuat F</li>
                                    <li><strong>X₂:</strong> Kolom untuk efek F (term yang diamati)</li>
                                    <li><strong>X₃:</strong> Kolom untuk efek yang memuat F</li>
                                    <li><strong>M₁:</strong> Matriks proyeksi ortogonal ke ruang kolom X₁</li>
                                    <li><strong>C:</strong> Invers tergeneralisasi dari (X₂ᵀ × W^½ × M₁ × W^½ × X₂)</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h4>{isEn ? "Type II SS Formula" : "Rumus Type II SS"}</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>
                            {isEn
                                ? "SS₂(F) = SS(F | all terms that don't contain F)"
                                : "SS₂(F) = SS(F | semua term yang tidak memuat F)"}
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Sum of Squares for term F after controlling for all terms that don't contain F"
                            : "Sum of Squares untuk term F setelah mengendalikan semua term yang tidak memuat F"}
                    </p>
                </div>

                <h3>{isEn ? "Type III Sum of Squares (Partial)" : "Type III Sum of Squares (Parsial)"}</h3>
                <div className="bg-yellow-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-yellow-800 mb-2">
                        {isEn ? "Type III SS Characteristics:" : "Karakteristik Type III SS:"}
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        {isEn ? (
                            <>
                                <li><strong>Partial:</strong> Tests term effect after ALL other terms in model</li>
                                <li><strong>Equal-Weighted:</strong> Uses equally weighted cell means</li>
                                <li><strong>Marginal:</strong> Tests marginal hypotheses</li>
                                <li><strong>Application:</strong> Models with interactions, unbalanced designs</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Parsial:</strong> Menguji efek term setelah SEMUA term lain dalam model</li>
                                <li><strong>Berbobot Sama:</strong> Menggunakan rata-rata sel dengan bobot sama</li>
                                <li><strong>Marginal:</strong> Menguji hipotesis marginal</li>
                                <li><strong>Penerapan:</strong> Model dengan interaksi, desain tidak seimbang</li>
                            </>
                        )}
                    </ul>
                </div>

                <h4>{isEn ? "L Matrix Construction for Type III" : "Konstruksi Matriks L untuk Type III"}</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        {isEn ? (
                            <>
                                <div><strong>Intercept:</strong> L = average of all factor-based parameters</div>
                                <div><strong>Covariates:</strong> L = [0, 0, ..., 1, 0, ...] (1 at covariate position)</div>
                                <div><strong>Factor Main Effects:</strong> Contrasts between levels, averaged over other factor levels</div>
                                <div><strong>Interactions:</strong> Product of contrasts from involved main effects</div>
                            </>
                        ) : (
                            <>
                                <div><strong>Intercept:</strong> L = rata-rata semua parameter berbasis faktor</div>
                                <div><strong>Kovariat:</strong> L = [0, 0, ..., 1, 0, ...] (1 pada posisi kovariat)</div>
                                <div><strong>Efek Utama Faktor:</strong> Kontras antar level, dirata-ratakan terhadap level faktor lain</div>
                                <div><strong>Interaksi:</strong> Hasil kali kontras dari efek utama yang terlibat</div>
                            </>
                        )}
                    </div>
                </div>

                <h4>{isEn ? "Type III SS Formula" : "Rumus Type III SS"}</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>
                            {isEn
                                ? "SS₃(F) = SS(F | all other terms in model)"
                                : "SS₃(F) = SS(F | semua term lain dalam model)"}
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Sum of Squares for term F after controlling for all other terms in model"
                            : "Sum of Squares untuk term F setelah mengendalikan semua term lain dalam model"}
                    </p>
                </div>

                <h3>{isEn ? "Type IV Sum of Squares (Balanced)" : "Type IV Sum of Squares (Seimbang)"}</h3>
                <div className="bg-red-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-red-800 mb-2">
                        {isEn ? "Type IV SS Characteristics:" : "Karakteristik Type IV SS:"}
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                        {isEn ? (
                            <>
                                <li><strong>Balanced:</strong> Designed for designs with empty cells</li>
                                <li><strong>Distributed:</strong> Contrasts distributed equally across available cells</li>
                                <li><strong>Modified Type III:</strong> Modification of Type III for incomplete data</li>
                                <li><strong>Application:</strong> Factorial designs with missing cells</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Seimbang:</strong> Dirancang untuk desain dengan sel kosong</li>
                                <li><strong>Terdistribusi:</strong> Kontras didistribusikan merata ke sel yang tersedia</li>
                                <li><strong>Modifikasi Type III:</strong> Modifikasi Type III untuk data tidak lengkap</li>
                                <li><strong>Penerapan:</strong> Desain faktorial dengan sel yang hilang</li>
                            </>
                        )}
                    </ul>
                </div>

                <h4>{isEn ? "L Matrix Construction for Type IV" : "Konstruksi Matriks L untuk Type IV"}</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        {isEn ? (
                            <>
                                <div><strong>1. Start with Type III L matrix</strong></div>
                                <div><strong>2. Identify effects containing term of interest</strong></div>
                                <div><strong>3. Adjust coefficients based on available cells</strong></div>
                                <div><strong>4. Distribute contrasts equally</strong></div>
                                <div><strong>5. Extract independent row basis</strong></div>
                            </>
                        ) : (
                            <>
                                <div><strong>1. Mulai dari matriks L Type III</strong></div>
                                <div><strong>2. Identifikasi efek yang memuat term yang diamati</strong></div>
                                <div><strong>3. Sesuaikan koefisien berdasarkan sel yang tersedia</strong></div>
                                <div><strong>4. Distribusikan kontras secara merata</strong></div>
                                <div><strong>5. Ekstrak basis baris yang independen</strong></div>
                            </>
                        )}
                    </div>
                </div>

                <h4>{isEn ? "Type IV SS Formula" : "Rumus Type IV SS"}</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>
                            {isEn
                                ? "SS₄(F) = SS₃(F) with adjustment for empty cells"
                                : "SS₄(F) = SS₃(F) dengan penyesuaian untuk sel kosong"}
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Type III Sum of Squares adjusted to handle missing cells"
                            : "Type III Sum of Squares yang disesuaikan untuk menangani sel yang hilang"}
                    </p>
                </div>

                <h2 className="mt-8">{isEn ? "Sum of Squares Types Comparison" : "Perbandingan Jenis Sum of Squares"}</h2>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2 text-left">{isEn ? "Type" : "Jenis"}</th>
                                <th className="border p-2 text-left">
                                    {isEn ? "Characteristic" : "Karakteristik"}
                                </th>
                                <th className="border p-2 text-left">
                                    {isEn ? "Control" : "Kontrol"}
                                </th>
                                <th className="border p-2 text-left">
                                    {isEn ? "Application" : "Penerapan"}
                                </th>
                                <th className="border p-2 text-left">{isEn ? "Order" : "Urutan"}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border p-2 font-bold">Type I</td>
                                <td className="border p-2">{isEn ? "Sequential" : "Sekuensial"}</td>
                                <td className="border p-2">{isEn ? "Previous terms" : "Term sebelumnya"}</td>
                                <td className="border p-2">
                                    {isEn ? "Hierarchical models" : "Model hierarkis"}
                                </td>
                                <td className="border p-2">{isEn ? "Dependent" : "Bergantung"}</td>
                            </tr>
                            <tr>
                                <td className="border p-2 font-bold">
                                    Type II
                                </td>
                                <td className="border p-2">Marginal</td>
                                <td className="border p-2">
                                    {isEn ? "Terms that don't contain F" : "Term yang tidak memuat F"}
                                </td>
                                <td className="border p-2">
                                    {isEn ? "Models without interactions" : "Model tanpa interaksi"}
                                </td>
                                <td className="border p-2">{isEn ? "Independent" : "Tidak bergantung"}</td>
                            </tr>
                            <tr>
                                <td className="border p-2 font-bold">
                                    Type III
                                </td>
                                <td className="border p-2">{isEn ? "Partial" : "Parsial"}</td>
                                <td className="border p-2">{isEn ? "All other terms" : "Semua term lain"}</td>
                                <td className="border p-2">
                                    {isEn ? "Models with interactions" : "Model dengan interaksi"}
                                </td>
                                <td className="border p-2">{isEn ? "Independent" : "Tidak bergantung"}</td>
                            </tr>
                            <tr>
                                <td className="border p-2 font-bold">
                                    Type IV
                                </td>
                                <td className="border p-2">{isEn ? "Balanced" : "Seimbang"}</td>
                                <td className="border p-2">{isEn ? "All other terms" : "Semua term lain"}</td>
                                <td className="border p-2">
                                    {isEn ? "Designs with empty cells" : "Desain dengan sel kosong"}
                                </td>
                                <td className="border p-2">{isEn ? "Independent" : "Tidak bergantung"}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3>{isEn ? "SS Calculation Algorithm" : "Algoritma Perhitungan SS"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold mb-2">
                        {isEn ? "Steps in calculate_ss_for_term:" : "Langkah-langkah dalam calculate_ss_for_term:"}
                    </h4>
                    <ol className="text-sm text-gray-600 space-y-1">
                        {isEn ? (
                            <>
                                <li>1. Validate L matrix and β̂ dimensions</li>
                                <li>2. Calculate L × β̂ (hypothesis linear combination estimate)</li>
                                <li>3. Calculate L × G⁻¹ × Lᵀ (covariance matrix)</li>
                                <li>4. Calculate rank of covariance matrix (degrees of freedom)</li>
                                <li>5. Calculate pseudo-inverse of covariance matrix</li>
                                <li>6. Calculate SS = (L×β̂)ᵀ × (L×G⁻¹×Lᵀ)⁻¹ × (L×β̂)</li>
                                <li>7. Ensure SS ≥ 0 (take maximum with 0)</li>
                            </>
                        ) : (
                            <>
                                <li>1. Validasi dimensi matriks L dan β̂</li>
                                <li>2. Hitung L × β̂ (estimasi kombinasi linear hipotesis)</li>
                                <li>3. Hitung L × G⁻¹ × Lᵀ (matriks kovarians)</li>
                                <li>4. Hitung rank matriks kovarians (derajat bebas)</li>
                                <li>5. Hitung pseudo-invers matriks kovarians</li>
                                <li>6. Hitung SS = (L×β̂)ᵀ × (L×G⁻¹×Lᵀ)⁻¹ × (L×β̂)</li>
                                <li>7. Pastikan SS ≥ 0 (ambil nilai maksimum dengan 0)</li>
                            </>
                        )}
                    </ol>
                </div>

                <h2 className="mt-8">{isEn ? "Degrees of Freedom" : "Derajat Bebas (Degrees of Freedom)"}</h2>

                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>df = rank(L × G⁻¹ × Lᵀ)</strong>
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Degrees of freedom for each SS type determined by rank of hypothesis covariance matrix"
                            : "Derajat bebas untuk setiap jenis SS ditentukan oleh rank matriks kovarians hipotesis"}
                    </p>
                </div>

                <h2 className="mt-8">{isEn ? "Mean Squares and F-Statistics" : "Mean Squares dan Statistik F"}</h2>

                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>MS = SS / df</strong>
                        </div>
                        <div>
                            <strong>F = MS / MSE</strong>
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Mean Squares and F-statistics calculated using appropriate SS and df"
                            : "Mean Squares dan statistik F dihitung menggunakan SS dan df yang sesuai"}
                    </p>
                </div>

                <h2 className="mt-8">{isEn ? "Effect Size" : "Ukuran Efek (Effect Size)"}</h2>

                <h3>Eta Squared (η²)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>η² = SS / SST</strong>
                        </div>
                    </div>
                </div>

                <h3>Partial Eta Squared (η²ₚ)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>η²ₚ = SS / (SS + SSE)</strong>
                        </div>
                    </div>
                </div>
            </div>
        </HelpContentWrapper>
    );
};
