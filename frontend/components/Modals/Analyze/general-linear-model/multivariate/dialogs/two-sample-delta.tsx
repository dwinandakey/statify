import React, { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVariableStore } from "@/stores/useVariableStore";
import { useDataStore } from "@/stores/useDataStore";
import { getSlicedData } from "@/hooks/useVariable";
import type { MultivariateTwoSampleDeltaProps } from "@/components/Modals/Analyze/general-linear-model/multivariate/types/multivariate";
import {
    factorLevels,
    normalizeDelta,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/services/two-sample-delta";

// Test Values (δ₀) for the two-population Hotelling T² test: H₀: μ₁ − μ₂ = δ₀,
// one entry per dependent variable, default 0. Same layout and buttons as
// the one-population Test Values (μ₀) dialog; the number of entries follows
// the Dependent Variables list.
export const MultivariateTwoSampleDelta = ({
    isTwoSampleDeltaOpen,
    setIsTwoSampleDeltaOpen,
    depVar,
    factor,
    delta0,
    onSave,
}: MultivariateTwoSampleDeltaProps) => {
    const variables = useVariableStore((state) => state.variables);
    const dataVariables = useDataStore((state) => state.data);

    // Levels in output-table order: μ₁ = first level, μ₂ = second level.
    const levels = useMemo(() => {
        if (!factor) return [];
        const sliced = getSlicedData({
            dataVariables: dataVariables as unknown as string[][],
            variables,
            selectedVariables: [factor],
        });
        return factorLevels((sliced?.[0] ?? []) as Record<string, any>[], factor);
    }, [dataVariables, variables, factor]);

    const [values, setValues] = useState<number[]>(() => normalizeDelta(delta0, depVar.length));

    useEffect(() => {
        if (isTwoSampleDeltaOpen) {
            setValues(normalizeDelta(delta0, depVar.length));
        }
    }, [isTwoSampleDeltaOpen, depVar, delta0]);

    const handleChange = (index: number, raw: string) => {
        const parsed = raw === "" || raw === "-" ? 0 : Number(raw);
        const safe = Number.isFinite(parsed) ? parsed : 0;
        setValues((prev) => {
            const next = [...prev];
            next[index] = safe;
            return next;
        });
    };

    const handleReset = () => {
        setValues(depVar.map(() => 0));
    };

    const handleContinue = () => {
        onSave(depVar.length === 0 ? null : [...values]);
        setIsTwoSampleDeltaOpen(false);
    };

    const handleCancel = () => {
        setIsTwoSampleDeltaOpen(false);
    };

    const twoLevels = levels.length === 2;
    const hypothesis = twoLevels
        ? `H₀: μ(${factor} = ${levels[0]}) − μ(${factor} = ${levels[1]}) = δ₀`
        : "H₀: μ₁ − μ₂ = δ₀";

    return (
        <Dialog open={isTwoSampleDeltaOpen} onOpenChange={setIsTwoSampleDeltaOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Test Values (δ₀) — Hotelling T² Dua Populasi
                    </DialogTitle>
                </DialogHeader>
                <Separator />
                <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">
                        Masukkan selisih vektor rata-rata hipotesis (δ₀) untuk
                        uji dua populasi (Equal maupun Unequal). Biarkan 0 untuk
                        uji standar μ₁ = μ₂.
                    </p>
                    <p id="two-sample-delta-hypothesis" className="text-sm font-medium">
                        {hypothesis}
                    </p>
                    {twoLevels ? (
                        <p className="text-xs text-muted-foreground">
                            μ₁ adalah level pertama {factor} ({levels[0]}) dan μ₂
                            level kedua ({levels[1]}), sesuai urutan pada tabel
                            Descriptive Statistics.
                        </p>
                    ) : (
                        <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">
                            δ₀ hanya berlaku bila Fixed Factor memiliki tepat 2
                            level{factor ? ` (${factor} memiliki ${levels.length} level)` : ""}.
                        </div>
                    )}

                    {depVar.length === 0 ? (
                        <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
                            Pilih Dependent Variables terlebih dahulu di
                            dialog utama.
                        </div>
                    ) : (
                        <ScrollArea className="max-h-[320px] pr-2">
                            <div className="flex flex-col gap-2">
                                {depVar.map((name, idx) => (
                                    <div
                                        key={`${name}-${idx}`}
                                        className="flex items-center gap-3"
                                    >
                                        <Label
                                            htmlFor={`delta0-2s-${idx}`}
                                            className="w-[160px] truncate text-sm"
                                            title={name}
                                        >
                                            {name}
                                        </Label>
                                        <Input
                                            id={`delta0-2s-${idx}`}
                                            type="number"
                                            step="any"
                                            placeholder="0"
                                            value={values[idx] ?? 0}
                                            onChange={(e) =>
                                                handleChange(idx, e.target.value)
                                            }
                                            className="flex-1"
                                        />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
                <DialogFooter className="sm:justify-start">
                    <Button type="button" onClick={handleContinue}>
                        Continue
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    {depVar.length > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                        >
                            Reset to 0
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
