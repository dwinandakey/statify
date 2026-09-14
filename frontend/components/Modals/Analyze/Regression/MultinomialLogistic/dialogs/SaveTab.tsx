"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SaveTabProps {
    options: {
        estimatedResponseProbabilities: boolean;
        predictedCategory: boolean;
        predictedCategoryProbability: boolean;
        actualCategoryProbability: boolean;
    };
    onChange: (saveOptions: {
        estimatedResponseProbabilities: boolean;
        predictedCategory: boolean;
        predictedCategoryProbability: boolean;
        actualCategoryProbability: boolean;
    }) => void;
}

export const SaveTab: React.FC<SaveTabProps> = ({ options, onChange }) => {

    const handleToggle = (key: keyof typeof options, checked: boolean | "indeterminate") => {
        onChange({
            ...options,
            [key]: checked === true,
        });
    };

    return (
        <div className="space-y-6 p-1">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">Saved Variables</h4>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs text-xs">
                                    Hasil estimasi model akan ditambahkan sebagai kolom baru di dataset (Data View).
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <div className="grid gap-4 bg-muted/20 p-4 rounded-lg border border-dashed text-sm">
                    {/* Estimated Response Probabilities */}
                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id="estimatedResponseProbabilities"
                            checked={options.estimatedResponseProbabilities}
                            onCheckedChange={(checked) => handleToggle("estimatedResponseProbabilities", checked)}
                            className="mt-1"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="estimatedResponseProbabilities" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Estimated response probabilities
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                                Simpan nilai peluang untuk setiap kategori variabel dependen.
                            </p>
                        </div>
                    </div>

                    {/* Predicted Category */}
                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id="predictedCategory"
                            checked={options.predictedCategory}
                            onCheckedChange={(checked) => handleToggle("predictedCategory", checked)}
                            className="mt-1"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="predictedCategory" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Predicted category
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                                Simpan kategori dengan probabilitas tertinggi untuk setiap baris data.
                            </p>
                        </div>
                    </div>

                    {/* Predicted Category Probability */}
                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id="predictedCategoryProbability"
                            checked={options.predictedCategoryProbability}
                            onCheckedChange={(checked) => handleToggle("predictedCategoryProbability", checked)}
                            className="mt-1"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="predictedCategoryProbability" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Predicted category probability
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                                Simpan probabilitas dari kategori yang diprediksi untuk setiap baris data.
                            </p>
                        </div>
                    </div>

                    {/* Actual Category Probability */}
                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id="actualCategoryProbability"
                            checked={options.actualCategoryProbability}
                            onCheckedChange={(checked) => handleToggle("actualCategoryProbability", checked)}
                            className="mt-1"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="actualCategoryProbability" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Actual category probability
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                                Simpan probabilitas dari kategori aktual/observed untuk setiap baris data.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-md">
                <p className="text-[10px] text-blue-700 leading-relaxed italic">
                    * Catatan: Nama variabel baru akan dibuat secara otomatis (misal: PRE_1, PRO_1, PREDP_1, ACTP_1)
                    agar tidak menimpa data asli Anda di Statify.
                </p>
            </div>
        </div>
    );
};