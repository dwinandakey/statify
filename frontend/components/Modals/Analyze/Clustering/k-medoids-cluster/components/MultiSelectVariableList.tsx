"use client";

import type { FC } from "react";
import React, { useCallback, useMemo, useState } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { getVariableIcon as defaultGetVariableIcon } from "@/components/Common/iconHelper";
import {
    ArrowBigLeft,
    ArrowBigRight,
    GripVertical,
    InfoIcon,
    MoveHorizontal,
} from "lucide-react";
import type { Variable } from "@/types/Variable";
import { useMobile } from "@/hooks/useMobile";

/**
 * Daftar variabel khusus K-Medoids yang mendukung pemilihan banyak variabel
 * sekaligus (Ctrl/Cmd + klik, Shift + klik, dan drag beberapa item sekaligus).
 *
 * Komponen ini sengaja dibuat lokal di folder k-medoids-cluster agar
 * VariableListManager bersama (single-select) tidak ikut berubah.
 */

export interface MultiSelectTargetList {
    id: string;
    title: string;
    variables: Variable[];
    height: string;
    maxItems?: number;
}

export interface MultiSelection {
    source: string;
    names: string[];
}

interface MultiSelectVariableListProps {
    availableVariables: Variable[];
    targetLists: MultiSelectTargetList[];
    selection: MultiSelection | null;
    setSelection: (value: MultiSelection | null) => void;
    onMoveVariables: (
        variables: Variable[],
        fromListId: string,
        toListId: string
    ) => void;
    onReorderVariable: (listId: string, variables: Variable[]) => void;
    getVariableIcon?: (variable: Variable) => React.ReactNode;
    getDisplayName?: (variable: Variable) => string;
    availableListHeight?: string;
}

const AVAILABLE_LIST_ID = "available";

const defaultGetDisplayName = (variable: Variable): string =>
    variable.label ? `${variable.label} [${variable.name}]` : variable.name;

