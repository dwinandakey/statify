import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useVariableStore } from "@/stores/useVariableStore";
import { useDataStore } from "@/stores/useDataStore";
import type { Variable } from "@/types/Variable";
import type {
    MultivariatePairedProps,
    PairedModeType,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/types/multivariate";
import PairedVariablesTab, {
    type PairedHighlightedPair,
    type PairedHighlightedVariable,
} from "@/components/Common/PairedVariablesTab";
import { computeDifferencePreview } from "@/components/Modals/Analyze/general-linear-model/multivariate/services/paired-difference";

const formatPreviewCell = (
    value: number | string | null | undefined
): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") {
        if (!Number.isFinite(value)) return "";
        // Show 4 decimals like the rest of the formatter, trim trailing zeros.
        return Number(value.toFixed(4)).toString();
    }
    return String(value);
};

const resizeDelta0 = (
    pairs: [string, string][],
    stored: number[] | null
): number[] => {
    return pairs.map((_, i) =>
        stored && i < stored.length && Number.isFinite(stored[i])
            ? stored[i]
            : 0
    );
};

const namesToVariable = (
    names: string[],
    variables: Variable[]
): Variable[] => {
    return names
        .map((n) => variables.find((v) => v.name === n))
        .filter((v): v is Variable => Boolean(v));
};

