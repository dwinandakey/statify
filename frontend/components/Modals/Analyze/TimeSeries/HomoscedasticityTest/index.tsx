
"use client";

import React, { useState } from "react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { useVariableStore } from "@/stores/useVariableStore";
import { useDataStore } from "@/stores/useDataStore";
import type { Variable } from "@/types/Variable";
import { useAnalyzeHook } from "@/components/Modals/Analyze/TimeSeries/HomoscedasticityTest/hooks/analyzeHook";
import VariablesTab from "@/components/Modals/Analyze/TimeSeries/HeteroskedasticityModels/VariablesTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface HomoscedasticityTestProps {
    onClose: () => void;
    containerType?: string;
}

const HomoscedasticityTest: FC<HomoscedasticityTestProps> = ({ onClose, containerType }) => {
    const { variables } = useVariableStore();
    const { data } = useDataStore();
        
    const [availableVariables, setAvailableVariables] = useState<Variable[]>(variables.filter(v => v.name !== ""));
    const [selectedVariables, setSelectedVariables] = useState<Variable[]>([]);
    const [highlightedVariable, setHighlightedVariable] = useState<{columnIndex: number, source: 'available' | 'selected'} | null>(null);
    
    // Lags state
    const [lags, setLags] = useState<number>(1);
    
    const { errorMsg, isCalculating, handleAnalyze } = useAnalyzeHook(
        selectedVariables,
        data,
        lags,
        onClose
    );

    const handleLagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLags(Number(e.target.value));
    };

    return (
        <div className="h-full flex flex-col">            
            <Tabs defaultValue="variables" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                    <TabsTrigger value="options">Options</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-auto">
                    <TabsContent value="variables" className="h-full">
                         {/* Reuse VariablesTab but limit to 1 selection */}
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

                    <TabsContent value="options" className="h-full p-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="lags">Number of Lags (q)</Label>
                            <Input 
                                id="lags" 
                                type="number" 
                                value={lags} 
                                onChange={handleLagsChange} 
                                min={1} 
                            />
                            <p className="text-xs text-muted-foreground">
                                Number of lagged squared residuals to include in the test regression.
                            </p>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            {errorMsg && (
                <div className="px-4 text-red-500 text-sm">
                    {errorMsg}
                </div>
            )}

            <div className="flex justify-end gap-2 p-4 border-t">
                <Button variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button onClick={handleAnalyze} disabled={isCalculating || selectedVariables.length === 0}>
                    {isCalculating ? "Testing..." : "Run Test"}
                </Button>
            </div>
        </div>
    );
};

export default HomoscedasticityTest;
