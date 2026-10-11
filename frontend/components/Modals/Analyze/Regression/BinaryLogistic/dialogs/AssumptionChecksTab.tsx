import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, ListChecks, GitBranch, Waves, ShieldCheck } from "lucide-react";
import type { Variable } from "@/types/Variable";

interface AssumptionChecksTabProps {
  dependent: Variable | null;
  covariates: Variable[];
  // Callback functions untuk menjalankan logic di parent/worker
  onRunVIF: () => Promise<void>;
  onRunBoxTidwell: () => Promise<void>;
}

export const AssumptionChecksTab: React.FC<AssumptionChecksTabProps> = ({
  dependent,
  covariates,
  onRunVIF,
  onRunBoxTidwell,
}) => {
  // --- STATE: Multicollinearity (VIF) ---
  const [isTestingVIF, setIsTestingVIF] = useState(false);
  const [vifError, setVifError] = useState<string | null>(null);
  const [vifSuccess, setVifSuccess] = useState(false);

  // --- STATE: Linearity of Logit (Box-Tidwell) ---
  const [isTestingBT, setIsTestingBT] = useState(false);
  const [btError, setBtError] = useState<string | null>(null);
  const [btSuccess, setBtSuccess] = useState(false);

  // --- HANDLER: VIF ---
  const handleTestVIFClick = async () => {
    try {
      setIsTestingVIF(true);
      setVifError(null);
      setVifSuccess(false);

      if (!dependent) {
        throw new Error("Please select a dependent variable for VIF testing.");
      }
      if (covariates.length < 2) {
        throw new Error(
          "Please select at least two independent variables (covariates) for VIF testing."
        );
      }

      // Jalankan fungsi prop (Worker logic ada di parent)
      await onRunVIF();

      setVifSuccess(true);
    } catch (error: any) {
      console.error("VIF Check Error:", error);
      setVifError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsTestingVIF(false);
    }
  };

  // --- HANDLER: Box-Tidwell ---
  const handleTestBTClick = async () => {
    try {
      setIsTestingBT(true);
      setBtError(null);
      setBtSuccess(false);

      if (!dependent || covariates.length === 0) {
        throw new Error(
          "Please select a dependent variable and at least one continuous covariate."
        );
      }

      // Jalankan fungsi prop (Worker logic ada di parent)
      await onRunBoxTidwell();

      setBtSuccess(true);
    } catch (error: any) {
      console.error("Box-Tidwell Error:", error);
      setBtError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsTestingBT(false);
    }
  };

  return (
    <div className="space-y-4 p-4 h-full overflow-y-auto">
      {/* SECTION 1: SELECTED VARIABLES SUMMARY */}
      <div className="space-y-2">
        <Label className="font-bold flex items-center gap-1.5">
          <ListChecks className="h-4 w-4 text-primary" />
          Selected Variables
        </Label>
        <Card id="binary-logistic-assumption-summary-card" className="border rounded-md shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-2">
              {/* Dependent Variable */}
              <div>
                <Label className="font-semibold">Dependent Variable:</Label>
                <div className="pl-4 text-sm mt-1">
                  {dependent ? (
                    <span className="bg-muted px-2 py-0.5 rounded text-foreground">
                      {dependent.name}
                      {dependent.label ? ` (${dependent.label})` : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">
                      None selected
                    </span>
                  )}
                </div>
              </div>

              <Separator className="my-3" />

              {/* Independent Variables (Covariates) */}
              <div>
                <Label className="font-semibold">
                  Independent Variables (Covariates):
                </Label>
                <ScrollArea className="h-24 mt-1 border rounded-md bg-muted/10">
                  <div className="p-2 space-y-1">
                    {covariates.length > 0 ? (
                      covariates.map((variable) => (
                        <div key={variable.id} className="text-sm px-2">
                          {variable.name}
                          {variable.label ? ` (${variable.label})` : ""}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground italic px-2">
                        None selected
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2: ASSUMPTION TESTS */}
      <div className="space-y-2">
        <Label className="font-bold flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Assumption Tests
        </Label>
        <Card className="border rounded-md shadow-sm">
          <CardContent className="p-4 space-y-6">
            {/* 1. Multicollinearity (VIF) */}
            <div id="binary-logistic-assumption-vif-section" className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <Label className="font-semibold text-base flex items-center gap-1.5">
                    <GitBranch className="h-4 w-4 text-primary" />
                    Multicollinearity Checking (VIF)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Detects strong correlations among independent variables.
                  </p>
                </div>
                <Button
                  onClick={handleTestVIFClick}
                  disabled={isTestingVIF || !dependent || covariates.length < 2}
                  size="sm"
                  className="min-w-[140px]"
                >
                  {isTestingVIF ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Check VIF"
                  )}
                </Button>
              </div>

              {/* Alerts for VIF */}
              {vifError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="ml-2 text-sm font-semibold">
                    Error
                  </AlertTitle>
                  <AlertDescription className="ml-2 text-xs">
                    {vifError}
                  </AlertDescription>
                </Alert>
              )}
              {vifSuccess && (
                <Alert className="py-2 border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="ml-2 text-sm font-semibold">
                    Success
                  </AlertTitle>
                  <AlertDescription className="ml-2 text-xs">
                    VIF check completed. See <strong>Output Viewer</strong> for
                    results.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* 2. Linearity of Logit (Box-Tidwell) */}
            <div id="binary-logistic-assumption-boxtidwell-section" className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <Label className="font-semibold text-base flex items-center gap-1.5">
                    <Waves className="h-4 w-4 text-primary" />
                    Linearity of Logit (Box-Tidwell)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tests relationship between continuous predictors and
                    log-odds.
                  </p>
                </div>
                <Button
                  onClick={handleTestBTClick}
                  disabled={
                    isTestingBT || !dependent || covariates.length === 0
                  }
                  size="sm"
                  className="min-w-[140px]"
                >
                  {isTestingBT ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Run Box-Tidwell"
                  )}
                </Button>
              </div>

              {/* Alerts for Box-Tidwell */}
              {btError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="ml-2 text-sm font-semibold">
                    Error
                  </AlertTitle>
                  <AlertDescription className="ml-2 text-xs">
                    {btError}
                  </AlertDescription>
                </Alert>
              )}
              {btSuccess && (
                <Alert className="py-2 border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="ml-2 text-sm font-semibold">
                    Success
                  </AlertTitle>
                  <AlertDescription className="ml-2 text-xs">
                    Linearity test completed. See <strong>Output Viewer</strong>{" "}
                    for results.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
