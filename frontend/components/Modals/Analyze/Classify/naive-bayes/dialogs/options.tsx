"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
    NaiveBayesNumericLikelihood,
    NaiveBayesOptionsType,
    NaiveBayesTextLikelihood,
} from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";

/** Nilai yang boleh dikirim ke `updateFormData` (v2 menambah objek override per variabel). */
export type NaiveBayesOptionsValue =
    | number
    | string
    | Record<string, NaiveBayesNumericLikelihood>;

type OptionsTabProps = {
    data: NaiveBayesOptionsType;
    updateFormData: (field: keyof NaiveBayesOptionsType, value: NaiveBayesOptionsValue) => void;
    /** v2 (AGENTS_V2 §3.6): nama variabel Numeric efektif untuk tabel override. */
    numericVariables?: string[];
    /** v2: true bila Text Features terisi (blok Text aktif). */
    hasTextFeatures?: boolean;
    /** v2: true bila ada predictor Numeric/Categorical efektif (Complement dinonaktifkan). */
    hasOtherPredictors?: boolean;
};

// Bila variabel Numeric lebih banyak dari ini, tabel override menampilkan kotak filter (§3.6).
export const OVERRIDE_FILTER_THRESHOLD = 50;

const TEXT_LIKELIHOOD_LABELS: Record<NaiveBayesTextLikelihood, string> = {
    multinomial: "Multinomial",
    bernoulli: "Bernoulli",
    complement: "Complement",
};

const COMPLEMENT_DISABLED_REASON =
    "Complement is only available when the model contains Text Features only (no numeric or categorical variables).";

/** Mengembalikan `value` bila termasuk `allowed`, selain itu undefined (pengganti cast). */
function pickAllowed<T extends string>(allowed: readonly T[], value: string): T | undefined {
    return allowed.find((a) => a === value);
}

const TEXT_LIKELIHOODS: readonly NaiveBayesTextLikelihood[] = ["multinomial", "bernoulli", "complement"];

/**
 * Membuang override yang menunjuk variabel yang tidak lagi Numeric efektif
 * (AGENTS_V2 §3.6). Fungsi murni; mengembalikan objek yang SAMA bila tidak ada
 * yang dibuang supaya pemanggil bisa membandingkan referensi.
 */
export function pruneNumericOverrides(
    overrides: Record<string, NaiveBayesNumericLikelihood> | undefined,
    numericVariables: readonly string[]
): Record<string, NaiveBayesNumericLikelihood> {
    const current = overrides ?? {};
    const allowed = new Set(numericVariables);
    const keys = Object.keys(current);
    if (keys.every((key) => allowed.has(key))) return current;
    const next: Record<string, NaiveBayesNumericLikelihood> = {};
    for (const key of keys) {
        if (allowed.has(key)) next[key] = current[key];
    }
    return next;
}

/**
 * Pesan galat field Smoothing Alpha / Text Alpha. Teksnya IDENTIK dengan cabang yang sama di
 * `getNumericInputError` (hooks/useNaiveBayesValidation.ts) supaya pesan di bawah field dan pesan
 * yang menahan OK selalu sama.
 */
export function getSmoothingAlphaError(value: number | undefined): string | null {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Enter a valid number for Smoothing Alpha.";
    if (value <= 0) return "Smoothing Alpha must be greater than 0.";
    if (value > 999) return "Smoothing Alpha must not exceed 999.";
    return null;
}

export function getTextAlphaError(value: number | undefined): string | null {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Enter a valid number for Text smoothing alpha.";
    if (value <= 0) return "Text smoothing alpha must be greater than 0.";
    if (value > 999) return "Text smoothing alpha must not exceed 999.";
    return null;
}

