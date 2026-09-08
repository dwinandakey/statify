"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useVariableStore } from '@/stores/useVariableStore';
import { useDataStore } from '@/stores/useDataStore';
import { useAnalysisData } from '@/hooks/useAnalysisData';
import { useResultStore } from '@/stores/useResultStore';
import { ChartService } from '@/services/chart/ChartService';
import { DataProcessingService } from '@/services/chart/DataProcessingService';

import { Variable } from '@/types/Variable';
import { CellUpdate } from '@/stores/useDataStore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, HelpCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { TourPopup, ActiveElementHighlight } from '@/components/Common/TourComponents';
import { useTourGuide, TabControlProps } from '@/components/Modals/Analyze/Descriptive/Descriptive/hooks/useTourGuide';
import { AnimatePresence } from 'framer-motion';
import { baseTourSteps } from './tourConfig';

// Define types for ordinal regression parameters
interface StatisticsOrdinalParams {
  estimates: boolean;
  goodnessOfFit: boolean;
  pseudoRSquare: boolean;
  cellInformation: boolean;
  confidenceLevel: string;
  delta: number;
  linkFunction: string;
  testOfParallelLines: boolean;
}

interface PlotsOrdinalParams {
  selectedX: string;
  selectedY: string;
  histogramForXChecked: boolean;
  observedProbabilities: boolean;
  cumulativeProbabilities: boolean;
}

interface SaveOrdinalParams {
  predictedCategory: boolean;
  predictedProbabilities: boolean;
  predictedCategoryProbability: boolean;
  actualCategoryProbability: boolean;
}

interface OptionsOrdinalParams {
  maximumIterations: number;
  delta: number;
  singularityTolerance: number;
  linkFunction: string;
}

interface AssumptionTestOrdinalParams {
  testOfParallelLines: boolean;
}

// Default parameters for ordinal regression
const defaultStatsParams: StatisticsOrdinalParams = {
  estimates: true,
  goodnessOfFit: true,
  pseudoRSquare: true,
  cellInformation: false,
  confidenceLevel: "95",
  delta: 0,
  linkFunction: "Logit",
  testOfParallelLines: true
};

const defaultPlotParams: PlotsOrdinalParams = {
  selectedX: "",
  selectedY: "",
  histogramForXChecked: false,
  observedProbabilities: false,
  cumulativeProbabilities: false
};

const defaultSaveParams: SaveOrdinalParams = {
  predictedCategory: false,
  predictedProbabilities: false,
  predictedCategoryProbability: false,
  actualCategoryProbability: false
};

const defaultOptionsParams: OptionsOrdinalParams = {
  maximumIterations: 100,
  delta: 0,
  singularityTolerance: 0.0000001,
  linkFunction: "Logit"
};

const defaultAssumptionTestParams: AssumptionTestOrdinalParams = {
  testOfParallelLines: true
};

