import React, { useEffect, useState } from "react";
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
import type { MultivariateTestValuesProps } from "@/components/Modals/Analyze/general-linear-model/multivariate/types/multivariate";

// Resize a stored μ₀ vector to match the current Dependent Variables list.
// Reuses existing values by position; pads new slots with 0.
const resizeTestValues = (
    depVar: string[],
    stored: number[] | null
): number[] => {
    const next: number[] = [];
    for (let i = 0; i < depVar.length; i++) {
        next.push(stored && i < stored.length ? stored[i] : 0);
    }
    return next;
};

export const MultivariateTestValues = ({
    isTestValuesOpen,
    setIsTestValuesOpen,
    depVar,
    testValues,
    onSave,
}: MultivariateTestValuesProps) => {
    const [values, setValues] = useState<number[]>(() =>
        resizeTestValues(depVar, testValues)
    );

    useEffect(() => {
        if (isTestValuesOpen) {
            setValues(resizeTestValues(depVar, testValues));
        }
    }, [isTestValuesOpen, depVar, testValues]);

    const handleChange = (index: number, raw: string) => {
        const parsed = raw === "" || raw === "-" ? 0 : Number(raw);
        const safe = Number.isFinite(parsed) ? parsed : 0;
        setValues((prev) => {
            const next = [...prev];
            next[index] = safe;
            return next;
        });
    };

    const handleClear = () => {
        setValues(depVar.map(() => 0));
    };

    const handleContinue = () => {
        if (depVar.length === 0) {
            onSave(null);
        } else {
            onSave([...values]);
        }
        setIsTestValuesOpen(false);
    };

    const handleCancel = () => {
        setIsTestValuesOpen(false);
    };

    return (
        <Dialog open={isTestValuesOpen} onOpenChange={setIsTestValuesOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Test Values (μ₀) — Hotelling T² Satu Populasi
                    </DialogTitle>
                </DialogHeader>
                <Separator />
                <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">
                        Masukkan vektor rata-rata hipotesis (μ₀) yang ingin
                        diuji. Kosongkan atau biarkan 0 untuk uji standar
                        terhadap vektor nol.
                    </p>

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
                                            htmlFor={`mu0-${idx}`}
                                            className="w-[160px] truncate text-sm"
                                            title={name}
                                        >
                                            {name}
                                        </Label>
                                        <Input
                                            id={`mu0-${idx}`}
                                            type="number"
                                            step="any"
                                            placeholder="0"
                                            value={values[idx] ?? 0}
                                            onChange={(e) =>
                                                handleChange(
                                                    idx,
                                                    e.target.value
                                                )
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
                            onClick={handleClear}
                        >
                            Reset to 0
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
