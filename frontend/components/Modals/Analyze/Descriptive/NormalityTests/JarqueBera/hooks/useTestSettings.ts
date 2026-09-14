import { useState, useCallback } from 'react';
import type { JarqueBeraTestOptions } from '../types';

/**
 * Hook untuk mengelola pengaturan/opsi Jarque-Bera Test
 */
export function useTestSettings() {
    const [options, setOptions] = useState<JarqueBeraTestOptions>({
        significanceLevel: 0.05,
        includeDescriptives: true,
    });

    const updateOption = useCallback(<K extends keyof JarqueBeraTestOptions>(
        key: K,
        value: JarqueBeraTestOptions[K]
    ) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetSettings = useCallback(() => {
        setOptions({
            significanceLevel: 0.05,
            includeDescriptives: true,
        });
    }, []);

    return {
        options,
        updateOption,
        resetSettings,
    };
}
