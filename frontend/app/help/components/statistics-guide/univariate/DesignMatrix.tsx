import React from "react";
import { HelpContentWrapper } from "../../HelpContentWrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    HelpCircle,
    Calculator,
    BarChart3,
    TrendingUp,
    LayoutDashboard,
} from "lucide-react";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

export const DesignMatrix: React.FC = () => {
    const { language } = useHelpLanguageStore();
    const isEn = language === "en";
    const where = isEn ? "Where:" : "Di mana:";

    return (
        <HelpContentWrapper
            title="GLM Univariate: Design Matrix & Sweep Operations"
            description={
                isEn
                    ? "Complete explanation of design matrix construction and sweep operations in GLM Univariate analysis."
                    : "Penjelasan lengkap konstruksi matriks desain dan operasi sweep dalam analisis GLM Univariate."
            }
        >
            <Alert className="mb-6 bg-blue-50 border-blue-100 text-blue-800">
                <div className="flex">
                    <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <AlertTitle className="text-blue-800 font-medium mb-1">
                            Design Matrix & Sweep Operations
                        </AlertTitle>
                        <AlertDescription className="text-blue-700">
                            {isEn
                                ? "The design matrix is a fundamental component in GLM that represents the linear model in matrix form. Gauss-Jordan sweep operations are used to solve equation systems and extract parameter estimates."
                                : "Matriks desain adalah komponen fundamental dalam GLM yang merepresentasikan model linear dalam bentuk matriks. Operasi sweep Gauss-Jordan digunakan untuk menyelesaikan sistem persamaan dan mengekstrak estimasi parameter."}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>

            <div className="prose max-w-none">
                <h2 className="flex items-center gap-2">
                    <LayoutDashboard className="h-6 w-6" />
                    {isEn ? "Basic Concepts of Design Matrix" : "Konsep Dasar Matriks Desain"}
                </h2>

                <p>
                    {isEn
                        ? "The Design Matrix (X) is a matrix that represents the linear model in matrix form. Each row represents one observation, and each column represents one predictor or combination of predictors."
                        : "Matriks Desain (X) adalah matriks yang merepresentasikan model linear dalam bentuk matriks. Setiap baris mewakili satu observasi, dan setiap kolom mewakili satu prediktor atau kombinasi prediktor."}
                </p>

                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold mb-2">
                        {isEn ? "Linear Model in Matrix Form:" : "Model Linear dalam Bentuk Matriks:"}
                    </h4>
                    <div className="text-center text-lg font-mono">
                        <strong>Y = Xβ + ε</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>Y</strong> = {isEn ? "response vector" : "vektor respons"} (n × 1)
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

                <h2 className="flex items-center gap-2 mt-8">
                    <Calculator className="h-6 w-6" />
                    {isEn ? "Design Matrix Construction" : "Konstruksi Matriks Desain"}
                </h2>

                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn ? "Steps in create_design_response_weights:" : "Langkah-langkah dalam create_design_response_weights:"}
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-2">
                        {isEn ? (
                            <>
                                <li><strong>Data Extraction:</strong> Extract dependent variable and WLS weights</li>
                                <li><strong>Data Validation:</strong> Ensure all values are numeric and valid</li>
                                <li><strong>Model Term Generation:</strong> Create list of terms based on configuration</li>
                                <li><strong>Data Caching:</strong> Pre-cache factor levels and covariates for efficiency</li>
                                <li><strong>Column Construction:</strong> Create columns for each model term</li>
                                <li><strong>Matrix Assembly:</strong> Combine all columns into design matrix</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Ekstraksi Data:</strong> Mengambil variabel dependen dan bobot WLS</li>
                                <li><strong>Validasi Data:</strong> Memastikan semua nilai numerik dan valid</li>
                                <li><strong>Pembentukan Term Model:</strong> Membuat daftar term berdasarkan konfigurasi</li>
                                <li><strong>Caching Data:</strong> Menyimpan level faktor dan kovariat lebih dulu agar efisien</li>
                                <li><strong>Konstruksi Kolom:</strong> Membuat kolom untuk setiap term model</li>
                                <li><strong>Perakitan Matriks:</strong> Menggabungkan semua kolom menjadi matriks desain</li>
                            </>
                        )}
                    </ol>
                </div>

                <h3>{isEn ? "Types of Terms in Model" : "Jenis Term dalam Model"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2">
                            Intercept
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Column with value 1 for all observations</li>
                                    <li>Represents constant in model</li>
                                    <li>Usually first column in design matrix</li>
                                </>
                            ) : (
                                <>
                                    <li>Kolom bernilai 1 untuk semua observasi</li>
                                    <li>Mewakili konstanta dalam model</li>
                                    <li>Biasanya kolom pertama dalam matriks desain</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-2">
                            {isEn ? "Covariates" : "Kovariat"}
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Continuous variables</li>
                                    <li>Original values from data</li>
                                    <li>No dummy coding required</li>
                                </>
                            ) : (
                                <>
                                    <li>Variabel kontinu</li>
                                    <li>Nilai asli dari data</li>
                                    <li>Tidak memerlukan dummy coding</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-2">
                            {isEn ? "Factors (Main Effects)" : "Faktor (Efek Utama)"}
                        </h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Dummy coding for each level</li>
                                    <li>One column per level (except reference level)</li>
                                    <li>Value 1 if observation at that level, 0 if not</li>
                                </>
                            ) : (
                                <>
                                    <li>Dummy coding untuk setiap level</li>
                                    <li>Satu kolom per level (kecuali level referensi)</li>
                                    <li>Bernilai 1 jika observasi berada di level tersebut, 0 jika tidak</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-bold text-red-800 mb-2">
                            {isEn ? "Interactions" : "Interaksi"}
                        </h4>
                        <ul className="text-sm text-red-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Product of component columns</li>
                                    <li>Represents interaction effects</li>
                                    <li>Can involve factors and covariates</li>
                                </>
                            ) : (
                                <>
                                    <li>Hasil kali kolom-kolom komponen</li>
                                    <li>Mewakili efek interaksi</li>
                                    <li>Dapat melibatkan faktor dan kovariat</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <BarChart3 className="h-6 w-6" />
                    {isEn ? "Cross-Product Matrix Z'WZ" : "Matriks Cross-Product Z'WZ"}
                </h2>

                <p>
                    {isEn
                        ? "The Z'WZ matrix is the cross-product matrix that becomes the center of Gauss-Jordan sweep operations. Z is formed by combining design matrix X and response vector Y."
                        : "Matriks Z'WZ adalah matriks cross-product yang menjadi pusat operasi sweep Gauss-Jordan. Z dibentuk dengan menggabungkan matriks desain X dan vektor respons Y."}
                </p>

                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold mb-2">{isEn ? "Z Matrix Construction:" : "Konstruksi Matriks Z:"}</h4>
                    <div className="text-center text-lg font-mono">
                        <strong>Z = [X Y]</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Matrix Z combines design matrix X with response vector Y"
                            : "Matriks Z menggabungkan matriks desain X dengan vektor respons Y"}
                    </p>
                </div>

                <h3>{isEn ? "Z'WZ Matrix Structure" : "Struktur Matriks Z'WZ"}</h3>
                <div className="bg-yellow-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-yellow-800 mb-2">
                        {isEn ? "Z'WZ matrix has structure:" : "Matriks Z'WZ memiliki struktur:"}
                    </h4>
                    <div className="text-center text-lg font-mono">
                        <strong>
                            [ X'WX X'WY ]<br />[ Y'WX Y'WY ]
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>X'WX:</strong> {isEn ? "p×p matrix (p = number of parameters)" : "matriks p×p (p = jumlah parameter)"}
                        </li>
                        <li>
                            <strong>X'WY:</strong> {isEn ? "p×1 vector" : "vektor p×1"}
                        </li>
                        <li>
                            <strong>Y'WX:</strong> {isEn ? "1×p vector (transpose of X'WY)" : "vektor 1×p (transpose dari X'WY)"}
                        </li>
                        <li>
                            <strong>Y'WY:</strong> {isEn ? "scalar (total sum of squares)" : "skalar (total sum of squares)"}
                        </li>
                    </ul>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <TrendingUp className="h-6 w-6" />
                    {isEn ? "Gauss-Jordan Sweep Operations" : "Operasi Sweep Gauss-Jordan"}
                </h2>

                <p>
                    {isEn
                        ? "Sweep operations are fundamental algorithms for solving linear equation systems and extracting parameter estimates from the Z'WZ matrix."
                        : "Operasi sweep adalah algoritma fundamental untuk menyelesaikan sistem persamaan linear dan mengekstrak estimasi parameter dari matriks Z'WZ."}
                </p>

                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn ? "Sweep Algorithm (AS 178):" : "Algoritma Sweep (AS 178):"}
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-2">
                        {isEn ? (
                            <>
                                <li><strong>Collinearity Detection:</strong> Check pivot element c[k,k]</li>
                                <li><strong>Pivot Validation:</strong> If |c[k,k]| ≤ ε × |s_k|, parameter is collinear</li>
                                <li><strong>Sweep Operations:</strong> For each valid row/column k</li>
                                <li><strong>Matrix Update:</strong> Apply sweep transformations</li>
                                <li><strong>Result Extraction:</strong> Extract G⁻¹, β̂, and S from swept matrix</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Deteksi Kolinearitas:</strong> Memeriksa elemen pivot c[k,k]</li>
                                <li><strong>Validasi Pivot:</strong> Jika |c[k,k]| ≤ ε × |s_k|, parameter bersifat kolinear</li>
                                <li><strong>Operasi Sweep:</strong> Untuk setiap baris/kolom k yang valid</li>
                                <li><strong>Pembaruan Matriks:</strong> Menerapkan transformasi sweep</li>
                                <li><strong>Ekstraksi Hasil:</strong> Mengambil G⁻¹, β̂, dan S dari matriks hasil sweep</li>
                            </>
                        )}
                    </ol>
                </div>

                <h3>{isEn ? "Standard Sweep Operations" : "Operasi Sweep Standar"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold mb-2">{isEn ? "For each row/column k:" : "Untuk setiap baris/kolom k:"}</h4>
                    <div className="text-sm font-mono space-y-2">
                        <div>
                            <strong>1. c[k,k] = -1/c[k,k]</strong>
                        </div>
                        <div>
                            <strong>2. c[k,j] = c[k,j]/c[k,k] (j ≠ k)</strong>
                        </div>
                        <div>
                            <strong>3. c[i,k] = c[i,k]/c[k,k] (i ≠ k)</strong>
                        </div>
                        <div>
                            <strong>
                                4. c[i,j] = c[i,j] + c[i,k] × c[k,j] × c[k,k]
                                (i,j ≠ k)
                            </strong>
                        </div>
                    </div>
                </div>

                <h3>{isEn ? "Results After Sweep" : "Hasil Setelah Sweep"}</h3>
                <div className="bg-yellow-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-yellow-800 mb-2">
                        {isEn ? "Matrix after sweeping first p rows/columns:" : "Matriks setelah sweep pada p baris/kolom pertama:"}
                    </h4>
                    <div className="text-center text-lg font-mono">
                        <strong>
                            [ -G B̂ ]<br />[ B̂' S ]
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{where}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>G:</strong> {isEn ? "Generalized inverse of X'WX" : "Invers tergeneralisasi dari X'WX"} (p×p)
                        </li>
                        <li>
                            <strong>B̂:</strong> {isEn ? "Parameter estimates" : "Estimasi parameter"} (p×1)
                        </li>
                        <li>
                            <strong>B̂':</strong> {isEn ? "Transpose of B̂" : "Transpose dari B̂"} (1×p)
                        </li>
                        <li>
                            <strong>S:</strong> {isEn ? "Residual matrix (1×1, contains SSE)" : "Matriks residual (1×1, berisi SSE)"}
                        </li>
                    </ul>
                </div>

                <h2 className="mt-8">{isEn ? "Collinearity Detection" : "Deteksi Kolinearitas"}</h2>

                <p>
                    {isEn
                        ? "The sweep algorithm detects collinearity by checking pivot elements. Collinear parameters cannot be uniquely estimated."
                        : "Algoritma sweep mendeteksi kolinearitas dengan memeriksa elemen pivot. Parameter yang kolinear tidak dapat diestimasi secara unik."}
                </p>

                <div className="bg-red-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-red-800 mb-2">
                        {isEn ? "Collinearity Conditions:" : "Kondisi Kolinearitas:"}
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                        {isEn ? (
                            <>
                                <li>|c[k,k]| ≤ ε × |s_k| (pivot too small)</li>
                                <li>Inconsistency in swept flags</li>
                                <li>Aliased parameters (cannot be estimated)</li>
                                <li>Parameter estimate = 0 for collinear parameters</li>
                            </>
                        ) : (
                            <>
                                <li>|c[k,k]| ≤ ε × |s_k| (pivot terlalu kecil)</li>
                                <li>Inkonsistensi pada flag swept</li>
                                <li>Parameter aliased (tidak dapat diestimasi)</li>
                                <li>Estimasi parameter = 0 untuk parameter yang kolinear</li>
                            </>
                        )}
                    </ul>
                </div>

                <h2 className="mt-8">{isEn ? "Parameter Estimation" : "Estimasi Parameter"}</h2>

                <h3>Ordinary Least Squares (OLS)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>β̂ = (X'X)⁻¹X'y</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "Parameter estimation using least squares method" : "Estimasi parameter menggunakan metode least squares"}
                    </p>
                </div>

                <h3>Weighted Least Squares (WLS)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>β̂ = (X'WX)⁻¹X'Wy</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Parameter estimation with weights for heteroscedasticity"
                            : "Estimasi parameter dengan bobot untuk heteroskedastisitas"}
                    </p>
                </div>

                <h3>Generalized Inverse</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>{isEn ? "G⁻¹ = -G (from sweep results)" : "G⁻¹ = -G (dari hasil sweep)"}</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "Generalized inverse for singular matrix cases" : "Invers tergeneralisasi untuk kasus matriks singular"}
                    </p>
                </div>

                <h2 className="mt-8">Sum of Squares Error (SSE)</h2>

                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>{isEn ? "SSE = S[0,0] (from sweep results)" : "SSE = S[0,0] (dari hasil sweep)"}</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Sum of Squares Error extracted from S[0,0] element of swept matrix"
                            : "Sum of Squares Error yang diambil dari elemen S[0,0] matriks hasil sweep"}
                    </p>
                </div>

                <h3>{isEn ? "Degrees of Freedom Error" : "Derajat Bebas Error"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>df_error = n - rank(X)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "Degrees of freedom for error" : "Derajat bebas untuk error"}
                    </p>
                </div>

                <h3>Mean Square Error (MSE)</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>MSE = SSE / df_error</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn ? "Error variance estimate" : "Estimasi varians error"}
                    </p>
                </div>

                <h2 className="mt-8">{isEn ? "Practical Applications" : "Aplikasi Praktis"}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2">
                            {isEn ? "Advantages of Sweep Operations" : "Keunggulan Operasi Sweep"}
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Automatic collinearity detection</li>
                                    <li>Handling of singular matrices</li>
                                    <li>Extraction of all statistics simultaneously</li>
                                    <li>Numerically stable</li>
                                </>
                            ) : (
                                <>
                                    <li>Deteksi kolinearitas otomatis</li>
                                    <li>Penanganan matriks singular</li>
                                    <li>Ekstraksi semua statistik sekaligus</li>
                                    <li>Stabil secara numerik</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-2">
                            {isEn ? "When to Use" : "Kapan Digunakan"}
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Models with complex interactions</li>
                                    <li>Data with collinearity</li>
                                    <li>Models with covariates</li>
                                    <li>Analysis requiring G⁻¹</li>
                                </>
                            ) : (
                                <>
                                    <li>Model dengan interaksi kompleks</li>
                                    <li>Data dengan kolinearitas</li>
                                    <li>Model dengan kovariat</li>
                                    <li>Analisis yang memerlukan G⁻¹</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="mt-8">{isEn ? "References" : "Referensi"}</h2>

                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                            Clarke, M.R.B. (1982) "Algorithm AS 178: The
                            Gauss-Jordan Sweep Operator with Detection of
                            Collinearity"
                        </li>
                        <li>
                            Ridout, M.S. and Cobby, J.M. (1989) "Algorithm AS
                            R78: A Remark on Algorithm AS 178"
                        </li>
                        <li>
                            Journal of the Royal Statistical Society. Series C
                            (Applied Statistics)
                        </li>
                    </ul>
                </div>
            </div>
        </HelpContentWrapper>
    );
};
