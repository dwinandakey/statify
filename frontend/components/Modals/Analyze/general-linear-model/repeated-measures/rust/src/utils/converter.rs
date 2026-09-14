use wasm_bindgen::JsValue;
use serde::Serialize;
use crate::models::result::RepeatedMeasureResult;

// Konversi dari String error ke JsValue untuk interaksi WASM
pub fn string_to_js_error(error: String) -> JsValue {
    JsValue::from_str(&error)
}

pub fn format_result(result: &Option<RepeatedMeasureResult>) -> Result<JsValue, JsValue> {
    match result {
        Some(result) => {
            let serializer = serde_wasm_bindgen::Serializer::new()
                .serialize_maps_as_objects(true);
            match result.serialize(&serializer) {
                Ok(value) => Ok(value),
                Err(e) => Err(JsValue::from_str(&format!(
                    "Failed to serialize repeated measures results: {}",
                    e
                ))),
            }
        }
        None => Err(JsValue::from_str(
            "No repeated measures analysis results available",
        )),
    }
}
