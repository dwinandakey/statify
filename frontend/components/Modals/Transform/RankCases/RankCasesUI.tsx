"use client";

import type { FC } from "react";
import React, { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Ruler,
  Shapes,
  BarChartHorizontal,
  HelpCircle,
} from "lucide-react";
import type { Variable } from "@/types/Variable";
import VariableListManager from "@/components/Common/VariableListManager";
import type { RankCasesUIProps } from "./types";

/**
 * =========================
 * UI CONTENT (INTI TAMPILAN)
 * =========================
 */
const RankCasesUIContent: FC<RankCasesUIProps> = ({
  onClose,
  containerType = "dialog",
}) => {
  /**
   * ICON VARIABEL
   * (sama persis dengan SortCasesUI)
   */
  const getVariableIcon = (variable: Variable) => {
    switch (variable.measure) {
      case "scale":
        return <Ruler size={14} className="text-muted-foreground mr-1" />;
      case "nominal":
        return <Shapes size={14} className="text-muted-foreground mr-1" />;
      case "ordinal":
        return (
          <BarChartHorizontal size={14} className="text-muted-foreground mr-1" />
        );
      default:
        return <Shapes size={14} className="text-muted-foreground mr-1" />;
    }
  };

  /**
   * NAMA TAMPILAN VARIABEL
   */
  const getDisplayName = useCallback((variable: Variable) => {
    return variable.label
      ? `${variable.label} [${variable.name}]`
      : variable.name;
  }, []);

  return (
    <>
      {containerType === "dialog" && (
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold">
            Rank Cases
          </DialogTitle>
        </DialogHeader>
      )}

      <div className="p-6 overflow-y-auto flex-grow">
        {/* ALERT: BELUM ADA LOGIC */}
        <Alert className="mb-4">
          <AlertDescription>
            Ranking logic has not been implemented yet. This is UI preview only.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-6">
          {/* LIST VARIABEL (DUMMY / KOSONG) */}
          <VariableListManager
            availableVariables={[]}
            targetLists={[]}
            variableIdKey="tempId"
            highlightedVariable={null}
            setHighlightedVariable={() => {}}
            onMoveVariable={() => {}}
            onReorderVariable={() => {}}
            getVariableIcon={getVariableIcon}
            getDisplayName={getDisplayName}
            showArrowButtons={false}
            availableListHeight="16rem"
          />

          {/* OPSI RANKING (UI SAJA) */}
          <div>
            <div className="text-sm font-medium mb-2">Rank Order:</div>
            <RadioGroup value="asc" className="flex flex-col space-y-2">
              <Label className="flex items-center gap-2">
                <RadioGroupItem value="asc" />
                <span className="text-sm">Ascending</span>
              </Label>
              <Label className="flex items-center gap-2">
                <RadioGroupItem value="desc" />
                <span className="text-sm">Descending</span>
              </Label>
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-secondary">
        <div className="flex items-center text-muted-foreground">
          <HelpCircle size={18} className="mr-1" />
          <span className="text-sm">Rank cases help</span>
        </div>
        <div>
          <Button variant="outline" className="mr-2" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled>OK</Button>
        </div>
      </div>
    </>
  );
};

/**
 * =========================
 * WRAPPER (DIALOG / SIDEBAR)
 * =========================
 */
export const RankCasesUI: FC<RankCasesUIProps> = (props) => {
  const { containerType = "sidebar", onClose } = props;

  if (containerType === "sidebar") {
    return (
      <div className="h-full flex flex-col bg-popover text-popover-foreground">
        <RankCasesUIContent {...props} />
      </div>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 flex flex-col max-h-[85vh]">
        <RankCasesUIContent {...props} />
      </DialogContent>
    </Dialog>
  );
};