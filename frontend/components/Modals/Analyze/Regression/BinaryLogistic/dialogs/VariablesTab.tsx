"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Ruler, Shapes, BarChartHorizontal } from "lucide-react";
import type { Variable } from "@/types/Variable";
import type { BinaryLogisticOptions } from "../types/binary-logistic";
import { cn } from "@/lib/utils";

interface VariablesTabProps {
  availableVariables: Variable[];
  selectedDependent: Variable | null;
  selectedCovariates: Variable[];
  highlightedVariable: Variable | null;
  setHighlightedVariable: (v: Variable | null) => void;

  // Handlers
  onMoveToDependent: () => void;
  onMoveToCovariates: () => void;
  onRemoveDependent: () => void;
  onRemoveCovariate: (v: Variable) => void;

  // Drop-based handlers (accepts batch of variables directly)
  onDropToDependent?: (vars: Variable[]) => void;
  onDropToCovariates?: (vars: Variable[]) => void;

  // Method
  method: BinaryLogisticOptions["method"];
  onMethodChange: (val: BinaryLogisticOptions["method"]) => void;
}

export const VariablesTab: React.FC<VariablesTabProps> = ({
  availableVariables,
  selectedDependent,
  selectedCovariates,
  highlightedVariable,
  setHighlightedVariable,
  onMoveToDependent,
  onMoveToCovariates,
  onRemoveDependent,
  onRemoveCovariate,
  onDropToDependent,
  onDropToCovariates,
  method,
  onMethodChange,
}) => {
  // --- Internal multi-select state for drag-and-drop ---
  const [selectedVarIds, setSelectedVarIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<"dependent" | "covariates" | null>(null);

  const selectedVars = availableVariables.filter((v) =>
    selectedVarIds.includes(String(v.id))
  );

  // --- Click handler: supports single, Ctrl, Shift selection ---
  const handleSelect = (v: Variable, e: React.MouseEvent<HTMLDivElement>) => {
    const multiSelect = e.ctrlKey || e.metaKey;
    const useRangeSelect = e.shiftKey && lastSelectedIndex !== null;
    const varId = String(v.id);

    const currentIndex = availableVariables.findIndex(
      (item) => String(item.id) === varId
    );
    if (currentIndex < 0) return;

    if (useRangeSelect) {
      const start = Math.min(lastSelectedIndex!, currentIndex);
      const end = Math.max(lastSelectedIndex!, currentIndex);
      const rangeIds = availableVariables
        .slice(start, end + 1)
        .map((item) => String(item.id));

      setSelectedVarIds((prev) => {
        if (multiSelect) {
          const merged = new Set([...prev, ...rangeIds]);
          return Array.from(merged);
        }
        return rangeIds;
      });
      setLastSelectedIndex(currentIndex);
      setHighlightedVariable(v);
      return;
    }

    if (multiSelect) {
      setSelectedVarIds((prev) =>
        prev.includes(varId)
          ? prev.filter((id) => id !== varId)
          : [...prev, varId]
      );
      setLastSelectedIndex(currentIndex);
      setHighlightedVariable(v);
      return;
    }

    // Single click toggle
    const isAlreadySelected =
      selectedVarIds.length === 1 && selectedVarIds[0] === varId;
    setSelectedVarIds(isAlreadySelected ? [] : [varId]);
    setLastSelectedIndex(currentIndex);
    setHighlightedVariable(isAlreadySelected ? null : v);
  };

  // --- Drag handlers ---
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    draggedVar: Variable
  ) => {
    const draggedId = String(draggedVar.id);
    const idsToDrag = selectedVarIds.includes(draggedId)
      ? selectedVarIds
      : [draggedId];

    if (!selectedVarIds.includes(draggedId)) {
      setSelectedVarIds([draggedId]);
    }

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/statify-variable-ids",
      JSON.stringify(idsToDrag)
    );
  };

  const handleDropToTarget = (
    e: React.DragEvent<HTMLDivElement>,
    target: "dependent" | "covariates"
  ) => {
    e.preventDefault();
    setDragOverTarget(null);

    const raw = e.dataTransfer.getData("application/statify-variable-ids");
    if (!raw) return;

    try {
      const ids = JSON.parse(raw) as string[];
      const droppedVars = availableVariables.filter((v) =>
        ids.includes(String(v.id))
      );
      if (droppedVars.length === 0) return;

      if (target === "dependent" && onDropToDependent) {
        onDropToDependent(droppedVars);
      } else if (target === "covariates" && onDropToCovariates) {
        onDropToCovariates(droppedVars);
      }

      setSelectedVarIds([]);
      setHighlightedVariable(null);
    } catch {
      // Ignore invalid payload
    }
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    target: "dependent" | "covariates"
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTarget(target);
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  // --- Button handlers: bridge multi-select with parent's single-variable handlers ---
  const handleButtonMoveToDependent = () => {
    if (selectedVars.length > 0 && onDropToDependent) {
      onDropToDependent(selectedVars);
      setSelectedVarIds([]);
      setHighlightedVariable(null);
      return;
    }
    onMoveToDependent();
    setSelectedVarIds([]);
  };

  const handleButtonMoveToCovariates = () => {
    if (selectedVars.length > 1 && onDropToCovariates) {
      onDropToCovariates(selectedVars);
      setSelectedVarIds([]);
      setHighlightedVariable(null);
      return;
    }
    onMoveToCovariates();
    setSelectedVarIds([]);
  };

  // --- Original icon helper ---
  const getVariableIcon = (variable: Variable) => {
    switch (variable.measure) {
      case "scale":
        return (
          <Ruler
            size={14}
            className="text-muted-foreground mr-1.5 flex-shrink-0"
          />
        );
      case "nominal":
        return (
          <Shapes
            size={14}
            className="text-muted-foreground mr-1.5 flex-shrink-0"
          />
        );
      case "ordinal":
        return (
          <BarChartHorizontal
            size={14}
            className="text-muted-foreground mr-1.5 flex-shrink-0"
          />
        );
      default:
        return (
          <Shapes
            size={14}
            className="text-muted-foreground mr-1.5 flex-shrink-0"
          />
        );
    }
  };

  const getDisplayName = (variable: Variable) =>
    variable.label || variable.name;

  const hasSelection = selectedVars.length > 0 || !!highlightedVariable;

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-2 gap-6 py-4 flex-grow min-h-0">
        {/* KOLOM KIRI: Available Variables */}
        <div className="col-span-1 flex flex-col h-full min-h-0">
          <label className="font-semibold block mb-2 text-sm">Variables:</label>
          <div className="border border-border rounded-md flex-1 bg-background overflow-hidden">
            <ScrollArea className="h-full p-2 pr-3">
              {availableVariables.map((variable) => (
                <div
                  key={variable.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, variable)}
                  className={cn(
                    "flex items-center p-1.5 mb-1 cursor-pointer border rounded-md text-sm transition-colors",
                    selectedVarIds.includes(String(variable.id))
                      ? "bg-primary/10 text-primary border-primary"
                      : highlightedVariable?.name === variable.name
                        ? "bg-primary/10 text-primary border-primary"
                        : "border-muted-foreground/30 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                  )}
                  onClick={(e) => handleSelect(variable, e)}
                  title="Click to select, drag to move"
                >
                  {getVariableIcon(variable)}
                  <span className="truncate">{getDisplayName(variable)}</span>
                </div>
              ))}
            </ScrollArea>
          </div>
        </div>

        {/* KOLOM KANAN: Target Boxes */}
        <div className="col-span-1 flex flex-col gap-4 min-h-0 h-full overflow-y-auto pr-2 pb-2">
          {/* Dependent Variable */}
          <div className="flex items-start gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="mt-6 shrink-0 h-8 w-8"
              onClick={handleButtonMoveToDependent}
              disabled={!hasSelection || !!selectedDependent}
            >
              <ChevronRight size={16} />
            </Button>
            <div className="flex-1">
              <label className="font-semibold block mb-2 text-sm">
                Dependent:
              </label>
              <div
                className={cn(
                  "border border-border rounded-md min-h-[40px] p-2 bg-background transition-colors",
                  dragOverTarget === "dependent" &&
                    "border-primary bg-primary/5 ring-1 ring-primary/30"
                )}
                onDragOver={(e) => handleDragOver(e, "dependent")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropToTarget(e, "dependent")}
              >
                {selectedDependent ? (
                  <div
                    className="flex items-center text-sm border border-muted-foreground/30 rounded-md p-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors cursor-pointer"
                    onClick={onRemoveDependent}
                    title="Click to remove"
                  >
                    {getVariableIcon(selectedDependent)}
                    <span className="truncate">
                      {getDisplayName(selectedDependent)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Select or drag variable...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Covariates (Expandable Height) */}
          <div className="flex items-start gap-2 flex-1 min-h-0">
            <Button
              variant="outline"
              size="icon"
              className="mt-6 shrink-0 h-8 w-8"
              onClick={handleButtonMoveToCovariates}
              disabled={!hasSelection}
            >
              <ChevronRight size={16} />
            </Button>

            <div className="flex-1">
              <label className="font-semibold block mb-2 text-sm">
                Covariates:
              </label>

              <div
                className={cn(
                  "border border-border rounded-md bg-background min-h-[200px] h-auto p-2 transition-colors",
                  dragOverTarget === "covariates" &&
                    "border-primary bg-primary/5 ring-1 ring-primary/30"
                )}
                onDragOver={(e) => handleDragOver(e, "covariates")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropToTarget(e, "covariates")}
              >
                {selectedCovariates.length === 0 && (
                  <div className="text-xs text-muted-foreground italic p-1">
                    Select or drag variables...
                  </div>
                )}
                {selectedCovariates.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center p-1.5 mb-1 rounded-md cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 border border-muted-foreground/30 text-sm transition-colors"
                    onClick={() => onRemoveCovariate(v)}
                    title="Click to remove"
                  >
                    {getVariableIcon(v)}
                    <span className="truncate">{getDisplayName(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER: Method Selector */}
      <div className="flex items-center justify-end gap-3 mt-2 pt-2 border-t border-border/50 flex-shrink-0 mb-2">
        <label htmlFor="method-select" className="text-sm font-medium">
          Method:
        </label>
        <select
          id="method-select"
          className="h-8 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={method}
          onChange={(e) =>
            onMethodChange(e.target.value as BinaryLogisticOptions["method"])
          }
          aria-label="Select Regression Method"
          title="Regression Method"
        >
          <option value="Enter">Enter</option>
          <optgroup label="Forward Stepwise">
            <option value="Forward: Conditional">Forward: Conditional</option>
            <option value="Forward: LR">Forward: LR</option>
            <option value="Forward: Wald">Forward: Wald</option>
          </optgroup>
          <optgroup label="Backward Stepwise">
            <option value="Backward: Conditional">
              Backward: Conditional
            </option>
            <option value="Backward: LR">Backward: LR</option>
            <option value="Backward: Wald">Backward: Wald</option>
          </optgroup>
        </select>
      </div>
    </div>
  );
};
