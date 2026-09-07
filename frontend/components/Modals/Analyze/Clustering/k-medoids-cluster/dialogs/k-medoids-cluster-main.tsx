"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    TooltipProvider,
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle } from "lucide-react";
import { KMedoidsClusterDefault } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/constants/k-medoids-cluster-default";
import type {
    KMedoidsClusterContainerProps,
    KMedoidsClusterMainType,
    KMedoidsClusterType,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import { ClusterMode } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import { KMedoidsClusterDialog } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/dialogs/dialog";
import { KMedoidsClusterIterate } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/dialogs/iterate";
import { KMedoidsClusterResults } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/dialogs/results";
import { KMedoidsClusterEvaluation } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/dialogs/evaluation";
import { KMedoidsClusterSave } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/dialogs/save";
import { KMedoidsClusterOptions } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/dialogs/options";
import { useModal } from "@/hooks/useModal";
import { useVariableStore } from "@/stores/useVariableStore";
import { useDataStore } from "@/stores/useDataStore";
import {
    analyzeKMedoidsCluster,
    warmupKMedoidsRuntime,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/services/k-medoids-cluster-analysis";
import { clearFormData, getFormData, saveFormData } from "@/hooks/useIndexedDB";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const KMedoidsClusterContainer = ({
    onClose,
}: KMedoidsClusterContainerProps) => {
    const variables = useVariableStore((state) => state.variables);
    const dataVariables = useDataStore((state) => state.data);

    const [formData, setFormData] = useState<KMedoidsClusterType>({
        ...KMedoidsClusterDefault,
    });
    const [activeTab, setActiveTab] = useState("variables");
    const [pendingMainData, setPendingMainData] = useState<KMedoidsClusterMainType | null>(null);
    const [missingWarning, setMissingWarning] = useState<{
        rowsWithMissing: number;
        totalRows: number;
        missingPercent: string;
        topVariables: string;
    } | null>(null);

    const { closeModal } = useModal();
    const router = useRouter();

    useEffect(() => {
        const loadFormData = async () => {
            const savedData = await getFormData("KMedoidsCluster");
            if (savedData) {
                const { id: _id, ...formDataWithoutId } = savedData;
                setFormData({
                    ...KMedoidsClusterDefault,
                    ...formDataWithoutId,
                    main: {
                        ...KMedoidsClusterDefault.main,
                        ...formDataWithoutId.main,
                    },
                    iterate: {
                        ...KMedoidsClusterDefault.iterate,
                        ...formDataWithoutId.iterate,
                    },
                    results: {
                        ...KMedoidsClusterDefault.results,
                        ...formDataWithoutId.results,
                    },
                    evaluation: {
                        ...KMedoidsClusterDefault.evaluation,
                        ...formDataWithoutId.evaluation,
                    },
                    save: {
                        ...KMedoidsClusterDefault.save,
                        ...formDataWithoutId.save,
                    },
                    options: {
                        ...KMedoidsClusterDefault.options,
                        ...formDataWithoutId.options,
                    },
                });
            } else {
                setFormData({ ...KMedoidsClusterDefault });
            }
        };

        loadFormData();

        // Panaskan worker/WASM lebih awal agar run pertama tidak menanggung biaya inisialisasi.
        void warmupKMedoidsRuntime(true);
    }, []);

    const updateFormData = useCallback(<T extends keyof typeof formData>(
        section: T,
        field: keyof (typeof formData)[T],
        value: unknown
    ) => {
        setFormData((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value,
            },
        }));
    }, []);

    const executeKMedoidsCluster = async (mainData: KMedoidsClusterMainType) => {
        const selectedVarNames = new Set(mainData.TargetVar ?? []);
        const selectedVariables = variables.filter((v) => selectedVarNames.has(v.name));

        closeModal();
        onClose();

        const promise = async () => {
            const newFormData = {
                ...formData,
                main: mainData,
            };

            await saveFormData("KMedoidsCluster", newFormData);

            // Tambahkan pelacakan progres
            const n_init = newFormData.iterate.NumberOfInitializations ?? 10;
            const dataSize = dataVariables.length;
            const progressToast = toast.loading(
                `Initializing clustering... (${dataSize} cases, ${n_init} runs)`
            );

            try {
                const result = await analyzeKMedoidsCluster({
                    configData: newFormData,
                    dataVariables,
                    variables: selectedVariables,
                    allVariables: variables,
                    useWorker: true, // Coba gunakan web worker (fallback otomatis ke direct jika tidak tersedia)
                    onProgress: (progress) => {
                        // Perbarui toast dengan progres terkini
                        const statusMsg = progress.stage === "clustering"
                            ? `${progress.message} (running in background)`
                            : progress.message;
                        toast.loading(statusMsg, { id: progressToast });
                    },
                });

                toast.dismiss(progressToast);

                if (result.success) {
                    // Penyimpanan hasil komprehensif berjalan di background.
                    // Navigasi segera; hasil terbaru akan muncul setelah tersimpan.
                    router.push("/dashboard/result");
                }
            } catch (error) {
                toast.dismiss(progressToast);
                throw error;
            }
        };

        toast.promise(promise, {
            loading: "Running K-Medoids Cluster analysis...",
            success: () => {
                return "K-Medoids Cluster analysis has been completed successfully.";
            },
            error: (err) => {
                return (
                    <span>
                        An error occurred during K-Medoids Cluster analysis.
                        <br />
                        Error: {String(err)}
                    </span>
                );
            },
        });
    };

    const detectMissingWarning = (mainData: KMedoidsClusterMainType) => {
        const selectedVarNames = new Set(mainData.TargetVar ?? []);
        const selectedVariables = variables.filter((v) => selectedVarNames.has(v.name));

        if (selectedVariables.length === 0 || dataVariables.length === 0) {
            return null;
        }

        const missingByVariable: Record<string, number> = Object.fromEntries(
            selectedVariables.map((v) => [v.name, 0])
        );
        let rowsWithMissing = 0;

        for (const row of dataVariables) {
            let hasMissingInRow = false;

            for (const variable of selectedVariables) {
                const rawValue = row[variable.columnIndex as number];
                const parsedValue =
                    typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue));

                if (!Number.isFinite(parsedValue)) {
                    hasMissingInRow = true;
                    missingByVariable[variable.name] = (missingByVariable[variable.name] || 0) + 1;
                }
            }

            if (hasMissingInRow) {
                rowsWithMissing += 1;
            }
        }

        if (rowsWithMissing === 0) {
            return null;
        }

        const topVariables = Object.entries(missingByVariable)
            .filter(([, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => `${name} (${count})`)
            .join(", ");

        return {
            rowsWithMissing,
            totalRows: dataVariables.length,
            missingPercent: ((rowsWithMissing / dataVariables.length) * 100).toFixed(1),
            topVariables,
        };
    };

    const getValidRowCount = (
    rows: (number | string | null | undefined)[][],
        selectedVariables: typeof variables,
        useListWise: boolean,
        usePairWise: boolean
    ) => {
        if (rows.length === 0 || selectedVariables.length === 0) {
            return 0;
        }

        let validCount = 0;

        for (const row of rows) {
            let hasAnyValid = false;
            let hasAnyMissing = false;

            for (const variable of selectedVariables) {
                const rawValue = row[variable.columnIndex as number];
                const parsedValue =
                    typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue));

                if (Number.isFinite(parsedValue)) {
                    hasAnyValid = true;
                } else {
                    hasAnyMissing = true;
                }
            }

            if (useListWise || !usePairWise) {
                if (!hasAnyMissing && hasAnyValid) {
                    validCount += 1;
                }
            } else if (hasAnyValid) {
                validCount += 1;
            }
        }

        return validCount;
    };

    const handleRunWithMissingCheck = () => {
        const selectedVarNames = new Set(formData.main.TargetVar ?? []);
        const selectedVariables = variables.filter((v) => selectedVarNames.has(v.name));

        if (dataVariables.length === 0) {
            toast.error("Dataset is empty. Please load data before running clustering.");
            return;
        }

        if (selectedVariables.length === 0) {
            toast.error("Please select at least one numeric variable for clustering.");
            return;
        }

        const useListWise = formData.options?.ExcludeListWise ?? true;
        const usePairWise = formData.options?.ExcludePairWise ?? false;
        const validRows = getValidRowCount(
            dataVariables,
            selectedVariables,
            useListWise,
            usePairWise
        );

        if (validRows < 2) {
            toast.error(
                "Not enough valid numeric rows for clustering. Check selected variables and missing handling settings."
            );
            return;
        }

        // Algoritma WASM mengharuskan k < n secara ketat (k == n tidak valid).
        // Tampilkan pesan error yang ramah sebelum submit agar pengguna dapat memperbaikinya.
        const isManual = formData.main.ClusterMode === ClusterMode.Manual;
        if (isManual) {
            const manualK = formData.main.Cluster ?? 2;
            if (manualK >= validRows) {
                toast.error(
                    `Number of clusters (k=${manualK}) must be less than the number of valid data rows (n=${validRows}). ` +
                    `Please reduce the number of clusters or add more data.`
                );
                return;
            }
        }

        const warning = detectMissingWarning(formData.main);
        if (warning) {
            setPendingMainData(formData.main);
            setMissingWarning(warning);
            return;
        }

        void executeKMedoidsCluster(formData.main);
    };

    const resetFormData = async () => {
        try {
            setFormData({ ...KMedoidsClusterDefault });
            await clearFormData("KMedoidsCluster");
            toast.success("Form data cleared successfully");
        } catch (error) {
            toast.error("Failed to clear form data:", error ?? "");
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-grow px-6 overflow-y-auto min-h-0">
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full h-full flex flex-col"
                >
                    <TabsList className="grid w-full grid-cols-6 flex-shrink-0">
                        <TabsTrigger value="variables">Variables</TabsTrigger>
                        <TabsTrigger value="iterate">Iterate</TabsTrigger>
                        <TabsTrigger value="results">Results</TabsTrigger>
                        <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                        <TabsTrigger value="save">Save</TabsTrigger>
                        <TabsTrigger value="options">Options</TabsTrigger>
                    </TabsList>

                    <div className="flex-grow min-h-0 overflow-hidden">
                        <TabsContent
                            value="variables"
                            className="h-full mt-0"
                        >
                            <KMedoidsClusterDialog
                                data={formData.main}
                                globalVariables={variables}
                                updateFormData={(field, value) =>
                                    updateFormData("main", field, value)
                                }
                            />
                        </TabsContent>

                        <TabsContent
                            value="iterate"
                            className="h-full mt-0"
                        >
                            <KMedoidsClusterIterate
                                data={formData.iterate}
                                mainData={formData.main}
                                updateFormData={(field, value) =>
                                    updateFormData("iterate", field, value)
                                }
                            />
                        </TabsContent>

                        <TabsContent
                            value="results"
                            className="h-full mt-0"
                        >
                            <KMedoidsClusterResults
                                data={formData.results}
                                iterateData={formData.iterate}
                                updateFormData={(field, value) =>
                                    updateFormData("results", field, value)
                                }
                            />
                        </TabsContent>

                        <TabsContent
                            value="evaluation"
                            className="h-full mt-0"
                        >
                            <KMedoidsClusterEvaluation
                                data={formData.evaluation}
                                updateFormData={(field, value) =>
                                    updateFormData("evaluation", field, value)
                                }
                            />
                        </TabsContent>

                        <TabsContent
                            value="save"
                            className="h-full mt-0"
                        >
                            <KMedoidsClusterSave
                                data={formData.save}
                                updateFormData={(field, value) =>
                                    updateFormData("save", field, value)
                                }
                            />
                        </TabsContent>

                        <TabsContent
                            value="options"
                            className="h-full mt-0"
                        >
                            <KMedoidsClusterOptions
                                data={formData.options}
                                updateFormData={(field, value) =>
                                    updateFormData("options", field, value)
                                }
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-secondary flex-shrink-0">
                <div className="flex items-center text-muted-foreground">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                                >
                                    <HelpCircle className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p className="text-xs">Help</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <div className="flex items-center space-x-4">
                    <Button
                        onClick={handleRunWithMissingCheck}
                        disabled={
                            !formData.main.TargetVar ||
                            formData.main.TargetVar.length === 0 ||
                            (formData.main.ClusterMode === ClusterMode.Manual && (!formData.main.Cluster || formData.main.Cluster < 2)) ||
                            (formData.main.ClusterMode === ClusterMode.Automatic && (!formData.main.AutoKMin || !formData.main.AutoKMax || formData.main.AutoKMin >= formData.main.AutoKMax)) ||
                            (formData.iterate.Method === "CLARA" && formData.iterate.SampleSize !== null && formData.iterate.SampleSize <= (formData.main.ClusterMode === ClusterMode.Automatic ? (formData.main.AutoKMax ?? 10) : (formData.main.Cluster ?? 2)))
                        }
                    >
                        OK
                    </Button>
                    <Button
                        variant="outline"
                        onClick={resetFormData}
                    >
                        Reset
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            closeModal();
                            onClose();
                        }}
                    >
                        Cancel
                    </Button>
                </div>
            </div>

            <AlertDialog
                open={Boolean(missingWarning)}
                onOpenChange={(open) => {
                    if (!open) {
                        setMissingWarning(null);
                        setPendingMainData(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Warning Missing Value</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <span className="block">
                                Ditemukan missing value pada {missingWarning?.rowsWithMissing ?? 0} dari {missingWarning?.totalRows ?? 0} baris ({missingWarning?.missingPercent ?? "0.0"}%).
                            </span>
                            <span className="block mt-2">
                                Jika dilanjutkan, proses clustering akan menghapus baris yang mengandung missing value.
                            </span>
                            {missingWarning?.topVariables ? (
                                <span className="block mt-2">Variabel terdampak (top 5): {missingWarning.topVariables}</span>
                            ) : null}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Kembali</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingMainData) {
                                    void executeKMedoidsCluster(pendingMainData);
                                }
                                setMissingWarning(null);
                                setPendingMainData(null);
                            }}
                        >
                            Lanjut
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default KMedoidsClusterContainer;