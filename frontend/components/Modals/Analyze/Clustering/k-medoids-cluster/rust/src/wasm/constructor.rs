// WASM constructor and initialization for K-Medoids

use wasm_bindgen::prelude::*;
use web_sys::console;

#[wasm_bindgen]
pub struct KMedoidsCluster {
    // Internal state will be added as we implement the algorithm
}

#[wasm_bindgen]
impl KMedoidsCluster {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console::log_1(&"K-Medoids Cluster initialized".into());
        Self {}
    }
}
