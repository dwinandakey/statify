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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
    knownSigma,
    onSaveKnownSigma,
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

    // Known Σ: one matrix (Σ₁ = Σ₂ = Σ) or one per factor level (Σ₁, Σ₂).
    const p = depVar.length;
    const [sigmaKnown, setSigmaKnown] = useState<boolean>(Boolean(knownSigma));
    const [sigmaMode, setSigmaMode] = useState<"common" | "separate">(knownSigma?.mode ?? "common");
    const [cells, setCells] = useState<SigmaCells>(() => sigmaCellsFrom(knownSigma?.sigma, p));
    const [cells1, setCells1] = useState<SigmaCells>(() => sigmaCellsFrom(knownSigma?.sigma1, p));
    const [cells2, setCells2] = useState<SigmaCells>(() => sigmaCellsFrom(knownSigma?.sigma2, p));
    const [sigmaError, setSigmaError] = useState<string | null>(null);

    useEffect(() => {
        if (isTwoSampleDeltaOpen) {
            setValues(normalizeDelta(delta0, depVar.length));
            setSigmaKnown(Boolean(knownSigma));
            setSigmaMode(knownSigma?.mode ?? "common");
            setCells(sigmaCellsFrom(knownSigma?.sigma, depVar.length));
            setCells1(sigmaCellsFrom(knownSigma?.sigma1, depVar.length));
            setCells2(sigmaCellsFrom(knownSigma?.sigma2, depVar.length));
            setSigmaError(null);
        }
    }, [isTwoSampleDeltaOpen, depVar, delta0, knownSigma]);

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
        // With Σ known the matrices are validated first; on an error the
        // dialog stays open and shows the message.
        let sigma: MultivariateTwoSampleDeltaProps["knownSigma"] = null;
        if (sigmaKnown && p > 0) {
            if (sigmaMode === "common") {
                const parsed = parseKnownSigma(cells, p, "Known covariance matrix Σ");
                if (parsed.error !== undefined) {
                    setSigmaError(parsed.error);
                    return;
                }
                sigma = { mode: "common", sigma: parsed.matrix };
            } else {
                const parsed1 = parseKnownSigma(cells1, p, `Known covariance matrix ${sigma1Title}`);
                if (parsed1.error !== undefined) {
                    setSigmaError(parsed1.error);
                    return;
                }
                const parsed2 = parseKnownSigma(cells2, p, `Known covariance matrix ${sigma2Title}`);
                if (parsed2.error !== undefined) {
                    setSigmaError(parsed2.error);
                    return;
                }
                sigma = { mode: "separate", sigma1: parsed1.matrix, sigma2: parsed2.matrix };
            }
        }
        onSave(depVar.length === 0 ? null : [...values]);
        onSaveKnownSigma(sigma);
        setIsTwoSampleDeltaOpen(false);
    };

    const handleCancel = () => {
        setIsTwoSampleDeltaOpen(false);
    };

    const twoLevels = levels.length === 2;
    const hypothesis = twoLevels
        ? `H₀: μ(${factor} = ${levels[0]}) − μ(${factor} = ${levels[1]}) = δ₀`
        : "H₀: μ₁ − μ₂ = δ₀";
    const sigma1Title = twoLevels ? `Σ₁ (${factor} = ${levels[0]})` : "Σ₁";
    const sigma2Title = twoLevels ? `Σ₂ (${factor} = ${levels[1]})` : "Σ₂";
    const clearError = () => setSigmaError(null);

    return (
        <Dialog open={isTwoSampleDeltaOpen} onOpenChange={setIsTwoSampleDeltaOpen}>
            <DialogContent className={sigmaKnown ? "sm:max-w-3xl max-h-[90vh] overflow-y-auto" : "sm:max-w-md"}>
                <DialogHeader>
                    <DialogTitle>
                        Multivariate: Test Values (δ₀)
                    </DialogTitle>
                </DialogHeader>
                <Separator />
                <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">
                        Enter the hypothesized difference of the mean vectors
                        (δ₀) for the two-sample Hotelling T² test (Equal or
                        Unequal). Leave 0 to test μ₁ = μ₂.
                    </p>
                    <p id="two-sample-delta-hypothesis" className="text-sm font-medium">
                        {hypothesis}
                    </p>
                    {twoLevels ? (
                        <p className="text-xs text-muted-foreground">
                            μ₁ is the first level of {factor} ({levels[0]}) and
                            μ₂ the second level ({levels[1]}), in the order of
                            the Descriptive Statistics table.
                        </p>
                    ) : (
                        <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">
                            δ₀ applies only when the Fixed Factor has exactly 2
                            levels{factor ? ` (${factor} has ${levels.length} levels)` : ""}.
                        </div>
                    )}

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

                    {depVar.length > 0 && (
                        <div className="flex flex-col gap-2 rounded-md border p-3">
                            <KnownSigmaCheckbox
                                id="two-sample-known-sigma-checkbox"
                                checked={sigmaKnown}
                                onCheckedChange={(checked) => {
                                    setSigmaKnown(checked);
                                    clearError();
                                }}
                            />
                            {sigmaKnown && (
                                <>
                                    <RadioGroup
                                        value={sigmaMode}
                                        onValueChange={(v) => {
                                            setSigmaMode(v as "common" | "separate");
                                            clearError();
                                        }}
                                        className="flex flex-col gap-1"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="common" id="known-sigma-common" />
                                            <Label htmlFor="known-sigma-common" className="text-sm cursor-pointer">
                                                Σ₁ = Σ₂ = Σ (one matrix)
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="separate" id="known-sigma-separate" />
                                            <Label htmlFor="known-sigma-separate" className="text-sm cursor-pointer">
                                                Σ₁ and Σ₂ (one matrix per level)
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                    <p className="text-xs text-muted-foreground">
                                        The chi-square test χ² = (x̄₁ − x̄₂ − δ₀)ᵀV⁻¹(x̄₁ − x̄₂ − δ₀),
                                        with V = (1/n₁ + 1/n₂)Σ or Σ₁/n₁ + Σ₂/n₂ and
                                        df = p, is shown next to the Hotelling T² test.
                                    </p>
                                    <KnownSigmaHint />
                                    {sigmaMode === "common" ? (
                                        <KnownSigmaMatrix
                                            idPrefix="two-sample-known-sigma"
                                            title="Σ"
                                            names={depVar}
                                            cells={cells}
                                            onChange={(i, j, v) => {
                                                setCells((prev) => setSigmaCell(prev, i, j, v));
                                                clearError();
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <KnownSigmaMatrix
                                                idPrefix="two-sample-known-sigma1"
                                                title={sigma1Title}
                                                names={depVar}
                                                cells={cells1}
                                                onChange={(i, j, v) => {
                                                    setCells1((prev) => setSigmaCell(prev, i, j, v));
                                                    clearError();
                                                }}
                                            />
                                            <KnownSigmaMatrix
                                                idPrefix="two-sample-known-sigma2"
                                                title={sigma2Title}
                                                names={depVar}
                                                cells={cells2}
                                                onChange={(i, j, v) => {
                                                    setCells2((prev) => setSigmaCell(prev, i, j, v));
                                                    clearError();
                                                }}
                                            />
                                        </>
                                    )}
                                    <KnownSigmaError id="two-sample-known-sigma-error" message={sigmaError} />
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
