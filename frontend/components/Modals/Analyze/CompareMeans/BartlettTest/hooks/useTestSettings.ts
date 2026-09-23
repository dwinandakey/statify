import { useState, useCallback } from 'react';
import type { BartlettTestOptions } from '../types';

/**
 * Hook untuk mengelola pengaturan/opsi Bartlett Test
 */
export function useTestSettings() {
    const [options, setOptions] = useState<BartlettTestOptions>({
        confidenceLevel: 0.95,
        includeDescriptives: true,
    });

    const updateOption = useCallback(<K extends keyof BartlettTestOptions>(
        key: K,
        value: BartlettTestOptions[K]
    ) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetSettings = useCallback(() => {
        setOptions({
            confidenceLevel: 0.95,
            includeDescriptives: true,
        });
    }, []);

    return {
        options,
        updateOption,
        resetSettings,
    };
}
