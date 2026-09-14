import { useState, useEffect, useRef, useCallback } from "react";
import { useVariableStore, processVariableName } from "@/stores/useVariableStore";
import { useDataStore } from "@/stores/useDataStore";
import { toast } from "sonner";
import type { Variable } from "@/types/Variable";
import { INDONESIAN_STOPWORDS, ENGLISH_STOPWORDS } from "../constants/stopwords";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface VectorizerOutput {
    vocabulary: string[];
    matrix: number[][];
    stats: {
        total_documents: number;
        vocabulary_size: number;
        method: string;
    };
}

export interface AppError {
    code: string;
    message: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────────────

export const useStringToWordVector = () => {
    const variablesStore = useVariableStore(state => state.variables);
    const getVariableData = useDataStore(state => state.getVariableData);

    // ── Variable selection state ──────────────────────────────────────────────
    const [availableVariables, setAvailableVariables] = useState<Variable[]>([]);
    const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
    const [highlightedVariable, setHighlightedVariable] = useState<Variable | null>(null);

    // ── Options state ─────────────────────────────────────────────────────────
    const [config, setConfig] = useState({
        lowercase: true,
        stopwords: {
            method: "none", // none | indonesian | english | custom
            customList: "ada\nadalah\nadanya\nadapun\nagak\nagaknya\nagar\nakan\nakankah\nakhir\nakhiri"
        },
        stemming: {
            method: "none", // none | indonesian | english
        },
        tokenizer: {
            type: "word",  // word | ngram
            minSize: 1,
            maxSize: 2,
        },
        delimiters: "[\\s.,;:'\"()?!]+",
        vectorization: {
            tfMethod: "log", // binary | raw | normalized | log
            idfMethod: "smooth", // none | idf | smooth
        },
        wordsToKeep: 1000,
    });

    // ── Execution state ───────────────────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<VectorizerOutput | null>(null);
    const [error, setError] = useState<AppError | null>(null);

    // Worker ref — akan diinisialisasi lazy saat pertama kali dibutuhkan
    const workerRef = useRef<Worker | null>(null);

    // ── Initial load: filter variabel tipe STRING / nominal ───────────────────
    useEffect(() => {
        const stringVars = variablesStore.filter(
            (v) => v.type === "STRING" || v.measure === "nominal"
        );
        if (selectedVariable) {
            setAvailableVariables(stringVars.filter(v => v.id !== selectedVariable.id));
        } else {
            setAvailableVariables(stringVars);
        }
    }, [variablesStore, selectedVariable]);

    // ── Cleanup Worker saat komponen unmount ──────────────────────────────────
    useEffect(() => {
        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, []);

    // ── Variable move handlers ────────────────────────────────────────────────
    const moveToTarget = () => {
        if (highlightedVariable) {
            setSelectedVariable(highlightedVariable);
            setHighlightedVariable(null);
        }
    };

    const removeTarget = () => {
        setSelectedVariable(null);
        setResult(null);
        setError(null);
    };

    // ── Fungsi Run utama ──────────────────────────────────────────────────────
    const runVectorizer = useCallback(async () => {
        if (!selectedVariable) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            // 1. Ambil data kolom dari store
            const { data: columnData } = await getVariableData(selectedVariable);

            // Konversi ke string[], buang null/empty
            const rawDocuments: string[] = columnData
                .filter((v): v is string | number => v !== null && v !== undefined && v !== "")
                .map(v => String(v));

            if (rawDocuments.length === 0) {
                setError({ code: "EMPTY_DATA", message: "Variabel yang dipilih tidak memiliki data teks." });
                setIsLoading(false);
                return;
            }

            // 2. Siapkan payload config untuk Rust
            //    Konversi format config UI → format yang dimengerti Rust
            const isNgram = config.tokenizer.type === "ngram";
            const rustConfig = {
                lowercase: config.lowercase,
                stemming_method: config.stemming.method,
                stopwords_method: config.stopwords.method,
                // Kirim stopwords sebagai JSON array string, atau null jika method "none"
                custom_stopwords: (() => {
                    if (config.stopwords.method === "indonesian") {
                        return JSON.stringify(INDONESIAN_STOPWORDS);
                    }
                    if (config.stopwords.method === "english") {
                        return JSON.stringify(ENGLISH_STOPWORDS);
                    }
                    if (config.stopwords.method === "custom") {
                        return JSON.stringify(
                            config.stopwords.customList
                                .split("\n")
                                .map(s => s.trim())
                                .filter(Boolean)
                        );
                    }
                    return null;
                })(),
                // Gunakan regex yang dikirim dari UI sebagai-is
                delimiters: config.delimiters,
                // Jika mode "word" (bukan n-gram), paksa min=max=1
                ngram_min: isNgram ? config.tokenizer.minSize : 1,
                ngram_max: isNgram ? config.tokenizer.maxSize : 1,
                tf_method: config.vectorization.tfMethod,
                idf_method: config.vectorization.idfMethod,
                words_to_keep: config.wordsToKeep || 1000,
            };

            // 3. Inisialisasi Worker (lazy) dan kirim pesan
            if (!workerRef.current) {
                workerRef.current = new Worker(
                    new URL("../stringToWord.processor.ts", import.meta.url),
                    { type: "module" }
                );
            }

            const worker = workerRef.current;

            // 4. Set handler sebelum kirim pesan
            worker.onmessage = (event: MessageEvent) => {
                const { status, payload } = event.data;
                if (status === "success") {
                    setResult(payload as VectorizerOutput);
                } else {
                    setError(payload as AppError);
                }
                setIsLoading(false);
            };

            worker.onerror = (event: ErrorEvent) => {
                setError({
                    code: "WORKER_ERROR",
                    message: `Web Worker error: ${event.message}`,
                });
                setIsLoading(false);
            };

            worker.postMessage({ data: rawDocuments, config: rustConfig });

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui.";
            setError({ code: "INTERNAL_ERROR", message });
            setIsLoading(false);
        }
    }, [selectedVariable, config, getVariableData]);

    const saveToDataset = async () => {
        if (!result) return;
        try {
            setIsLoading(true);
            const dataStore = useDataStore.getState();
            const variablesStore = useVariableStore.getState();
            const tempVariables = [...variablesStore.variables];
            
            // 1. Prepare safe variable names and ColumnData list
            const columnDataList = result.vocabulary.map((term, colIndex) => {
                // Gunakan processVariableName agar nama unik, valid untuk SPSS, 
                // dan tidak terpotong begitu saja jika illegal
                const baseName = `VEC_${term}`;
                const { processedName } = processVariableName(baseName, tempVariables);
                const finalName = processedName || `VEC_VAR_${colIndex}`;
                
                // Simpan ke tempVariables agar iterasi berikutnya tau kalau nama ini sudah dipakai (uniqueness check)
                tempVariables.push({ name: finalName, columnIndex: 999 } as any);

                return {
                    variable_name: finalName, // Akan kita pakai untuk tracking
                    values: result.matrix.map(row => row[colIndex])
                };
            });

            // 2. Tambahkan Data ke DataStore
            const { startColumnIndex } = await dataStore.addVariableColumns(columnDataList);

            // 3. Daftarkan Metadata Variabel ke VariableStore
            const newVarsMetadata = result.vocabulary.map((term, index) => {
                const finalName = columnDataList[index].variable_name; // Ambil nama yang sudah aman dari map sebelumnya
                return {
                    columnIndex: startColumnIndex + index,
                    name: finalName,
                    type: 'NUMERIC' as const,
                    width: 8,
                    decimals: (config.vectorization.tfMethod === 'none' || config.vectorization.tfMethod === 'binary' || config.vectorization.tfMethod === 'raw') && config.vectorization.idfMethod === 'none' ? 0 : 4,
                    label: `Vector of "${term}"`,
                    values: [],
                    missing: null,
                    columns: 64,
                    align: 'right' as const,
                    measure: 'scale' as const,
                    role: 'input' as const
                };
            });

            await variablesStore.registerVariableMetadata(newVarsMetadata);
            
            // 4. Pastikan UI sinkron ulang dengan reload variables
            await variablesStore.loadVariables();

            toast.success(`${result.vocabulary.length} kolom vektor berhasil ditambahkan ke dataset!`);
        } catch (err: any) {
            toast.error("Gagal menyimpan ke dataset: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };


    // ──────────────────────────────────────────────────────────────────────────
    return {
        // Variable Context
        availableVariables,
        selectedVariable,
        highlightedVariable,
        setHighlightedVariable,
        moveToTarget,
        removeTarget,

        // Options Context
        config,
        setConfig,

        // Execution Context
        isLoading,
        result,
        error,
        runVectorizer,
        saveToDataset,
    };
};