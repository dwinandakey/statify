"use client";

import React, { useEffect, useState } from "react";
import type {
    KMedoidsClusterIterateProps,
    KMedoidsClusterIterateType,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import {
    KMedoidsMethod,
    type SeedMode,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { HelpCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import {
    TooltipProvider,
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
import { useDataStore } from "@/stores/useDataStore";

// Fungsi pembantu untuk mendapatkan rekomendasi berdasarkan metode dan ukuran dataset
const getMethodAdvisory = (method: KMedoidsMethod, n: number) => {
    switch (method) {
        case KMedoidsMethod.PAM:
            if (n < 200) {
                return {
                    status: "optimal",
                    badgeText: "Sangat Cocok",
                    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    complexity: "Waktu: O(k(n-k)²), Memori: O(n²)",
                    details: "PAM menghitung matriks dissimilarity penuh. Sangat akurat dan optimal untuk dataset kecil Anda.",
                    recommendation: "Gunakan parameter default (n_init = 10) untuk hasil terbaik."
                };
            } else if (n <= 1000) {
                return {
                    status: "warning",
                    badgeText: "Dapat Diterima",
                    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    complexity: "Waktu: O(k(n-k)²), Memori: O(n²)",
                    details: `Untuk ${n} data, PAM akan menghitung sekitar ${(n * n / 1000).toFixed(0)} ribu pasang jarak. Masih sangat presisi, namun eksekusi mulai terasa melambat.`,
                    recommendation: "Pertimbangkan mengurangi Number of Initializations menjadi 3-5."
                };
            } else {
                return {
                    status: "critical",
                    badgeText: "Kurang Direkomendasikan",
                    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                    complexity: "Waktu: O(k(n-k)²), Memori: O(n²)",
                    details: `Dataset cukup besar (${n} data). Matriks jarak PAM memerlukan ${((n * n) / 1000000).toFixed(2)} juta kalkulasi, yang dapat membebani browser thread.`,
                    recommendation: "Sangat disarankan beralih ke CLARA (Large Datasets) atau CLARANS."
                };
            }
        case KMedoidsMethod.CLARA:
            if (n < 200) {
                return {
                    status: "warning",
                    badgeText: "Kurang Optimal",
                    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    complexity: "Waktu: O(k·s² + k(n-s)), Memori: O(s² + n)",
                    details: `CLARA dirancang untuk data besar menggunakan sampling (default sample size: 40 + 2k). Untuk data kecil (${n} objek), sampling dapat menghilangkan representasi variasi data.`,
                    recommendation: "Disarankan menggunakan PAM untuk akurasi maksimal pada data kecil."
                };
            } else {
                return {
                    status: "optimal",
                    badgeText: "Sangat Cocok",
                    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    complexity: "Waktu: O(k·s² + k(n-s)), Memori: O(s² + n)",
                    details: `Sangat efisien untuk dataset besar (${n} data). CLARA menarik sub-sampel kecil dan melakukan pengklasteran PAM di sub-sampel tersebut secara berulang.`,
                    recommendation: "Parameter default (5 sample runs) sudah sangat optimal."
                };
            }
        case KMedoidsMethod.CLARANS:
            if (n < 100) {
                return {
                    status: "warning",
                    badgeText: "Dapat Diterima",
                    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    complexity: "Waktu: O(n²) worst-case, Memori: O(n)",
                    details: "CLARANS melakukan pencarian acak pada grafik medoid. Untuk data sangat kecil, PAM lebih presisi dan memiliki performa kecepatan yang sama.",
                    recommendation: "Gunakan PAM jika ingin presisi mutlak pada dataset sangat kecil."
                };
            } else {
                return {
                    status: "optimal",
                    badgeText: "Sangat Cocok",
                    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    complexity: "Waktu: O(n²) worst-case, Memori: O(n)",
                    details: `Keseimbangan terbaik antara kualitas klaster dan kecepatan untuk data ukuran menengah-besar (${n} data). CLARANS tidak dibatasi oleh sub-sampel statis seperti CLARA.`,
                    recommendation: "Gunakan parameter auto untuk Max Neighbors guna efisiensi terbaik."
                };
            }
    }
};

/**
 * ========================================
 * ITERATE DIALOG
 * ========================================
 * Konfigurasi parameter algoritma K-Medoids:
 * - Metode (PAM/CLARA/CLARANS)
 * - Initial medoids strategy
 * - Iteration & convergence parameters
 */
export const KMedoidsClusterIterate = ({
    updateFormData,
    data,
    mainData,
}: KMedoidsClusterIterateProps) => {
    const [iterateState, setIterateState] = useState<KMedoidsClusterIterateType>({
        ...data,
        SeedMode: data.SeedMode ?? (data.RandomSeed === null ? "default" : "custom"),
    });
    
    const dataCount = useDataStore((state) => state.data.length);
    const normalizedMethod = String(iterateState.Method ?? "").trim().toUpperCase();
    const isPam = normalizedMethod === "PAM";
    const isClara = normalizedMethod === "CLARA";
    const isClarans = normalizedMethod === "CLARANS";

    // Hitung nilai maksimum k berdasarkan mode clustering
    const maxK = mainData.ClusterMode === "automatic" 
        ? (mainData.AutoKMax ?? 10) 
        : (mainData.Cluster ?? 2);
    // CLARA mengharuskan sample_size > k.
    const minSampleSize = maxK + 1;

    useEffect(() => {
        setIterateState({
            ...data,
            SeedMode: data.SeedMode ?? (data.RandomSeed === null ? "default" : "custom"),
        });
    }, [data]);

    const handleChange = (
        field: keyof KMedoidsClusterIterateType,
        value: number | boolean | string | null
    ) => {
        setIterateState((prevState) => ({
            ...prevState,
            [field]: value,
        }));
        // Sinkronkan state form induk agar Execute menggunakan konfigurasi iterate terbaru.
        updateFormData(field, value);
    };

    const handleSeedModeChange = (value: SeedMode) => {
        setIterateState((prevState) => {
            const nextSeed = value === "custom" ? prevState.RandomSeed : null;
            return {
                ...prevState,
                SeedMode: value,
                RandomSeed: nextSeed,
            };
        });

        updateFormData("SeedMode", value);
        updateFormData("RandomSeed", value === "custom" ? iterateState.RandomSeed : null);
    };

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="space-y-6">
                {/* ========== METODE K-MEDOIDS ========== */}
                <div className="flex flex-col gap-2 border-b pb-4">
                    <div className="flex items-center gap-2">
                        <Label className="font-bold">K-Medoids Method</Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                        <strong>PAM:</strong> Optimal quality, O(n²), small data<br/>
                                        <strong>CLARA:</strong> Sampling, faster, large data<br/>
                                        <strong>CLARANS:</strong> Hybrid approach
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <Select
                        value={iterateState.Method}
                        onValueChange={(value) =>
                            handleChange("Method", value as KMedoidsMethod)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={KMedoidsMethod.PAM}>
                                PAM (Partitioning Around Medoids)
                            </SelectItem>
                            <SelectItem value={KMedoidsMethod.CLARA}>
                                CLARA (Large Datasets)
                            </SelectItem>
                            <SelectItem value={KMedoidsMethod.CLARANS}>
                                CLARANS (Randomized Search)
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {/* KARTU REKOMENDASI DINAMIS */}
                    {(() => {
                        const advice = getMethodAdvisory(iterateState.Method, dataCount);
                        const isOptimal = advice.status === "optimal";
                        const isWarning = advice.status === "warning";
                        
                        return (
                            <div className="mt-3 rounded-lg border bg-muted/40 p-4 transition-all duration-300 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-start gap-3">
                                    {isOptimal ? (
                                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    ) : isWarning ? (
                                        <Info className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                    ) : (
                                        <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
                                    )}
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className="text-sm font-semibold">
                                                Analisis Kelayakan Algoritma
                                            </span>
                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${advice.badgeClass}`}>
                                                {advice.badgeText}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {advice.details}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* ========== PARAMETER ITERASI UMUM ========== */}
                <div className="flex flex-col gap-3 border-b pb-4">
                    <div className="flex items-center gap-2">
                        <Label className="font-bold">Iteration Parameters</Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                    <p className="text-xs">
                                        Control how the algorithm iterates and converges to a solution.
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label>Maximum Iterations:</Label>
                            <Input
                                type="number"
                                value={iterateState.MaximumIterations ?? ""}
                                min={1}
                                placeholder="300"
                                onChange={(e) =>
                                    handleChange("MaximumIterations", Number(e.target.value))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Max iterations before stopping (default: 300)
                            </p>
                        </div>

                        {isPam && (
                            <div className="flex flex-col gap-2">
                                <Label>Convergence Tolerance:</Label>
                                <Input
                                    type="number"
                                    value={iterateState.ConvergenceCriterion ?? ""}
                                    min={0}
                                    step={0.0001}
                                    placeholder="0"
                                    onChange={(e) =>
                                        handleChange("ConvergenceCriterion", Number(e.target.value))
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Stop if cost change &lt; threshold (default: 0)
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <Label>Seed Mode:</Label>
                            <Select
                                value={iterateState.SeedMode}
                                onValueChange={(value) => handleSeedModeChange(value as SeedMode)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Default" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default</SelectItem>
                                    <SelectItem value="random">Random</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                            {iterateState.SeedMode === "custom" && (
                                <Input
                                    type="number"
                                    value={iterateState.RandomSeed ?? ""}
                                    placeholder="Default"
                                    onChange={(e) => {
                                        const nextValue = e.target.value === "" ? null : Number(e.target.value);
                                        if (nextValue === null) {
                                            handleSeedModeChange("default");
                                            return;
                                        }
                                        handleChange("RandomSeed", nextValue);
                                    }}
                                />
                            )}
                            <p className="text-xs text-muted-foreground">
                                Default: gunakan BUILD phase (deterministik). Random: inisialisasi acak setiap run. Custom: gunakan seed agar hasil konsisten.
                            </p>
                        </div>

                        {isPam && (
                            <div className="flex flex-col gap-2">
                                <Label>Number of Initializations:</Label>
                                <Input
                                    type="number"
                                    value={iterateState.NumberOfInitializations ?? ""}
                                    min={1}
                                    placeholder="10"
                                    onChange={(e) =>
                                        handleChange("NumberOfInitializations", Number(e.target.value))
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Run multiple times, keep best result (default: 10). Higher values = better results but slower. Use 1-3 for large datasets.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ========== PARAMETER KHUSUS CLARA ========== */}
                {isClara && (
                    <div className="flex flex-col gap-3 border-b pb-4 bg-muted/30 p-3 rounded">
                        <Label className="font-bold">CLARA Parameters</Label>
                        
                        <div className="flex flex-col gap-2">
                            <Label>Sample Size:</Label>
                            <Input
                                type="number"
                                value={iterateState.SampleSize ?? ""}
                                min={minSampleSize}
                                placeholder={`Auto: 40 + 2k`}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (e.target.value === "") {
                                        handleChange("SampleSize", null);
                                    } else {
                                        handleChange("SampleSize", val);
                                    }
                                }}
                            />
                            {iterateState.SampleSize !== null && iterateState.SampleSize <= maxK && (
                                <p className="text-xs text-red-500 font-medium">
                                    Error: Sample size must be greater than number of clusters (k={maxK}).
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Size of random sample (leave empty for auto: 40 + 2k, min: {minSampleSize})
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <Label>Number of Samples:</Label>
                            <Input
                                type="number"
                                value={iterateState.NumSamples ?? ""}
                                min={1}
                                max={20}
                                onChange={(e) =>
                                    handleChange("NumSamples", Number(e.target.value))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                How many sampling iterations (default: 5)
                            </p>
                        </div>
                    </div>
                )}

                {/* ========== PARAMETER KHUSUS CLARANS ========== */}
                {isClarans && (
                    <div className="flex flex-col gap-3 border-b pb-4 bg-muted/30 p-3 rounded">
                        <div className="flex items-center gap-2">
                            <Label className="font-bold">CLARANS Parameters</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                        <p className="text-xs">
                                            CLARANS uses randomized local search to find optimal clustering.
                                            Higher values improve quality but increase computation time.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <Label>Number of Local Minima:</Label>
                            <Input
                                type="number"
                                value={iterateState.NumLocal ?? ""}
                                min={1}
                                placeholder="2"
                                onChange={(e) =>
                                    handleChange("NumLocal", Number(e.target.value))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Number of local minima to search (default: 2)
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <Label>Maximum Neighbors:</Label>
                            <Input
                                type="number"
                                value={iterateState.MaxNeighbor ?? ""}
                                min={1}
                                placeholder="Auto: max(250, 1.25% of n×(k-1))"
                                onChange={(e) =>
                                    handleChange("MaxNeighbor", e.target.value === "" ? null : Number(e.target.value))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Max neighbors to check per search (leave empty for auto calculation)
                            </p>
                        </div>
                    </div>
                )}
            </div>
            

        </div>
    );
};
