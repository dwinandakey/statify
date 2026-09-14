use serde::Serialize;
use wasm_bindgen::JsValue;

/// Tipe error terpusat untuk seluruh pipeline NLP.
/// Semua modul mengembalikan tipe ini agar JS menerima objek JSON { code, message }
/// yang konsisten saat terjadi kegagalan.
#[derive(Serialize, Debug)]
pub struct AppError {
    pub code: String,
    pub message: String,
}

impl AppError {
    pub fn new(code: &str, message: &str) -> Self {
        AppError {
            code: code.to_string(),
            message: message.to_string(),
        }
    }

    /// Konversi ke JsValue untuk dikembalikan ke JavaScript sebagai Err(JsValue).
    pub fn to_js(&self) -> JsValue {
        let json = serde_json::to_string(self)
            .unwrap_or_else(|_| r#"{"code":"SERIALIZE_ERROR","message":"Gagal serialize error"}"#.to_string());
        JsValue::from_str(&json)
    }
}
