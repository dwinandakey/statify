import type { FC } from "react";
import React, { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Variable } from "@/types/Variable";

interface OptionTabProps {
    autoSelect: boolean;
    setAutoSelect: (val: boolean) => void;
    maxP: number;
    setMaxP: (val: number) => void;
    maxQ: number;
    setMaxQ: (val: number) => void;
    selectionCriterion: "aic" | "bic" | "hq";
    setSelectionCriterion: (val: "aic" | "bic" | "hq") => void;
    pOrder: number;
    qOrders: number[];
    independentVariables: Variable[];
    handlePOrder: (value: number) => void;
    handleQOrders: (value: number[]) => void;
}

const OptionTab: FC<OptionTabProps> = ({
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
    independentVariables,
    handlePOrder,
    handleQOrders,
}) => {
    useEffect(() => {
        const nVars = independentVariables.length;
        if (nVars > 0 && qOrders.length !== nVars) {
            const newQOrders = Array(nVars).fill(0).map((_, i) => qOrders[i] || 1);
            handleQOrders(newQOrders);
        }
    }, [independentVariables.length, qOrders, handleQOrders]);

    const handleQOrderChange = (index: number, value: number) => {
        const newQOrders = [...qOrders];
        newQOrders[index] = value;
        handleQOrders(newQOrders);
    };

    return (
        <div className="space-y-6 p-4">
            {/* Automatic vs Manual Selection */}
            <div className="flex items-center space-x-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg">
                <Checkbox
                    id="autoSelect"
                    checked={autoSelect}
                    onCheckedChange={(checked) => setAutoSelect(!!checked)}
                />
                <div className="grid gap-1">
                    <label htmlFor="autoSelect" className="text-sm font-medium cursor-pointer">
                        Automatic Lag Selection (Recommended like EViews)
                    </label>
                    <p className="text-xs text-muted-foreground">
                        Automatically evaluates all model combinations up to Max Lags and selects the model with lowest criterion value.
                    </p>
                </div>
            </div>

            {autoSelect ? (
                <div className="space-y-4 border rounded-lg p-4 bg-background">
                    <h4 className="text-sm font-semibold text-foreground">Automatic Lag Selection Settings</h4>
                    
                    <div className="space-y-2">
                        <Label htmlFor="selectionCriterion">Model Selection Criterion</Label>
                        <Select
                            value={selectionCriterion}
                            onValueChange={(val) => setSelectionCriterion(val as "aic" | "bic" | "hq")}
                        >
                            <SelectTrigger id="selectionCriterion">
                                <SelectValue placeholder="Select criterion" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aic">Akaike Info Criterion (AIC - EViews Default)</SelectItem>
                                <SelectItem value="bic">Schwarz Criterion (BIC / SC)</SelectItem>
                                <SelectItem value="hq">Hannan-Quinn Criterion (HQ)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="maxP">Max AR Lag for Y (max p)</Label>
                            <Input
                                id="maxP"
                                type="number"
                                min={1}
                                max={8}
                                value={maxP}
                                onChange={(e) => setMaxP(Math.max(1, Math.min(8, parseInt(e.target.value) || 4)))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxQ">Max DL Lag for X (max q)</Label>
                            <Input
                                id="maxQ"
                                type="number"
                                min={0}
                                max={8}
                                value={maxQ}
                                onChange={(e) => setMaxQ(Math.max(0, Math.min(8, parseInt(e.target.value) || 4)))}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 border rounded-lg p-4 bg-background">
                    <h4 className="text-sm font-semibold text-foreground">Manual Fixed Lag Orders</h4>
                    
                    <div className="space-y-2">
                        <Label htmlFor="pOrder">AR Order (p) for Y</Label>
                        <Input
                            id="pOrder"
                            type="number"
                            min={0}
                            max={5}
                            value={pOrder}
                            onChange={(e) => handlePOrder(Math.max(0, Math.min(5, parseInt(e.target.value) || 1)))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Number of lags of dependent variable Y (typically 1-2)
                        </p>
                    </div>

                    {independentVariables.length > 0 && (
                        <div className="space-y-4 pt-2">
                            <Label>DL Orders (q) for X variables</Label>
                            {independentVariables.map((xVar, index) => (
                                <div key={xVar.columnIndex} className="space-y-2">
                                    <Label htmlFor={`qOrder${index}`} className="text-sm">
                                        q{index + 1} for {xVar.name}
                                    </Label>
                                    <Input
                                        id={`qOrder${index}`}
                                        type="number"
                                        min={0}
                                        max={5}
                                        value={qOrders[index] || 1}
                                        onChange={(e) => handleQOrderChange(index, Math.max(0, Math.min(5, parseInt(e.target.value) || 1)))}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Model Specification</h4>
                {independentVariables.length > 0 ? (
                    <>
                        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {autoSelect 
                                ? `Automatic Search: ARDL(1..${maxP}, 0..${maxQ}) via ${selectionCriterion.toUpperCase()}`
                                : `Fixed Model: ARDL(${pOrder}, ${qOrders.join(', ')})`
                            }
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Unrestricted ARDL: Yₜ = C + Σαᵢ·Yₜ₋ᵢ + Σγⱼ·Xⱼ,ₜ₋ⱼ + εₜ
                        </p>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Select independent variables to configure lag orders
                    </p>
                )}
            </div>
        </div>
    );
};

export default OptionTab;

