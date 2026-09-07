/**
 * Komponen Profil Klaster
 * Menampilkan karakteristik detail setiap klaster beserta profil atribut
 */

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ClusterProfile } from "../types/output";

const Progress: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
    <div className={`w-full bg-muted rounded-full overflow-hidden ${className ?? ""}`}>
        <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
    </div>
);

interface ClusterProfilesProps {
    profiles: ClusterProfile[];
    variables: { name: string; label?: string }[];
}

export const ClusterProfilesComponent: React.FC<ClusterProfilesProps> = ({ profiles, variables }) => {
    // Hitung min/maks untuk setiap atribut di semua klaster untuk normalisasi
    const attributeRanges: Record<string, { min: number; max: number }> = {};
    
    variables.forEach(v => {
        const values = profiles
            .map(p => p.meanAttributes?.[v.name])
            .filter((val): val is number => val !== null && val !== undefined && isFinite(val));
        
        attributeRanges[v.name] = {
            min: values.length > 0 ? Math.min(...values) : 0,
            max: values.length > 0 ? Math.max(...values) : 0
        };
    });

    const normalizeValue = (value: number, attrName: string): number => {
        const range = attributeRanges[attrName];
        if (range.max === range.min) return 50;
        return ((value - range.min) / (range.max - range.min)) * 100;
    };

    const getSilhouetteBadge = (score: number | null | undefined) => {
        if (score === null || score === undefined || !isFinite(score)) return <Badge variant="secondary">N/A</Badge>;
        if (score >= 0.7) return <Badge variant="default" className="bg-green-600">Very Strong</Badge>;
        if (score >= 0.5) return <Badge variant="default" className="bg-blue-600">Strong</Badge>;
        if (score >= 0.3) return <Badge variant="default" className="bg-yellow-600">Moderate</Badge>;
        return <Badge variant="destructive">Weak</Badge>;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map((profile) => (
                <Card key={profile.clusterLabel}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Cluster {profile.clusterLabel}</CardTitle>
                                <CardDescription>{profile.descriptiveLabel}</CardDescription>
                            </div>
                            {getSilhouetteBadge(profile.silhouetteScore)}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Statistik Klaster */}
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                                <div className="text-muted-foreground">Size</div>
                                <div className="font-semibold">{profile.size} cases ({profile.percentage !== null ? profile.percentage.toFixed(1) : '0'}%)</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Medoid</div>
                                <div className="font-semibold">Case #{profile.medoidId ?? 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Avg Distance</div>
                                <div className="font-semibold">{profile.withinClusterDistance !== null ? profile.withinClusterDistance.toFixed(2) : 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Silhouette</div>
                                <div className="font-semibold">{profile.silhouetteScore !== null ? profile.silhouetteScore.toFixed(3) : 'N/A'}</div>
                            </div>
                        </div>

                        {/* Profil Atribut */}
                        <div className="space-y-3">
                            <div className="text-sm font-medium">Attribute Profile</div>
                            {variables.map(v => {
                                const value = profile.meanAttributes?.[v.name];
                                const safeValue = value !== null && isFinite(value) ? value : 0;
                                const normalized = normalizeValue(safeValue, v.name);
                                
                                return (
                                    <div key={v.name} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">{v.label ?? v.name}</span>
                                            <span className="font-mono">{safeValue.toFixed(2)}</span>
                                        </div>
                                        <Progress value={normalized} className="h-2" />
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
