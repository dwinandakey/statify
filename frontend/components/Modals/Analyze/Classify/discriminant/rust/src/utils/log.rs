/// Debug message to the browser console, e.g. `crate::debug_log!("Box M: {:?}", m)`.
///
/// Compiled only into debug WASM builds (`wasm-pack build --dev`). Release builds,
/// which the app ships, and native builds (unit tests) contain no console call and
/// never evaluate the arguments, so no text dump of the data is ever built. The
/// arguments are still type-checked in every build (inside a dead `if false`), so a
/// value used only in a log does not trigger unused-variable warnings.
#[macro_export]
macro_rules! debug_log {
    ($($arg:tt)*) => {{
        #[cfg(all(target_arch = "wasm32", debug_assertions))]
        {
            web_sys::console::log_1(&format!($($arg)*).into());
        }
        #[cfg(not(all(target_arch = "wasm32", debug_assertions)))]
        {
            if false {
                let _ = format!($($arg)*);
            }
        }
    }};
}

// Structure untuk pencatatan fungsi yang dieksekusi
#[derive(Debug, Clone, Default)]
pub struct FunctionLogger {
    executed_functions: Vec<String>,
}

impl FunctionLogger {
    // Menambahkan fungsi baru ke logger
    pub fn add_log(&mut self, function_name: &str) {
        self.executed_functions.push(function_name.to_string());
    }

    // Mengecek apakah ada fungsi yang dieksekusi
    pub fn has_logs(&self) -> bool {
        !self.executed_functions.is_empty()
    }

    // Mendapatkan seluruh fungsi yang dieksekusi sebagai formatted string
    pub fn get_log_summary(&self) -> String {
        if !self.has_logs() {
            return "Tidak ada fungsi yang dieksekusi.".to_string();
        }

        let mut summary = String::from("Daftar Fungsi yang Dieksekusi:\n");
        for (i, function) in self.executed_functions.iter().enumerate() {
            summary.push_str(&format!("  {}. {}\n", i + 1, function));
        }

        summary
    }

    // Mendapatkan daftar fungsi yang dieksekusi
    pub fn get_executed_functions(&self) -> Vec<String> {
        self.executed_functions.clone()
    }
}
