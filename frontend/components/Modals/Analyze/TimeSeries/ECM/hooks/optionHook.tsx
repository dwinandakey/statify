import { useState } from "react";

export const useOptionHook = () => {
    const [maxLagADF, setMaxLagADF] = useState<number>(2); // Max lag for ADF test
    const [maxLagECM, setMaxLagECM] = useState<number>(1); // Max lag for ECM

    const handleMaxLagADF = (value: number) => {
        setMaxLagADF(value);
    };

    const handleMaxLagECM = (value: number) => {
        setMaxLagECM(value);
    };

    const resetOptions = () => {
        setMaxLagADF(2);
        setMaxLagECM(1);
    };

    return {
        maxLagADF,
        maxLagECM,
        handleMaxLagADF,
        handleMaxLagECM,
        resetOptions,
    };
};
