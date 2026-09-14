import init, { KNNAnalysis } from "/workers/Classify/NearestNeighbor/pkg/wasm.js?v=knn-predictor-space-axis-picker-20260521";

const WASM_URL =
  "/workers/Classify/NearestNeighbor/pkg/wasm_bg.wasm?v=knn-predictor-space-axis-picker-20260521";

self.onmessage = async (e) => {
  const {
    target,
    features,
    focal,
    caseData,
    targetDefs,
    featureDefs,
    focalDefs,
    caseDefs,
    config
  } = e.data;

  try {
    // init WASM (WAJIB kasih path biar ga error)
    await init(WASM_URL);

    const knn = new KNNAnalysis(
      target,
      features,
      focal,
      caseData,
      targetDefs,
      featureDefs,
      focalDefs,
      caseDefs,
      config
    );

    const result = knn.get_formatted_results();
    const errors = knn.get_all_errors();

    self.postMessage({
      success: true,
      data: result,
      errors
    });

  } catch (err) {
    self.postMessage({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    });
  }
};
