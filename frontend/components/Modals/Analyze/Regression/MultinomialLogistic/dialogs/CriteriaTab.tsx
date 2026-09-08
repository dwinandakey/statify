"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface CriteriaTabProps {
    options: {
        iterations: number;
        pconverge: number;
        lconverge: number;
        singularity: number;
        delta: number;
    };
    onChange: (criteria: any) => void;
}

export const CriteriaTab: React.FC<CriteriaTabProps> = ({ options, onChange }) => {

    const handleInputChange = (field: string, value: string) => {
        const numValue = parseFloat(value);
        onChange({
            ...options,
            [field]: isNaN(numValue) ? 0 : numValue,
        });
    };

    return (
        <div className="space-y-5 p-1">
            {/* 1. Iterations Panel */}
            <section className="rounded-md border bg-muted/10 p-4">
                <div className="flex items-center gap-2 mb-1">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Iterations
                    </Label>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground opacity-60 hover:opacity-100 cursor-help transition-opacity" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-blue-600 dark:bg-blue-700 text-white border-blue-500 shadow-md">
                                <p className="max-w-xs text-xs normal-case font-normal">
                                    Pengaturan batas maksimum perulangan algoritma untuk menemukan estimasi parameter terbaik.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <p className="text-[10px] text-muted-foreground mb-4">
                    Kontrol proses estimasi Model Likelihood.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Maximum Iterations */}
                    <div className="space-y-1.5">
                        <Label htmlFor="iterations" className="text-xs">Maximum iterations:</Label>
                        <Input
                            id="iterations"
                            type="number"
                            value={options.iterations}
                            onChange={(e) => handleInputChange("iterations", e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>

                    {/* Parameter convergence criterion */}
                    <div className="space-y-1.5">
                        <Label htmlFor="pconverge" className="text-xs">Parameter convergence:</Label>
                        <Input
                            id="pconverge"
                            type="number"
                            step="0.000001"
                            value={options.pconverge}
                            onChange={(e) => handleInputChange("pconverge", e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>

                    {/* Log-likelihood convergence criterion */}
                    <div className="space-y-1.5">
                        <Label htmlFor="lconverge" className="text-xs">Log-likelihood convergence:</Label>
                        <Input
                            id="lconverge"
                            type="number"
                            step="0.000001"
                            value={options.lconverge}
                            onChange={(e) => handleInputChange("lconverge", e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                </div>
            </section>

            {/* 2. Tolerance & Singularity Panel */}
            <section className="rounded-md border bg-muted/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Tolerance & Singularity
                    </Label>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground opacity-60 hover:opacity-100 cursor-help transition-opacity" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-blue-600 dark:bg-blue-700 text-white border-blue-500 shadow-md">
                                <p className="max-w-xs text-xs normal-case font-normal">
                                    Pengaturan kriteria singularitas matriks dan delta penyesuaian sel data kosong.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Singularity Criterion */}
                    <div className="space-y-1.5">
                        <Label htmlFor="singularity" className="text-xs">Singularity criterion:</Label>
                        <Input
                            id="singularity"
                            type="number"
                            step="0.000000001"
                            value={options.singularity}
                            onChange={(e) => handleInputChange("singularity", e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>

                    {/* Cell Delta */}
                    <div className="space-y-1.5">
                        <Label htmlFor="delta" className="text-xs">Added to empty cells (Delta):</Label>
                        <Input
                            id="delta"
                            type="number"
                            step="0.1"
                            value={options.delta}
                            onChange={(e) => handleInputChange("delta", e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};