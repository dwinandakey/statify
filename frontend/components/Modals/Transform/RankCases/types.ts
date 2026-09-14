import type { Variable } from "@/types/Variable";

/**
 * Konfigurasi 1 variabel untuk ranking
 * (BELUM DIPAKAI, tapi disiapkan untuk future)
 */
export interface RankVariableConfig {
  variable: Variable;
  direction: "asc" | "desc";
}

/**
 * Props untuk RankCasesUI (UI ONLY)
 */
export interface RankCasesUIProps {
  onClose: () => void;
  containerType?: "dialog" | "sidebar";
}