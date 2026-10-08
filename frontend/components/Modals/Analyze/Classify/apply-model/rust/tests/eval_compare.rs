//! Evaluasi skripsi — Track D (OPSIONAL): probabilitas posterior Apply Model pada PRESISI PENUH dari SUMBER Rust,
//! sekaligus pemeriksaan bahwa biner wasm yang dipakai skrip Node (`testing/text_analytics_eval/headless`) tidak basi
//! terhadap sumber.
//!
//! Cara kerja (tidak menulis ulang rumus; hanya memanggil fungsi produksi):
//!   1. Membaca model hasil Export Model dari wasm Naive Bayes: `testing/text_analytics_eval/accuracy/out/model_statify_<K>.json`
//!      (dibuat oleh `node testing/text_analytics_eval/accuracy/run_statify.mjs`).
//!   2. Membaca `Claude outputs/pilkada_test.csv` (kolom `Id`, `Sentiment`, `Text Tweet`).
//!   3. `build_scorer(model)` -> `TextModel::prepare(payload raw)` -> `score_row_with_text` -> `normalize_log_scores`
//!      (log-sum-exp) -> `argmax_with_tie_break`: jalur yang sama dengan `run_apply_model_with_text`, tetapi probabilitas
//!      TIDAK dibulatkan `round4`.
//!   4. Menulis `out/pred_statify_rust_<K>.csv` (Id, kelas_aktual, kelas_prediksi, prob_<kelas>...) dengan representasi
//!      f64 terpendek yang round-trip (`{}` Rust; setara atau lebih teliti daripada `{:.17}`).
//!   5. Membandingkan dengan `out/pred_statify_<K>.csv` (keluaran wasm AM): kelas prediksi harus sama dan
//!      `round4(p_rust)` harus persis sama dengan nilai wasm. Bila tidak, wasm kemungkinan BASI terhadap sumber (tes gagal).
//!
//! Jika model_statify_<K>.json belum ada, konfigurasi itu dilewati (dicetak). Jalankan:
//!   cargo test --test eval_compare -- --nocapture      (dari apply-model/rust)
//! Berkas ini terpisah supaya galat kompilasi di sini tidak mengganggu tes lain. TIDAK dikompilasi di sesi penulisan
//! (tidak ada toolchain Rust/crate di sandbox): bila gagal kompilasi, laporkan pesan galatnya.

use std::fs;
use std::path::{Path, PathBuf};

use serde_json::Value;

use wasm::models::payload::{TextPayload, TextValues};
use wasm::scoring::{build_scorer, RowScore};
use wasm::stats::posterior::{argmax_with_tie_break, normalize_log_scores, round4};

const KONFIGURASI: &[&str] = &[
    "K1", "K2", "K3", "K4", "K5", "K6", "K1w", "K2w", "K3w", "K4w", "K5w", "K1m", "K2m", "K5m",
];

fn repo_root() -> PathBuf {
    // .../frontend/components/Modals/Analyze/Classify/apply-model/rust -> naik 7 tingkat = akar repo.
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(7)
        .expect("akar repo tidak ditemukan")
        .to_path_buf()
}

/// CSV RFC 4180 sederhana (kutip ganda, "" sebagai escape, sel boleh berisi koma/baris baru).
fn parse_csv(text: &str) -> Vec<Vec<String>> {
    let text = text.strip_prefix('\u{feff}').unwrap_or(text);
    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut row: Vec<String> = Vec::new();
    let mut cell = String::new();
    let mut in_quotes = false;
    let mut chars = text.chars().peekable();
    while let Some(ch) = chars.next() {
        if in_quotes {
            if ch == '"' {
                if chars.peek() == Some(&'"') {
                    cell.push('"');
                    chars.next();
                } else {
                    in_quotes = false;
                }
            } else {
                cell.push(ch);
            }
        } else if ch == '"' {
            in_quotes = true;
        } else if ch == ',' {
            row.push(std::mem::take(&mut cell));
        } else if ch == '\n' || ch == '\r' {
            if ch == '\r' && chars.peek() == Some(&'\n') {
                chars.next();
            }
            row.push(std::mem::take(&mut cell));
            rows.push(std::mem::take(&mut row));
        } else {
            cell.push(ch);
        }
    }
    if !cell.is_empty() || !row.is_empty() {
        row.push(cell);
        rows.push(row);
    }
    rows.into_iter()
        .filter(|r| !(r.len() == 1 && r[0].is_empty()))
        .collect()
}

fn column(header: &[String], name: &str) -> usize {
    header
        .iter()
        .position(|h| h == name)
        .unwrap_or_else(|| panic!("kolom '{name}' tidak ada di CSV: {header:?}"))
}

