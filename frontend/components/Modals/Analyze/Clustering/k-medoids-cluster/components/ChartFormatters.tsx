/**
 * Chart Visualisasi K-Medoids
 * Komponen chart komprehensif untuk visualisasi clustering
 * Menggunakan sistem chart yang ada dengan format khusus K-Medoids
 */

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { KMedoidsOutput, IterationHistory } from "../types/output";

/**
 * Format data K-Medoids untuk visualisasi scatter plot
 * Membuat data chart yang kompatibel dengan "Grouped Scatter Plot" GeneralChartContainer
 * Memisahkan titik biasa dan medoid untuk visualisasi yang berbeda
 */
export function formatScatterPlotData(output: KMedoidsOutput, xVar: string, yVar: string) {
    // Pisahkan titik biasa dan medoid untuk visualisasi yang berbeda
    const dataPoints = output.assignments
        .filter(obj => !obj.isMedoid)
        .map(obj => {
            const xVal = obj.attributes?.[xVar];
            const yVal = obj.attributes?.[yVar];
            
            return {
                x: xVal !== null && isFinite(xVal as number) ? (xVal as number) : 0,
                y: yVal !== null && isFinite(yVal as number) ? (yVal as number) : 0,
                category: `cluster ${obj.clusterLabel}`,
                label: `Case ${obj.objectId}`,
                clusterNum: obj.clusterLabel
            };
        });

    // Tambahkan medoid sebagai kategori terpisah
    const medoids = output.assignments
        .filter(obj => obj.isMedoid)
        .map(obj => {
            const xVal = obj.attributes?.[xVar];
            const yVal = obj.attributes?.[yVar];
            
            return {
                x: xVal !== null && isFinite(xVal as number) ? (xVal as number) : 0,
                y: yVal !== null && isFinite(yVal as number) ? (yVal as number) : 0,
                category: "centroide",
                label: `Medoid C${obj.clusterLabel}`,
                clusterNum: obj.clusterLabel
            };
        });

    const chartData = [...dataPoints, ...medoids];

    return {
        charts: [{
            chartType: "Grouped Scatter Plot",
            chartMetadata: {
                axisInfo: {
                    category: "Cluster",
                    value: `${xVar} vs ${yVar}`
                },
                description: `Scatter plot visualization of K-Medoids clustering results showing ${output.summary.numClusters} clusters.`,
                title: "K-Medoids Cluster Visualization",
                subtitle: `${yVar} vs ${xVar}`,
                notes: `Scatter plot showing ${output.summary.numClusters} clusters. Centroids marked with ⊗.`,
                titleFontSize: 16,
                subtitleFontSize: 12
            },
            chartData,
            chartConfig: {
                width: 600,
                height: 400,
                useAxis: true,
                axisLabels: {
                    x: xVar,
                    y: yVar
                },
                // Styling berbeda untuk klaster dan centroid
                pointStyles: {
                    "cluster 1": { symbol: "circle", color: "#FF6B6B" },
                    "cluster 2": { symbol: "circle", color: "#4ECDC4" },
                    "cluster 3": { symbol: "circle", color: "#95E1D3" },
                    "centroide": { symbol: "cross", size: 12, color: "#000000" }
                }
            }
        }]
    };
}

/**
 * Konversi data sampling CLARA ke format IterationHistory
 * agar dapat digunakan kembali dengan komponen ConvergenceChart yang ada
 */
export function formatClaraSamplingAsConvergenceData(
    samples: { sampleIndex: number; cost: number; sampleSize?: number; pamIterations?: number }[]
): IterationHistory[] {
    return samples.map((s, idx) => {
        const prevCost = idx === 0 ? s.cost : samples[idx - 1].cost;
        return {
            iteration: s.sampleIndex,
            totalCost: s.cost,
            improvement: prevCost - s.cost,   // positif = membaik
            swapsMade: s.pamIterations ?? 0,
        };
    });
}

/**
 * Format data untuk donut chart (ukuran klaster)
 */
export function formatDonutChartData(output: KMedoidsOutput) {
    const labels = output.clusterProfiles.map(p => `Cluster ${p.clusterLabel}`);
    const data = output.clusterProfiles.map(p => p.size);
    const percentages = output.clusterProfiles.map(p => 
        p.percentage !== null ? p.percentage.toFixed(1) : '0'
    );

    return {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                label: "Number of Cases",
                data,
                backgroundColor: output.clusterProfiles.map((_, idx) => 
                    `hsl(${(idx * 360) / output.clusterProfiles.length}, 70%, 60%)`
                ),
                borderColor: output.clusterProfiles.map((_, idx) => 
                    `hsl(${(idx * 360) / output.clusterProfiles.length}, 70%, 50%)`
                ),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: "Cluster Size Distribution"
                },
                legend: {
                    display: true,
                    position: "right" as const
                },
                tooltip: {
                    callbacks: {
                        label: (context: {label?: string; parsed: number; dataIndex: number}) => {
                            const label = context.label ?? '';
                            const value = context.parsed;
                            const percentage = percentages[context.dataIndex];
                            return `${label}: ${value} cases (${percentage}%)`;
                        }
                    }
                }
            }
        }
    };
}

/**
 * Format data untuk radar chart (profil klaster)
 */
export function formatRadarChartData(output: KMedoidsOutput, variables: string[]) {
    const datasets = output.clusterProfiles.map((profile, idx) => ({
        label: `Cluster ${profile.clusterLabel}`,
        data: variables.map(v => {
            const val = profile.meanAttributes?.[v];
            return val !== null && isFinite(val) ? val : 0;
        }),
        backgroundColor: `hsla(${(idx * 360) / output.clusterProfiles.length}, 70%, 50%, 0.2)`,
        borderColor: `hsl(${(idx * 360) / output.clusterProfiles.length}, 70%, 50%)`,
        borderWidth: 2
    }));

    return {
        type: "radar",
        data: {
            labels: variables,
            datasets
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: "Cluster Attribute Profiles"
                },
                legend: {
                    display: true,
                    position: "top" as const
                }
            },
            scales: {
                r: {
                    beginAtZero: true
                }
            }
        }
    };
}

/**
 * Format data untuk line chart konvergensi
 */
export function formatConvergenceChartData(output: KMedoidsOutput) {
    const iterations = output.iterationHistory.map(h => h.iteration);
    const costs = output.iterationHistory.map(h => h.totalCost);

    return {
        type: "line",
        data: {
            labels: iterations,
            datasets: [{
                label: "Total Cost",
                data: costs,
                borderColor: "rgb(59, 130, 246)",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                tension: 0.1,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: "Convergence History"
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Iteration"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Total Cost"
                    },
                    beginAtZero: false
                }
            }
        }
    };
}

/**
 * Format data untuk bar chart silhouette
 */
export function formatSilhouetteBarChartData(output: KMedoidsOutput) {
    const labels = output.silhouetteScores.perCluster.map(s => `Cluster ${s.clusterLabel}`);
    const scores = output.silhouetteScores.perCluster.map(s => s.averageScore);
    
    const colors = scores.map(score => {
        if (score >= 0.7) return "rgba(34, 197, 94, 0.8)"; // hijau
        if (score >= 0.5) return "rgba(59, 130, 246, 0.8)"; // biru
        if (score >= 0.3) return "rgba(234, 179, 8, 0.8)"; // kuning
        return "rgba(239, 68, 68, 0.8)"; // merah
    });

    return {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Silhouette Score",
                data: scores,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace("0.8", "1")),
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: "y" as const,
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: "Silhouette Score by Cluster"
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        afterLabel: (context: {parsed: {x: number}}) => {
                            const score = context.parsed.x;
                            if (score >= 0.7) return "Quality: Very Strong";
                            if (score >= 0.5) return "Quality: Strong";
                            if (score >= 0.3) return "Quality: Moderate";
                            return "Quality: Weak";
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Silhouette Score"
                    },
                    min: -1,
                    max: 1
                }
            }
        }
    };
}

/**
 * Format data untuk elbow chart
 */
export function formatElbowChartData(output: KMedoidsOutput) {
    if (!output.elbowData) return null;

    const kValues = output.elbowData.map(d => d.k);
    const costs = output.elbowData.map(d => d.totalCost);

    return {
        type: "line",
        data: {
            labels: kValues,
            datasets: [{
                label: "Total Cost",
                data: costs,
                borderColor: "rgb(168, 85, 247)",
                backgroundColor: "rgba(168, 85, 247, 0.1)",
                tension: 0.1,
                fill: true,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointStyle: "circle"
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: "Elbow Method: Optimal K Selection"
                },
                legend: {
                    display: true,
                    position: "top" as const
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Number of Clusters (k)"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Total Cost"
                    }
                }
            }
        }
    };
}

/**
 * Komponen pembungkus container chart
 */
interface ChartCardProps {
    title: string;
    description?: string;
    chartData: {type?: string; data?: unknown; options?: unknown};
    height?: number;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, description, chartData, height = 400 }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>
                <div style={{ height: `${height}px` }}>
                    {/* Chart akan dirender oleh GeneralChartContainer */}
                    <div data-chart-type={chartData.type} data-chart-config={JSON.stringify(chartData)}>
                        {/* Placeholder untuk rendering chart */}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
