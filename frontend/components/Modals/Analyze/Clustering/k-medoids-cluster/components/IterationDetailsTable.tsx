/**
 * IterationDetailsTable
 * Standard data table showing k-medoids iteration history:
 *   – Total Cost per iteration
 *   – Improvement (Δ cost)
 *   – Swaps Made
 *   – Final converged row marked
 */

import React, { useMemo } from "react";
import DataTableRenderer from "@/components/Output/Table/DataTableRenderer";
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
    const tableJson = useMemo(() => {
        if (!data || data.length === 0) return "{}";

        const totalReduction = data[0].totalCost - data[data.length - 1].totalCost;
        const maxCost = Math.max(...data.map(d => d.totalCost));
        const reductionPct = maxCost > 0 ? (totalReduction / maxCost) * 100 : 0;

        return JSON.stringify({
            tables: [
                {
                    key: "iteration_details",
                    title: "K-Medoids Iteration Details",
                    columnHeaders: [
                        { header: "Iteration" },
                        { header: "Total Cost" },
                        { header: "Improvement" },
                        { header: "Swaps" },
                    ],
                    rows: data.map((h, i) => {
                        const isLast = i === data.length - 1;
                        const impPositive = h.improvement > 0.0001;
                        const impNeg = h.improvement < -0.0001;
                        return {
                            rowHeader: [isLast && converged ? `${h.iteration} (Converged)` : String(h.iteration)],
                            "Total Cost": fmt(h.totalCost),
                            Improvement: i === 0
                                ? "—"
                                : `${impPositive ? "▼" : impNeg ? "▲" : "–"} ${fmt(Math.abs(h.improvement))}`,
                            Swaps: h.swapsMade,
                        };
                    }),
                    footer: [
                        `${data.length} iterations · Start: ${fmt(data[0].totalCost)} · End: ${fmt(data[data.length - 1].totalCost)} · Reduction: ${fmt(totalReduction)} (${reductionPct.toFixed(1)}%)${converged ? " · ✓ Converged" : ""}`,
                    ],
                },
            ],
        });
    }, [data, converged]);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                Iteration data is not available
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <DataTableRenderer data={tableJson} />
        </div>
    );
};
