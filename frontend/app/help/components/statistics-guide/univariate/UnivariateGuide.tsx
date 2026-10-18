import React from "react";
import { HelpContentWrapper } from "../../HelpContentWrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    HelpCircle,
    Calculator,
    TrendingUp,
    BarChart3,
    Layers,
} from "lucide-react";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

export const UnivariateGuide: React.FC = () => {
    const { language } = useHelpLanguageStore();
    const isEn = language === "en";
    const where = isEn ? "Where:" : "Di mana:";

    return (
        <HelpContentWrapper
            title="GLM Univariate"
            description={
                isEn
                    ? "General Linear Model (GLM) Univariate analysis for regression, ANOVA, and ANCOVA with complete mathematical formulas."
                    : "Analisis General Linear Model (GLM) Univariate untuk regresi, ANOVA, dan ANCOVA dengan rumus matematis lengkap."
            }
        >
            <Alert className="mb-6 bg-blue-50 border-blue-100 text-blue-800">
                <div className="flex">
                    <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <AlertTitle className="text-blue-800 font-medium mb-1">
                            {isEn ? "GLM Univariate Overview" : "Ringkasan GLM Univariate"}
                        </AlertTitle>
                        <AlertDescription className="text-blue-700">
                            {isEn
                                ? "GLM Univariate is a statistical framework that unifies regression, ANOVA, and ANCOVA into one comprehensive mathematical model."
                                : "GLM Univariate adalah kerangka statistik yang menyatukan regresi, ANOVA, dan ANCOVA ke dalam satu model matematis yang komprehensif."}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>

            <div className="prose max-w-none">
                <h2 className="flex items-center gap-2">
                    <Calculator className="h-6 w-6" />
                    {isEn ? "General Mathematical Model of GLM" : "Model Matematis Umum GLM"}
                </h2>

                <p>
                    {isEn
                        ? "GLM Univariate uses the general linear model:"
                        : "GLM Univariate menggunakan model linear umum:"}
                </p>

                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold mb-2">{isEn ? "GLM Univariate Model:" : "Model GLM Univariate:"}</h4>
                    <div className="text-center text-lg font-mono">
                        <strong>Y = Xβ + ε</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>Y</strong> = {isEn ? "dependent variable vector" : "vektor variabel dependen"} (n ×
                            1)
                        </li>
                        <li>
                            <strong>X</strong> = {isEn ? "design matrix" : "matriks desain"} (n × p)
                        </li>
                        <li>
                            <strong>β</strong> = {isEn ? "parameter vector" : "vektor parameter"} (p × 1)
                        </li>
                        <li>
                            <strong>ε</strong> = {isEn ? "error vector" : "vektor error"} (n × 1)
                        </li>
                    </ul>
                </div>

                <p>
                    {isEn ? "With assumption:" : "Dengan asumsi:"} <strong>ε ~ N(0, σ²I)</strong>
                </p>

                <h2 className="flex items-center gap-2 mt-8">
                    <TrendingUp className="h-6 w-6" />
                    {isEn ? "Regression Analysis" : "Analisis Regresi"}
                </h2>

                <p>
                    {isEn
                        ? "Linear regression models the relationship between a continuous dependent variable with one or more independent variables."
                        : "Regresi linear memodelkan hubungan antara variabel dependen kontinu dengan satu atau lebih variabel independen."}
                </p>

                <h3>{isEn ? "Simple Linear Regression" : "Regresi Linear Sederhana"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>Y = β₀ + β₁X + ε</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "Parameter estimation:" : "Estimasi parameter:"}
                    </p>
                    <div className="text-sm font-mono">
                        <div>β₁ = Σ(xᵢ - x̄)(yᵢ - ȳ) / Σ(xᵢ - x̄)²</div>
                        <div>β₀ = ȳ - β₁x̄</div>
                    </div>
                </div>

                <h3>{isEn ? "Multiple Linear Regression" : "Regresi Linear Berganda"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>Y = β₀ + β₁X₁ + β₂X₂ + ... + βₖXₖ + ε</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "OLS estimation:" : "Estimasi OLS:"}
                    </p>
                    <div className="text-sm font-mono">
                        <div>
                            <strong>β̂ = (X'X)⁻¹X'y</strong>
                        </div>
                    </div>
                </div>

                <h3>{isEn ? "Coefficient of Determination (R²)" : "Koefisien Determinasi (R²)"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>R² = 1 - (SSE/SST)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>SSE = Σ(yᵢ - ŷᵢ)² (Sum of Squares Error)</li>
                        <li>SST = Σ(yᵢ - ȳ)² (Total Sum of Squares)</li>
                    </ul>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <BarChart3 className="h-6 w-6" />
                    {isEn ? "Analysis of Variance (ANOVA)" : "Analisis Varians (ANOVA)"}
                </h2>

                <p>
                    {isEn
                        ? "ANOVA is used to compare means from three or more groups by testing the null hypothesis that all population means are equal."
                        : "ANOVA digunakan untuk membandingkan rata-rata dari tiga kelompok atau lebih dengan menguji hipotesis nol bahwa semua rata-rata populasi sama."}
                </p>

                <h3>One-Way ANOVA</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>Yᵢⱼ = μ + αᵢ + εᵢⱼ</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        {isEn ? (
                            <>
                                <li>Yᵢⱼ = j-th observation in i-th group</li>
                                <li>μ = overall mean</li>
                                <li>αᵢ = i-th group effect</li>
                                <li>εᵢⱼ = random error</li>
                            </>
                        ) : (
                            <>
                                <li>Yᵢⱼ = observasi ke-j pada kelompok ke-i</li>
                                <li>μ = rata-rata keseluruhan</li>
                                <li>αᵢ = efek kelompok ke-i</li>
                                <li>εᵢⱼ = error acak</li>
                            </>
                        )}
                    </ul>
                </div>

                <h4>{isEn ? "F-Statistic for One-Way ANOVA:" : "Statistik F untuk One-Way ANOVA:"}</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>F = MSB / MSW</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>MSB = SSB / (k-1) (Mean Square Between)</li>
                        <li>MSW = SSW / (N-k) (Mean Square Within)</li>
                        <li>SSB = Σnᵢ(x̄ᵢ - x̄)² (Sum of Squares Between)</li>
                        <li>SSW = ΣΣ(xᵢⱼ - x̄ᵢ)² (Sum of Squares Within)</li>
                    </ul>
                </div>

                <h3>Two-Way ANOVA</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>Yᵢⱼₖ = μ + αᵢ + βⱼ + (αβ)ᵢⱼ + εᵢⱼₖ</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        {isEn ? (
                            <>
                                <li>αᵢ = factor A level i effect</li>
                                <li>βⱼ = factor B level j effect</li>
                                <li>(αβ)ᵢⱼ = interaction effect</li>
                            </>
                        ) : (
                            <>
                                <li>αᵢ = efek faktor A level i</li>
                                <li>βⱼ = efek faktor B level j</li>
                                <li>(αβ)ᵢⱼ = efek interaksi</li>
                            </>
                        )}
                    </ul>
                </div>

                <h4>{isEn ? "Sum of Squares for Two-Way ANOVA:" : "Sum of Squares untuk Two-Way ANOVA:"}</h4>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>SSA = bnΣ(x̄ᵢ.. - x̄...)²</strong>
                        </div>
                        <div>
                            <strong>SSB = anΣ(x̄.ⱼ. - x̄...)²</strong>
                        </div>
                        <div>
                            <strong>
                                SSAB = nΣ(x̄ᵢⱼ. - x̄ᵢ.. - x̄.ⱼ. + x̄...)²
                            </strong>
                        </div>
                        <div>
                            <strong>SSE = ΣΣΣ(xᵢⱼₖ - x̄ᵢⱼ.)²</strong>
                        </div>
                        <div>
                            <strong>SST = ΣΣΣ(xᵢⱼₖ - x̄...)²</strong>
                        </div>
                    </div>
                </div>

                <h3>N-Way ANOVA</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>
                            Y = μ + Σαᵢ + Σ(αβ)ᵢⱼ + Σ(αβγ)ᵢⱼₖ + ... + ε
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "This model includes:" : "Model ini mencakup:"}
                    </p>
                    <ul className="text-sm text-gray-600 mt-1">
                        {isEn ? (
                            <>
                                <li>Main effects for each factor</li>
                                <li>Two-way interaction effects</li>
                                <li>Three-way interaction effects</li>
                                <li>And so on up to N-way interactions</li>
                            </>
                        ) : (
                            <>
                                <li>Efek utama untuk setiap faktor</li>
                                <li>Efek interaksi dua arah</li>
                                <li>Efek interaksi tiga arah</li>
                                <li>Dan seterusnya hingga interaksi N arah</li>
                            </>
                        )}
                    </ul>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <Layers className="h-6 w-6" />
                    {isEn ? "Analysis of Covariance (ANCOVA)" : "Analisis Kovarians (ANCOVA)"}
                </h2>

                <p>
                    {isEn
                        ? "ANCOVA combines ANOVA with regression to control for the effects of covariate variables that cannot be manipulated."
                        : "ANCOVA menggabungkan ANOVA dengan regresi untuk mengendalikan efek variabel kovariat yang tidak dapat dimanipulasi."}
                </p>

                <h3>{isEn ? "One-Way ANCOVA Model" : "Model One-Way ANCOVA"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>Yᵢⱼ = μ + αᵢ + β(Xᵢⱼ - X̄) + εᵢⱼ</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        {isEn ? (
                            <>
                                <li>Yᵢⱼ = dependent variable</li>
                                <li>Xᵢⱼ = covariate</li>
                                <li>αᵢ = group effect</li>
                                <li>β = covariate regression coefficient</li>
                            </>
                        ) : (
                            <>
                                <li>Yᵢⱼ = variabel dependen</li>
                                <li>Xᵢⱼ = kovariat</li>
                                <li>αᵢ = efek kelompok</li>
                                <li>β = koefisien regresi kovariat</li>
                            </>
                        )}
                    </ul>
                </div>

                <h3>{isEn ? "Two-Way ANCOVA Model" : "Model Two-Way ANCOVA"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>
                            Yᵢⱼₖ = μ + αᵢ + βⱼ + (αβ)ᵢⱼ + γ(Xᵢⱼₖ - X̄) + εᵢⱼₖ
                        </strong>
                    </div>
                </div>

                <h3>{isEn ? "Adjusted Means in ANCOVA" : "Rata-rata Terkoreksi (Adjusted Means) dalam ANCOVA"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>Ȳᵢ(adj) = Ȳᵢ - b(X̄ᵢ - X̄)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        {isEn ? (
                            <>
                                <li>Ȳᵢ(adj) = adjusted mean for group i</li>
                                <li>Ȳᵢ = observed mean for group i</li>
                                <li>b = covariate regression coefficient</li>
                                <li>X̄ᵢ = covariate mean for group i</li>
                                <li>X̄ = overall covariate mean</li>
                            </>
                        ) : (
                            <>
                                <li>Ȳᵢ(adj) = rata-rata terkoreksi untuk kelompok i</li>
                                <li>Ȳᵢ = rata-rata observasi untuk kelompok i</li>
                                <li>b = koefisien regresi kovariat</li>
                                <li>X̄ᵢ = rata-rata kovariat untuk kelompok i</li>
                                <li>X̄ = rata-rata kovariat keseluruhan</li>
                            </>
                        )}
                    </ul>
                </div>

                <h2 className="mt-8">{isEn ? "GLM Univariate Assumptions" : "Asumsi GLM Univariate"}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-2">
                            {isEn ? "1. Normality" : "1. Normalitas"}
                        </h4>
                        <p className="text-sm text-yellow-700">
                            {isEn ? "Residuals must be normally distributed:" : "Residual harus berdistribusi normal:"}{" "}
                            <strong>ε ~ N(0, σ²)</strong>
                        </p>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-2">
                            {isEn ? "2. Homoscedasticity" : "2. Homoskedastisitas"}
                        </h4>
                        <p className="text-sm text-yellow-700">
                            {isEn ? "Constant residual variance:" : "Varians residual konstan:"}{" "}
                            <strong>Var(εᵢ) = σ²</strong>
                        </p>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-2">
                            {isEn ? "3. Independence" : "3. Independensi"}
                        </h4>
                        <p className="text-sm text-yellow-700">
                            {isEn ? "Residuals are mutually independent:" : "Residual saling independen:"}{" "}
                            <strong>Cov(εᵢ, εⱼ) = 0</strong>
                        </p>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-2">
                            {isEn ? "4. Linearity" : "4. Linearitas"}
                        </h4>
                        <p className="text-sm text-yellow-700">
                            {isEn ? "Linear relationship between variables:" : "Hubungan linear antar variabel:"}{" "}
                            <strong>E(Y) = Xβ</strong>
                        </p>
                    </div>
                </div>

                <h2 className="mt-8">{isEn ? "Hypothesis Testing" : "Pengujian Hipotesis"}</h2>

                <h3>{isEn ? "F-Test for Model Significance" : "Uji F untuk Signifikansi Model"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>F = (SSR/p) / (SSE/(n-p-1))</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>SSR = Sum of Squares Regression</li>
                        <li>SSE = Sum of Squares Error</li>
                        <li>p = {isEn ? "number of parameters (excluding intercept)" : "jumlah parameter (tidak termasuk intercept)"}</li>
                        <li>n = {isEn ? "number of observations" : "jumlah observasi"}</li>
                    </ul>
                </div>

                <h3>{isEn ? "t-Test for Individual Coefficients" : "Uji t untuk Koefisien Individual"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>t = β̂ᵢ / SE(β̂ᵢ)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>SE(β̂ᵢ) = √(MSE × Cᵢᵢ)</li>
                        <li>Cᵢᵢ = {isEn ? "i-th diagonal element of (X'X)⁻¹" : "elemen diagonal ke-i dari (X'X)⁻¹"}</li>
                    </ul>
                </div>

                <h2 className="mt-8">{isEn ? "Effect Size" : "Ukuran Efek (Effect Size)"}</h2>

                <h3>Eta Squared (η²)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>η² = SSB / SST</strong>
                    </div>
                </div>

                <h3>Partial Eta Squared (η²ₚ)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>η²ₚ = SSB / (SSB + SSE)</strong>
                    </div>
                </div>

                <h2 className="mt-8">{isEn ? "Power Analysis" : "Analisis Power"}</h2>

                <h3>{isEn ? "Power for ANOVA" : "Power untuk ANOVA"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>
                            Power = P(F {">"} F₍α,k-1,N-k₎ | F ~ F₍k-1,N-k,λ₎)
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            λ = n × Σ(μᵢ - μ)² / σ² ({isEn ? "noncentrality parameter" : "parameter nonsentralitas"})
                        </li>
                        <li>F₍α,k-1,N-k₎ = {isEn ? "critical F value" : "nilai kritis F"}</li>
                    </ul>
                </div>

                <h2 className="mt-8">{isEn ? "Related Topic" : "Topik Terkait"}</h2>
                <ul>
                    <li>GLM Univariate: Design Matrix</li>
                    <li>GLM Univariate: Sum of Squares</li>
                    <li>GLM Univariate: Parameter Estimates</li>
                    <li>GLM Univariate: Contrast Factors</li>
                    <li>GLM Univariate: Heteroscedasticity Tests</li>
                    <li>GLM Univariate: Levene Tests</li>
                    <li>GLM Univariate: EM Means</li>
                    <li>GLM Univariate: Lack of Fit Tests</li>
                </ul>

                <h2 className="mt-8">{isEn ? "Reference" : "Referensi"}</h2>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <ul>
                        <li>
                            Sarty, G. E. (2022). Introduction to Applied
                            Statistics for Psychology Students. University of
                            Saskatchewan.
                        </li>
                    </ul>
                </div>
            </div>
        </HelpContentWrapper>
    );
};
