use wasm_bindgen::JsValue;
use serde::Serialize;

use crate::models::result::MultivariateResult;

// Konversi dari String error ke JsValue untuk interaksi WASM
pub fn string_to_js_error(error: String) -> JsValue {
    JsValue::from_str(&error)
}

/// Convert MultivariateResult into a JsValue where all HashMap fields
/// are serialized as plain JavaScript objects (not Map).
/// This mirrors the univariate pattern in converter.rs → format_result.
pub fn format_result(result: &Option<MultivariateResult>) -> Result<JsValue, JsValue> {
    match result {
        Some(result) => {
            let serializer = serde_wasm_bindgen::Serializer::new()
                .serialize_maps_as_objects(true);
            match result.serialize(&serializer) {
                Ok(value) => Ok(value),
                Err(e) => Err(JsValue::from_str(&format!(
                    "Failed to serialize multivariate results: {}",
                    e
                ))),
            }
        }
        None => Err(JsValue::from_str(
            "No multivariate analysis results available",
        )),
    }
}
