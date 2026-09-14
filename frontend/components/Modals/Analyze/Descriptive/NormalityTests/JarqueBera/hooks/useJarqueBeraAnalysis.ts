import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { Variable } from '@/types/Variable';
import type { JarqueBeraTestOptions, JarqueBeraTestResult } from '../types';
import { useDataStore } from '@/stores/useDataStore';
import { useResultStore } from '@/stores/useResultStore';
import { useAnalysisData } from '@/hooks/useAnalysisData';
import { formatJarqueBeraTestTable, formatDescriptiveStatisticsTable } from '../utils/formatters';

interface UseJarqueBeraAnalysisProps {
    testVariables: Variable[];
    options: JarqueBeraTestOptions;
    onClose: () => void;
}

/**
 * Hook untuk menjalankan analisis Jarque-Bera Test menggunakan Web Worker
 *
 * Jarque-Bera Test adalah uji normalitas yang memeriksa apakah data
 * memiliki skewness dan kurtosis yang konsisten dengan distribusi normal.
 *
 * RUMUS:
 * JB = n × [(S²/6) + ((K-3)²/24)]
 *
 * Dimana:
 * - n = ukuran sampel
 * - S = skewness
 * - K = kurtosis
 *
 * Statistik JB mengikuti distribusi chi-square dengan df = 2
 */
export function useJarqueBeraAnalysis({
    testVariables,
    options,
    onClose,
}: UseJarqueBeraAnalysisProps) {
    const [isCalculating, setIsCalculating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const resultsRef = useRef<JarqueBeraTestResult[]>([]);

    // Menggunakan useAnalysisData untuk mendapatkan data dari store
    const { data: analysisData } = useAnalysisData();
    const { addLog, addAnalytic, addStatistic } = useResultStore();

    /**
     * Tangani error kalkulasi
     */
    const handleCalculationError = useCallback((error: string) => {
        console.error('Calculation error:', error);
        setErrorMsg(error);
        setIsCalculating(false);
        toast.error(`Analysis failed: ${error}`);
    }, []);

    /**
     * Tangani penyelesaian kalkulasi
     */
    const handleCalculationComplete = useCallback(async (results: JarqueBeraTestResult[]) => {
        try {
            console.log('[DEBUG] Jarque-Bera Test - Raw results from worker:', results);
            resultsRef.current = results;

            // Add log entry
            const variableNames = testVariables.map(v => v.name).join(' ');
            let logMsg = `JARQUE_BERA ${variableNames}`;
            if (options.includeDescriptives) {
                logMsg += ` /STATISTICS DESCRIPTIVES`;
            }
            const logId = await addLog({ log: logMsg });

            // Buat entri analytic
            const analyticTitle = `Jarque-Bera Test of Normality`;
            const analyticId = await addAnalytic(logId, {
                title: analyticTitle,
                note: 'Tests if data follows a normal distribution based on skewness and kurtosis'
            });

            // Format dan simpan tabel Jarque-Bera Test
            const jbTable = formatJarqueBeraTestTable(results, options.significanceLevel);
            console.log('[DEBUG] Jarque-Bera Test - Formatted table:', JSON.stringify(jbTable, null, 2));

            // Validasi struktur tabel
            if (jbTable.rows && jbTable.rows.length > 0) {
                const invalidRows = jbTable.rows.filter((row: any) =>
                    !row.rowHeader || !Array.isArray(row.rowHeader) || row.rowHeader.length === 0
                );
                if (invalidRows.length > 0) {
                    console.error('[ERROR] Invalid rows detected:', invalidRows);
                    throw new Error('Table contains invalid rows');
                }
            }

            // Deep clone dan simpan
            const tableToSave = JSON.parse(JSON.stringify({ tables: [jbTable] }));

            await addStatistic(analyticId, {
                title: "Jarque-Bera Test of Normality",
                output_data: JSON.stringify(tableToSave),
                components: "Jarque-Bera Test",
                description: "Tests the null hypothesis that data is normally distributed"
            });

            // Tambahkan statistik deskriptif jika diminta
            if (options.includeDescriptives) {
                const descriptivesTable = formatDescriptiveStatisticsTable(results);
                console.log('[DEBUG] Descriptives - Formatted table:', JSON.stringify(descriptivesTable, null, 2));

                // Validasi struktur tabel
                if (descriptivesTable.rows && descriptivesTable.rows.length > 0) {
                    const invalidRows = descriptivesTable.rows.filter((row: any) =>
                        !row.rowHeader || !Array.isArray(row.rowHeader) || row.rowHeader.length === 0
                    );
                    if (invalidRows.length > 0) {
                        throw new Error('Descriptive table contains invalid rows');
                    }
                }

                const descriptivesToSave = JSON.parse(JSON.stringify({ tables: [descriptivesTable] }));

                await addStatistic(analyticId, {
                    title: "Descriptive Statistics",
                    output_data: JSON.stringify(descriptivesToSave),
                    components: "Descriptives",
                    description: "Summary statistics including skewness and kurtosis"
                });
            }

            toast.success("Jarque-Bera Test completed successfully");
            setIsCalculating(false);
            onClose();

        } catch (error) {
            console.error('Error saving results:', error);
            handleCalculationError('Failed to save results');
        }
    }, [testVariables, options, addAnalytic, addStatistic, addLog, onClose, handleCalculationError]);

    // Inisialisasi worker
    useEffect(() => {
        workerRef.current = new Worker('/workers/DescriptiveStatistics/jarqueBeraWorker.js', { type: 'module' });

        workerRef.current.onmessage = (e) => {
            const { type, data, error } = e.data;

            if (type === 'JARQUE_BERA_RESULT') {
                handleCalculationComplete(data);
            } else if (type === 'ERROR') {
                handleCalculationError(error);
            }
        };

        workerRef.current.onerror = (error) => {
            console.error('Worker error:', error);
            handleCalculationError('Worker error occurred');
        };

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, [handleCalculationComplete, handleCalculationError]);

    /**
     * Jalankan analisis Jarque-Bera Test
     */
    const runAnalysis = useCallback(async () => {
        // Validasi
        if (testVariables.length === 0) {
            toast.error('Please select at least one test variable');
            return;
        }

        setIsCalculating(true);
        setErrorMsg(null);

        try {
            // Simpan perubahan pending sebelum analisis
            await useDataStore.getState().checkAndSave();

            // Persiapkan data untuk setiap test variable
            const variablesData = testVariables.map(variable => {
                return analysisData.map((row: any) => row[variable.columnIndex]);
            });

            // Kirim data ke worker
            if (workerRef.current) {
                workerRef.current.postMessage({
                    type: 'CALCULATE',
                    data: {
                        testVariables: testVariables.map(v => v.name),
                        variablesData,
                        options: {
                            significanceLevel: options.significanceLevel,
                            includeDescriptives: options.includeDescriptives,
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Error preparing data:', error);
            handleCalculationError('Failed to prepare data for analysis');
        }
    }, [testVariables, analysisData, options, handleCalculationError]);

    /**
     * Batalkan kalkulasi
     */
    const cancelCalculation = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = new Worker('/workers/DescriptiveStatistics/jarqueBeraWorker.js');
        }
        setIsCalculating(false);
        setErrorMsg(null);
    }, []);

    return {
        isCalculating,
        errorMsg,
        runAnalysis,
        cancelCalculation,
    };
}
