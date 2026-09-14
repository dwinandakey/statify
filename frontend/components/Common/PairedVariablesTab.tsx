import type { FC, Dispatch, SetStateAction } from "react";
import React, { useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowBigLeft, ArrowBigRight, Ruler, Shapes, BarChartHorizontal, InfoIcon, ArrowBigUp, ArrowBigDown, MoveHorizontal, FileQuestion } from "lucide-react";
import type { Variable } from "@/types/Variable";

export type PairedHighlightedVariable = {
    tempId: string;
    source: 'available' | 'test1' | 'test2';
    rowIndex?: number;
};

export type PairedHighlightedPair = {
    id: number;
    rowIndex?: number;
};

type TourStepLike = {
    targetId: string;
    [key: string]: unknown;
};

export interface PairedVariablesTabProps {
    availableVariables: Variable[];
    testVariables1: Variable[];
    testVariables2: Variable[];
    pairNumbers: number[];
    highlightedPair: PairedHighlightedPair | null;
    setHighlightedPair: Dispatch<SetStateAction<PairedHighlightedPair | null>>;
    highlightedVariable: PairedHighlightedVariable | null;
    setHighlightedVariable: Dispatch<SetStateAction<PairedHighlightedVariable | null>>;
    moveToTestVariables: (variable: Variable) => void;
    removeVariable: (sourceList: 'test1' | 'test2', rowIndex: number) => void;
    moveVariableBetweenLists: (rowIndex: number) => void;
    moveUpPair: (rowIndex: number) => void;
    moveDownPair: (rowIndex: number) => void;
    removePair: (rowIndex: number) => void;
    reorderPairs?: (pairs: [Variable, Variable][]) => void;
    tourActive?: boolean;
    currentStep?: number;
    tourSteps?: TourStepLike[];
    /** Prefix for DOM ids and test ids. Defaults to "paired-samples-t-test"
     *  so existing PairedSamplesTTest tests and tour steps keep working when
     *  this component is consumed via the shim at PairedSamplesTTest/components/VariablesTab. */
    idPrefix?: string;
}

