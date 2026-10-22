"use client";

import type { FC } from "react";
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useVariableStore } from "@/stores/useVariableStore";
import { useDataStore } from "@/stores/useDataStore";
import type { Variable } from "@/types/Variable";
import { useTimeHook } from "@/components/Modals/Analyze/TimeSeries/TimeSeriesTimeHook";
import { useOptionHook } from "@/components/Modals/Analyze/TimeSeries/ARDL/hooks/optionHook";
import { useAnalyzeHook } from "@/components/Modals/Analyze/TimeSeries/ARDL/hooks/analyzeHook";
import VariablesTab from "@/components/Modals/Analyze/TimeSeries/ARDL/VariablesTab";
import TimeTab from "@/components/Modals/Analyze/TimeSeries/TimeSeriesTimeTab";
import OptionTab from "@/components/Modals/Analyze/TimeSeries/ARDL/OptionTab";
import { useTimeSeriesSplit } from "@/components/Modals/Analyze/TimeSeries/Common/useTimeSeriesSplit";
import { TimeSeriesSplitTab } from "@/components/Modals/Analyze/TimeSeries/Common/TimeSeriesSplitTab";
import { getFormData, clearFormData } from "@/hooks/useIndexedDB";
import type { DataRow } from "@/types/Data";
import { toast } from "sonner";

interface ARDLProps {
    onClose: () => void;
    containerType?: string;
}

const ARDL: FC<ARDLProps> = ({ onClose, containerType }) => {
    const { variables } = useVariableStore();
    const { data } = useDataStore();
        
    const [availableVariables, setAvailableVariables] = useState<Variable[]>([]);
    const [dependentVariable, setDependentVariable] = useState<Variable[]>([]);
    const [independentVariables, setIndependentVariables] = useState<Variable[]>([]);
    const [highlightedVariable, setHighlightedVariable] = useState<{columnIndex: number, source: string} | null>(null);
    const [activeTab, setActiveTab] = useState("variables");
    const [saveLongRun, setSaveLongRun] = useState(false);
    const [saveShortRun, setSaveShortRun] = useState(false);

    const {
        periods,
        selectedPeriod,
        handleSelectedPeriod,
        inputPeriods,
        resetTime,
    } = useTimeHook();

    const {
        autoSelect,
        setAutoSelect,
        maxP,
        setMaxP,
        maxQ,
        setMaxQ,
        selectionCriterion,
        setSelectionCriterion,
        pOrder,
        qOrders,
        handlePOrder,
        handleQOrders,
        resetOptions,
    } = useOptionHook();

    const splitHook = useTimeSeriesSplit(0.8);

    const handleSaveSplitToDataView = async (
        totalRows: number,
        validRowIndices: number[],
        splitIndex: number,
        testPredictions?: number[]
    ) => {
        await splitHook.saveSplitToDataView({
            totalRows,
            validRowIndices,
            splitIndex,
            testPredictions,
            modelLabel: "ARDL"
        });
    };

    const { errorMsg: analysisError, isCalculating, handleAnalyzes } = useAnalyzeHook(
        dependentVariable,
        independentVariables,
        data,
        selectedPeriod,
        autoSelect,
        maxP,
        maxQ,
        selectionCriterion,
        pOrder,
        qOrders,
        saveLongRun,
        saveShortRun,
        {
            splitEnabled: splitHook.splitEnabled,
            splitMode: splitHook.splitMode,
            rollingType: splitHook.rollingType,
            trainRatio: splitHook.trainRatio,
            saveSplitVariable: splitHook.saveSplitVariable,
            savePredictions: splitHook.savePredictions
        },
        handleSaveSplitToDataView,
        onClose
    );
    
    const combinedError = analysisError;

    useEffect(() => {
        if (combinedError) {
            toast.error(`Error: ${String(combinedError)}`);
        }
    }, [combinedError]);

    useEffect(() => {
        const loadSavedState = async () => {
            try {
                const savedData = await getFormData("ARDL", "variables");
                const filteredVariables = variables.filter(v => v.name !== "");

                if (savedData?.prevDataRef) {
                    if (JSON.stringify(savedData.prevDataRef) !== JSON.stringify(data)) {
                        await clearFormData("ARDL");
                        setAvailableVariables(filteredVariables);
                        setDependentVariable([]);
                        setIndependentVariables([]);
                        return;
                    }
                }
                
                if (savedData?.dependentVariable) {
                    setDependentVariable(savedData.dependentVariable);
                }
                if (savedData?.independentVariables) {
                    setIndependentVariables(savedData.independentVariables);
                }
                
                const selectedVars = [...(savedData?.dependentVariable || []), ...(savedData?.independentVariables || [])];
                const remaining = filteredVariables.filter(
                    v => !selectedVars.some((sv: Variable) => sv.columnIndex === v.columnIndex)
                );
                setAvailableVariables(remaining);
            } catch (error) {
                console.error("Error loading saved state:", error);
                const filteredVariables = variables.filter(v => v.name !== "");
                setAvailableVariables(filteredVariables);
                setDependentVariable([]);
                setIndependentVariables([]);
            }
        };

        loadSavedState();
    }, [variables, data]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    const handleOk = () => {
        if (dependentVariable.length === 0 || independentVariables.length === 0) {
            toast.error("Please select at least one dependent and one independent variable");
            return;
        }
        handleAnalyzes();
    };

    const handleReset = async () => {
        const filteredVariables = variables.filter(v => v.name !== "");
        setAvailableVariables(filteredVariables);
        setDependentVariable([]);
        setIndependentVariables([]);
        resetTime();
        resetOptions();
        splitHook.resetSplit();
        await clearFormData("ARDL");
        toast.success("Form reset successfully");
    };

    const totalObs = dependentVariable.length > 0 && independentVariables.length > 0
        ? data.filter(row => {
            const yVal = row[dependentVariable[0].columnIndex];
            if (yVal === null || yVal === undefined || isNaN(Number(yVal))) return false;
            return independentVariables.every(iv => {
                const xVal = row[iv.columnIndex];
                return xVal !== null && xVal !== undefined && !isNaN(Number(xVal));
            });
        }).length
        : data.length;

    return (
        <div className="h-full flex flex-col">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                    <TabsTrigger value="time">Time</TabsTrigger>
                    <TabsTrigger value="options">Options</TabsTrigger>
                    <TabsTrigger value="split">Split Data</TabsTrigger>
                    <TabsTrigger value="save">Save</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-auto">
                    <TabsContent value="variables" className="h-full">
                        <VariablesTab
                            availableVariables={availableVariables}
                            dependentVariable={dependentVariable}
                            independentVariables={independentVariables}
                            highlightedVariable={highlightedVariable}
                            setAvailableVariables={setAvailableVariables}
                            setDependentVariable={setDependentVariable}
                            setIndependentVariables={setIndependentVariables}
                            setHighlightedVariable={setHighlightedVariable}
                            containerType={containerType}
                        />
                    </TabsContent>

                    <TabsContent value="time" className="h-full">
                        <TimeTab
                            periods={periods}
                            selectedPeriod={selectedPeriod}
                            handleSelectedPeriod={handleSelectedPeriod}
                            inputPeriods={inputPeriods}
                        />
                    </TabsContent>

                    <TabsContent value="options" className="h-full">
                        <OptionTab
                            autoSelect={autoSelect}
                            setAutoSelect={setAutoSelect}
                            maxP={maxP}
                            setMaxP={setMaxP}
                            maxQ={maxQ}
                            setMaxQ={setMaxQ}
                            selectionCriterion={selectionCriterion}
                            setSelectionCriterion={setSelectionCriterion}
                            pOrder={pOrder}
                            qOrders={qOrders}
                            independentVariables={independentVariables}
                            handlePOrder={handlePOrder}
                            handleQOrders={handleQOrders}
                        />
                    </TabsContent>

                    <TabsContent value="split" className="h-full">
                        <TimeSeriesSplitTab
                            splitEnabled={splitHook.splitEnabled}
                            setSplitEnabled={splitHook.setSplitEnabled}
                            splitMode={splitHook.splitMode}
                            setSplitMode={splitHook.setSplitMode}
                            rollingType={splitHook.rollingType}
                            setRollingType={splitHook.setRollingType}
                            trainRatio={splitHook.trainRatio}
                            setTrainRatio={splitHook.setTrainRatio}
                            saveSplitVariable={splitHook.saveSplitVariable}
                            setSaveSplitVariable={splitHook.setSaveSplitVariable}
                            savePredictions={splitHook.savePredictions}
                            setSavePredictions={splitHook.setSavePredictions}
                            totalObs={totalObs}
                            modelName="ARDL"
                        />
                    </TabsContent>

                    <TabsContent value="save" className="h-full">
                        <div className="space-y-6 p-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-foreground">Save Analysis Residuals</h3>
                                <p className="text-xs text-muted-foreground">
                                    Choose the residuals series you want to save back to the active dataset columns.
                                </p>
                                
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-start space-x-3">
                                        <Checkbox
                                            id="saveLongRun"
                                            checked={saveLongRun}
                                            onCheckedChange={(checked) => setSaveLongRun(!!checked)}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <label htmlFor="saveLongRun" className="text-sm font-medium leading-none cursor-pointer">
                                                Long-Run Equation Residuals (RES_LR)
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                Residuals from the long-run cointegration relationship (equilibrium error).
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start space-x-3">
                                        <Checkbox
                                            id="saveShortRun"
                                            checked={saveShortRun}
                                            onCheckedChange={(checked) => setSaveShortRun(!!checked)}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <label htmlFor="saveShortRun" className="text-sm font-medium leading-none cursor-pointer">
                                                Short-Run ARDL-ECM Residuals (RES_SR)
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                Residuals from the short-run dynamic error correction model.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleReset}>
                    Reset
                </Button>
                <Button variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleOk} 
                    disabled={isCalculating || dependentVariable.length === 0 || independentVariables.length === 0}
                >
                    {isCalculating ? "Calculating..." : "OK"}
                </Button>
            </div>
        </div>
    );
};

export default ARDL;
