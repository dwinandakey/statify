mod data;
mod io;
mod model;
mod optimizer;
mod stats;
mod types;
mod utils;

pub use data::*;
pub use io::output;
pub use io::output::*;
pub use io::validation;
pub use io::validation::*;
pub use model::*;
pub use model::derivatives::*;
pub use model::likelihood::*;
pub use model::links::*;
pub use optimizer::*;
pub use optimizer::parallel::*;
pub use stats::statistics;
pub use stats::statistics::*;
pub use types::*;
pub use utils::*;
use wasm_bindgen::prelude::*;

// ORDINAL DEBUG CHECKLIST
// 1. MAIN: cek [ORDINAL][MAIN][PAYLOAD_TO_WORKER]
// 2. WORKER: cek [ORDINAL][WORKER][RECEIVED] & [ORDINAL][WORKER][PAYLOAD_VALID]
// 3. RUST: cek hasil plum_validate (missing field => struct Rust belum sama)
// 4. WORKER RESULT: cek [ORDINAL][WORKER][NORMALIZED_RESULT]
// 5. MAIN FORMATTER: cek [ORDINAL][MAIN][FORMATTED_SECTIONS]

#[wasm_bindgen]
pub fn plum_version() -> String {
    "statify_ordinal-0.1.0".to_string()
}

#[wasm_bindgen]
pub fn plum_validate(input: JsValue) -> Result<JsValue, JsValue> {
    let parsed: PlumWorkerPayload = if let Some(json) = input.as_string() {
        serde_json::from_str(&json)
            .map_err(|e| JsValue::from_str(&format!("Invalid input: {e}")))?
    } else {
        serde_wasm_bindgen::from_value(input)
            .map_err(|e| JsValue::from_str(&format!("Invalid input: {e}")))?
    };
    let validation = validation::validate_input(&parsed);
    serde_wasm_bindgen::to_value(&validation)
        .map_err(|e| JsValue::from_str(&format!("Output serialization failed: {e}")))
}

#[wasm_bindgen]
pub fn plum_fit(input: JsValue) -> Result<JsValue, JsValue> {
    let parsed: PlumWorkerPayload = if let Some(json) = input.as_string() {
        serde_json::from_str(&json)
            .map_err(|e| JsValue::from_str(&format!("Invalid input: {e}")))?
    } else {
        serde_wasm_bindgen::from_value(input)
            .map_err(|e| JsValue::from_str(&format!("Invalid input: {e}")))?
    };

    let validation = validation::validate_input(&parsed);
    if !validation.valid {
        return Err(JsValue::from_str(&validation.errors.join("; ")));
    }

    let data = data::aggregate_data(&parsed)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    let spec = PlumSpec::from_input(&parsed)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let output_options: Option<PlumOutputOptions> =
        serde_json::from_value(parsed.output_options.clone()).ok();
    let default_all = output_options.is_none();
    let print_iteration_history = output_options
        .as_ref()
        .and_then(|opt| opt.print_iteration_history.or(opt.iteration_history))
        .unwrap_or(default_all);
    let iteration_history_every = output_options
        .as_ref()
        .and_then(|opt| opt.iteration_history_every.or(opt.iteration_history_step))
        .unwrap_or(1)
        .max(1);
    let history_options = IterationHistoryOptions {
        enabled: print_iteration_history,
        every: iteration_history_every,
    };

    let options = EstimationOptions::from_payload(Some(&parsed.estimation_options));
    let fit = optimizer::fit_plum(&data, &spec, &options, &history_options)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let output = output::build_plum_output(&parsed, &data, &spec, &fit)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    serde_wasm_bindgen::to_value(&output)
        .map_err(|e| JsValue::from_str(&format!("Output serialization failed: {e}")))
}
