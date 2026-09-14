import {useEffect, useMemo, useState} from "react";
import type {
    RepeatedMeasuresContainerProps,
    RepeatedMeasuresMainType,
    RepeatedMeasuresType,
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/types/repeated-measures";
import type {
    RepeatedMeasureDefineData,
    RepeatedMeasureDefineType,
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/types/repeated-measure-define";
import {
    RepeatedMeasuresDefault
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/constants/repeated-measures-default";
import {
    RepeatedMeasureDefineDefault
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/constants/repeated-measures-define-default";
import {
    RepeatedMeasuresDialog
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/dialogs/dialog";
import {
    RepeatedMeasureDefineDialog
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/dialogs/define/repeated-measures-dialog";
import {RepeatedMeasuresModel} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/dialogs/model";
import {
    RepeatedMeasuresContrast
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/dialogs/contrast";
import {RepeatedMeasuresPlots} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/dialogs/plots";
import {
    RepeatedMeasuresPostHoc
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/dialogs/posthoc";
import {
    RepeatedMeasuresEMMeans
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/dialogs/emmeans";
import {RepeatedMeasuresSave} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/dialogs/save";
import {
    RepeatedMeasuresOptions
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/dialogs/options";
import {useModal} from "@/hooks/useModal";
import {useVariableStore} from "@/stores/useVariableStore";
import {useDataStore} from "@/stores/useDataStore";
import {
    analyzeRepeatedMeasures
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/services/repeated-measures-analysis";
import {clearFormData, getFormData, saveFormData} from "@/hooks/useIndexedDB";

export const RepeatedMeasuresContainer = ({
    onClose,
    combinationVars: initialCombinationVars,
    factorVars: initialFactorVars,
}: RepeatedMeasuresContainerProps) => {
    const variables = useVariableStore((state) => state.variables);
    const dataVariables = useDataStore((state) => state.data);
    const tempVariables = useMemo(
        () => variables.map((variable) => variable.name),
        [variables]
    );

    const hasInitialDefinition =
        !!initialCombinationVars && initialCombinationVars.length > 0;

    const [formData, setFormData] = useState<RepeatedMeasuresType>({
        ...RepeatedMeasuresDefault,
    });
    const [defineData, setDefineData] = useState<RepeatedMeasureDefineType>({
        ...RepeatedMeasureDefineDefault,
    });
    const [combinationVars, setCombinationVars] = useState<string[]>(
        initialCombinationVars ?? []
    );
    const [factorVars, setFactorVars] = useState<string[]>(
        initialFactorVars ?? []
    );

    // Phase: "define" first (SPSS-style), then "main" once factors are defined.
    const [isDefineOpen, setIsDefineOpen] = useState(!hasInitialDefinition);
    const [isMainOpen, setIsMainOpen] = useState(hasInitialDefinition);
    const [isModelOpen, setIsModelOpen] = useState(false);
    const [isContrastOpen, setIsContrastOpen] = useState(false);
    const [isPlotsOpen, setIsPlotsOpen] = useState(false);
    const [isPostHocOpen, setIsPostHocOpen] = useState(false);
    const [isEMMeansOpen, setIsEMMeansOpen] = useState(false);
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);

    const { closeModal } = useModal();

    useEffect(() => {
        const loadFormData = async () => {
            try {
                const savedData = await getFormData("RepeatedMeasures");
                if (savedData) {
                    const { id, ...formDataWithoutId } = savedData;
                    setFormData(formDataWithoutId);
                } else {
                    setFormData({ ...RepeatedMeasuresDefault });
                }

                const savedDefine = await getFormData("RepeatedMeasuresDefine");
                if (savedDefine) {
                    const { id, ...defineWithoutId } = savedDefine;
                    setDefineData(defineWithoutId);
                    const restoredFactorVars = (
                        defineWithoutId.main?.factors ?? []
                    )
                        .map((f: { name: string | null }) => f.name || "")
                        .filter((n: string) => n.length > 0);
                    if (restoredFactorVars.length > 0) {
                        setFactorVars(restoredFactorVars);
                    }
                } else {
                    setDefineData({ ...RepeatedMeasureDefineDefault });
                }
            } catch (error) {
                console.error("Failed to load form data:", error);
            }
        };

        loadFormData();
    }, []);

    useEffect(() => {
        setFormData((prev) => {
            const newState = { ...prev };

            // Within-subjects factors (from Define) drive the Contrast list.
            // Format follows SPSS: "perlakuan(Repeated)".
            const defaultContrastMethod =
                prev.contrast.ContrastMethod ?? "Repeated";
            const contrastMethodLabel =
                defaultContrastMethod.charAt(0).toUpperCase() +
                defaultContrastMethod.slice(1);

            const existingContrastFactors = prev.contrast.FactorList ?? [];
            const contrastFactorList = factorVars.map((fName) => {
                const existing = existingContrastFactors.find(
                    (entry) => entry.split("(")[0] === fName
                );
                return existing ?? `${fName}(${contrastMethodLabel})`;
            });

            newState.contrast = {
                ...prev.contrast,
                FactorList: contrastFactorList,
            };

            if (prev.main.FactorsVar) {
                newState.plots = {
                    ...prev.plots,
                    SrcList: [...prev.main.FactorsVar],
                };
                newState.posthoc = {
                    ...prev.posthoc,
                    SrcList: [...prev.main.FactorsVar],
                };
            }

            const factorList = prev.main.FactorsVar
                ? [...prev.main.FactorsVar]
                : [];
            const covariatesList = prev.main.Covariates
                ? [...prev.main.Covariates]
                : [];

            newState.model = {
                ...prev.model,
                BetSubVar: [...factorList, ...covariatesList],
            };

            newState.emmeans = {
                ...prev.emmeans,
                SrcList: [...factorList],
            };

            return newState;
        });
    }, [
        factorVars,
        formData.main.SubVar,
        formData.main.FactorsVar,
        formData.main.Covariates,
        formData.plots.FixFactorVars,
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

    const updateDefineFormData = (
        field: keyof RepeatedMeasureDefineData,
        value: unknown
    ) => {
        setDefineData((prev) => ({
            ...prev,
            main: {
                ...prev.main,
                [field]: value,
            },
        }));
    };

    const handleDefineContinue = async (
        defineState: RepeatedMeasureDefineData,
        nextCombinationVars: string[],
        nextFactorVars: string[]
    ) => {
        const newDefineData = { ...defineData, main: defineState };
        setDefineData(newDefineData);

        try {
            await saveFormData("RepeatedMeasuresDefine", newDefineData);
        } catch (error) {
            console.error("Failed to save define form data:", error);
        }

        setCombinationVars(nextCombinationVars);
        setFactorVars(nextFactorVars);

        // Reset SubVar to the new placeholder set so the main dialog shows the
        // correct slots for the user to fill.
        setFormData((prev) => ({
            ...prev,
            main: { ...prev.main, SubVar: nextCombinationVars },
        }));

        setIsDefineOpen(false);
        setIsMainOpen(true);
    };

    const resetDefineFormData = async () => {
        try {
            await clearFormData("RepeatedMeasuresDefine");
            setDefineData({ ...RepeatedMeasureDefineDefault });
        } catch (error) {
            console.error("Failed to clear define form data:", error);
        }
    };

    const executeRepeatedMeasures = async (
        mainData: RepeatedMeasuresMainType
    ) => {
        try {
            const newFormData = {
                ...formData,
                main: mainData,
                model: {
                    ...formData.model,
                    DefFactors: (factorVars ?? []).join(";"),
                },
            };

            await saveFormData("RepeatedMeasures", newFormData);

            await analyzeRepeatedMeasures({
                configData: newFormData,
                dataVariables,
                variables,
            });
        } catch (error) {
            console.error(error);
        }

        closeModal();
        onClose();
    };

    const resetFormData = async () => {
        try {
            await clearFormData("RepeatedMeasures");
            setFormData({ ...RepeatedMeasuresDefault });
        } catch (error) {
            console.error("Failed to clear form data:", error);
        }
    };

    const openSection = (
        section:
            | "define"
            | "main"
            | "model"
            | "contrast"
            | "plots"
            | "posthoc"
            | "emmeans"
            | "save"
            | "options"
    ) => {
        setIsDefineOpen(false);
        setIsMainOpen(false);
        setIsModelOpen(false);
        setIsContrastOpen(false);
        setIsPlotsOpen(false);
        setIsPostHocOpen(false);
        setIsEMMeansOpen(false);
        setIsSaveOpen(false);
        setIsOptionsOpen(false);

        switch (section) {
            case "define":
                setIsDefineOpen(true);
                break;
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
        }
    };

    const handleContinue = () => {
        openSection("main");
    };

    return (
        <div className="flex-grow overflow-y-auto flex flex-col h-full">
            {isDefineOpen && (
                <RepeatedMeasureDefineDialog
                    isDefineOpen={isDefineOpen}
                    setIsDefineOpen={(value) =>
                        value ? openSection("define") : setIsDefineOpen(false)
                    }
                    updateFormData={updateDefineFormData}
                    data={defineData.main}
                    onContinue={handleDefineContinue}
                    onReset={resetDefineFormData}
                />
            )}

            {isMainOpen && (
                <RepeatedMeasuresDialog
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
                    updateFormData={(field, value) =>
                        updateFormData("main", field, value)
                    }
                    data={formData.main}
                    globalVariables={tempVariables}
                    combinationVars={combinationVars}
                    onBack={() => openSection("define")}
                    onContinue={(mainData) => executeRepeatedMeasures(mainData)}
                    onReset={resetFormData}
                />
            )}

            {isModelOpen && (
                <RepeatedMeasuresModel
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
                <RepeatedMeasuresContrast
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
                <RepeatedMeasuresPlots
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
                <RepeatedMeasuresPostHoc
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
                <RepeatedMeasuresEMMeans
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
                <RepeatedMeasuresSave
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
                <RepeatedMeasuresOptions
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
        </div>
    );
};
