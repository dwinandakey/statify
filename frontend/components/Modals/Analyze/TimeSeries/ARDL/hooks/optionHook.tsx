import { useState } from "react";

export const useOptionHook = () => {
    const [autoSelect, setAutoSelect] = useState<boolean>(true);
    const [maxP, setMaxP] = useState<number>(4);
    const [maxQ, setMaxQ] = useState<number>(4);
    const [selectionCriterion, setSelectionCriterion] = useState<"aic" | "bic" | "hq">("aic");
    
    const [pOrder, setPOrder] = useState<number>(1); // AR order for Y (fixed mode)
    const [qOrders, setQOrders] = useState<number[]>([1]); // DL orders for each X variable (fixed mode)

    const handlePOrder = (value: number) => {
        setPOrder(value);
    };

    const handleQOrders = (value: number[]) => {
        setQOrders(value);
    };

    const resetOptions = () => {
        setAutoSelect(true);
        setMaxP(4);
        setMaxQ(4);
        setSelectionCriterion("aic");
        setPOrder(1);
        setQOrders([1]);
    };

    return {
        autoSelect,
        setAutoSelect,
        maxP,
        setMaxP,
        maxQ,
        setMaxQ,
        selectionCriterion,
        setSelectionCriterion,
        pOrder,
        qOrders,
        handlePOrder,
        handleQOrders,
        resetOptions,
    };
};

