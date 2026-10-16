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
import { useAnalyzeHook } from "@/components/Modals/Analyze/TimeSeries/HeteroskedasticityModels/hooks/analyzeHook";
import VariablesTab from "@/components/Modals/Analyze/TimeSeries/HeteroskedasticityModels/VariablesTab";
import TimeTab from "@/components/Modals/Analyze/TimeSeries/TimeSeriesTimeTab";
import { useTimeSeriesSplit } from "@/components/Modals/Analyze/TimeSeries/Common/useTimeSeriesSplit";
import { TimeSeriesSplitTab } from "@/components/Modals/Analyze/TimeSeries/Common/TimeSeriesSplitTab";
import { getFormData, saveFormData, clearFormData } from "@/hooks/useIndexedDB";
import type { DataRow } from "@/types/Data";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

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

    // Forecast Options State
    const [includeForecast, setIncludeForecast] = useState<boolean>(false);
    const [forecastHorizon, setForecastHorizon] = useState<number>(10);

    // Split Data Hook
    const splitHook = useTimeSeriesSplit(0.8);

    const {
        periods,
        selectedPeriod,
        handleSelectedPeriod,
        inputPeriods,
        resetTime,
    } = useTimeHook();

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
            modelLabel: modelType
        });
    };

    const { errorMsg, isCalculating, handleAnalyzes } = useAnalyzeHook(
        selectedVariables,
        data,
        selectedPeriod,
        pOrder,
        qOrder,
        modelType,
        includeForecast,
        forecastHorizon,
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

    useEffect(() => {
        if (errorMsg) {
            toast.error(`Error: ${errorMsg}`);
        }
    }, [errorMsg]);

    // Load saved state from IndexedDB
    useEffect(() => {
        const loadSavedState = async () => {
            try {
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
            toast.error("Please select a dependent variable");
            return;
        }
        handleAnalyzes();
    };

    const handleReset = async () => {
        const filteredVariables = variables.filter(v => v.name !== "");
        setAvailableVariables(filteredVariables);
        setSelectedVariables([]);
        setModelType("GARCH");
        setPOrder(1);
        setQOrder(1);
        setIncludeForecast(false);
        setForecastHorizon(10);
        splitHook.resetSplit();
        resetTime();
        await clearFormData("HeteroskedasticityModels");
        toast.success("Form reset successfully");
    };

    const totalObs = selectedVariables.length > 0 && selectedVariables[0]
        ? data.filter(row => {
            const v = row[selectedVariables[0].columnIndex];
            return v !== null && v !== undefined && !isNaN(Number(v));
        }).length
        : data.length;

    return (
        <div className="h-full flex flex-col">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                    <TabsTrigger value="time">Time</TabsTrigger>
                    <TabsTrigger value="options">Options</TabsTrigger>
                    <TabsTrigger value="forecast">Forecast</TabsTrigger>
                    <TabsTrigger value="split">Split Data</TabsTrigger>
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
                                Pilih spesifikasi model volatilitas yang akan diestimasi.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>ARCH Order (q)</Label>
                                <Input 
                                    type="number" 
                                    value={qOrder} 
                                    onChange={(e) => setQOrder(Math.max(1, parseInt(e.target.value) || 1))}
                                    min={1} 
                                />
                                <p className="text-xs text-muted-foreground">
                                    Lag kuadrat residual (shock volatilitas).
                                </p>
                            </div>
                            
                            {modelType !== "ARCH" && (
                                <div className="space-y-2">
                                    <Label>GARCH Order (p)</Label>
                                    <Input 
                                        type="number" 
                                        value={pOrder} 
                                        onChange={(e) => setPOrder(Math.max(1, parseInt(e.target.value) || 1))}
                                        min={1} 
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Lag ragam kondisional (persistensi volatilitas).
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t">
                            <Label className="mb-2 block">Optimasi Solver</Label>
                            <p className="text-xs text-muted-foreground">
                                Estimasi menggunakan algoritma optimasi numerik L-BFGS Quasi-Newton.
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="forecast" className="h-full p-6 space-y-5">
                        <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                            <Checkbox
                                id="include-garch-forecast"
                                checked={includeForecast}
                                onCheckedChange={(checked) => setIncludeForecast(!!checked)}
                                className="mt-1"
                            />
                            <div className="space-y-1">
                                <Label htmlFor="include-garch-forecast" className="text-sm font-semibold cursor-pointer">
                                    Sertakan Peramalan Multi-Step (Forecasting)
                                </Label>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Menghitung peramalan nilai mean (ŷ = μ) dan ragam kondisional (σ²_&#123;T+h&#125;) beberapa langkah ke depan beserta 95% Confidence Interval.
                                </p>
                            </div>
                        </div>

                        {includeForecast && (
                            <Card className="animate-in fade-in-50 duration-200">
                                <CardContent className="pt-5 space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Forecast Horizon (Langkah ke Depan)</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={forecastHorizon}
                                                onChange={(e) => setForecastHorizon(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
                                                className="w-32"
                                            />
                                            <span className="text-xs text-muted-foreground">periode / waktu ke depan (1 s.d. 100)</span>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-muted/40 rounded-md text-xs text-muted-foreground space-y-1 border">
                                        <p className="font-semibold text-foreground">Catatan Matematis Peramalan:</p>
                                        <ul className="list-disc list-inside space-y-0.5">
                                            <li>Prediksi Mean: ŷ = μ (konstanta mean equation).</li>
                                            <li>Interval Kepercayaan 95%: μ ± 1.96 · σ_&#123;T+h&#125;.</li>
                                            <li>Prediksi Ragam Multi-Step konvergen ke unconditional variance ω / (1 - α - β) jika model stasioner.</li>
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
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
                            modelName={modelType}
                        />
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
