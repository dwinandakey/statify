"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SplitMode, RollingType } from "./useTimeSeriesSplit";

interface TimeSeriesSplitTabProps {
    splitEnabled: boolean;
    setSplitEnabled: (val: boolean) => void;
    splitMode: SplitMode;
    setSplitMode: (mode: SplitMode) => void;
    rollingType: RollingType;
    setRollingType: (type: RollingType) => void;
    trainRatio: number;
    setTrainRatio: (ratio: number) => void;
    saveSplitVariable: boolean;
    setSaveSplitVariable: (val: boolean) => void;
    savePredictions: boolean;
    setSavePredictions: (val: boolean) => void;
    totalObs: number;
    modelName?: string;
}

export const TimeSeriesSplitTab: React.FC<TimeSeriesSplitTabProps> = ({
    splitEnabled,
    setSplitEnabled,
    splitMode,
    setSplitMode,
    rollingType,
    setRollingType,
    trainRatio,
    setTrainRatio,
    saveSplitVariable,
    setSaveSplitVariable,
    savePredictions,
    setSavePredictions,
    totalObs,
    modelName = "Model"
}) => {
    const trainCount = Math.max(2, Math.floor(totalObs * trainRatio));
    const testCount = Math.max(1, totalObs - trainCount);

    return (
        <div className="space-y-5 p-5 h-full overflow-y-auto">
            {/* Top Toggle Card */}
            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                <Checkbox
                    id="enable-ts-split"
                    checked={splitEnabled}
                    onCheckedChange={(checked) => setSplitEnabled(!!checked)}
                    className="mt-1"
                />
                <div className="space-y-1">
                    <Label htmlFor="enable-ts-split" className="text-sm font-semibold cursor-pointer">
                        Aktifkan Pembagian Data Training & Testing (Time Series Split)
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Membagi data secara urut waktu (kronologis) untuk melatih model pada sampel pelatihan dan mengevaluasi akurasi peramalan (*out-of-sample*) pada sampel pengujian.
                    </p>
                </div>
            </div>

            {splitEnabled && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                    {/* Method Selection (Mode 1 & Mode 2) */}
                    <Card>
                        <CardContent className="pt-5 space-y-4">
                            <div>
                                <Label className="text-sm font-semibold block mb-1">
                                    Metode Pembagian Data (Time Series Validation Mode)
                                </Label>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Pilih strategi evaluasi runtun waktu yang sesuai dengan tujuan analisis Anda:
                                </p>
                            </div>

                            <RadioGroup
                                value={splitMode}
                                onValueChange={(val) => setSplitMode(val as SplitMode)}
                                className="space-y-3"
                            >
                                <div className="flex items-start space-x-3 p-3 rounded-md border hover:bg-accent/40 transition-colors">
                                    <RadioGroupItem value="holdout" id="mode-holdout" className="mt-0.5" />
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="mode-holdout" className="text-xs font-semibold cursor-pointer">
                                                Mode 1: Holdout Kronologis (Fixed Split)
                                            </Label>
                                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Standar</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Data dipotong satu kali secara kronologis (misal 80% Training, 20% Testing). Model diestimasi pada data training, kemudian dilakukan peramalan dinamis multi-step sepanjang periode testing.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3 p-3 rounded-md border hover:bg-accent/40 transition-colors">
                                    <RadioGroupItem value="rolling" id="mode-rolling" className="mt-0.5" />
                                    <div className="space-y-1 w-full">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="mode-rolling" className="text-xs font-semibold cursor-pointer">
                                                Mode 2: Rolling / Expanding Window (Walk-Forward Validation)
                                            </Label>
                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary">Dinamis</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Evaluasi peramalan 1 langkah ke depan (*one-step-ahead*) secara berulang sepanjang periode testing untuk menguji kestabilan parameter model di berbagai titik waktu.
                                        </p>

                                        {splitMode === "rolling" && (
                                            <div className="mt-3 pl-2 border-l-2 border-primary/30 space-y-2 pt-1">
                                                <Label className="text-xs font-medium text-foreground">Jenis Window:</Label>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center space-x-1.5 text-xs cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="rollingType"
                                                            checked={rollingType === "expanding"}
                                                            onChange={() => setRollingType("expanding")}
                                                            className="text-primary"
                                                        />
                                                        <span>Expanding Window (Sampel makin membesar)</span>
                                                    </label>
                                                    <label className="flex items-center space-x-1.5 text-xs cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="rollingType"
                                                            checked={rollingType === "fixed"}
                                                            onChange={() => setRollingType("fixed")}
                                                            className="text-primary"
                                                        />
                                                        <span>Rolling Window (Ukuran tetap bergeser)</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    {/* Ratio & Preview Card */}
                    <Card>
                        <CardContent className="pt-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">
                                    Proporsi Data Training
                                </Label>
                                <span className="text-sm font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                    {Math.round(trainRatio * 100)}% Training / {100 - Math.round(trainRatio * 100)}% Testing
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={50}
                                    max={95}
                                    step={1}
                                    value={Math.round(trainRatio * 100)}
                                    onChange={(e) => setTrainRatio(Number(e.target.value) / 100)}
                                    className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex items-center gap-1 w-20">
                                    <Input
                                        type="number"
                                        min={50}
                                        max={95}
                                        value={Math.round(trainRatio * 100)}
                                        onChange={(e) => {
                                            const val = Math.min(95, Math.max(50, Number(e.target.value) || 80));
                                            setTrainRatio(val / 100);
                                        }}
                                        className="h-8 text-center text-xs"
                                    />
                                    <span className="text-xs text-muted-foreground">%</span>
                                </div>
                            </div>

                            {/* Data Summary Grid */}
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                                <div className="p-2.5 rounded bg-muted/40">
                                    <div className="text-[11px] text-muted-foreground">Total Observasi</div>
                                    <div className="text-sm font-semibold text-foreground">{totalObs} obs</div>
                                </div>
                                <div className="p-2.5 rounded bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/40">
                                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Training (In-Sample)</div>
                                    <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">{trainCount} obs (1..{trainCount})</div>
                                </div>
                                <div className="p-2.5 rounded bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40">
                                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Testing (Out-of-Sample)</div>
                                    <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">{testCount} obs ({trainCount + 1}..{totalObs})</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save to Data View Options */}
                    <Card>
                        <CardContent className="pt-5 space-y-3">
                            <Label className="text-sm font-semibold block">
                                Simpan ke Data View
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Simpan hasil pembagian dan estimasi langsung sebagai kolom baru di lembar kerja Statify:
                            </p>

                            <div className="space-y-2.5 pt-1">
                                <div className="flex items-start space-x-2.5">
                                    <Checkbox
                                        id="save-split-var"
                                        checked={saveSplitVariable}
                                        onCheckedChange={(checked) => setSaveSplitVariable(!!checked)}
                                    />
                                    <div className="grid gap-0.5 leading-none">
                                        <label htmlFor="save-split-var" className="text-xs font-medium cursor-pointer">
                                            Simpan Indikator Partisi Data (<code className="text-primary font-mono text-[11px]">SPLIT_n</code>)
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Menambahkan kolom berisi label <span className="font-semibold text-blue-600">"TRAIN"</span> dan <span className="font-semibold text-amber-600">"TEST"</span> pada setiap baris data view.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-2.5">
                                    <Checkbox
                                        id="save-pred-var"
                                        checked={savePredictions}
                                        onCheckedChange={(checked) => setSavePredictions(!!checked)}
                                    />
                                    <div className="grid gap-0.5 leading-none">
                                        <label htmlFor="save-pred-var" className="text-xs font-medium cursor-pointer">
                                            Simpan Nilai Prediksi Testing (<code className="text-primary font-mono text-[11px]">PRED_TEST_n</code>)
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Menambahkan kolom nilai peramalan out-of-sample (ŷ) pada baris data testing.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default TimeSeriesSplitTab;
