import React from "react"
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrdinalOptionsParams } from "../types/ordinal";

interface Props { params: OrdinalOptionsParams, onChange: (params: Partial<OrdinalOptionsParams>) => void; }
export const OptionsTab: React.FC<Props> = ({ params, onChange }) => {
    return (
        <div className="grid grid-cols-2 gap-8 py-4 h-full overflow-y-auto">
            <div className="space-y-6">
                <div className="space-y-3">
                    <h4 className="font-semibold text-sm border-b pb-1 mb-2">
                      Iteration
                    </h4>
                    <div>
                        <Label>Maximum Iterations</Label>
                        <Input 
                            type="number" 
                            value={params.maxIterations} 
                            onChange={(e) => onChange({ maxIterations: Number(e.target.value) })} 
                            />
                    </div>
                    <div><Label>Maximum step-halving</Label><Input type="number" value={params.maxStepHalving} onChange={(e) => onChange({ maxStepHalving: Number(e.target.value) })} /></div>
                    <div><Label>Log-likelihood convergence</Label><Input type="number" value={params.logLikelihoodConvergence} onChange={(e) => onChange({ logLikelihoodConvergence: Number(e.target.value) })} /></div>
                    <div><Label>Parameter convergence</Label><Input type="number" value={params.parameterConvergence} onChange={(e) => onChange({ parameterConvergence: Number(e.target.value) })} /></div>
                </div>
            </div>
            <div className="space-y-6">
            <div><Label>Confidence Interval</Label><Input type="number" value={params.confidenceInterval} onChange={(e) => onChange({ confidenceInterval: Number(e.target.value) })} /></div>
            <div><Label>Delta</Label><Input type="number" value={params.delta} onChange={(e) => onChange({ delta: Number(e.target.value) })} /></div>
            <div><Label>Singularity Tolerance</Label><Input type="number" value={params.singularityTolerance} onChange={(e) => onChange({ singularityTolerance: Number(e.target.value) })} /></div>
            <div>
                <Label>Link Function</Label>
                <Select value={params.linkFunction} onValueChange={(value: any) => onChange({ linkFunction: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Logit">Logit</SelectItem>
                        <SelectItem value="Probit">Probit</SelectItem>
                        <SelectItem value="Complementary Log-Log">Complementary Log-Log</SelectItem>
                        <SelectItem value="Negative Log-Log">Negative Log-Log</SelectItem>
                        <SelectItem value="Cauchit">Cauchit</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            </div>
            
        </div>
    );
};