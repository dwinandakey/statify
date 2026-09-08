import { useEffect, useMemo, useState } from "react";
import type {
    MultivariateContainerProps,
    MultivariateMainType,
    MultivariateType,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/types/multivariate";
import {
    MultivariateDefault
} from "@/components/Modals/Analyze/general-linear-model/multivariate/constants/multivariate-default";
import { MultivariateDialog } from "@/components/Modals/Analyze/general-linear-model/multivariate/dialogs/dialog";
import { MultivariateModel } from "@/components/Modals/Analyze/general-linear-model/multivariate/dialogs/model";
import { MultivariateContrast } from "@/components/Modals/Analyze/general-linear-model/multivariate/dialogs/contrast";
import { MultivariatePlots } from "@/components/Modals/Analyze/general-linear-model/multivariate/dialogs/plots";
import { MultivariatePostHoc } from "@/components/Modals/Analyze/general-linear-model/multivariate/dialogs/posthoc";
import { MultivariateEMMeans } from "@/components/Modals/Analyze/general-linear-model/multivariate/dialogs/emmeans";
import { MultivariateSave } from "@/components/Modals/Analyze/general-linear-model/multivariate/dialogs/save";
import { MultivariateOptions } from "@/components/Modals/Analyze/general-linear-model/multivariate/dialogs/options";
import { MultivariateBootstrap } from "@/components/Modals/Analyze/general-linear-model/multivariate/dialogs/bootstrap";
import { MultivariateTestValues } from "@/components/Modals/Analyze/general-linear-model/multivariate/dialogs/test-values";
import { MultivariatePaired } from "@/components/Modals/Analyze/general-linear-model/multivariate/dialogs/paired";
import { useModal } from "@/hooks/useModal";
import { useVariableStore } from "@/stores/useVariableStore";
import { useDataStore } from "@/stores/useDataStore";
import {
    analyzeMultivariate
} from "@/components/Modals/Analyze/general-linear-model/multivariate/services/multivariate-analysis";
import {clearFormData, getFormData, saveFormData} from "@/hooks/useIndexedDB";
import { toast } from "sonner";

export const MultivariateContainer = ({
    onClose,
}: MultivariateContainerProps) => {
    const variables = useVariableStore((state) => state.variables);
    const dataVariables = useDataStore((state) => state.data);
    const tempVariables = useMemo(
        () => variables.map((variable) => variable.name),
        [variables]
    );

    const [formData, setFormData] = useState<MultivariateType>({
        ...MultivariateDefault,
    });
    const [isMainOpen, setIsMainOpen] = useState(true);
    const [isModelOpen, setIsModelOpen] = useState(false);
    const [isContrastOpen, setIsContrastOpen] = useState(false);
    const [isPlotsOpen, setIsPlotsOpen] = useState(false);
    const [isPostHocOpen, setIsPostHocOpen] = useState(false);
    const [isEMMeansOpen, setIsEMMeansOpen] = useState(false);
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [isBootstrapOpen, setIsBootstrapOpen] = useState(false);
    const [isTestValuesOpen, setIsTestValuesOpen] = useState(false);
    const [isPairedOpen, setIsPairedOpen] = useState(false);

    const { closeModal } = useModal();

    useEffect(() => {
        const loadFormData = async () => {
            const savedData = await getFormData("Multivariate");
            if (savedData) {
                const { id, ...formDataWithoutId } = savedData;
                // Older IndexedDB entries predate TestValues and VarianceMode,
                // so hydrate them explicitly to keep MultivariateMainType total.
                const normalized: MultivariateType = {
                    ...formDataWithoutId,
                    main: {
                        ...formDataWithoutId.main,
                        TestValues:
                            formDataWithoutId.main?.TestValues ?? null,
                        VarianceMode:
                            formDataWithoutId.main?.VarianceMode ?? null,
                        PairedMode:
                            formDataWithoutId.main?.PairedMode ?? null,
                    },
                };
                setFormData(normalized);
            } else {
                setFormData({ ...MultivariateDefault });
            }
        };

        toast.promise(loadFormData, {
            loading: "Loading Multivariate Analysis settings...",
            success: () => {
                return "Multivariate Analysis settings loaded successfully.";
            },
            error: (err) => {
                return (
                    <span>
                        An error occurred while loading settings.
                        <br />
                        Error: {String(err)}
                    </span>
                );
            },
        });
    }, []);

    useEffect(() => {
        setFormData((prev) => {
            const newState = { ...prev };

            if (prev.main.FixFactor) {
                newState.contrast = {
                    ...prev.contrast,
                    FactorList: [...prev.main.FixFactor],
                };
                newState.plots = {
                    ...prev.plots,
                    SrcList: [...prev.main.FixFactor],
                };
                newState.posthoc = {
                    ...prev.posthoc,
                    SrcList: [...prev.main.FixFactor],
                };
            }

            const depVars = prev.main.DepVar ? [...prev.main.DepVar] : [];
            const factorVars = prev.main.FixFactor
                ? [...prev.main.FixFactor]
                : [];
            const covarVars = prev.main.Covar ? [...prev.main.Covar] : [];
            const wlsVars = prev.main.WlsWeight ? [prev.main.WlsWeight] : [];

            newState.model = {
                ...prev.model,
                FactorsVar: [...factorVars, ...covarVars],
            };

            newState.emmeans = {
                ...prev.emmeans,
                SrcList: [...factorVars],
            };

            const usedVariables = [
                ...depVars,
                ...factorVars,
                ...covarVars,
                ...wlsVars,
            ];

            const updatedVariables = tempVariables.filter(
                (variable) => !usedVariables.includes(variable)
            );

            newState.bootstrap = {
                ...prev.bootstrap,
                Variables: updatedVariables,
            };

            return newState;
        });
    }, [
        formData.main.DepVar,
        formData.main.FixFactor,
        formData.main.Covar,
        formData.main.WlsWeight,
        formData.plots.FixFactorVars,
        tempVariables,
    ]);

    const updateFormData = <T extends keyof typeof formData>(
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
    };

    const executeMultivariate = async (mainData: MultivariateMainType) => {
        closeModal();
        onClose();

        const promise = async () => {
            // Auto-resize μ₀ vector to match DepVar length. If the user
            // edited DVs after entering test values, pad with 0 or truncate
            // positionally so Rust validation never trips on length mismatch.
            const depLen = mainData.DepVar?.length ?? 0;
            const normalizedTestValues =
                mainData.TestValues === null
                    ? null
                    : Array.from(
                          { length: depLen },
                          (_, i) =>
                              mainData.TestValues?.[i] !== undefined &&
                              Number.isFinite(mainData.TestValues[i])
                                  ? mainData.TestValues[i]
                                  : 0
                      );

            const newFormData = {
                ...formData,
                main: {
                    ...mainData,
                    TestValues: normalizedTestValues,
                },
            };

            await saveFormData("Multivariate", newFormData);

            await analyzeMultivariate({
                configData: newFormData,
                dataVariables,
                variables,
            });
        };

        toast.promise(promise, {
            loading: "Running Multivariate analysis...",
            success: () => {
                return "Multivariate analysis has been completed successfully.";
            },
            error: (err) => {
                return (
                    <span>
                        An error occurred during Multivariate analysis.
                        <br />
                        Error: {String(err)}
                    </span>
                );
            },
        });
    };

    const resetFormData = async () => {
        try {
            await clearFormData("Multivariate");
            setFormData({ ...MultivariateDefault });
        } catch (error) {
            console.error("Failed to clear form data:", error);
        }
    };

    const openSection = (
        section:
            | "main"
            | "model"
            | "contrast"
            | "plots"
            | "posthoc"
            | "emmeans"
            | "save"
            | "options"
            | "bootstrap"
            | "testValues"
            | "paired"
    ) => {
        setIsMainOpen(false);
        setIsModelOpen(false);
        setIsContrastOpen(false);
        setIsPlotsOpen(false);
        setIsPostHocOpen(false);
        setIsEMMeansOpen(false);
        setIsSaveOpen(false);
        setIsOptionsOpen(false);
        setIsBootstrapOpen(false);
        setIsTestValuesOpen(false);
        setIsPairedOpen(false);

        switch (section) {
            case "main":
                setIsMainOpen(true);
                break;
            case "model":
                setIsModelOpen(true);
                break;
            case "contrast":
                setIsContrastOpen(true);
                break;
            case "plots":
                setIsPlotsOpen(true);
                break;
            case "posthoc":
                setIsPostHocOpen(true);
                break;
            case "emmeans":
                setIsEMMeansOpen(true);
                break;
            case "save":
                setIsSaveOpen(true);
                break;
            case "options":
                setIsOptionsOpen(true);
                break;
            case "bootstrap":
                setIsBootstrapOpen(true);
                break;
            case "testValues":
                setIsTestValuesOpen(true);
                break;
            case "paired":
                setIsPairedOpen(true);
                break;
        }
    };

    const handleContinue = () => {
        openSection("main");
    };

    return (
        <div className="flex-grow overflow-y-auto flex flex-col h-full">
            {isMainOpen && (
                <MultivariateDialog
                    isMainOpen={isMainOpen}
                    setIsMainOpen={(value) =>
                        value ? openSection("main") : setIsMainOpen(false)
                    }
                    setIsModelOpen={(value) =>
                        value ? openSection("model") : setIsModelOpen(false)
                    }
                    setIsContrastOpen={(value) =>
                        value
                            ? openSection("contrast")
                            : setIsContrastOpen(false)
                    }
                    setIsPlotsOpen={(value) =>
                        value ? openSection("plots") : setIsPlotsOpen(false)
                    }
                    setIsPostHocOpen={(value) =>
                        value
                            ? openSection("posthoc")
                            : setIsPostHocOpen(false)
                    }
                    setIsEMMeansOpen={(value) =>
                        value ? openSection("emmeans") : setIsEMMeansOpen(false)
                    }
                    setIsSaveOpen={(value) =>
                        value ? openSection("save") : setIsSaveOpen(false)
                    }
                    setIsOptionsOpen={(value) =>
                        value ? openSection("options") : setIsOptionsOpen(false)
                    }
                    setIsBootstrapOpen={(value) =>
                        value
                            ? openSection("bootstrap")
                            : setIsBootstrapOpen(false)
                    }
                    setIsTestValuesOpen={(value) =>
                        value
                            ? openSection("testValues")
                            : setIsTestValuesOpen(false)
                    }
                    setIsPairedOpen={(value) =>
                        value
                            ? openSection("paired")
                            : setIsPairedOpen(false)
                    }
                    updateFormData={(field, value) =>
                        updateFormData("main", field, value)
                    }
                    data={formData.main}
                    globalVariables={tempVariables}
                    onContinue={(mainData) => executeMultivariate(mainData)}
                    onReset={resetFormData}
                />
            )}

            {isModelOpen && (
                <MultivariateModel
                    isModelOpen={isModelOpen}
                    setIsModelOpen={(value) =>
                        value ? openSection("model") : handleContinue()
                    }
                    updateFormData={(field, value) =>
                        updateFormData("model", field, value)
                    }
                    data={formData.model}
                />
            )}

            {isContrastOpen && (
                <MultivariateContrast
                    isContrastOpen={isContrastOpen}
                    setIsContrastOpen={(value) =>
                        value ? openSection("contrast") : handleContinue()
                    }
                    updateFormData={(field, value) =>
                        updateFormData("contrast", field, value)
                    }
                    data={formData.contrast}
                />
            )}

            {isPlotsOpen && (
                <MultivariatePlots
                    isPlotsOpen={isPlotsOpen}
                    setIsPlotsOpen={(value) =>
                        value ? openSection("plots") : handleContinue()
                    }
                    updateFormData={(field, value) =>
                        updateFormData("plots", field, value)
                    }
                    data={formData.plots}
                />
            )}

            {isPostHocOpen && (
                <MultivariatePostHoc
                    isPostHocOpen={isPostHocOpen}
                    setIsPostHocOpen={(value) =>
                        value ? openSection("posthoc") : handleContinue()
                    }
                    updateFormData={(field, value) =>
                        updateFormData("posthoc", field, value)
                    }
                    data={formData.posthoc}
                />
            )}

            {isEMMeansOpen && (
                <MultivariateEMMeans
                    isEMMeansOpen={isEMMeansOpen}
                    setIsEMMeansOpen={(value) =>
                        value ? openSection("emmeans") : handleContinue()
                    }
                    updateFormData={(field, value) =>
                        updateFormData("emmeans", field, value)
                    }
                    data={formData.emmeans}
                />
            )}

            {isSaveOpen && (
                <MultivariateSave
                    isSaveOpen={isSaveOpen}
                    setIsSaveOpen={(value) =>
                        value ? openSection("save") : handleContinue()
                    }
                    updateFormData={(field, value) =>
                        updateFormData("save", field, value)
                    }
                    data={formData.save}
                />
            )}

            {isOptionsOpen && (
                <MultivariateOptions
                    isOptionsOpen={isOptionsOpen}
                    setIsOptionsOpen={(value) =>
                        value ? openSection("options") : handleContinue()
                    }
                    updateFormData={(field, value) =>
                        updateFormData("options", field, value)
                    }
                    data={formData.options}
                />
            )}

            {isBootstrapOpen && (
                <MultivariateBootstrap
                    isBootstrapOpen={isBootstrapOpen}
                    setIsBootstrapOpen={(value) =>
                        value ? openSection("bootstrap") : handleContinue()
                    }
                    updateFormData={(field, value) =>
                        updateFormData("bootstrap", field, value)
                    }
                    data={formData.bootstrap}
                />
            )}

            {isTestValuesOpen && (
                <MultivariateTestValues
                    isTestValuesOpen={isTestValuesOpen}
                    setIsTestValuesOpen={(value) =>
                        value
                            ? openSection("testValues")
                            : handleContinue()
                    }
                    depVar={formData.main.DepVar ?? []}
                    testValues={formData.main.TestValues}
                    onSave={(testValues) =>
                        updateFormData("main", "TestValues", testValues)
                    }
                />
            )}

            {isPairedOpen && (
                <MultivariatePaired
                    isPairedOpen={isPairedOpen}
                    setIsPairedOpen={(value) =>
                        value ? openSection("paired") : handleContinue()
                    }
                    pairedMode={formData.main.PairedMode}
                    onSave={(pairedMode) =>
                        updateFormData("main", "PairedMode", pairedMode)
                    }
                />
            )}
        </div>
    );
};
