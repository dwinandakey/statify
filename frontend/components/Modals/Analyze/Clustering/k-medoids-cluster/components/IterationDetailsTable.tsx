/**
 * IterationDetailsTable
 * Styled table showing k-medoids iteration history:
 *   – Total Cost per iteration with an inline progress bar
 *   – Improvement (Δ cost) color-coded green/red/neutral
 *   – Swaps Made badge
 *   – Final converged row highlighted
 */

import React from "react";
import type { IterationHistory } from "../types/output";

interface IterationDetailsTableProps {
    data: IterationHistory[];
    converged?: boolean;
}

function fmt(n: number): string {
    if (!isFinite(n)) return "—";
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(3)}M`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(3)}K`;
    return n.toFixed(4);
}

export const IterationDetailsTable: React.FC<IterationDetailsTableProps> = ({
    data,
    converged = false,
}) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                Data iterasi tidak tersedia
            </div>
        );
    }

    const maxCost = Math.max(...data.map(d => d.totalCost));
    const minCost = Math.min(...data.map(d => d.totalCost));
    const costRange = maxCost - minCost || 1;

    // Total reduction from start to end
    const totalReduction = data[0].totalCost - data[data.length - 1].totalCost;
    const reductionPct = maxCost > 0 ? (totalReduction / maxCost) * 100 : 0;

    return (
        <div className="space-y-3">
            {/* Summary strip */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground px-1">
                <span>
                    <span className="font-semibold text-foreground">{data.length}</span> iterasi
                </span>
                <span>·</span>
                <span>
                    Awal: <span className="font-semibold text-foreground">{fmt(data[0].totalCost)}</span>
                </span>
                <span>·</span>
                <span>
                    Akhir: <span className="font-semibold text-foreground">{fmt(data[data.length - 1].totalCost)}</span>
                </span>
                <span>·</span>
                <span>
                    Reduksi: <span className="font-semibold text-green-600 dark:text-green-400">
                        {fmt(totalReduction)} ({reductionPct.toFixed(1)}%)
                    </span>
                </span>
                {converged && (
                    <>
                        <span>·</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">✓ Converged</span>
                    </>
                )}
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-hidden">
                <div className="overflow-y-auto max-h-[340px]">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                            <tr className="border-b">
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-20">Iterasi</th>
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Total Cost</th>
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-32">Improvement</th>
                                <th className="px-3 py-2 text-center font-semibold text-muted-foreground w-24">Swaps</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((h, i) => {
                                const isLast = i === data.length - 1;
                                const barWidth = maxCost > 0
                                    ? ((h.totalCost - minCost) / costRange) * 100
                                    : 0;
                                // improvement sign
                                const impPositive = h.improvement > 0.0001;
                                const impZero = Math.abs(h.improvement) <= 0.0001;
                                const impNeg = h.improvement < -0.0001;

                                return (
                                    <tr
                                        key={h.iteration}
                                        className={[
                                            "border-b last:border-0 transition-colors",
                                            isLast && converged
                                                ? "bg-green-50 dark:bg-green-950/30"
                                                : i % 2 === 0
                                                    ? "bg-transparent"
                                                    : "bg-muted/20",
                                        ].join(" ")}
                                    >
                                        {/* Iteration */}
                                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                                            {isLast && converged
                                                ? <span className="flex items-center gap-1">
                                                    <span className="text-green-600 dark:text-green-400">✓</span>
                                                    {h.iteration}
                                                  </span>
                                                : h.iteration}
                                        </td>

                                        {/* Total Cost + inline bar */}
                                        <td className="px-3 py-2">
                                            <div className="font-mono text-xs font-medium">{fmt(h.totalCost)}</div>
                                            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden w-full max-w-[140px]">
                                                <div
                                                    className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all"
                                                    style={{ width: `${Math.max(2, 100 - barWidth)}%` }}
                                                />
                                            </div>
                                        </td>

                                        {/* Improvement */}
                                        <td className="px-3 py-2">
                                            {i === 0 ? (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            ) : (
                                                <span className={[
                                                    "inline-flex items-center gap-0.5 font-mono text-xs font-semibold px-1.5 py-0.5 rounded",
                                                    impPositive
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                                        : impZero
                                                            ? "bg-muted text-muted-foreground"
                                                            : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
                                                ].join(" ")}>
                                                    {impPositive ? "▼" : impNeg ? "▲" : "–"}
                                                    {" "}{fmt(Math.abs(h.improvement))}
                                                </span>
                                            )}
                                        </td>

                                        {/* Swaps Made */}
                                        <td className="px-3 py-2 text-center">
                                            {h.swapsMade > 0 ? (
                                                <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                                    {h.swapsMade}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-muted text-muted-foreground text-xs">
                                                    0
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
