/**
 * K-Medoids Summary Cards Component
 * Displays key metrics in card format following existing UI design
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KMedoidsSummary } from "../types/output";
import { TrendingUp, TrendingDown, Target, BarChart3, CheckCircle2, XCircle } from "lucide-react";

interface SummaryCardsProps {
    summary: KMedoidsSummary;
    showCaseCount?: boolean;
    showTotalCost?: boolean;
    algorithmMethod?: string;
}

export const KMedoidsSummaryCards: React.FC<SummaryCardsProps> = ({
    summary,
    showCaseCount = true,
    showTotalCost = true,
    algorithmMethod,
}) => {
    const normalizedMethod = (algorithmMethod ?? "").toUpperCase();
    const isSamplingMethod = normalizedMethod === "CLARA" || normalizedMethod === "CLARANS";
    const avgScore = summary.averageSilhouetteScore ?? 0;
    const totalSwapCost = summary.swapCost ?? summary.totalCost;
    const averageSwapCost = summary.avgCost ?? (summary.numCases > 0 ? totalSwapCost / summary.numCases : 0);
    const averageBuildCost = summary.buildCost !== undefined && summary.buildCost !== null && summary.numCases > 0
        ? summary.buildCost / summary.numCases
        : null;
    const silhouetteQuality =
        avgScore >= 0.7 ? { label: "Very Strong", color: "text-green-600" } :
            avgScore >= 0.5 ? { label: "Strong", color: "text-blue-600" } :
                avgScore >= 0.3 ? { label: "Moderate", color: "text-yellow-600" } :
                    { label: "Weak", color: "text-red-600" };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Number of Clusters */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Number of Clusters</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.numClusters}</div>
                    <p className="text-xs text-muted-foreground">
                        {summary.numCases} cases analyzed
                    </p>
                </CardContent>
            </Card>

            {showTotalCost && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost / Dissimilarity</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 xl:grid-cols-3 xl:gap-5">
                            <div className="min-w-0">
                                <div className="text-base font-bold leading-tight tabular-nums sm:text-lg xl:text-xl">
                                    {isFinite(totalSwapCost) ? totalSwapCost.toFixed(4) : "N/A"}
                                </div>
                                <p className="text-xs text-muted-foreground">Total Cost (SWAP)</p>
                            </div>
                            {!isSamplingMethod && (
                                <div className="min-w-0">
                                    <div className="text-base font-bold leading-tight tabular-nums sm:text-lg xl:text-xl">
                                        {averageBuildCost !== null && isFinite(averageBuildCost) ? averageBuildCost.toFixed(6) : 'N/A'}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Average Cost (BUILD)</p>
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="text-base font-bold leading-tight tabular-nums sm:text-lg xl:text-xl">
                                    {isFinite(averageSwapCost) ? averageSwapCost.toFixed(6) : 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground">Average Cost (SWAP)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Silhouette Score */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Silhouette Score</CardTitle>
                    {avgScore >= 0.5 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                        <TrendingDown className="h-4 w-4 text-yellow-600" />
                    )}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{avgScore.toFixed(3)}</div>
                    <p className={`text-xs ${silhouetteQuality.color}`}>
                        Quality: {silhouetteQuality.label}
                    </p>
                </CardContent>
            </Card>

            {/* Convergence Status or Jumlah Sampling */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {isSamplingMethod ? "Jumlah Sampling" : "Convergence"}
                    </CardTitle>
                    {!isSamplingMethod && (summary.converged ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                        <XCircle className="h-4 w-4 text-yellow-600" />
                    ))}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.totalIterations}</div>
                    <p className="text-xs text-muted-foreground">
                        {isSamplingMethod ? "Jumlah kali sampling dilakukan" : (summary.converged ? "Converged successfully" : "Max iterations reached")}
                    </p>
                </CardContent>
            </Card>

            {showCaseCount && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Largest Cluster</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Cluster {summary.largestCluster?.id ?? 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">
                            {summary.largestCluster?.size ?? 0} cases ({summary.largestCluster && summary.numCases ? ((summary.largestCluster.size / summary.numCases) * 100).toFixed(1) : '0'}%)
                        </p>
                    </CardContent>
                </Card>
            )}

            {showCaseCount && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Smallest Cluster</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Cluster {summary.smallestCluster?.id ?? 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">
                            {summary.smallestCluster?.size ?? 0} cases ({summary.smallestCluster && summary.numCases ? ((summary.smallestCluster.size / summary.numCases) * 100).toFixed(1) : '0'}%)
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
