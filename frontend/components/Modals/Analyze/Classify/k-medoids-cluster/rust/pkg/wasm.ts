type KMedoidsInput = {
  data?: number[][];
  n_clusters?: number;
  method?: string;
  max_iterations?: number;
  distance_metric?: string;
  random_seed?: number | null;
  n_init?: number;
  convergence_tolerance?: number;
};

function missingWasmError(): Error {
  return new Error(
    "K-Medoids WASM package is missing. Build it from " +
      "components/Modals/Analyze/Classify/k-medoids-cluster/rust by running: " +
      "wasm-pack build --target web --out-dir pkg (or run rust/build.bat).",
  );
}

export default async function init(): Promise<void> {
  throw missingWasmError();
}

export function test_connection(): string {
  throw missingWasmError();
}

export function run_k_medoids(_input: KMedoidsInput): any {
  throw missingWasmError();
}

export function run_k_medoids_range(_input: unknown): any {
  throw missingWasmError();
}
