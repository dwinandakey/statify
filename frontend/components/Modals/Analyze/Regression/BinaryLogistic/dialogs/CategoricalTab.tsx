import React, { useState, useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { Variable } from "@/types/Variable";
import type {
  BinaryLogisticCategoricalParams,
  ContrastMethodType,
  ReferenceCategoryType} from "../types/binary-logistic";
import {
  DEFAULT_CONTRAST,
  DEFAULT_REFERENCE,
} from "../types/binary-logistic";

interface CategoricalTabProps {
  covariates: Variable[];
  factors: Variable[];
  params: BinaryLogisticCategoricalParams;
  onChange: (p: BinaryLogisticCategoricalParams) => void;
}

export const CategoricalTab: React.FC<CategoricalTabProps> = ({
  covariates,
  factors,
  params,
  onChange,
}) => {
  // Currently selected variable in the list (for editing its contrast/reference)
  const [selectedVarName, setSelectedVarName] = useState<string | null>(null);

  // Temporary edit state for contrast/reference (applied on "Change")
  const [editContrast, setEditContrast] = useState<ContrastMethodType>(DEFAULT_CONTRAST);
  const [editReference, setEditReference] = useState<ReferenceCategoryType>(DEFAULT_REFERENCE);

  // Toggle checkbox state only (not selection for editing)
  const toggleCovariate = useCallback((name: string) => {
    const current = params.covariates;
    const newSettings = { ...params.variableSettings };

    if (current.includes(name)) {
      // Uncheck: remove from covariates and settings
      delete newSettings[name];
      onChange({
        ...params,
        covariates: current.filter((c) => c !== name),
        variableSettings: newSettings,
      });
      if (selectedVarName === name) setSelectedVarName(null);
    } else {
      // Check: add with default settings
      newSettings[name] = {
        name,
        contrast: DEFAULT_CONTRAST,
        referenceCategory: DEFAULT_REFERENCE,
      };
      onChange({
        ...params,
        covariates: [...current, name],
        variableSettings: newSettings,
      });
    }
  }, [params, onChange, selectedVarName]);

  // When user clicks a row, handle check OR select-for-editing
  const handleRowClick = useCallback((name: string) => {
    const isChecked = params.covariates.includes(name);
    if (isChecked) {
      // Already checked → select for editing (load current settings into edit state)
      setSelectedVarName(name);
      const setting = params.variableSettings[name];
      setEditContrast(setting?.contrast ?? DEFAULT_CONTRAST);
      setEditReference(setting?.referenceCategory ?? DEFAULT_REFERENCE);
    } else {
      // Not checked → check it with default settings
      toggleCovariate(name);
    }
  }, [params.covariates, params.variableSettings, toggleCovariate]);

  // Apply the edit to the selected variable
  const handleChange = useCallback(() => {
    if (!selectedVarName) return;
    const newSettings = { ...params.variableSettings };
    newSettings[selectedVarName] = {
      name: selectedVarName,
      contrast: editContrast,
      referenceCategory: editReference,
    };
    onChange({ ...params, variableSettings: newSettings });
  }, [selectedVarName, editContrast, editReference, params, onChange]);

  // Gabungkan factors dan covariates untuk ditampilkan
  const allVariables = useMemo(() => [...factors, ...covariates], [factors, covariates]);

  // --- LOGIKA: Cek apakah metode butuh referensi ---
  const methodsWithoutReference = [
    "Difference",
    "Helmert",
    "Repeated",
    "Polynomial",
  ];
  const isReferenceDisabled = methodsWithoutReference.includes(editContrast);

  // Build display label for a variable showing its current setting, e.g. "Indicator(Last)"
  const getSettingLabel = useCallback((name: string): string | null => {
    if (!params.covariates.includes(name)) return null;
    const s = params.variableSettings[name];
    if (!s) return null;
    const noRef = methodsWithoutReference.includes(s.contrast);
    if (noRef) return `${s.contrast}`;
    return `${s.contrast}(${s.referenceCategory})`;
  }, [params.covariates, params.variableSettings]);

  // Check if edit state differs from saved state (to enable Change button)
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedVarName) return false;
    const saved = params.variableSettings[selectedVarName];
    if (!saved) return true;
    return saved.contrast !== editContrast || saved.referenceCategory !== editReference;
  }, [selectedVarName, editContrast, editReference, params.variableSettings]);

  return (
    <div className="grid grid-cols-2 gap-6 py-4 h-full min-h-0">
      {/* Kiri: List Covariates */}
      <div className="flex flex-col h-full min-h-0">
        <Label className="mb-2 font-semibold">
          Categorical Covariates:
        </Label>
        <div className="border rounded-md flex-1 bg-background min-h-0 relative">
          <ScrollArea className="h-full p-2 w-full">
            <div className="pr-3">
              {allVariables.map((v) => {
                const isChecked = params.covariates.includes(v.name);
                const isSelected = selectedVarName === v.name;
                const settingLabel = getSettingLabel(v.name);

                return (
                  <div
                    key={v.id}
                    className={`flex items-center space-x-3 p-2 rounded-md transition-colors border-b last:border-0 cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 ring-1 ring-primary/30"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => handleRowClick(v.name)}
                    data-testid={`binary-logistic-categorical-row-${v.name}`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleCovariate(v.name)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex flex-col flex-grow min-w-0">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-medium truncate">
                          {v.name}
                          {settingLabel && (
                            <span className="text-muted-foreground font-normal ml-1">
                              ({settingLabel})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {allVariables.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 min-h-[200px]">
                  <p className="text-sm text-muted-foreground">
                    No covariates selected in main tab.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Kanan: Settings per Variable */}
      <div className="flex flex-col h-full min-h-0">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6 pb-2">
            {/* Info: which variable is being configured */}
            <div className="border p-3 rounded-md bg-muted/50">
              {selectedVarName ? (
                <p className="text-sm">
                  Configuring: <span className="font-semibold">{selectedVarName}</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Click a checked variable to configure its contrast method and reference category.
                </p>
              )}
            </div>

            <div className={`space-y-4 border p-4 rounded-md bg-card shadow-sm transition-all duration-200 ${
              !selectedVarName ? "opacity-50 pointer-events-none" : ""
            }`}>
              <Label className="font-semibold">Contrast Method</Label>
              <Select
                value={editContrast}
                onValueChange={(val) => setEditContrast(val as ContrastMethodType)}
                disabled={!selectedVarName}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indicator">Indicator</SelectItem>
                  <SelectItem value="Simple">Simple</SelectItem>
                  <SelectItem value="Difference">Difference</SelectItem>
                  <SelectItem value="Helmert">Helmert</SelectItem>
                  <SelectItem value="Repeated">Repeated</SelectItem>
                  <SelectItem value="Polynomial">Polynomial</SelectItem>
                  <SelectItem value="Deviation">Deviation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              className={`space-y-4 border p-4 rounded-md bg-card shadow-sm transition-all duration-200 ${
                !selectedVarName || isReferenceDisabled
                  ? "opacity-50 pointer-events-none grayscale"
                  : "opacity-100"
              }`}
            >
              <Label className="font-semibold">Reference Category</Label>
              <RadioGroup
                value={editReference}
                onValueChange={(val) => setEditReference(val as ReferenceCategoryType)}
                disabled={!selectedVarName || isReferenceDisabled}
              >
                <div className="flex items-center space-x-2 border p-2 rounded hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="Last" id="ref-last" />
                  <Label
                    htmlFor="ref-last"
                    className="cursor-pointer flex-grow"
                  >
                    Last (highest value)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border p-2 rounded hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="First" id="ref-first" />
                  <Label
                    htmlFor="ref-first"
                    className="cursor-pointer flex-grow"
                  >
                    First (lowest value)
                  </Label>
                </div>
              </RadioGroup>
              {isReferenceDisabled && selectedVarName && (
                <p className="text-[10px] text-muted-foreground italic">
                  *Reference category is not applicable for the selected
                  contrast method.
                </p>
              )}
            </div>

            {/* Change Button */}
            <Button
              onClick={handleChange}
              disabled={!selectedVarName || !hasUnsavedChanges}
              className="w-full"
              variant={hasUnsavedChanges ? "default" : "outline"}
            >
              Change
            </Button>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