// Variables Tab Component - Modified to match SPSS layout
const VariablesOrdinalTab: React.FC<{
  availableVariables: Variable[];
  selectedDependentVariable: Variable | null;
  selectedFactorVariables: Variable[];
  selectedCovariateVariables: Variable[];
  highlightedVariable: Variable | null;
  handleSelectAvailableVariable: (variable: Variable | null) => void;
  handleMoveToDependent: () => void;
  handleMoveToFactor: () => void;
  handleMoveToCovariate: () => void;
  handleRemoveFromDependent: () => void;
  handleRemoveFromFactor: (variable: Variable) => void;
  handleRemoveFromCovariate: (variable: Variable) => void;
}> = ({
  availableVariables,
  selectedDependentVariable,
  selectedFactorVariables,
  selectedCovariateVariables,
  highlightedVariable,
  handleSelectAvailableVariable,
  handleMoveToDependent,
  handleMoveToFactor,
  handleMoveToCovariate,
  handleRemoveFromDependent,
  handleRemoveFromFactor,
  handleRemoveFromCovariate
}) => {
  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        {/* Left side - Available Variables */}
        <div className="w-1/3 space-y-2">
          <h3 className="text-sm font-medium">Available Variables</h3>
          <div className="border rounded-md p-2 h-64 overflow-y-auto">
            {availableVariables.map((variable) => (
              <div
                key={variable.id}
                className={`p-1 cursor-pointer hover:bg-gray-100 ${highlightedVariable?.id === variable.id ? 'bg-blue-100' : ''}`}
                onClick={() => handleSelectAvailableVariable(variable)}
              >
                {variable.name}
              </div>
            ))}
          </div>
        </div>
        
        {/* Middle - Selected Variables and Arrow Buttons */}
        <div className="w-1/2 space-y-4">
          {/* Dependent Variable */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Dependent</h3>
            <div className="border rounded-md p-2 h-20 overflow-y-auto">
              {selectedDependentVariable ? (
                <div className="p-1 bg-blue-100 flex justify-between items-center">
                  {selectedDependentVariable.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleRemoveFromDependent}
                  >
                    ×
                  </Button>
                </div>
              ) : (
                <div className="text-gray-400 p-1">No variable selected</div>
              )}
            </div>
          </div>
          
          {/* Factor(s) Variables */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Factor(s)</h3>
            <div className="border rounded-md p-2 h-20 overflow-y-auto">
              {selectedFactorVariables.length > 0 ? (
                selectedFactorVariables.map((variable) => (
                  <div key={variable.id} className="p-1 bg-blue-100 flex justify-between items-center">
                    {variable.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleRemoveFromFactor(variable)}
                    >
                      ×
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 p-1">No variables selected</div>
              )}
            </div>
          </div>
          
          {/* Covariate(s) Variables */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Covariate(s)</h3>
            <div className="border rounded-md p-2 h-20 overflow-y-auto">
              {selectedCovariateVariables.length > 0 ? (
                selectedCovariateVariables.map((variable) => (
                  <div key={variable.id} className="p-1 bg-blue-100 flex justify-between items-center">
                    {variable.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleRemoveFromCovariate(variable)}
                    >
                      ×
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 p-1">No variables selected</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right side - Arrow Buttons and Additional Options */}
        <div className="w-1/6 space-y-4">
          {/* Arrow Buttons */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMoveToDependent}
              disabled={!highlightedVariable}
              className="w-full"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMoveToFactor}
              disabled={!highlightedVariable}
              className="w-full"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMoveToCovariate}
              disabled={!highlightedVariable}
              className="w-full"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Additional Buttons like in SPSS */}
          <div className="space-y-2 pt-4">
            <Button variant="outline" size="sm" className="w-full">Options</Button>
            <Button variant="outline" size="sm" className="w-full">Output</Button>
            <Button variant="outline" size="sm" className="w-full">Save</Button>
            <Button variant="outline" size="sm" className="w-full">Location</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatisticsOrdinal: React.FC<{
  params: StatisticsOrdinalParams;
  onChange: (newParams: Partial<StatisticsOrdinalParams>) => void;
  showAlert: (title: string, description: string) => void;
}> = ({ params, onChange, showAlert }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Statistics</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.estimates}
              onChange={(e) => onChange({ estimates: e.target.checked })}
            />
            <span>Estimates</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.goodnessOfFit}
              onChange={(e) => onChange({ goodnessOfFit: e.target.checked })}
            />
            <span>Goodness of Fit</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.pseudoRSquare}
              onChange={(e) => onChange({ pseudoRSquare: e.target.checked })}
            />
            <span>Pseudo R-Square</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.cellInformation}
              onChange={(e) => onChange({ cellInformation: e.target.checked })}
            />
            <span>Cell Information</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.testOfParallelLines}
              onChange={(e) => onChange({ testOfParallelLines: e.target.checked })}
            />
            <span>Test of Parallel Lines</span>
          </label>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Confidence Interval</h3>
        <div className="flex items-center space-x-2">
          <label>Level (%):</label>
          <input
            type="text"
            value={params.confidenceLevel}
            onChange={(e) => onChange({ confidenceLevel: e.target.value })}
            className="border rounded px-2 py-1 w-16"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Delta</h3>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={params.delta}
            onChange={(e) => onChange({ delta: parseFloat(e.target.value) || 0 })}
            className="border rounded px-2 py-1 w-16"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Link Function</h3>
        <select
          value={params.linkFunction}
          onChange={(e) => onChange({ linkFunction: e.target.value })}
          className="border rounded px-2 py-1 w-full"
        >
          <option value="Logit">Logit</option>
          <option value="Probit">Probit</option>
          <option value="Complementary Log-Log">Complementary Log-Log</option>
          <option value="Negative Log-Log">Negative Log-Log</option>
          <option value="Cauchit">Cauchit</option>
        </select>
      </div>
    </div>
  );
};

const PlotsOrdinal: React.FC<{
  params: PlotsOrdinalParams;
  onChange: (newParams: Partial<PlotsOrdinalParams>) => void;
  availablePlotVariables: { name: string }[];
}> = ({ params, onChange, availablePlotVariables }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">X Axis</h3>
          <select
            value={params.selectedX}
            onChange={(e) => onChange({ selectedX: e.target.value })}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="">Select variable</option>
            {availablePlotVariables.map((variable) => (
              <option key={variable.name} value={variable.name}>
                {variable.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Y Axis</h3>
          <select
            value={params.selectedY}
            onChange={(e) => onChange({ selectedY: e.target.value })}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="">Select variable</option>
            {availablePlotVariables.map((variable) => (
              <option key={variable.name} value={variable.name}>
                {variable.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Plot Options</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.histogramForXChecked}
              onChange={(e) => onChange({ histogramForXChecked: e.target.checked })}
            />
            <span>Histogram for X</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.observedProbabilities}
              onChange={(e) => onChange({ observedProbabilities: e.target.checked })}
            />
            <span>Observed Probabilities</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.cumulativeProbabilities}
              onChange={(e) => onChange({ cumulativeProbabilities: e.target.checked })}
            />
            <span>Cumulative Probabilities</span>
          </label>
        </div>
      </div>
    </div>
  );
};

const SaveOrdinal: React.FC<{
  params: SaveOrdinalParams;
  onChange: (newParams: Partial<SaveOrdinalParams>) => void;
}> = ({ params, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Save Variables</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.predictedCategory}
              onChange={(e) => onChange({ predictedCategory: e.target.checked })}
            />
            <span>Predicted Category</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.predictedProbabilities}
              onChange={(e) => onChange({ predictedProbabilities: e.target.checked })}
            />
            <span>Predicted Probabilities</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.predictedCategoryProbability}
              onChange={(e) => onChange({ predictedCategoryProbability: e.target.checked })}
            />
            <span>Predicted Category Probability</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.actualCategoryProbability}
              onChange={(e) => onChange({ actualCategoryProbability: e.target.checked })}
            />
            <span>Actual Category Probability</span>
          </label>
        </div>
      </div>
    </div>
  );
};

const OptionsOrdinal: React.FC<{
  params: OptionsOrdinalParams;
  onChange: (newParams: Partial<OptionsOrdinalParams>) => void;
  showAlert: (title: string, description: string) => void;
}> = ({ params, onChange, showAlert }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Iteration Options</h3>
        <div className="flex items-center space-x-2">
          <label>Maximum Iterations:</label>
          <input
            type="number"
            value={params.maximumIterations}
            onChange={(e) => onChange({ maximumIterations: parseInt(e.target.value) || 100 })}
            className="border rounded px-2 py-1 w-20"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Delta</h3>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={params.delta}
            onChange={(e) => onChange({ delta: parseFloat(e.target.value) || 0 })}
            className="border rounded px-2 py-1 w-20"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Singularity Tolerance</h3>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={params.singularityTolerance}
            onChange={(e) => onChange({ singularityTolerance: parseFloat(e.target.value) || 0.0000001 })}
            className="border rounded px-2 py-1 w-32"
            step="0.0000001"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Link Function</h3>
        <select
          value={params.linkFunction}
          onChange={(e) => onChange({ linkFunction: e.target.value })}
          className="border rounded px-2 py-1 w-full"
        >
          <option value="Logit">Logit</option>
          <option value="Probit">Probit</option>
          <option value="Complementary Log-Log">Complementary Log-Log</option>
          <option value="Negative Log-Log">Negative Log-Log</option>
          <option value="Cauchit">Cauchit</option>
        </select>
      </div>
    </div>
  );
};

