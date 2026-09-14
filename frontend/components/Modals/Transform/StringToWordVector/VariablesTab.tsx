import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Ruler, Shapes, BarChartHorizontal } from "lucide-react";
import type { Variable } from "@/types/Variable";

interface VariablesTabProps {
  availableVariables: Variable[];
  selectedVariable: Variable | null;
  highlightedVariable: Variable | null;
  setHighlightedVariable: (v: Variable | null) => void;

  onMoveToTarget: () => void;
  onRemoveTarget: () => void;
}

export const VariablesTab: React.FC<VariablesTabProps> = ({
  availableVariables,
  selectedVariable,
  highlightedVariable,
  setHighlightedVariable,
  onMoveToTarget,
  onRemoveTarget,
}) => {
  const getVariableIcon = (variable: Variable) => {
    switch (variable.measure) {
      case "scale":
        return <Ruler size={14} className="text-muted-foreground mr-1.5 flex-shrink-0" />;
      case "nominal":
        return <Shapes size={14} className="text-muted-foreground mr-1.5 flex-shrink-0" />;
      case "ordinal":
        return <BarChartHorizontal size={14} className="text-muted-foreground mr-1.5 flex-shrink-0" />;
      default:
        return <Shapes size={14} className="text-muted-foreground mr-1.5 flex-shrink-0" />;
    }
  };

  const getDisplayName = (variable: Variable) => variable.label || variable.name;

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
                  className={`flex items-center p-1.5 mb-1 cursor-pointer border rounded-md text-sm transition-colors ${
                    highlightedVariable?.name === variable.name
                      ? "bg-primary/10 text-primary border-primary"
                      : "border-muted-foreground/30 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                  }`}
                  onClick={() =>
                    setHighlightedVariable(
                      variable.name === highlightedVariable?.name ? null : variable
                    )
                  }
                  title="Click to select"
                >
                  {getVariableIcon(variable)}
                  <span className="truncate">{getDisplayName(variable)}</span>
                </div>
              ))}
              {availableVariables.length === 0 && (
                <div className="text-xs text-muted-foreground italic p-2 mt-2 text-center">
                  No text/string variables available.
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* KOLOM KANAN: Target Boxes */}
        <div className="col-span-1 flex flex-col gap-4 min-h-0 h-full overflow-y-auto pr-2 pb-2">
          {/* Target Variable */}
          <div className="flex items-start gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="mt-6 shrink-0 h-8 w-8"
              onClick={onMoveToTarget}
              disabled={!highlightedVariable || !!selectedVariable}
            >
              <ChevronRight size={16} />
            </Button>
            <div className="flex-1">
              <label className="font-semibold block mb-2 text-sm">
                Target Variable:
              </label>
              <div className="border border-border rounded-md min-h-[40px] p-2 bg-background transition-colors">
                {selectedVariable ? (
                  <div
                    className="flex items-center text-sm border border-muted-foreground/30 rounded-md p-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors cursor-pointer"
                    onClick={onRemoveTarget}
                    title="Click to remove"
                  >
                    {getVariableIcon(selectedVariable)}
                    <span className="truncate">{getDisplayName(selectedVariable)}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Select one variable...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