export const OptionsTab = ({
    data,
    updateFormData,
    numericVariables = [],
    hasTextFeatures = false,
    hasOtherPredictors = false,
}: OptionsTabProps) => {
    const [optionsState, setOptionsState] = useState<NaiveBayesOptionsType>({ ...data });

    useEffect(() => {
        setOptionsState({ ...data });
    }, [data]);

    // UC-03 alur alternatif 4a: nilai TIDAK SAH tetap diteruskan ke form (tidak lagi dibuang diam-diam
    // sambil mempertahankan nilai lama), sehingga getNumericInputError memblokir OK/pindah tab dengan pesan
    // yang SAMA persis dengan pesan galat di bawah field ini, dan analisis tidak dijalankan.
    const error = useMemo(() => getSmoothingAlphaError(optionsState.SmoothingAlpha), [optionsState.SmoothingAlpha]);
    const textAlphaError = useMemo(
        () => (hasTextFeatures ? getTextAlphaError(optionsState.TextAlpha) : null),
        [hasTextFeatures, optionsState.TextAlpha]
    );

    const handleAlphaChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const numValue = Number(e.target.value);
            setOptionsState((prev) => ({ ...prev, SmoothingAlpha: numValue }));
            updateFormData("SmoothingAlpha", numValue);
        },
        [updateFormData]
    );

    const handleTextAlphaChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const numValue = Number(e.target.value);
            setOptionsState((prev) => ({ ...prev, TextAlpha: numValue }));
            updateFormData("TextAlpha", numValue);
        },
        [updateFormData]
    );

    const textLikelihood = optionsState.TextLikelihood ?? "multinomial";
    const complementDisabled = hasOtherPredictors;
    // Pilihan tersimpan "complement" tetapi kini ada predictor lain: tampilkan galat (OK diblokir validasi).
    const complementConflict = hasTextFeatures && textLikelihood === "complement" && hasOtherPredictors;

    return (
        <TooltipProvider delayDuration={100}>
            <div className="flex flex-col gap-4">
                {/* Blok Numeric (AGENTS_V2 §3.6) */}
                <section id="naive-bayes-options-numeric" className="rounded-lg border p-4" aria-label="Numeric likelihood">
                    <div className="flex flex-col gap-3">
                        <p className="text-sm font-semibold">Numeric</p>
                        {/* Revisi pasca-sidang: hanya Gaussian standar (pilihan min. std dihapus). */}
                        <p className="text-sm text-muted-foreground">Likelihood: Gaussian</p>
                        <p className="text-sm text-muted-foreground">
                            {numericVariables.length === 0
                                ? "There are no numeric variables in the current model."
                                : "Numeric variables (Covariates) are modeled with a normal distribution using the mean and variance of each class."}
                        </p>
                    </div>
                </section>

                {/* Blok Categorical (field v1 SmoothingAlpha dipertahankan) */}
                <section id="naive-bayes-options-categorical" className="rounded-lg border p-4" aria-label="Categorical likelihood">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-semibold">Categorical</p>
                            <p className="text-sm text-muted-foreground">Likelihood: Categorical</p>
                            <Label htmlFor="smoothing-alpha" className="font-semibold">
                                Smoothing Alpha
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Laplace smoothing for categorical probabilities. Accepted values are above 0, up
                                to 999.
                            </p>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="smoothing-alpha"
                                    type="number"
                                    min={0.01}
                                    max={999}
                                    step={0.1}
                                    className="w-[120px]"
                                    value={optionsState.SmoothingAlpha ?? ""}
                                    onChange={handleAlphaChange}
                                />
                            </div>
                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>
                    </div>
                </section>

                {/* Blok Text (aktif bila Text Features terisi) */}
                <section
                    id="naive-bayes-options-text"
                    className={`rounded-lg border p-4 ${hasTextFeatures ? "" : "opacity-60"}`}
                    aria-label="Text likelihood"
                >
                    <div className="flex flex-col gap-3">
                        <Label className="font-semibold">Text</Label>
                        {!hasTextFeatures && (
                            <p className="text-sm text-muted-foreground">
                                Available when a Raw Text Variable or Word-Vector Variables are set on the Variables tab.
                            </p>
                        )}
                        <RadioGroup
                            value={textLikelihood}
                            disabled={!hasTextFeatures}
                            onValueChange={(value) => {
                                const picked = pickAllowed(TEXT_LIKELIHOODS, value);
                                if (picked !== undefined) updateFormData("TextLikelihood", picked);
                            }}
                            className="flex flex-col gap-2"
                        >
                            {TEXT_LIKELIHOODS.map((value) => {
                                const isComplement = value === "complement";
                                const disabled = !hasTextFeatures || (isComplement && complementDisabled);
                                const item = (
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                            value={value}
                                            id={`text-likelihood-${value}`}
                                            disabled={disabled}
                                        />
                                        <Label
                                            htmlFor={`text-likelihood-${value}`}
                                            className={`text-sm font-normal ${disabled ? "" : "cursor-pointer"}`}
                                        >
                                            {TEXT_LIKELIHOOD_LABELS[value]}
                                        </Label>
                                    </div>
                                );
                                if (isComplement && hasTextFeatures && complementDisabled) {
                                    return (
                                        <Tooltip key={value}>
                                            <TooltipTrigger asChild>
                                                <span tabIndex={0} className="w-fit">
                                                    {item}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>{COMPLEMENT_DISABLED_REASON}</TooltipContent>
                                        </Tooltip>
                                    );
                                }
                                return <React.Fragment key={value}>{item}</React.Fragment>;
                            })}
                        </RadioGroup>
                        {hasTextFeatures && complementDisabled && (
                            <p className="text-xs text-muted-foreground">{COMPLEMENT_DISABLED_REASON}</p>
                        )}
                        {complementConflict && (
                            <p className="text-sm text-destructive" role="alert">
                                Complement is selected, but the model also contains numeric or categorical variables.
                                Choose Multinomial or Bernoulli.
                            </p>
                        )}

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="text-alpha" className="font-semibold">
                                Text Alpha (smoothing)
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Smoothing parameter for the text likelihood. Accepted values are above 0, up to
                                999.
                            </p>
                            <Input
                                id="text-alpha"
                                type="number"
                                min={0.01}
                                max={999}
                                step={0.1}
                                className="w-[120px]"
                                disabled={!hasTextFeatures}
                                value={optionsState.TextAlpha ?? ""}
                                onChange={handleTextAlphaChange}
                            />
                            {textAlphaError && <p className="text-sm text-destructive">{textAlphaError}</p>}
                        </div>
                    </div>
                </section>
            </div>
        </TooltipProvider>
    );
};

export default OptionsTab;