const AssumptionTestOrdinal: React.FC<{
  params: AssumptionTestOrdinalParams;
  onChange: (newParams: Partial<AssumptionTestOrdinalParams>) => void;
  selectedDependentVariable: Variable | null;
  selectedFactorVariables: Variable[];
  selectedCovariateVariables: Variable[];
}> = ({ params, onChange, selectedDependentVariable, selectedFactorVariables, selectedCovariateVariables }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Assumption Tests</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={params.testOfParallelLines}
              onChange={(e) => onChange({ testOfParallelLines: e.target.checked })}
            />
            <span>Test of Parallel Lines</span>
          </label>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Model Variables</h3>
        <div className="border rounded-md p-2">
          <div className="space-y-1">
            <div>
              <span className="font-medium">Dependent:</span> {selectedDependentVariable?.name || "None selected"}
            </div>
            <div>
              <span className="font-medium">Factor(s):</span> {selectedFactorVariables.length > 0 ? 
                selectedFactorVariables.map(v => v.name).join(", ") : 
                "None selected"}
            </div>
            <div>
              <span className="font-medium">Covariate(s):</span> {selectedCovariateVariables.length > 0 ? 
                selectedCovariateVariables.map(v => v.name).join(", ") : 
                "None selected"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ModalOrdinalProps {
  onClose: () => void;
  containerType?: "dialog" | "sidebar";
}

const ModalOrdinal: React.FC<ModalOrdinalProps> = ({ onClose, containerType = "dialog" }) => {
  // State variables
  const [activeTab, setActiveTab] = useState<'variables' | 'statistics' | 'plots' | 'save' | 'options' | 'assumption'>('variables');
  const [availableVariables, setAvailableVariables] = useState<Variable[]>([]);

  // -------------------- Help Tour --------------------
  const tabControl = React.useMemo<TabControlProps>(() => ({
    setActiveTab: (tab: string) => setActiveTab(tab as any),
    currentActiveTab: activeTab
  }), [activeTab]);

  const {
    tourActive,
    currentStep,
    tourSteps,
    currentTargetElement,
    startTour,
    nextStep,
    prevStep,
    endTour
  } = useTourGuide(baseTourSteps, containerType, tabControl);
  
  const [selectedDependentVariable, setSelectedDependentVariable] = useState<Variable | null>(null);
  const [selectedFactorVariables, setSelectedFactorVariables] = useState<Variable[]>([]);
  const [selectedCovariateVariables, setSelectedCovariateVariables] = useState<Variable[]>([]);
  const [highlightedVariable, setHighlightedVariable] = useState<Variable | null>(null);
  const method = "Enter";
  
  // Inlined useValidationAlert hook logic
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ title: string, description: string }>({ title: "", description: "" });
  const [inlineAlertMessage, setInlineAlertMessage] = useState<string | null>(null);

  const showAlert = (title: string, description: string) => {
    if (containerType === "sidebar") {
        setInlineAlertMessage(`${title}: ${description}`);
    } else {
        setAlertMessage({ title, description });
        setAlertOpen(true);
    }
  };

  const ValidationAlert = () => (
    <>
        {containerType === "dialog" && (
            <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{alertMessage.title}</AlertDialogTitle>
                        <AlertDialogDescription>{alertMessage.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setAlertOpen(false)}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
        {containerType === "sidebar" && inlineAlertMessage && (
            <div className="col-span-full p-2 mb-2 text-sm text-destructive-foreground bg-destructive rounded-md">
                {inlineAlertMessage}
                <Button variant="ghost" size="sm" onClick={() => setInlineAlertMessage(null)} className="ml-2 text-destructive-foreground hover:bg-destructive/80">Dismiss</Button>
            </div>
        )}
    </>
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State untuk parameter dari tab lain
  const [statsParams, setStatsParams] = useState<StatisticsOrdinalParams>(defaultStatsParams);
  const [plotParams, setPlotParams] = useState<PlotsOrdinalParams>(defaultPlotParams);
  const [saveParams, setSaveParams] = useState<SaveOrdinalParams>(defaultSaveParams);
  const [optionsParams, setOptionsParams] = useState<OptionsOrdinalParams>(defaultOptionsParams);
  const [assumptionTestParams, setAssumptionTestParams] = useState<AssumptionTestOrdinalParams>(defaultAssumptionTestParams);

  const variablesFromStore = useVariableStore((state) => state.variables);
  const { data } = useAnalysisData();
  const { addLog, addAnalytic, addStatistic } = useResultStore();

  // Side effect
  useEffect(() => {
    // Update available variables for the Variables tab
    const allSelectedIndices = [
      selectedDependentVariable?.columnIndex,
      ...selectedFactorVariables.map(v => v.columnIndex),
      ...selectedCovariateVariables.map(v => v.columnIndex),
    ].filter(index => index !== undefined);

    const availableVars: Variable[] = variablesFromStore
      .filter(v => v.name && v.type !== 'STRING' && !allSelectedIndices.includes(v.columnIndex))
      .map((v): Variable => ({
        id: v.id,
        columnIndex: v.columnIndex,
        name: v.name,
        type: v.type,
        width: v.width,
        decimals: v.decimals,
        label: v.label,
        values: v.values,
        missing: v.missing,
        columns: v.columns,
        align: v.align,
        measure: v.measure,
        role: v.role,
      }));
    setAvailableVariables(availableVars);
  }, [variablesFromStore, selectedDependentVariable, selectedFactorVariables, selectedCovariateVariables]);

  // Prepare variables for the Plots tab
  const availablePlotVariables = React.useMemo(() => {
    const standardPlotVars = [
        { name: "*ZPRED" },
        { name: "*ZRESID" },
        { name: "*DRESID" },
        { name: "*ADJPRED" },
        { name: "*SRESID" },
        { name: "*SDRESID" },
    ];
    const selectedVarsForPlot = [
        ...(selectedDependentVariable ? [{ name: selectedDependentVariable.name }] : []),
        ...selectedFactorVariables.map(v => ({ name: v.name })),
        ...selectedCovariateVariables.map(v => ({ name: v.name }))
    ];
    const combined = [...selectedVarsForPlot, ...standardPlotVars];
    return combined.filter((v, index, self) =>
        index === self.findIndex((t) => t.name === v.name)
    );
  }, [selectedDependentVariable, selectedFactorVariables, selectedCovariateVariables]);

  // Handler functions for variable tab
  const handleSelectAvailableVariable = (variable: Variable | null) => {
    setHighlightedVariable(variable);
  };

  const handleMoveToDependent = () => {
    if (highlightedVariable && availableVariables.some(v => v.columnIndex === highlightedVariable.columnIndex)) {
      const currentAvailable = availableVariables.filter(v => v.columnIndex !== highlightedVariable.columnIndex);
      if (selectedDependentVariable) {
          currentAvailable.push(selectedDependentVariable);
      }
      setAvailableVariables(currentAvailable.sort((a, b) => a.columnIndex - b.columnIndex));
      setSelectedDependentVariable(highlightedVariable);
      setHighlightedVariable(null);
    }
  };

  const handleMoveToFactor = () => {
      if (highlightedVariable && availableVariables.some(v => v.columnIndex === highlightedVariable.columnIndex)) {
          const variableToAdd = availableVariables.find(v => v.columnIndex === highlightedVariable.columnIndex);
          if (variableToAdd) {
              setSelectedFactorVariables((prev) => [...prev, variableToAdd].sort((a, b) => a.columnIndex - b.columnIndex));
              setAvailableVariables((prev) => prev.filter((item) => item.columnIndex !== highlightedVariable.columnIndex).sort((a, b) => a.columnIndex - b.columnIndex));
              setHighlightedVariable(null);
          }
      }
  };

  const handleMoveToCovariate = () => {
      if (highlightedVariable && availableVariables.some(v => v.columnIndex === highlightedVariable.columnIndex)) {
          const variableToAdd = availableVariables.find(v => v.columnIndex === highlightedVariable.columnIndex);
          if (variableToAdd) {
              setSelectedCovariateVariables((prev) => [...prev, variableToAdd].sort((a, b) => a.columnIndex - b.columnIndex));
              setAvailableVariables((prev) => prev.filter((item) => item.columnIndex !== highlightedVariable.columnIndex).sort((a, b) => a.columnIndex - b.columnIndex));
              setHighlightedVariable(null);
          }
      }
  };

  const handleRemoveFromDependent = () => {
    if (selectedDependentVariable) {
      setAvailableVariables((prev) => [...prev, selectedDependentVariable].sort((a, b) => a.columnIndex - b.columnIndex));
      setSelectedDependentVariable(null);
    }
  };

  const handleRemoveFromFactor = (variable: Variable) => {
    setAvailableVariables((prev) => [...prev, variable].sort((a, b) => a.columnIndex - b.columnIndex));
    setSelectedFactorVariables((prev) => prev.filter((item) => item.columnIndex !== variable.columnIndex));
  };

  const handleRemoveFromCovariate = (variable: Variable) => {
    setAvailableVariables((prev) => [...prev, variable].sort((a, b) => a.columnIndex - b.columnIndex));
    setSelectedCovariateVariables((prev) => prev.filter((item) => item.columnIndex !== variable.columnIndex));
  };

  // Handlers for parameter tabs
  const handleStatsChange = (newParams: Partial<StatisticsOrdinalParams>) => {
    setStatsParams(prev => ({ ...prev, ...newParams }));
  };

  const handlePlotChange = (newParams: Partial<PlotsOrdinalParams>) => {
    setPlotParams(prev => ({ ...prev, ...newParams }));
  };

  const handleSaveChange = (newParams: Partial<SaveOrdinalParams>) => {
    setSaveParams(prev => ({ ...prev, ...newParams }));
  };

  const handleOptionsChange = (newParams: Partial<OptionsOrdinalParams>) => {
    setOptionsParams(prev => ({ ...prev, ...newParams }));
  };

  const handleAssumptionTestChange = (newParams: Partial<AssumptionTestOrdinalParams>) => {
    setAssumptionTestParams(prev => ({ ...prev, ...newParams }));
  };

  // handleReset
  const handleReset = () => {
    // Get all currently selected variables across all fields
     const allSelectedVars = [
        selectedDependentVariable,
        ...selectedFactorVariables,
        ...selectedCovariateVariables,
    ].filter(v => v !== null) as Variable[];

    // Reset available variables to the full list from the store
    setAvailableVariables(variablesFromStore.map(v => ({...v})).sort((a, b) => a.columnIndex - b.columnIndex));

    // Clear all selections
    setSelectedDependentVariable(null);
    setSelectedFactorVariables([]);
    setSelectedCovariateVariables([]);
    setHighlightedVariable(null);

    // Reset parameters for other tabs to defaults
    setStatsParams(defaultStatsParams);
    setPlotParams(defaultPlotParams);
    setSaveParams(defaultSaveParams);
    setOptionsParams(defaultOptionsParams);
    setAssumptionTestParams(defaultAssumptionTestParams);

    console.log("Reset button clicked - All selections and parameters reset");
  };

  const handleClose = () => {
    onClose();
  };

  // Placeholder for handleAnalyze - will be implemented later
  const handleAnalyze = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Validasi input
      if (!selectedDependentVariable || (selectedFactorVariables.length === 0 && selectedCovariateVariables.length === 0)) {
        showAlert('Input Error', 'Please select a dependent variable and at least one factor or covariate variable.');
        setIsLoading(false);
        return;
      }
      
      // Placeholder for actual analysis logic
      console.log("Ordinal regression analysis would be performed here");
      console.log("Dependent variable:", selectedDependentVariable);
      console.log("Factor variables:", selectedFactorVariables);
      console.log("Covariate variables:", selectedCovariateVariables);
      console.log("Statistics parameters:", statsParams);
      console.log("Plot parameters:", plotParams);
      console.log("Save parameters:", saveParams);
      console.log("Options parameters:", optionsParams);
      console.log("Assumption test parameters:", assumptionTestParams);
      
      // Show a placeholder message
      showAlert('Analysis Not Implemented', 'Ordinal regression analysis logic will be implemented in a future update.');
      
    } catch (error: unknown) {
      console.error('[Analyze] Failed to perform ordinal regression:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorMsg(`Failed to perform ordinal regression: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Feature Tour elements */}
      <AnimatePresence>
        {tourActive && tourSteps.length > 0 && currentStep < tourSteps.length && (
          <TourPopup
            step={tourSteps[currentStep]}
            currentStep={currentStep}
            totalSteps={tourSteps.length}
            onNext={nextStep}
            onPrev={prevStep}
            onClose={endTour}
            targetElement={currentTargetElement}
          />
        )}
      </AnimatePresence>
      <ActiveElementHighlight active={tourActive} />
      <ValidationAlert />
      <div className="px-6 py-4">
        <Separator className="my-2" />
      </div>

      <div className="flex-grow px-6 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger id="ordinal-variables-tab-trigger" data-testid="ordinal-variables-tab" value="variables">Variables</TabsTrigger>
            <TabsTrigger id="ordinal-statistics-tab-trigger" data-testid="ordinal-statistics-tab" value="statistics">Statistics</TabsTrigger>
            <TabsTrigger id="ordinal-plots-tab-trigger" data-testid="ordinal-plots-tab" value="plots">Plots</TabsTrigger>
            <TabsTrigger id="ordinal-save-tab-trigger" data-testid="ordinal-save-tab" value="save">Save</TabsTrigger>
            <TabsTrigger data-testid="ordinal-options-tab" value="options">Options</TabsTrigger>
            <TabsTrigger id="ordinal-assumption-tab-trigger" data-testid="ordinal-assumption-tab" value="assumption">Assumption</TabsTrigger>
          </TabsList>

          {/* Variables Tab */}
          <TabsContent value="variables">
            <VariablesOrdinalTab
              availableVariables={availableVariables}
              selectedDependentVariable={selectedDependentVariable}
              selectedFactorVariables={selectedFactorVariables}
              selectedCovariateVariables={selectedCovariateVariables}
              highlightedVariable={highlightedVariable}
              handleSelectAvailableVariable={handleSelectAvailableVariable}
              handleMoveToDependent={handleMoveToDependent}
              handleMoveToFactor={handleMoveToFactor}
              handleMoveToCovariate={handleMoveToCovariate}
              handleRemoveFromDependent={handleRemoveFromDependent}
              handleRemoveFromFactor={handleRemoveFromFactor}
              handleRemoveFromCovariate={handleRemoveFromCovariate}
            />
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics">
            <StatisticsOrdinal params={statsParams} onChange={handleStatsChange} showAlert={showAlert} />
          </TabsContent>

          {/* Plots Tab */}
          <TabsContent value="plots">
            <PlotsOrdinal
              params={plotParams}
              onChange={handlePlotChange}
              availablePlotVariables={availablePlotVariables} />
          </TabsContent>

          {/* Save Tab */}
          <TabsContent value="save">
             <SaveOrdinal params={saveParams} onChange={handleSaveChange} />
          </TabsContent>

          {/* Options Tab */}
          <TabsContent value="options">
             <OptionsOrdinal params={optionsParams} onChange={handleOptionsChange} showAlert={showAlert} />
          </TabsContent>

          {/* Assumption Test Tab */}
          <TabsContent value="assumption">
            <AssumptionTestOrdinal 
              params={assumptionTestParams} 
              onChange={handleAssumptionTestChange}
              selectedDependentVariable={selectedDependentVariable}
              selectedFactorVariables={selectedFactorVariables}
              selectedCovariateVariables={selectedCovariateVariables}
            />
          </TabsContent>
        </Tabs>
        {errorMsg && (
            <div className="mt-4">
                <Alert variant="destructive">
                    <AlertTitle>Analysis Error</AlertTitle>
                    <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
            </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-secondary flex-shrink-0">
        {/* Left: Help button with tooltip */}
        <div className="flex items-center text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="ordinal-help-button"
                  variant="ghost"
                  size="icon"
                  onClick={startTour}
                  aria-label="Start feature tour"
                  className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Start feature tour</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Right: Action buttons - matching SPSS layout */}
        <div className="flex items-center space-x-4">
          <Button id="ordinal-ok-button" onClick={handleAnalyze} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...
              </>
            ) : (
              'OK'
            )}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>
            Reset
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="outline" disabled={isLoading}>
            Paste
          </Button>
          <Button variant="outline" disabled={isLoading}>
            Help
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModalOrdinal;