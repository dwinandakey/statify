
"use client";

import type { FC } from "react";
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useVariableStore } from "@/stores/useVariableStore";
import { useDataStore } from "@/stores/useDataStore";
import type { Variable } from "@/types/Variable";
import { useTimeHook } from "@/components/Modals/Analyze/TimeSeries/TimeSeriesTimeHook";
import { useAnalyzeHook } from "@/components/Modals/Analyze/TimeSeries/HeteroskedasticityModels/hooks/analyzeHook";
import VariablesTab from "@/components/Modals/Analyze/TimeSeries/HeteroskedasticityModels/VariablesTab";
import TimeTab from "@/components/Modals/Analyze/TimeSeries/TimeSeriesTimeTab";
import { getFormData, saveFormData, clearFormData } from "@/hooks/useIndexedDB";
import type { DataRow } from "@/types/Data";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HeteroskedasticityModelsProps {
    onClose: () => void;
    containerType?: string;
}

const HeteroskedasticityModels: FC<HeteroskedasticityModelsProps> = ({ onClose, containerType }) => {
    const { variables } = useVariableStore();
    const { data } = useDataStore();
        
    const [availableVariables, setAvailableVariables] = useState<Variable[]>([]);
    const [selectedVariables, setSelectedVariables] = useState<Variable[]>([]);
    const [highlightedVariable, setHighlightedVariable] = useState<{columnIndex: number, source: 'available' | 'selected'} | null>(null);
    const [prevDataRef, setPrevDataRef] = useState<DataRow[] | null>(null);
    
    // Model Options State
    const [activeTab, setActiveTab] = useState("variables");
    const [modelType, setModelType] = useState<string>("GARCH");
    const [pOrder, setPOrder] = useState<number>(1); // GARCH order / ARCH order for ARCH model
    const [qOrder, setQOrder] = useState<number>(1); // ARCH order for GARCH model

    const {
        periods,
        selectedPeriod,
        handleSelectedPeriod,
        inputPeriods,
        resetTime,
    } = useTimeHook();

    const { errorMsg, isCalculating, handleAnalyzes } = useAnalyzeHook(
        selectedVariables,
        data,
        selectedPeriod,
        pOrder,
        qOrder,
        modelType,
        onClose
    );
    

    useEffect(() => {
        if (errorMsg) {
            toast.error(`Error: ${errorMsg}`);
        }
    }, [errorMsg]);

    // Load saved state from IndexedDB
    useEffect(() => {
        const loadSavedState = async () => {
            try {
                // Determine form ID based on model type? Or just generic?
                // Using generic "HeteroModels" for shared state
                const savedData = await getFormData("HeteroskedasticityModels", "variables");
                const filteredVariables = variables.filter(v => v.name !== "");

                if (savedData?.prevDataRef) {
                    setPrevDataRef(savedData.prevDataRef);
                    if (JSON.stringify(savedData.prevDataRef) !== JSON.stringify(data)) {
                        await clearFormData("HeteroskedasticityModels");
                        setAvailableVariables(filteredVariables);
                        setSelectedVariables([]);
                        return;
                    }
                }
                
                if (savedData?.selectedVariables && savedData?.selectedVariables.length > 0) {
                    setSelectedVariables(savedData.selectedVariables);
                    const remaining = filteredVariables.filter(
                        v => !savedData.selectedVariables.some((sv: Variable) => sv.columnIndex === v.columnIndex)
                    );
                    setAvailableVariables(remaining);
                } else {
                    setAvailableVariables(filteredVariables);
                    setSelectedVariables([]);
                }
            } catch (error) {
                console.error("Error loading saved state:", error);
                const filteredVariables = variables.filter(v => v.name !== "");
                setAvailableVariables(filteredVariables);
                setSelectedVariables([]);
            }
        };

        loadSavedState();
    }, [variables, data]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    const handleOk = () => {
        if (selectedVariables.length === 0) {
            toast.error("Please select at least one variable");
            return;
        }
        handleAnalyzes();
    };

    const handleReset = async () => {
        const filteredVariables = variables.filter(v => v.name !== "");
        setAvailableVariables(filteredVariables);
        setSelectedVariables([]);
        resetTime();
        setModelType("GARCH");
        setPOrder(1);
        setQOrder(1);
        await clearFormData("HeteroskedasticityModels");
        toast.success("Form reset successfully");
    };

    return (
        <div className="h-full flex flex-col">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                    <TabsTrigger value="time">Time</TabsTrigger>
                    <TabsTrigger value="options">Model</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-auto">
                    <TabsContent value="variables" className="h-full">
                        <VariablesTab
                            availableVariables={availableVariables}
                            selectedVariables={selectedVariables}
                            highlightedVariable={highlightedVariable}
                            setAvailableVariables={setAvailableVariables}
                            setSelectedVariables={setSelectedVariables}
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

                    <TabsContent value="options" className="h-full p-6 space-y-6">
                        <div className="space-y-2">
                            <Label>Model Type</Label>
                            <Select value={modelType} onValueChange={setModelType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GARCH">GARCH (Standard)</SelectItem>
                                    <SelectItem value="EGARCH">EGARCH (Exponential)</SelectItem>
                                    <SelectItem value="TGARCH">TGARCH (Threshold/GJR)</SelectItem>
                                    <SelectItem value="IGARCH">IGARCH (Integrated GARCH)</SelectItem>
                                    <SelectItem value="ARCH">ARCH (Autoregressive Conditional Heteroscedasticity)</SelectItem>
                                </SelectContent>
                            </Select>
                             <p className="text-xs text-muted-foreground">
                                Select the specific volatility model specification.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>ARCH Order (q)</Label>
                                <Input 
                                    type="number" 
                                    value={qOrder} 
                                    onChange={(e) => setQOrder(parseInt(e.target.value) || 1)}
                                    min={1} 
                                />
                                <p className="text-xs text-muted-foreground">
                                    Lags of squared residuals.
                                </p>
                            </div>
                            
                            {modelType !== "ARCH" && (
                                <div className="space-y-2">
                                    <Label>GARCH Order (p)</Label>
                                    <Input 
                                        type="number" 
                                        value={pOrder} 
                                        onChange={(e) => setPOrder(parseInt(e.target.value) || 1)}
                                        min={1} 
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Lags of conditional variance.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t">
                            <Label className="mb-2 block">Solver Options</Label>
                            <p className="text-xs text-muted-foreground">
                                Currently using L-BFGS optimization.
                            </p>
                             {/* Future: Add Distribution and Restriction options here */}
                        </div>

                    </TabsContent>
                </div>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t text-sm px-4 pb-4">
                <Button variant="outline" onClick={handleReset}>
                    Reset
                </Button>
                <Button variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button onClick={handleOk} disabled={isCalculating || selectedVariables.length === 0}>
                    {isCalculating ? "Estimating..." : "Estimate"}
                </Button>
            </div>
        </div>
    );
};

export default HeteroskedasticityModels;
