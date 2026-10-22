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

export const KMeansClustering: React.FC = () => {
    const { language } = useHelpLanguageStore();
    const isEn = language === "en";

    return (
        <HelpContentWrapper
            title="K-Means Clustering"
            description={
                isEn
                    ? "Complete explanation of the K-Means clustering algorithm for data grouping."
                    : "Penjelasan lengkap algoritma K-Means clustering untuk pengelompokan data."
            }
        >
            <Alert className="mb-6 bg-blue-50 border-blue-100 text-blue-800">
                <div className="flex">
                    <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <AlertTitle className="text-blue-800 font-medium mb-1">
                            K-Means Clustering
                        </AlertTitle>
                        <AlertDescription className="text-blue-700">
                            {isEn
                                ? "The K-Means algorithm iteratively updates cluster center positions to minimize the total distance between data points and their nearest cluster centers."
                                : "Algoritma K-Means memperbarui posisi pusat cluster secara iteratif untuk meminimalkan total jarak antara titik data dan pusat cluster terdekatnya."}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>

            <div className="prose max-w-none">
                <h2 className="flex items-center gap-2">
                    <Target className="h-6 w-6" />
                    {isEn ? "Basic Concepts of K-Means" : "Konsep Dasar K-Means"}
                </h2>

                <p>
                    {isEn
                        ? "K-Means is a clustering algorithm that divides data into K groups based on similarity. Each group has a center (centroid) that represents the average of all data points in that group."
                        : "K-Means adalah algoritma clustering yang membagi data menjadi K kelompok berdasarkan kemiripan. Setiap kelompok memiliki pusat (centroid) yang mewakili rata-rata semua titik data dalam kelompok tersebut."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2">
                            {isEn ? "K-Means Objectives" : "Tujuan K-Means"}
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Minimize within-cluster variance</li>
                                    <li>Maximize between-cluster separation</li>
                                    <li>Group similar data</li>
                                    <li>Discover hidden patterns</li>
                                </>
                            ) : (
                                <>
                                    <li>Meminimalkan varians di dalam cluster</li>
                                    <li>Memaksimalkan pemisahan antar cluster</li>
                                    <li>Mengelompokkan data yang mirip</li>
                                    <li>Menemukan pola tersembunyi</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-2">
                            {isEn ? "Characteristics" : "Karakteristik"}
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Iterative algorithm</li>
                                    <li>Based on Euclidean distance</li>
                                    <li>Converges to local minimum</li>
                                    <li>Sensitive to initialization</li>
                                </>
                            ) : (
                                <>
                                    <li>Algoritma iteratif</li>
                                    <li>Berbasis jarak Euclidean</li>
                                    <li>Konvergen ke minimum lokal</li>
                                    <li>Sensitif terhadap inisialisasi</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <Calculator className="h-6 w-6" />
                    {isEn ? "K-Means Algorithm" : "Algoritma K-Means"}
                </h2>

                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn
                            ? "Steps in generate_final_cluster_centers:"
                            : "Langkah-langkah dalam generate_final_cluster_centers:"}
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-2">
                        {isEn ? (
                            <>
                                <li>
                                    <strong>Initialize Cluster Centers:</strong>{" "}
                                    Determine initial positions of cluster centers
                                </li>
                                <li>
                                    <strong>Calculate Convergence Threshold:</strong>{" "}
                                    Based on minimum distance between initial centers
                                </li>
                                <li>
                                    <strong>Iterate Assignment & Update:</strong> Assign
                                    points to nearest cluster and update centers
                                </li>
                                <li>
                                    <strong>Check Convergence:</strong> Compare center
                                    position changes with threshold
                                </li>
                            </>
                        ) : (
                            <>
                                <li>
                                    <strong>Inisialisasi Pusat Cluster:</strong>{" "}
                                    Menentukan posisi awal pusat cluster
                                </li>
                                <li>
                                    <strong>Hitung Ambang Konvergensi:</strong>{" "}
                                    Berdasarkan jarak minimum antar pusat awal
                                </li>
                                <li>
                                    <strong>Iterasi Penugasan & Pembaruan:</strong> Menugaskan
                                    titik ke cluster terdekat lalu memperbarui pusatnya
                                </li>
                                <li>
                                    <strong>Periksa Konvergensi:</strong> Membandingkan perubahan
                                    posisi pusat dengan ambang
                                </li>
                            </>
                        )}
                    </ol>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <BarChart3 className="h-6 w-6" />
                    {isEn ? "Initialization Methods" : "Metode Inisialisasi"}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-2">
                            {isEn ? "Random Initialization" : "Inisialisasi Acak"}
                        </h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Select K points randomly</li>
                                    <li>Simple and fast</li>
                                    <li>Inconsistent results</li>
                                    <li>Can get trapped in local minima</li>
                                </>
                            ) : (
                                <>
                                    <li>Memilih K titik secara acak</li>
                                    <li>Sederhana dan cepat</li>
                                    <li>Hasil tidak konsisten</li>
                                    <li>Dapat terjebak di minimum lokal</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h4 className="font-bold text-purple-800 mb-2">
                            K-Means++
                        </h4>
                        <ul className="text-sm text-purple-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Probabilistic selection</li>
                                    <li>Initial centers more separated</li>
                                    <li>Faster convergence</li>
                                    <li>More consistent results</li>
                                </>
                            ) : (
                                <>
                                    <li>Pemilihan probabilistik</li>
                                    <li>Pusat awal lebih berjauhan</li>
                                    <li>Konvergensi lebih cepat</li>
                                    <li>Hasil lebih konsisten</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="flex items-center gap-2 mt-8">
                    <TrendingUp className="h-6 w-6" />
                    {isEn ? "Distance Calculation" : "Perhitungan Jarak"}
                </h2>

                <h3>{isEn ? "Euclidean Distance" : "Jarak Euclidean"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>d(x, y) = √(Σ(xᵢ - yᵢ)²)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{isEn ? "Where:" : "Di mana:"}</p>
                    <ul className="text-sm text-gray-600 mt-1">
                        <li>
                            <strong>x, y</strong> = {isEn ? "data vectors" : "vektor data"}
                        </li>
                        <li>
                            <strong>i</strong> = {isEn ? "i-th dimension" : "dimensi ke-i"}
                        </li>
                        <li>
                            <strong>d</strong> = {isEn ? "Euclidean distance" : "jarak Euclidean"}
                        </li>
                    </ul>
                </div>

                <h3>{isEn ? "Assignment Rule" : "Aturan Penugasan"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>c(x) = argmin_k ||x - μ_k||²</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Each data point is assigned to the cluster with the nearest center"
                            : "Setiap titik data ditugaskan ke cluster dengan pusat terdekat"}
                    </p>
                </div>

                <h3>{isEn ? "Update Rule" : "Aturan Pembaruan"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>μ_k = (1/|C_k|) × Σ_{"x∈C_k"} x</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Cluster center is updated as the average of all points in the cluster"
                            : "Pusat cluster diperbarui sebagai rata-rata semua titik dalam cluster"}
                    </p>
                </div>

                <h2 className="mt-8">{isEn ? "Two Update Modes" : "Dua Mode Pembaruan"}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2">
                            Running Means
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Update centers incrementally</li>
                                    <li>μ_new = μ_old + (x - μ_old) / n</li>
                                    <li>More memory efficient</li>
                                    <li>Suitable for large datasets</li>
                                </>
                            ) : (
                                <>
                                    <li>Memperbarui pusat secara bertahap</li>
                                    <li>μ_new = μ_old + (x - μ_old) / n</li>
                                    <li>Lebih hemat memori</li>
                                    <li>Cocok untuk dataset besar</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-2">
                            Batch Update
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            {isEn ? (
                                <>
                                    <li>Update centers after all assignments</li>
                                    <li>μ = (1/|C|) x Σ_{"x∈C"} x</li>
                                    <li>More accurate</li>
                                    <li>Standard K-Means</li>
                                </>
                            ) : (
                                <>
                                    <li>Memperbarui pusat setelah semua penugasan selesai</li>
                                    <li>μ = (1/|C|) x Σ_{"x∈C"} x</li>
                                    <li>Lebih akurat</li>
                                    <li>K-Means standar</li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>

                <h2 className="mt-8">{isEn ? "Convergence Criteria" : "Kriteria Konvergensi"}</h2>

                <h3>{isEn ? "Threshold Calculation" : "Perhitungan Ambang"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>
                            threshold = convergence_criterion × min_center_dist
                        </strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Threshold is calculated based on minimum distance between initial cluster centers"
                            : "Ambang dihitung berdasarkan jarak minimum antar pusat cluster awal"}
                    </p>
                </div>

                <h3>{isEn ? "Stopping Conditions" : "Kondisi Berhenti"}</h3>
                <div className="bg-yellow-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-yellow-800 mb-2">
                        {isEn ? "Algorithm stops when:" : "Algoritma berhenti ketika:"}
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        {isEn ? (
                            <>
                                <li>max_change ≤ threshold (convergence achieved)</li>
                                <li>
                                    iterations ≥ max_iterations (maximum iterations
                                    reached)
                                </li>
                                <li>No assignment changes (perfect convergence)</li>
                            </>
                        ) : (
                            <>
                                <li>max_change ≤ threshold (konvergensi tercapai)</li>
                                <li>
                                    iterations ≥ max_iterations (iterasi maksimum
                                    tercapai)
                                </li>
                                <li>Tidak ada perubahan penugasan (konvergensi sempurna)</li>
                            </>
                        )}
                    </ul>
                </div>

                <h3>{isEn ? "Maximum Change Calculation" : "Perhitungan Perubahan Maksimum"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>max_change = max(||μ_new - μ_old||)</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Maximum change is the largest Euclidean distance between old and new centers"
                            : "Perubahan maksimum adalah jarak Euclidean terbesar antara pusat lama dan pusat baru"}
                    </p>
                </div>

                <h2 className="mt-8">{isEn ? "Distance Between Cluster Centers" : "Jarak Antar Pusat Cluster"}</h2>

                <h3>{isEn ? "Distance Matrix" : "Matriks Jarak"}</h3>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <div className="text-center text-lg font-mono">
                        <strong>D[i][j] = ||μ_i - μ_j||</strong>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isEn
                            ? "Symmetric matrix showing Euclidean distances between cluster centers"
                            : "Matriks simetris yang menunjukkan jarak Euclidean antar pusat cluster"}
                    </p>
                </div>

                <h3>{isEn ? "Distance Matrix Interpretation" : "Interpretasi Matriks Jarak"}</h3>
                <div className="bg-blue-50 p-4 rounded-lg my-4">
                    <h4 className="font-bold text-blue-800 mb-2">
                        {isEn ? "Distance value interpretation:" : "Interpretasi nilai jarak:"}
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        {isEn ? (
                            <>
                                <li>
                                    <strong>D[i][j] = 0:</strong> i = j (distance to
                                    self)
                                </li>
                                <li>
                                    <strong>D[i][j] small:</strong> Clusters i and j are
                                    close
                                </li>
                                <li>
                                    <strong>D[i][j] large:</strong> Clusters i and j are
                                    far apart
                                </li>
                                <li>
                                    <strong>D[i][j] = D[j][i]:</strong> Symmetric matrix
                                </li>
                            </>
                        ) : (
                            <>
                                <li>
                                    <strong>D[i][j] = 0:</strong> i = j (jarak ke diri
                                    sendiri)
                                </li>
                                <li>
                                    <strong>D[i][j] kecil:</strong> Cluster i dan j
                                    berdekatan
                                </li>
                                <li>
                                    <strong>D[i][j] besar:</strong> Cluster i dan j
                                    berjauhan
                                </li>
                                <li>
                                    <strong>D[i][j] = D[j][i]:</strong> Matriks simetris
                                </li>
                            </>
                        )}
                    </ul>
                </div>

                <h2 className="mt-8">{isEn ? "References" : "Referensi"}</h2>
                <div className="bg-gray-50 p-4 rounded-lg my-4">
                    <ul>
                        <li>
                            Hartigan, J. A. (1975). Clustering Algorithms. In
                            John Wiley & Sons. John Wiley & Sons.
                        </li>
                    </ul>
                </div>
            </div>
        </HelpContentWrapper>
    );
};