export const MultivariatePaired = ({
    isPairedOpen,
    setIsPairedOpen,
    pairedMode,
    onSave,
}: MultivariatePairedProps) => {
    const variables = useVariableStore((state) => state.variables);
    const dataRows = useDataStore((state) => state.data);

    const allSelectableVariables = useMemo(
        () => variables.filter((v) => v.name && v.name !== ""),
        [variables]
    );

    // Local pairing state mirrors useVariableSelection in PairedSamplesTTest
    // (kept inline because we need controlled initialisation from `pairedMode`
    // and tight integration with the δ₀ list).
    const [testVariables1, setTestVariables1] = useState<Variable[]>([]);
    const [testVariables2, setTestVariables2] = useState<Variable[]>([]);
    const [pairNumbers, setPairNumbers] = useState<number[]>([]);
    const [delta0, setDelta0] = useState<number[]>([]);
    const [highlightedVariable, setHighlightedVariable] =
        useState<PairedHighlightedVariable | null>(null);
    const [highlightedPair, setHighlightedPair] =
        useState<PairedHighlightedPair | null>(null);

    // Hydrate from stored PairedMode each time the dialog re-opens. Falls back
    // to empty selection when no prior config exists.
    useEffect(() => {
        if (!isPairedOpen) return;
        const storedPairs = pairedMode?.pairs ?? [];
        const v1 = namesToVariable(
            storedPairs.map(([a]) => a).filter(Boolean),
            allSelectableVariables
        );
        const v2 = namesToVariable(
            storedPairs.map(([, b]) => b).filter(Boolean),
            allSelectableVariables
        );
        setTestVariables1(v1);
        setTestVariables2(v2);
        setPairNumbers(storedPairs.map((_, i) => i + 1));
        setDelta0(resizeDelta0(storedPairs, pairedMode?.delta0 ?? null));
        setHighlightedVariable(null);
        setHighlightedPair(null);
    }, [isPairedOpen, pairedMode, allSelectableVariables]);

    const usedNames = useMemo(() => {
        const names: string[] = [];
        testVariables1.forEach((v) => v && names.push(v.name));
        testVariables2.forEach((v) => v && names.push(v.name));
        return new Set(names);
    }, [testVariables1, testVariables2]);

    const availableVariables = useMemo(
        () => allSelectableVariables.filter((v) => !usedNames.has(v.name)),
        [allSelectableVariables, usedNames]
    );

    // Keep δ₀ length in sync with the active pair count, preserving entered
    // values by position.
    useEffect(() => {
        const target = Math.max(testVariables1.length, testVariables2.length);
        setDelta0((prev) => {
            if (prev.length === target) return prev;
            const next: number[] = [];
            for (let i = 0; i < target; i++) {
                next.push(i < prev.length && Number.isFinite(prev[i]) ? prev[i] : 0);
            }
            return next;
        });
    }, [testVariables1.length, testVariables2.length]);

    // ── Pair management (subset of PairedSamplesTTest/useVariableSelection) ──
    const moveToTestVariables = useCallback(
        (variable: Variable) => {
            const undefinedIndexInTest1 = testVariables1.findIndex(
                (v) => v === undefined
            );
            const undefinedIndexInTest2 = testVariables2.findIndex(
                (v) => v === undefined
            );
            const hasUndefinedInTest1 = undefinedIndexInTest1 !== -1;
            const hasUndefinedInTest2 = undefinedIndexInTest2 !== -1;

            // Fill holes in pairs first, then balance lengths.
            if (hasUndefinedInTest1 || hasUndefinedInTest2) {
                let target: "test1" | "test2";
                let idx: number;
                if (hasUndefinedInTest1 && hasUndefinedInTest2) {
                    if (undefinedIndexInTest1 <= undefinedIndexInTest2) {
                        target = "test1";
                        idx = undefinedIndexInTest1;
                    } else {
                        target = "test2";
                        idx = undefinedIndexInTest2;
                    }
                } else if (hasUndefinedInTest1) {
                    target = "test1";
                    idx = undefinedIndexInTest1;
                } else {
                    target = "test2";
                    idx = undefinedIndexInTest2;
                }
                const counterpart =
                    target === "test1" ? testVariables2[idx] : testVariables1[idx];
                if (
                    counterpart &&
                    counterpart.columnIndex === variable.columnIndex
                ) {
                    toast.error(
                        "Pasangan harus berisi dua variabel yang berbeda."
                    );
                    return;
                }
                if (target === "test1") {
                    setTestVariables1((prev) => {
                        const next = [...prev];
                        next[idx] = variable;
                        return next;
                    });
                } else {
                    setTestVariables2((prev) => {
                        const next = [...prev];
                        next[idx] = variable;
                        return next;
                    });
                }
            } else if (testVariables1.length !== testVariables2.length) {
                const shorter =
                    testVariables1.length < testVariables2.length
                        ? "test1"
                        : "test2";
                const matchingIdx = Math.min(
                    testVariables1.length,
                    testVariables2.length
                );
                const counterpart =
                    shorter === "test1"
                        ? testVariables2[matchingIdx]
                        : testVariables1[matchingIdx];
                if (
                    counterpart &&
                    counterpart.columnIndex === variable.columnIndex
                ) {
                    toast.error(
                        "Pasangan harus berisi dua variabel yang berbeda."
                    );
                    return;
                }
                if (shorter === "test1") {
                    setTestVariables1((prev) => [...prev, variable]);
                } else {
                    setTestVariables2((prev) => [...prev, variable]);
                }
            } else {
                // Lists balanced — start a new pair on the V1 side.
                setTestVariables1((prev) => [...prev, variable]);
                setPairNumbers((prev) => [
                    ...prev,
                    prev.length > 0 ? Math.max(...prev) + 1 : 1,
                ]);
            }
            setHighlightedVariable(null);
        },
        [testVariables1, testVariables2]
    );

    const removeVariable = useCallback(
        (sourceList: "test1" | "test2", rowIndex: number) => {
            if (sourceList === "test1") {
                const counterpart = testVariables2[rowIndex];
                if (!counterpart) {
                    setTestVariables1((prev) => {
                        const next = [...prev];
                        next.splice(rowIndex, 1);
                        return next;
                    });
                    setTestVariables2((prev) => {
                        const next = [...prev];
                        next.splice(rowIndex, 1);
                        return next;
                    });
                    setPairNumbers((prev) => {
                        const next = [...prev];
                        next.pop();
                        return next;
                    });
                } else {
                    setTestVariables1((prev) => {
                        const next = [...prev];
                        // Mark slot empty so a new variable can fill the pair.
                        next[rowIndex] = undefined as unknown as Variable;
                        return next;
                    });
                }
            } else {
                const counterpart = testVariables1[rowIndex];
                if (!counterpart) {
                    setTestVariables1((prev) => {
                        const next = [...prev];
                        next.splice(rowIndex, 1);
                        return next;
                    });
                    setTestVariables2((prev) => {
                        const next = [...prev];
                        next.splice(rowIndex, 1);
                        return next;
                    });
                    setPairNumbers((prev) => {
                        const next = [...prev];
                        next.pop();
                        return next;
                    });
                } else {
                    setTestVariables2((prev) => {
                        const next = [...prev];
                        next[rowIndex] = undefined as unknown as Variable;
                        return next;
                    });
                }
            }
            setHighlightedVariable(null);
        },
        [testVariables1, testVariables2]
    );

    const moveVariableBetweenLists = useCallback(
        (index: number) => {
            if (
                testVariables1[index] &&
                testVariables2[index] &&
                testVariables1[index].columnIndex ===
                    testVariables2[index].columnIndex
            ) {
                toast.error("Pasangan harus berisi dua variabel yang berbeda.");
                return;
            }
            const temp = testVariables1[index];
            setTestVariables1((prev) => {
                const next = [...prev];
                next[index] = testVariables2[index];
                return next;
            });
            setTestVariables2((prev) => {
                const next = [...prev];
                next[index] = temp;
                return next;
            });
        },
        [testVariables1, testVariables2]
    );

    const swapRows = useCallback(
        (i: number, j: number) => {
            setTestVariables1((prev) => {
                const next = [...prev];
                [next[i], next[j]] = [next[j], next[i]];
                return next;
            });
            setTestVariables2((prev) => {
                const next = [...prev];
                [next[i], next[j]] = [next[j], next[i]];
                return next;
            });
            setDelta0((prev) => {
                const next = [...prev];
                [next[i], next[j]] = [next[j], next[i]];
                return next;
            });
        },
        []
    );

    const moveUpPair = useCallback(
        (index: number) => {
            if (index > 0) {
                swapRows(index, index - 1);
                setHighlightedPair({ id: index - 1 });
            }
        },
        [swapRows]
    );

    const moveDownPair = useCallback(
        (index: number) => {
            const maxLen = Math.max(testVariables1.length, testVariables2.length);
            if (index < maxLen - 1) {
                swapRows(index, index + 1);
                setHighlightedPair({ id: index + 1 });
            }
        },
        [swapRows, testVariables1.length, testVariables2.length]
    );

    const removePair = useCallback((index: number) => {
        setTestVariables1((prev) => prev.filter((_, i) => i !== index));
        setTestVariables2((prev) => prev.filter((_, i) => i !== index));
        setPairNumbers((prev) => prev.slice(0, prev.length - 1));
        setDelta0((prev) => prev.filter((_, i) => i !== index));
        setHighlightedPair(null);
    }, []);

    // ── Validation helpers ───────────────────────────────────────────────────
    const completePairs: [string, string][] = useMemo(() => {
        const len = Math.min(testVariables1.length, testVariables2.length);
        const out: [string, string][] = [];
        for (let i = 0; i < len; i++) {
            const a = testVariables1[i];
            const b = testVariables2[i];
            if (a && b && a.columnIndex !== b.columnIndex) {
                out.push([a.name, b.name]);
            }
        }
        return out;
    }, [testVariables1, testVariables2]);

    const hasIncompletePair = useMemo(() => {
        const max = Math.max(testVariables1.length, testVariables2.length);
        for (let i = 0; i < max; i++) {
            if (!testVariables1[i] || !testVariables2[i]) return true;
        }
        return false;
    }, [testVariables1, testVariables2]);

    const preview = useMemo(
        () =>
            computeDifferencePreview(
                dataRows,
                allSelectableVariables,
                completePairs,
                10
            ),
        [dataRows, allSelectableVariables, completePairs]
    );

    // ── δ₀ handlers ──────────────────────────────────────────────────────────
    const handleDelta0Change = (index: number, raw: string) => {
        const parsed = raw === "" || raw === "-" ? 0 : Number(raw);
        const safe = Number.isFinite(parsed) ? parsed : 0;
        setDelta0((prev) => {
            const next = [...prev];
            next[index] = safe;
            return next;
        });
    };

    const handleResetDelta0 = () => {
        setDelta0(completePairs.map(() => 0));
    };

    // ── Footer actions ───────────────────────────────────────────────────────
    const handleContinue = () => {
        if (completePairs.length === 0) {
            toast.warning("Tambahkan minimal satu pasangan variabel.");
            return;
        }
        if (hasIncompletePair) {
            toast.warning(
                "Terdapat pasangan yang belum lengkap. Isi Variable 1 dan Variable 2 untuk setiap baris."
            );
            return;
        }
        const trimmedDelta0 = delta0.slice(0, completePairs.length);
        const allZero = trimmedDelta0.every((v) => v === 0);
        const payload: PairedModeType = {
            pairs: completePairs,
            delta0: allZero ? null : trimmedDelta0,
        };
        onSave(payload);
        setIsPairedOpen(false);
    };

    const handleCancel = () => {
        setIsPairedOpen(false);
    };

    const handleClearAll = () => {
        onSave(null);
        setIsPairedOpen(false);
    };

    return (
        <Dialog open={isPairedOpen} onOpenChange={setIsPairedOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Paired (Hotelling T²) — Vektor Selisih
                    </DialogTitle>
                </DialogHeader>
                <Separator />

                <div className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                        Pilih pasangan variabel (Measurement 1 vs Measurement 2)
                        untuk membentuk vektor selisih d = M1 − M2. Sistem akan
                        menjalankan Hotelling T² Satu Populasi pada vektor d
                        terhadap δ₀.
                    </p>

                    {/* Bagian A — Pemilihan Pasangan Variabel */}
                    <div className="rounded-md border p-3 bg-background">
                        <Label className="text-sm font-semibold mb-2 block">
                            A. Pemilihan Pasangan Variabel
                        </Label>
                        <PairedVariablesTab
                            availableVariables={availableVariables}
                            testVariables1={testVariables1}
                            testVariables2={testVariables2}
                            pairNumbers={pairNumbers}
                            highlightedVariable={highlightedVariable}
                            setHighlightedVariable={setHighlightedVariable}
                            highlightedPair={highlightedPair}
                            setHighlightedPair={setHighlightedPair}
                            moveToTestVariables={moveToTestVariables}
                            removeVariable={removeVariable}
                            moveVariableBetweenLists={moveVariableBetweenLists}
                            moveUpPair={moveUpPair}
                            moveDownPair={moveDownPair}
                            removePair={removePair}
                            idPrefix="multivariate-paired"
                        />
                    </div>

                    {/* Bagian B — Preview Vektor Selisih */}
                    <div className="rounded-md border p-3 bg-background">
                        <Label className="text-sm font-semibold mb-2 block">
                            B. Preview Vektor Selisih (10 baris pertama)
                        </Label>
                        {completePairs.length === 0 ? (
                            <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
                                Pilih minimal satu pasangan lengkap untuk
                                menampilkan preview.
                            </div>
                        ) : (
                            <ScrollArea className="max-h-[320px] pr-2 border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {preview.columns.map((c, i) => (
                                                <TableHead
                                                    key={`col-${i}`}
                                                    className="text-xs whitespace-nowrap"
                                                >
                                                    {c}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {preview.rows.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={
                                                        preview.columns.length
                                                    }
                                                    className="text-center text-muted-foreground text-sm"
                                                >
                                                    Tidak ada data pada dataset.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            preview.rows.map((row, rIdx) => (
                                                <TableRow key={`row-${rIdx}`}>
                                                    {row.map((cell, cIdx) => (
                                                        <TableCell
                                                            key={`cell-${rIdx}-${cIdx}`}
                                                            className="text-xs whitespace-nowrap"
                                                        >
                                                            {formatPreviewCell(
                                                                cell
                                                            )}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        )}
                    </div>

                    {/* Bagian C — Input δ₀ */}
                    <div className="rounded-md border p-3 bg-background">
                        <Label className="text-sm font-semibold mb-2 block">
                            C. Nilai Selisih Hipotesis (δ₀)
                        </Label>
                        <p className="text-xs text-muted-foreground mb-2">
                            Masukkan nilai selisih hipotesis (δ₀) untuk setiap
                            pasangan. Biarkan 0 untuk menguji tidak ada
                            perbedaan.
                        </p>
                        {completePairs.length === 0 ? (
                            <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
                                Tambahkan pasangan lengkap untuk mengatur δ₀.
                            </div>
                        ) : (
                            <ScrollArea className="max-h-[240px] pr-2">
                                <div className="flex flex-col gap-2">
                                    {completePairs.map(([v1, v2], idx) => (
                                        <div
                                            key={`delta0-${idx}`}
                                            className="flex items-center gap-3"
                                        >
                                            <Label
                                                htmlFor={`delta0-${idx}`}
                                                className="w-[260px] truncate text-sm"
                                                title={`d${idx + 1} = ${v1} − ${v2}`}
                                            >
                                                {`d${idx + 1} = ${v1} − ${v2}`}
                                            </Label>
                                            <Input
                                                id={`delta0-${idx}`}
                                                type="number"
                                                step="any"
                                                placeholder="0"
                                                value={delta0[idx] ?? 0}
                                                onChange={(e) =>
                                                    handleDelta0Change(
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
                </div>

                <DialogFooter className="sm:justify-between flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClearAll}
                    >
                        Disable Paired Mode
                    </Button>
                    <div className="flex gap-2">
                        {completePairs.length > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleResetDelta0}
                            >
                                Reset δ₀ to 0
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleCancel}
                        >
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleContinue}>
                            Continue
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