const MultiSelectVariableList: FC<MultiSelectVariableListProps> = ({
    availableVariables,
    targetLists,
    selection,
    setSelection,
    onMoveVariables,
    onReorderVariable,
    getVariableIcon = defaultGetVariableIcon,
    getDisplayName = defaultGetDisplayName,
    availableListHeight = "300px",
}) => {
    const [draggedNames, setDraggedNames] = useState<string[]>([]);
    const [draggedSourceListId, setDraggedSourceListId] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [anchorIndex, setAnchorIndex] = useState<number | null>(null);

    const { isMobile, isPortrait } = useMobile();

    const allLists = useMemo(
        () => [
            {
                id: AVAILABLE_LIST_ID,
                title: "Available Variables",
                variables: availableVariables,
                height: availableListHeight,
            } as MultiSelectTargetList,
            ...targetLists,
        ],
        [availableVariables, targetLists, availableListHeight]
    );

    const getList = useCallback(
        (listId: string) => allLists.find((list) => list.id === listId),
        [allLists]
    );

    const selectedNames = useMemo(
        () => new Set(selection?.names ?? []),
        [selection]
    );

    const isSelected = useCallback(
        (variable: Variable, listId: string) =>
            selection?.source === listId && selectedNames.has(variable.name),
        [selection, selectedNames]
    );

    // Variabel terpilih, diurutkan sesuai urutan tampil pada daftar sumbernya
    const getSelectedVariables = useCallback((): Variable[] => {
        if (!selection) return [];
        const sourceList = getList(selection.source);
        if (!sourceList) return [];
        const names = new Set(selection.names);
        return sourceList.variables.filter((variable) => names.has(variable.name));
    }, [getList, selection]);

    // --- Pemilihan ---
    const handleVariableClick = useCallback(
        (event: React.MouseEvent, variable: Variable, listId: string, index: number) => {
            const isRangeClick = event.shiftKey;
            const isToggleClick = event.ctrlKey || event.metaKey;
            const list = getList(listId);
            if (!list) return;

            // Pemilihan selalu terbatas pada satu daftar
            if (!selection || selection.source !== listId) {
                setSelection({ source: listId, names: [variable.name] });
                setAnchorIndex(index);
                return;
            }

            if (isRangeClick && anchorIndex !== null) {
                const start = Math.min(anchorIndex, index);
                const end = Math.max(anchorIndex, index);
                const names = list.variables.slice(start, end + 1).map((v) => v.name);
                setSelection({ source: listId, names });
                return;
            }

            if (isToggleClick) {
                const names = selection.names.includes(variable.name)
                    ? selection.names.filter((name) => name !== variable.name)
                    : [...selection.names, variable.name];
                setSelection(names.length > 0 ? { source: listId, names } : null);
                setAnchorIndex(index);
                return;
            }

            // Klik biasa: pilih satu, atau batalkan bila item itu satu-satunya yang terpilih
            if (selection.names.length === 1 && selection.names[0] === variable.name) {
                setSelection(null);
                setAnchorIndex(null);
                return;
            }

            setSelection({ source: listId, names: [variable.name] });
            setAnchorIndex(index);
        },
        [anchorIndex, getList, selection, setSelection]
    );

    const selectAllInList = useCallback(
        (listId: string) => {
            const list = getList(listId);
            if (!list || list.variables.length === 0) return;
            setSelection({
                source: listId,
                names: list.variables.map((variable) => variable.name),
            });
            setAnchorIndex(0);
        },
        [getList, setSelection]
    );

    const clearSelection = useCallback(() => {
        setSelection(null);
        setAnchorIndex(null);
    }, [setSelection]);

    // --- Perpindahan ---
    const moveVariables = useCallback(
        (variables: Variable[], fromListId: string, toListId: string) => {
            if (variables.length === 0 || fromListId === toListId) return;
            onMoveVariables(variables, fromListId, toListId);
            clearSelection();
        },
        [clearSelection, onMoveVariables]
    );

    const handleVariableDoubleClick = useCallback(
        (variable: Variable, listId: string) => {
            // Bila item yang diklik ganda termasuk dalam pilihan, pindahkan semuanya
            const variablesToMove = isSelected(variable, listId)
                ? getSelectedVariables()
                : [variable];

            if (listId !== AVAILABLE_LIST_ID) {
                moveVariables(variablesToMove, listId, AVAILABLE_LIST_ID);
                return;
            }

            const target = targetLists.find(
                (list) =>
                    list.maxItems === undefined ||
                    list.variables.length < list.maxItems ||
                    list.maxItems === 1
            );
            if (target) {
                moveVariables(variablesToMove, AVAILABLE_LIST_ID, target.id);
            }
        },
        [getSelectedVariables, isSelected, moveVariables, targetLists]
    );

    // --- Drag & drop ---
    const handleDragStart = useCallback(
        (event: React.DragEvent<HTMLDivElement>, variable: Variable, listId: string) => {
            // Jika item yang di-drag termasuk pilihan aktif, bawa seluruh pilihan
            const names = isSelected(variable, listId)
                ? getSelectedVariables().map((v) => v.name)
                : [variable.name];

            event.dataTransfer.setData(
                "application/json",
                JSON.stringify({ names, sourceListId: listId })
            );
            event.dataTransfer.effectAllowed = "move";
            setDraggedNames(names);
            setDraggedSourceListId(listId);
        },
        [getSelectedVariables, isSelected]
    );

    const handleDragEnd = useCallback(() => {
        setDraggedNames([]);
        setDraggedSourceListId(null);
        setIsDraggingOver(null);
        setDragOverIndex(null);
    }, []);

    const handleDragOver = useCallback(
        (event: React.DragEvent<HTMLDivElement>, targetListId: string) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setIsDraggingOver(targetListId);
            if (draggedSourceListId !== targetListId && dragOverIndex !== null) {
                setDragOverIndex(null);
            }
        },
        [dragOverIndex, draggedSourceListId]
    );

    const handleItemDragOver = useCallback(
        (event: React.DragEvent<HTMLDivElement>, index: number, listId: string) => {
            event.preventDefault();
            event.stopPropagation();
            if (draggedSourceListId === listId) {
                event.dataTransfer.dropEffect = "move";
                setDragOverIndex(index);
                return;
            }
            event.dataTransfer.dropEffect = "move";
            setIsDraggingOver(listId);
            if (dragOverIndex !== null) setDragOverIndex(null);
        },
        [dragOverIndex, draggedSourceListId]
    );

    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDraggingOver(null);
            setDragOverIndex(null);
        }
    }, []);

    const handleDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>, targetListId: string, targetIndex?: number) => {
            event.preventDefault();
            event.stopPropagation();

            try {
                const raw = event.dataTransfer.getData("application/json");
                if (!raw) return;

                const { names, sourceListId } = JSON.parse(raw) as {
                    names: string[];
                    sourceListId: string;
                };
                if (!Array.isArray(names) || names.length === 0 || !sourceListId) return;

                const sourceList = getList(sourceListId);
                if (!sourceList) return;

                const nameSet = new Set(names);
                const variablesToMove = sourceList.variables.filter((variable) =>
                    nameSet.has(variable.name)
                );
                if (variablesToMove.length === 0) return;

                if (sourceListId === targetListId) {
                    // Susun ulang di dalam daftar yang sama
                    if (typeof targetIndex !== "number") return;

                    const remaining = sourceList.variables.filter(
                        (variable) => !nameSet.has(variable.name)
                    );
                    const itemsBeforeTarget = sourceList.variables
                        .slice(0, targetIndex)
                        .filter((variable) => !nameSet.has(variable.name)).length;

                    const reordered = [
                        ...remaining.slice(0, itemsBeforeTarget),
                        ...variablesToMove,
                        ...remaining.slice(itemsBeforeTarget),
                    ];
                    onReorderVariable(targetListId, reordered);
                    return;
                }

                moveVariables(variablesToMove, sourceListId, targetListId);
            } catch (error) {
                console.error("[MultiSelectVariableList handleDrop] Error:", error);
            } finally {
                handleDragEnd();
            }
        },
        [getList, handleDragEnd, moveVariables, onReorderVariable]
    );

    // --- Render ---
    const renderVariableItem = (variable: Variable, listId: string, index: number) => {
        const isBeingDragged =
            draggedSourceListId === listId && draggedNames.includes(variable.name);
        const isHighlighted = isSelected(variable, listId);
        const isDropTargetIndicator =
            draggedSourceListId === listId && dragOverIndex === index && !isBeingDragged;

        return (
            <TooltipProvider key={`${listId}-${variable.name}`}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            id={`variable-item-${listId}-${variable.name}`}
                            data-testid={`variable-item-${listId}-${variable.name}`}
                            data-variable-id={variable.name}
                            data-list-id={listId}
                            className={`
                                flex items-center p-1 border rounded-md group relative cursor-grab select-none
                                transition-all duration-150 ease-in-out text-sm
                                ${isBeingDragged ? "opacity-40 bg-accent" : "hover:bg-accent"}
                                ${isHighlighted ? "bg-accent border-primary" : "border-border"}
                            `}
                            style={{
                                borderTopStyle: "solid",
                                borderTopWidth: isDropTargetIndicator ? "3px" : "1px",
                                borderTopColor: isDropTargetIndicator
                                    ? "hsl(var(--primary))"
                                    : isHighlighted
                                        ? "hsl(var(--primary))"
                                        : "hsl(var(--border))",
                                paddingTop: isDropTargetIndicator ? "1px" : "4px",
                                paddingBottom: "4px",
                                borderLeftWidth: "1px",
                                borderRightWidth: "1px",
                                borderBottomWidth: "1px",
                                borderLeftColor: isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))",
                                borderRightColor: isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))",
                                borderBottomColor: isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))",
                            }}
                            onClick={(event) => handleVariableClick(event, variable, listId, index)}
                            onDoubleClick={() => handleVariableDoubleClick(variable, listId)}
                            draggable
                            onDragStart={(event) => handleDragStart(event, variable, listId)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(event) => handleItemDragOver(event, index, listId)}
                            onDrop={(event) => handleDrop(event, listId, index)}
                        >
                            <div className="flex items-center w-full truncate">
                                <GripVertical
                                    size={14}
                                    className="text-muted-foreground mr-1 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                                    data-testid={`drag-handle-${listId}-${variable.name}`}
                                />
                                <span data-testid={`variable-icon-${listId}-${variable.name}`}>
                                    {getVariableIcon(variable)}
                                </span>
                                <span
                                    className="truncate"
                                    data-testid={`variable-name-${listId}-${variable.name}`}
                                    title={getDisplayName(variable)}
                                >
                                    {getDisplayName(variable)}
                                </span>
                            </div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="text-sm">{getDisplayName(variable)}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    interface ArrowInfo {
        button: React.ReactNode;
        handler: () => void;
    }

    const renderList = (list: MultiSelectTargetList, arrowInfo?: ArrowInfo) => {
        const { id, title, variables, height, maxItems } = list;
        const isSingleItemList = maxItems === 1;
        const isAvailable = id === AVAILABLE_LIST_ID;

        const adjustedHeight = isSingleItemList
            ? variables.length === 0
                ? "46px"
                : "auto"
            : height;
        const overflowStyle = isSingleItemList
            ? "overflow-hidden"
            : "overflow-y-auto overflow-x-hidden";

        return (
            <div
                key={id}
                className={`flex flex-col ${isAvailable ? "" : "mb-2"}`}
                id={`${id}-variables-list-container`}
                data-testid={`${id}-variables-list-container`}
            >
                {title && (
                    <div
                        id={`${id}-list-title`}
                        data-testid={`${id}-list-title`}
                        className={`text-sm font-medium text-foreground mb-1.5 px-1 flex items-center h-6 ${arrowInfo ? "cursor-pointer hover:bg-accent rounded" : ""}`}
                        onClick={arrowInfo?.handler}
                    >
                        {arrowInfo?.button && (
                            <span
                                className="mr-1 flex-shrink-0"
                                data-testid={`arrow-button-${id}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    arrowInfo.handler();
                                }}
                            >
                                {arrowInfo.button}
                            </span>
                        )}
                        <span className="truncate" title={title}>
                            {title}
                        </span>
                        {variables.length > 1 && (
                            <button
                                type="button"
                                className="ml-auto flex shrink-0 items-center pl-2 text-xs font-normal text-muted-foreground hover:text-primary hover:underline"
                                data-testid={`select-all-${id}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    const allSelected =
                                        selection?.source === id &&
                                        selection.names.length === variables.length;
                                    if (allSelected) {
                                        clearSelection();
                                    } else {
                                        selectAllInList(id);
                                    }
                                }}
                            >
                                {selection?.source === id &&
                                    selection.names.length === variables.length
                                    ? "Clear"
                                    : "Select all"}
                            </button>
                        )}
                    </div>
                )}
                <div
                    data-list-id={id}
                    data-testid={`${id}-variable-list`}
                    id={`${id}-variables-list`}
                    role="group"
                    aria-label={title || id}
                    className={`
                        border p-1 rounded-md w-full transition-colors relative bg-background
                        ${overflowStyle}
                        ${isDraggingOver === id ? "border-primary bg-accent" : "border-border"}
                    `}
                    style={{ height: adjustedHeight, minHeight: isSingleItemList ? "auto" : "" }}
                    onDragOver={(event) => handleDragOver(event, id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(event) => handleDrop(event, id)}
                >
                    {variables.length === 0 && !isAvailable && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none p-2">
                            <MoveHorizontal size={18} className="mb-1" />
                            <p className="text-xs text-center">
                                {isSingleItemList ? "Drop one variable here" : "Drop variables here"}
                            </p>
                        </div>
                    )}
                    {variables.length === 0 && isAvailable && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none p-4">
                            <p className="text-sm text-center">All variables used</p>
                        </div>
                    )}

                    <div
                        className="space-y-0.5 p-0.5 transition-all duration-150"
                        data-testid={`${id}-variables-container`}
                        id={`${id}-variables-container`}
                    >
                        {variables.map((variable, index) => renderVariableItem(variable, id, index))}
                    </div>
                </div>
            </div>
        );
    };

    const availableList = allLists[0];
    const selectedVariables = getSelectedVariables();
    const selectionCount = selectedVariables.length;

    // Tombol panah per daftar tujuan, memindahkan SEMUA variabel yang terpilih
    const arrowButtons: Record<string, ArrowInfo> = {};

    if (selection && selectionCount > 0) {
        if (selection.source === AVAILABLE_LIST_ID) {
            targetLists.forEach((target) => {
                const isFull =
                    target.maxItems !== undefined &&
                    target.variables.length >= target.maxItems &&
                    target.maxItems !== 1;
                if (isFull) return;

                const handler = () =>
                    moveVariables(selectedVariables, AVAILABLE_LIST_ID, target.id);

                arrowButtons[target.id] = {
                    button: (
                        <button
                            id={`arrow-move-to-${target.id}-button`}
                            data-testid={`arrow-move-button-${target.id}`}
                            aria-label={`Move ${selectionCount} variable(s) to ${target.title}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                handler();
                            }}
                            className="flex-shrink-0 flex items-center justify-center p-0.5 w-6 h-6 rounded-full border border-border bg-accent/50 hover:bg-accent hover:border-primary transition-all duration-150 ease-in-out"
                        >
                            <ArrowBigRight size={16} className="text-foreground" />
                        </button>
                    ),
                    handler,
                };
            });
        } else {
            const handler = () =>
                moveVariables(selectedVariables, selection.source, AVAILABLE_LIST_ID);

            arrowButtons[selection.source] = {
                button: (
                    <button
                        id="arrow-move-back-to-available-button"
                        data-testid="arrow-move-button-back-to-available"
                        aria-label={`Move ${selectionCount} variable(s) back to Available`}
                        onClick={(event) => {
                            event.stopPropagation();
                            handler();
                        }}
                        className="flex-shrink-0 flex items-center justify-center p-0.5 w-6 h-6 rounded-full border border-border bg-accent/50 hover:bg-accent hover:border-primary transition-all duration-150 ease-in-out"
                    >
                        <ArrowBigLeft size={16} className="text-foreground" />
                    </button>
                ),
                handler,
            };
        }
    }

    const helperText = (
        <div
            className="text-xs text-muted-foreground flex items-start p-1.5 rounded bg-accent border border-border"
            data-testid="kmedoids-multiselect-help"
        >
            <InfoIcon size={14} className="mr-1.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <span>
                Click to select, <strong>Ctrl/Cmd + click</strong> to add to the selection,{" "}
                <strong>Shift + click</strong> to select a range. Drag or double-click to move.
                {selectionCount > 0 && (
                    <span className="ml-1 font-medium text-foreground">
                        ({selectionCount} variable(s) selected)
                    </span>
                )}
            </span>
        </div>
    );

    const useVerticalLayout = isMobile && isPortrait;

    if (useVerticalLayout) {
        return (
            <div
                className="flex flex-col gap-4"
                id="variable-list-manager-mobile"
                data-testid="variable-list-manager-mobile"
            >
                <div className="w-full flex flex-col">{renderList(availableList)}</div>
                <div className="w-full flex flex-col space-y-2">
                    {targetLists.map((list) => (
                        <React.Fragment key={`list-${list.id}`}>
                            {renderList(list, arrowButtons[list.id])}
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex flex-col mt-2 space-y-2">{helperText}</div>
            </div>
        );
    }

    return (
        <div
            className="flex gap-8 items-start relative"
            id="variable-list-manager-desktop"
            data-testid="variable-list-manager-desktop"
        >
            <div className="w-[45%] flex flex-col" id="available-variables-column">
                {renderList(availableList)}
                <div className="flex flex-col mt-2 space-y-2">{helperText}</div>
            </div>

            <div className="w-[45%] flex flex-col space-y-2 relative" id="target-variables-column">
                {targetLists.map((list) => (
                    <React.Fragment key={`list-${list.id}`}>
                        {renderList(list, arrowButtons[list.id])}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default MultiSelectVariableList;
