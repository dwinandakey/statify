import { create } from "zustand";

interface GARCHResults {
  modelType: string; // "GARCH" or "ARCH"
  p: number;
  q: number;
  coefficients: {
    omega: string;
    alpha: string[];
    beta: string[];
  };
  diagnostics: {
    aic: string;
    bic: string;
    logLikelihood: string;
  };
  variance: number[];
  residuals: number[];
  data: number[];
}

interface ECMResults {
  longRun: {
    beta0: string;
    beta1: string;
  };
  cointegration: {
    adfStat: string;
    isCointegrated: boolean;
  };
  ecm: {
    coefficients: string[]; // [α, γ, φ] usually
    residuals: number[];
    rSquared: string;
    // Assuming coefficients follow specific order, or we map them in UI
  };
}

interface ARDLResults {
  coefficients: string[];
  standardErrors: string[];
  tStats: string[];
  pValues: string[];
  residuals: number[];
  fittedValues: number[];
  longRun: string[];
  boundsF: string;
  rSquared: string;
  // Metadata passed separately or implied
}

interface TimeSeriesResultsState {
    // Current Active Result
    currentModel: "GARCH" | "ARCH" | "ECM" | "ARDL" | null;
    
    // Store results
    garchResults: GARCHResults | null;
    ecmResults: ECMResults | null;
    ardlResults: ARDLResults | null;
    
    // Actions
    setGarchResults: (results: GARCHResults) => void;
    setEcmResults: (results: ECMResults) => void;
    setArdlResults: (results: ARDLResults) => void;
    clearResults: () => void;
}

export const useTimeSeriesResultsStore = create<TimeSeriesResultsState>((set) => ({
    currentModel: null,
    garchResults: null,
    ecmResults: null,
    ardlResults: null,
    
    setGarchResults: (results) => set({ 
        garchResults: results,
        currentModel: results.modelType === "ARCH" ? "ARCH" : "GARCH"
    }),
    
    setEcmResults: (results) => set({ 
        ecmResults: results,
        currentModel: "ECM"
    }),
    
    setArdlResults: (results) => set({ 
        ardlResults: results,
        currentModel: "ARDL"
    }),
    
    clearResults: () => set({
        currentModel: null,
        garchResults: null,
        ecmResults: null,
        ardlResults: null
    })
}));
