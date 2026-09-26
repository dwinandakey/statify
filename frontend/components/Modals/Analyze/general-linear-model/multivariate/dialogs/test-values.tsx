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
import {
    parseKnownSigma,
    setSigmaCell,
    sigmaCellsFrom,
    type SigmaCells,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/services/known-sigma";
import {
    KnownSigmaCheckbox,
    KnownSigmaError,
    KnownSigmaHint,
    KnownSigmaMatrix,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/dialogs/known-sigma-matrix";

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
    knownSigma,
    onSaveKnownSigma,
}: MultivariateTestValuesProps) => {
    const [values, setValues] = useState<number[]>(() =>
        resizeTestValues(depVar, testValues)
    );
    // Known Σ (one-population chi-square test); unchecked by default.
    const [sigmaKnown, setSigmaKnown] = useState<boolean>(Boolean(knownSigma));
    const [sigmaCells, setSigmaCells] = useState<SigmaCells>(() =>
        sigmaCellsFrom(knownSigma, depVar.length)
    );
    const [sigmaError, setSigmaError] = useState<string | null>(null);

    useEffect(() => {
        if (isTestValuesOpen) {
            setValues(resizeTestValues(depVar, testValues));
            setSigmaKnown(Boolean(knownSigma));
            setSigmaCells(sigmaCellsFrom(knownSigma, depVar.length));
            setSigmaError(null);
        }
    }, [isTestValuesOpen, depVar, testValues, knownSigma]);

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
        // With Σ known the matrix is validated first; on an error the
        // dialog stays open and shows the message.
        let sigma: number[][] | null = null;
        if (sigmaKnown && depVar.length > 0) {
            const parsed = parseKnownSigma(sigmaCells, depVar.length, "Known covariance matrix Σ");
            if (parsed.error !== undefined) {
                setSigmaError(parsed.error);
                return;
            }
            sigma = parsed.matrix;
        }
        if (depVar.length === 0) {
            onSave(null);
        } else {
            onSave([...values]);
        }
        onSaveKnownSigma(sigma);
        setIsTestValuesOpen(false);
    };

    const handleCancel = () => {
        setIsTestValuesOpen(false);
    };

    return (
        <Dialog open={isTestValuesOpen} onOpenChange={setIsTestValuesOpen}>
            <DialogContent className={sigmaKnown ? "sm:max-w-3xl max-h-[90vh] overflow-y-auto" : "sm:max-w-md"}>
                <DialogHeader>
                    <DialogTitle>
                        Multivariate: Test Values (μ₀)
                    </DialogTitle>
                </DialogHeader>
                <Separator />
                <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">
                        Enter the hypothesized mean vector (μ₀) for the
                        one-sample Hotelling T² test. Leave 0 to test against
                        the zero vector.
                    </p>

                    {depVar.length === 0 ? (
                        <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
                            Select the Dependent Variables in the main dialog
                            first.
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

                    {depVar.length > 0 && (
                        <div className="flex flex-col gap-2 rounded-md border p-3">
                            <KnownSigmaCheckbox
                                id="known-sigma-checkbox"
                                checked={sigmaKnown}
                                onCheckedChange={(checked) => {
                                    setSigmaKnown(checked);
                                    setSigmaError(null);
                                }}
                            />
                            {sigmaKnown && (
                                <>
                                    <p className="text-xs text-muted-foreground">
                                        The chi-square test χ² = n(x̄ − μ₀)ᵀΣ⁻¹(x̄ − μ₀),
                                        df = p, is shown next to the Hotelling
                                        T² test.
                                    </p>
                                    <KnownSigmaHint />
                                    <KnownSigmaMatrix
                                        idPrefix="known-sigma"
                                        title="Σ"
                                        names={depVar}
                                        cells={sigmaCells}
                                        onChange={(i, j, v) => {
                                            setSigmaCells((prev) => setSigmaCell(prev, i, j, v));
                                            setSigmaError(null);
                                        }}
                                    />
                                    <KnownSigmaError id="known-sigma-error" message={sigmaError} />
                                </>
                            )}
                        </div>
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