const PairedVariablesTab: FC<PairedVariablesTabProps> = ({
    availableVariables,
    testVariables1,
    testVariables2,
    pairNumbers,
    highlightedVariable,
    setHighlightedVariable,
    highlightedPair,
    setHighlightedPair,
    moveToTestVariables,
    removeVariable,
    moveVariableBetweenLists,
    moveUpPair,
    moveDownPair,
    removePair,
    tourActive = false,
    currentStep = 0,
    tourSteps = [],
    idPrefix = "paired-samples-t-test",
}) => {
    const getDisplayName = (variable: Variable) => {
        if (!variable.label) return variable.name;
        return `${variable.label} [${variable.name}]`;
    };

    const getVariableIcon = (variable: Variable) => {
        switch (variable.measure) {
            case "scale":
                return <Ruler size={14} className="text-muted-foreground mr-1 flex-shrink-0" />;
            case "nominal":
                return <Shapes size={14} className="text-muted-foreground mr-1 flex-shrink-0" />;
            case "ordinal":
                return <BarChartHorizontal size={14} className="text-muted-foreground mr-1 flex-shrink-0" />;
            case "unknown":
                return <FileQuestion size={14} className="text-muted-foreground mr-1 flex-shrink-0" />;
            default:
                return variable.type === "STRING"
                    ? <Shapes size={14} className="text-muted-foreground mr-1 flex-shrink-0" />
                    : <Ruler size={14} className="text-muted-foreground mr-1 flex-shrink-0" />;
        }
    };

    const isVariableDisabled = useCallback((variable: Variable): boolean => {
        return variable.type !== 'NUMERIC';
    }, []);

    const handleVariableSelect = (variable: Variable, source: 'available' | 'test1' | 'test2', rowIndex?: number) => {
        if (source === 'available') {
            if (highlightedVariable && highlightedVariable.tempId === variable.tempId && highlightedVariable.source === source) {
                setHighlightedVariable(null);
            } else {
                setHighlightedVariable({
                    tempId: variable.tempId || `temp_id_${variable.columnIndex}`,
                    source,
                    rowIndex: undefined
                });
                setHighlightedPair(null);
            }
        } else {
            if (highlightedVariable &&
                highlightedVariable.tempId === variable.tempId &&
                highlightedVariable.source === source &&
                highlightedVariable.rowIndex === rowIndex) {
                setHighlightedVariable(null);
            } else {
                setHighlightedVariable({
                    tempId: variable.tempId || `temp_id_${variable.columnIndex}`,
                    source,
                    rowIndex
                });
                setHighlightedPair(null);
            }
        }
    };

    const handleVariableDoubleClick = useCallback((variable: Variable, sourceListId: string, rowIndex?: number) => {
        if (sourceListId === 'available' && !isVariableDisabled(variable)) {
            moveToTestVariables(variable);
        } else if (sourceListId === 'test1' && rowIndex !== undefined) {
            removeVariable('test1', rowIndex);
        } else if (sourceListId === 'test2' && rowIndex !== undefined) {
            removeVariable('test2', rowIndex);
        }
    }, [moveToTestVariables, removeVariable, isVariableDisabled]);

    const handlePairClick = (index: number) => {
        setHighlightedPair(highlightedPair?.id === index ? null : { id: index });
        setHighlightedVariable(null);
    };

    const handleMoveButton = () => {
        if (highlightedVariable) {
            if (highlightedVariable.source === 'available') {
                const variable = availableVariables.find(v => v.tempId === highlightedVariable.tempId);
                if (variable && !isVariableDisabled(variable)) {
                    moveToTestVariables(variable);
                }
            } else if (highlightedVariable.source === 'test1' && highlightedVariable.rowIndex !== undefined) {
                removeVariable('test1', highlightedVariable.rowIndex);
            } else if (highlightedVariable.source === 'test2' && highlightedVariable.rowIndex !== undefined) {
                removeVariable('test2', highlightedVariable.rowIndex);
            }
        }
    };

    const renderVariableList = (variables: Variable[], height: string) => (
        <div className="border border-border p-1 rounded-md w-full transition-colors relative bg-background overflow-y-auto overflow-x-hidden" style={{ height }}>
            <div className={`space-y-0.5 p-0.5 transition-all duration-150`}>
                {variables.map((variable) => (
                    <TooltipProvider key={variable.tempId || variable.columnIndex}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className={`flex items-center p-1 border rounded-md cursor-pointer group relative transition-all duration-150 ease-in-out text-sm hover:bg-accent
                                        ${
                                            highlightedVariable &&
                                            highlightedVariable.tempId === variable.tempId &&
                                            highlightedVariable.source === 'available'
                                            ? "bg-accent border-primary"
                                            : "border-border"
                                        }
                                        ${isVariableDisabled(variable) ? "opacity-50 cursor-not-allowed" : ""}`}
                                    style={{
                                        borderTopStyle: 'solid',
                                        borderTopWidth: '1px',
                                        borderTopColor: (
                                            highlightedVariable &&
                                            highlightedVariable.tempId === variable.tempId &&
                                            highlightedVariable.source === 'available'
                                            ? 'hsl(var(--primary))'
                                            : 'hsl(var(--border))'),
                                        paddingTop: '4px',
                                        paddingBottom: '4px',
                                        borderLeftWidth: '1px',
                                        borderRightWidth: '1px',
                                        borderBottomWidth: '1px',
                                        borderLeftColor: (
                                            highlightedVariable &&
                                            highlightedVariable.tempId === variable.tempId &&
                                            highlightedVariable.source === 'available'
                                            ? 'hsl(var(--primary))'
                                            : 'hsl(var(--border))'),
                                        borderRightColor: (
                                            highlightedVariable &&
                                            highlightedVariable.tempId === variable.tempId &&
                                            highlightedVariable.source === 'available'
                                            ? 'hsl(var(--primary))'
                                            : 'hsl(var(--border))'),
                                        borderBottomColor: (
                                            highlightedVariable &&
                                            highlightedVariable.tempId === variable.tempId &&
                                            highlightedVariable.source === 'available'
                                            ? 'hsl(var(--primary))'
                                            : 'hsl(var(--border))'),
                                    }}
                                    onClick={() => handleVariableSelect(variable, 'available')}
                                    onDoubleClick={() => handleVariableDoubleClick(variable, 'available')}
                                >
                                    <div className="flex items-center w-full truncate">
                                        <div className="w-[14px] mr-1 flex-shrink-0"></div>
                                        {getVariableIcon(variable)}
                                        <span className="truncate">{getDisplayName(variable)}</span>
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p className="text-xs">{getDisplayName(variable)}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>
        </div>
    );

    const isTourElementActive = useCallback((elementId: string) => {
        if (!tourActive || currentStep >= tourSteps.length) return false;
        return tourSteps[currentStep]?.targetId === elementId;
    }, [tourActive, currentStep, tourSteps]);

    const renderMoveButtonToRight = () => {
        if (!highlightedVariable || highlightedVariable.source !== 'available') return null;
        return (
            <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 flex items-center justify-center p-0 w-6 h-6 rounded-full border-border hover:bg-accent hover:border-primary transition-all duration-150 ease-in-out"
                onClick={handleMoveButton}
            >
                <ArrowBigRight size={16} />
            </Button>
        );
    };

    const renderMoveButtonToLeft = () => {
        if (!highlightedVariable || highlightedVariable.source === 'available') {
            if (highlightedPair) {
                return (
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0 flex items-center justify-center p-0 w-6 h-6 rounded-full border-border hover:bg-accent hover:border-primary transition-all duration-150 ease-in-out"
                        onClick={() => removePair(highlightedPair.id || 0)}
                    >
                        <ArrowBigLeft size={16} />
                    </Button>
                );
            }
            return null;
        }
        return (
            <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 flex items-center justify-center p-0 w-6 h-6 rounded-full border-border hover:bg-accent hover:border-primary transition-all duration-150 ease-in-out"
                onClick={handleMoveButton}
            >
                <ArrowBigLeft size={16} />
            </Button>
        );
    };

    return (
        <div className="flex gap-8 items-start relative">
            <div id={`${idPrefix}-available-variables`} className="w-[30%] flex flex-col relative">
                <div className="text-sm font-medium mb-1.5 px-1 flex items-center h-6">
                    <span className="truncate">Available Variables</span>
                </div>
                {renderVariableList(availableVariables, '300px')}
                <div className="flex flex-col mt-2 space-y-2 relative">
                    <div className="text-xs text-muted-foreground flex items-center p-1.5 rounded bg-accent border border-border">
                        <InfoIcon size={14} className="mr-1.5 flex-shrink-0 text-muted-foreground" />
                        <span>Double-click to move variables between lists.</span>
                    </div>
                </div>
                {tourActive && isTourElementActive(`${idPrefix}-available-variables`) && (
                    <div className="absolute inset-0 pointer-events-none border-2 border-primary animate-pulse rounded-md z-10"></div>
                )}
            </div>

            <div id={`${idPrefix}-test-variables`} className="w-[60%] flex flex-col relative">
                <div className="text-sm font-medium mb-1.5 px-1 flex items-center h-6">
                    {renderMoveButtonToLeft()}
                    {renderMoveButtonToRight()}
                    <span className="truncate ml-1">Paired Variable(s)</span>
                </div>
                <div className="mb-2 border border-border rounded-md overflow-auto" style={{height: "300px"}}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12 text-center">Pair</TableHead>
                                <TableHead>Variable 1</TableHead>
                                <TableHead>Variable 2</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {testVariables1.length === 0 && testVariables2.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        No variables selected for testing
                                    </TableCell>
                                </TableRow>
                            ) : (
                                Array.from({ length: Math.max(testVariables1.length, testVariables2.length) }).map((_, index) => {
                                    const isPairHighlighted = highlightedPair?.id === index;
                                    const isV1Highlighted = Boolean(
                                        highlightedVariable &&
                                        testVariables1[index] &&
                                        highlightedVariable.tempId === testVariables1[index].tempId &&
                                        highlightedVariable.source === 'test1' &&
                                        highlightedVariable.rowIndex === index
                                    );
                                    const isV2Highlighted = Boolean(
                                        highlightedVariable &&
                                        testVariables2[index] &&
                                        highlightedVariable.tempId === testVariables2[index].tempId &&
                                        highlightedVariable.source === 'test2' &&
                                        highlightedVariable.rowIndex === index
                                    );
                                    const v1CellHighlight = isV1Highlighted || isPairHighlighted;
                                    const v2CellHighlight = isV2Highlighted || isPairHighlighted;

                                    return (
                                        <TableRow
                                            key={index}
                                            className={isPairHighlighted ? "bg-accent" : ""}
                                        >
                                            <TableCell
                                                className={`text-center cursor-pointer hover:bg-accent ${
                                                    isPairHighlighted ? "bg-accent" : ""
                                                }`}
                                                onClick={() => handlePairClick(index)}
                                                style={{
                                                    boxSizing: 'content-box',
                                                    borderTopWidth: isPairHighlighted ? '1px' : '',
                                                    borderBottomWidth: isPairHighlighted ? '1px' : '',
                                                    borderLeftWidth: isPairHighlighted ? '1px' : '',
                                                    borderColor: isPairHighlighted
                                                        ? 'hsl(var(--primary))'
                                                        : 'hsl(var(--border))',
                                                }}
                                            >
                                                <span className="text-sm">{pairNumbers[index] || index + 1}</span>
                                            </TableCell>
                                            <TableCell
                                                className={`cursor-pointer hover:bg-accent ${v1CellHighlight ? "bg-accent" : ""}`}
                                                style={{
                                                    boxSizing: 'content-box',
                                                    borderTopWidth: v1CellHighlight ? '1px' : '0px',
                                                    borderBottomWidth: v1CellHighlight ? '1px' : '0px',
                                                    borderLeftWidth: isV1Highlighted ? '1px' : '0px',
                                                    borderRightWidth: isV1Highlighted ? '1px' : '0px',
                                                    borderTopColor: v1CellHighlight
                                                        ? 'hsl(var(--primary))'
                                                        : 'hsl(var(--border))',
                                                    borderBottomColor: v1CellHighlight
                                                        ? 'hsl(var(--primary))'
                                                        : 'hsl(var(--border))',
                                                    borderLeftColor: isV1Highlighted
                                                        ? 'hsl(var(--primary))'
                                                        : 'hsl(var(--border))',
                                                    borderRightColor: isV1Highlighted
                                                        ? 'hsl(var(--primary))'
                                                        : 'hsl(var(--border))',
                                                }}
                                                onClick={() => {
                                                    if (testVariables1[index]) {
                                                        handleVariableSelect(testVariables1[index], 'test1', index);
                                                    }
                                                }}
                                                onDoubleClick={() => {
                                                    if (testVariables1[index]) {
                                                        handleVariableDoubleClick(testVariables1[index], 'test1', index);
                                                    }
                                                }}
                                            >
                                                {testVariables1[index] ? (
                                                    <div className="flex items-center">
                                                        {getVariableIcon(testVariables1[index])}
                                                        <span className="text-sm">{getDisplayName(testVariables1[index])}</span>
                                                    </div>
                                                ) : ""}
                                            </TableCell>
                                            <TableCell
                                                className={`cursor-pointer hover:bg-accent ${v2CellHighlight ? "bg-accent" : ""}`}
                                                style={{
                                                    boxSizing: 'content-box',
                                                    borderTopStyle: 'solid',
                                                    borderTopWidth: v2CellHighlight ? '1px' : '0px',
                                                    borderBottomWidth: v2CellHighlight ? '1px' : '0px',
                                                    borderLeftWidth: isV2Highlighted ? '1px' : '0px',
                                                    borderRightWidth: v2CellHighlight ? '1px' : '0px',
                                                    borderTopColor: v2CellHighlight
                                                        ? 'hsl(var(--primary))'
                                                        : 'hsl(var(--border))',
                                                    borderBottomColor: v2CellHighlight
                                                        ? 'hsl(var(--primary))'
                                                        : 'hsl(var(--border))',
                                                    borderLeftColor: isV2Highlighted
                                                        ? 'hsl(var(--primary))'
                                                        : 'hsl(var(--border))',
                                                    borderRightColor: v2CellHighlight
                                                        ? 'hsl(var(--primary))'
                                                        : 'hsl(var(--border))',
                                                }}
                                                onClick={() => {
                                                    if (testVariables2[index]) {
                                                        handleVariableSelect(testVariables2[index], 'test2', index);
                                                    }
                                                }}
                                                onDoubleClick={() => {
                                                    if (testVariables2[index]) {
                                                        handleVariableDoubleClick(testVariables2[index], 'test2', index);
                                                    }
                                                }}
                                            >
                                                {testVariables2[index] ? (
                                                    <div className="flex items-center">
                                                        {getVariableIcon(testVariables2[index])}
                                                        <span className="text-sm">{getDisplayName(testVariables2[index])}</span>
                                                    </div>
                                                ) : ""}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div
                    id={`${idPrefix}-move-button`}
                    className="flex flex-row gap-1 justify-end relative"
                >
                    <div className="relative">
                        <Button
                            id={`${idPrefix}-move-up-button`}
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveUpPair(highlightedPair?.id || 0)}
                            disabled={highlightedPair?.id === 0 || highlightedPair?.id === undefined}
                        >
                            <ArrowBigUp size={16} />
                        </Button>
                        {tourActive && isTourElementActive(`${idPrefix}-move-up-button`) && (
                            <div className="absolute inset-0 pointer-events-none border-2 border-primary animate-pulse rounded-md z-10"></div>
                        )}
                    </div>
                    <div className="relative">
                        <Button
                            id={`${idPrefix}-move-down-button`}
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveDownPair(highlightedPair?.id || 0)}
                            disabled={
                                highlightedPair?.id === Math.max(testVariables1.length, testVariables2.length) - 1 ||
                                highlightedPair?.id === undefined
                            }
                        >
                            <ArrowBigDown size={16} />
                        </Button>
                        {tourActive && isTourElementActive(`${idPrefix}-move-down-button`) && (
                            <div className="absolute inset-0 pointer-events-none border-2 border-primary animate-pulse rounded-md z-10"></div>
                        )}
                    </div>
                    <div className="relative">
                        <Button
                            id={`${idPrefix}-change-button`}
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveVariableBetweenLists(highlightedPair?.id || 0)}
                            disabled={highlightedPair?.id === undefined}
                        >
                            <MoveHorizontal size={16} />
                        </Button>
                        {tourActive && isTourElementActive(`${idPrefix}-change-button`) && (
                            <div className="absolute inset-0 pointer-events-none border-2 border-primary animate-pulse rounded-md z-10"></div>
                        )}
                    </div>
                    {tourActive && isTourElementActive(`${idPrefix}-move-button`) && (
                        <div className="absolute right-0 top-0 w-20 h-full pointer-events-none border-2 border-primary animate-pulse rounded-md z-10"></div>
                    )}
                </div>
                {tourActive && isTourElementActive(`${idPrefix}-test-variables`) && (
                    <div className="absolute inset-0 pointer-events-none border-2 border-primary animate-pulse rounded-md z-10"></div>
                )}
            </div>
        </div>
    );
};

export default PairedVariablesTab;
