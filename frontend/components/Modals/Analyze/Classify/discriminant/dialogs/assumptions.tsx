import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
    /** Runs the assumption checks and pushes their output to the Output Viewer. */
    onRunAssumptions: () => Promise<void>;
    hasGrouping: boolean;
    independentCount: number;
};

const ASSUMPTIONS: { label: string; description: string }[] = [
    {
        label: "Multicollinearity (Tolerance / VIF)",
        description: "Flags predictors that are too strongly inter-correlated.",
    },
    {
        label: "Multivariate normality (Henze-Zirkler)",
        description: "Tests joint normality of the predictors.",
    },
    {
        label: "Univariate normality (Anderson-Darling)",
        description: "Tests normality of each predictor.",
    },
];

export const DiscriminantAssumptions = ({
    onRunAssumptions,
    hasGrouping,
    independentCount,
}: Props) => {
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const canRun = hasGrouping && independentCount > 0;

    const handleRun = async () => {
        try {
            setIsRunning(true);
            setError(null);
            setSuccess(false);
            await onRunAssumptions();
            setSuccess(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <Label className="font-bold">Assumption Tests</Label>
            <p className="text-xs text-muted-foreground">
                These assumptions should hold for the discriminant analysis to be
                valid. Run them to check — results appear in the Output Viewer right
                away, without running the full analysis.
            </p>

            <Card className="border rounded-md shadow-sm">
                <CardContent className="p-4 space-y-3">
                    {ASSUMPTIONS.map((a, i) => (
                        <React.Fragment key={a.label}>
                            {i > 0 && <Separator />}
                            <div>
                                <Label className="text-sm font-semibold">{a.label}</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {a.description}
                                </p>
                            </div>
                        </React.Fragment>
                    ))}
                </CardContent>
            </Card>

            <Button onClick={handleRun} disabled={isRunning || !canRun} className="w-full">
                {isRunning ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running...
                    </>
                ) : (
                    "Run Assumption Tests"
                )}
            </Button>

            {!canRun && (
                <p className="text-xs text-muted-foreground">
                    Select a grouping variable and at least one independent variable
                    (Variables tab) to run the tests.
                </p>
            )}

            {error && (
                <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="ml-2 text-sm font-semibold">Error</AlertTitle>
                    <AlertDescription className="ml-2 text-xs">{error}</AlertDescription>
                </Alert>
            )}
            {success && (
                <Alert className="py-2 border-green-200 bg-green-50 text-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="ml-2 text-sm font-semibold">Done</AlertTitle>
                    <AlertDescription className="ml-2 text-xs">
                        Assumption checks completed. See the{" "}
                        <strong>Output Viewer</strong> for results.
                    </AlertDescription>
                </Alert>
            )}

            <p className="text-xs text-muted-foreground">
                Homogeneity of covariance matrices is covered by Box&apos;s M
                (Statistics tab) and shown with the assumptions in the full output.
            </p>
        </div>
    );
};