#[test]
fn eval_compare_pilkada_probabilitas_presisi_penuh_dan_wasm_tidak_basi() {
    let root = repo_root();
    let out_dir = root.join("testing").join("text_analytics_eval").join("accuracy").join("out");
    let test_csv = root.join("Claude outputs").join("pilkada_test.csv");
    let rows = parse_csv(&fs::read_to_string(&test_csv).expect("pilkada_test.csv tidak terbaca"));
    let header = rows[0].clone();
    let data = &rows[1..];
    let (c_id, c_label, c_text) = (column(&header, "Id"), column(&header, "Sentiment"), column(&header, "Text Tweet"));

    // Sama dengan apply-model-analysis.ts#readRawTextValues: kosong/spasi saja -> None, selain itu apa adanya.
    let docs: Vec<Option<String>> = data
        .iter()
        .map(|r| {
            let t = &r[c_text];
            if t.trim().is_empty() {
                None
            } else {
                Some(t.clone())
            }
        })
        .collect();
    let payload = TextPayload {
        source: "raw".to_string(),
        mapped_columns: None,
        values: TextValues::Raw(docs),
    };

    let mut diuji = 0usize;
    let mut masalah: Vec<String> = Vec::new();
    for k in KONFIGURASI {
        let model_path = out_dir.join(format!("model_statify_{k}.json"));
        if !model_path.exists() {
            println!("[eval_compare] lewati {k}: {} belum ada (jalankan run_statify.mjs dulu)", model_path.display());
            continue;
        }
        let model: Value = serde_json::from_str(&fs::read_to_string(&model_path).expect("model terbaca"))
            .expect("model JSON valid");
        let scorer = build_scorer(&model).expect("model Export Model valid");
        let classes: Vec<String> = scorer.classes().to_vec();
        let text_model = scorer.text_model().expect("model memuat fitur Text");
        let text_scores = text_model.prepare(&payload, data.len()).expect("prepare teks");

        let mut csv = String::new();
        csv.push_str("Id,kelas_aktual,kelas_prediksi");
        for c in &classes {
            csv.push_str(&format!(",prob_{c}"));
        }
        csv.push('\n');

        // Hasil wasm (untuk pemeriksaan basi): Id,kelas_aktual,kelas_prediksi,prob_*
        let wasm_path = out_dir.join(format!("pred_statify_{k}.csv"));
        let wasm_rows = if wasm_path.exists() {
            Some(parse_csv(&fs::read_to_string(&wasm_path).expect("pred wasm terbaca")))
        } else {
            None
        };

        let mut beda_kelas = 0usize;
        let mut beda_prob = 0usize;
        for (i, r) in data.iter().enumerate() {
            let id = &r[c_id];
            let actual = &r[c_label];
            match scorer.score_row_with_text(&[], text_scores.row(i)) {
                RowScore::Scored { log_scores, .. } => {
                    let p = normalize_log_scores(&log_scores);
                    let w = argmax_with_tie_break(&classes, &log_scores);
                    csv.push_str(&format!("{id},{actual},{}", classes[w]));
                    for pj in &p {
                        csv.push_str(&format!(",{pj}"));
                    }
                    csv.push('\n');
                    if let Some(wr) = &wasm_rows {
                        // Baris/kolom wasm yang hilang dihitung sebagai beda (bukan panic indeks).
                        match wr.get(i + 1) {
                            Some(line) if line.len() >= 3 + p.len() => {
                                if line[2] != classes[w] {
                                    beda_kelas += 1;
                                }
                                for (j, pj) in p.iter().enumerate() {
                                    let dari_wasm: f64 = line[3 + j].parse().unwrap_or(f64::NAN);
                                    if round4(*pj) != dari_wasm {
                                        beda_prob += 1;
                                    }
                                }
                            }
                            _ => beda_kelas += 1,
                        }
                    }
                }
                RowScore::NotScored => {
                    csv.push_str(&format!("{id},{actual},"));
                    for _ in &classes {
                        csv.push(',');
                    }
                    csv.push('\n');
                    // Baris tidak diskor di sumber Rust harus juga tidak diprediksi (kelas kosong) di wasm.
                    if let Some(wr) = &wasm_rows {
                        let kelas_wasm = wr.get(i + 1).and_then(|line| line.get(2));
                        if kelas_wasm.map_or(true, |kelas| !kelas.is_empty()) {
                            beda_kelas += 1;
                        }
                    }
                }
            }
        }
        fs::write(out_dir.join(format!("pred_statify_rust_{k}.csv")), csv).expect("tulis pred_statify_rust");
        diuji += 1;
        println!(
            "[eval_compare] {k}: {} baris; beda kelas vs wasm = {beda_kelas}; beda round4(prob) vs wasm = {beda_prob}",
            data.len()
        );
        if beda_kelas > 0 || beda_prob > 0 {
            masalah.push(format!("{k}: beda kelas={beda_kelas}, beda probabilitas(round4)={beda_prob}"));
        }
    }
    println!("[eval_compare] konfigurasi diuji: {diuji}");
    assert!(
        masalah.is_empty(),
        "wasm AM berbeda dari sumber Rust (kemungkinan basi): {masalah:?}"
    );
}
