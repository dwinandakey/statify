# run_D.ps1 - Track D: perbandingan akurasi numerik Statify vs scikit-learn vs WEKA (di Windows).
# Langkah (semua idempoten; tidak menghapus apa pun; berkas keluaran ditimpa dengan nama yang sama):
#   1. node headless\selftest.mjs                        -> logs\accuracy_selftest_win.txt
#   2. node accuracy\run_statify.mjs (pilkada, K1..K6 + varian w/m) -> accuracy\out\pred_statify_<K>.csv, model_*.json
#      (memanggil wasm YANG SAMA dengan aplikasi; sha256 wasm tercetak di log)      -> logs\accuracy_statify_pilkada_win.txt
#   3. python accuracy\sk_compare.py (butuh numpy, scipy, pandas, scikit-learn; dilewati bila python tidak ada)
#   4. python accuracy\compare_predictions.py (numpy + pandas)          -> accuracy\out\compare_pilkada.md/.json
#   5. Dataset tambahan SMS Spam dan SmSA bila accuracy\datasets\*.csv ada (lihat accuracy\datasets\MANIFEST.md)
#   6. Opsional: cargo test --test eval_compare (apply-model\rust): probabilitas presisi penuh + pemeriksaan wasm basi
#      -> logs\rust_eval_compare.txt
#   7. Opsional: Jest standar eval\payload_equivalence (kesetaraan pembangun payload headless dengan TS)
# Pemakaian (dari folder repo):  powershell -ExecutionPolicy Bypass -File testing\text_analytics_eval\run_D.ps1
# Parameter: -SkipRust, -SkipJest, -SkipDatasets
param([switch]$SkipRust, [switch]$SkipJest, [switch]$SkipDatasets)
. (Join-Path $PSScriptRoot 'tools\common.ps1')

$acc      = Join-Path $RepoRoot 'testing\text_analytics_eval\accuracy'
$headless = Join-Path $RepoRoot 'testing\text_analytics_eval\headless'
$amRust   = Join-Path $RepoRoot 'frontend\components\Modals\Analyze\Classify\apply-model\rust'
$frontend = Join-Path $RepoRoot 'frontend'
$codes = [ordered]@{}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Write-Host 'node tidak ditemukan di PATH: jalur Statify headless tidak bisa dijalankan.'; exit 2 }
$py = Get-Command python -ErrorAction SilentlyContinue

# --- 1. uji kecil pustaka
$codes['selftest'] = Invoke-Logged -Name 'accuracy_selftest_win' -Command 'node testing\text_analytics_eval\headless\selftest.mjs' -WorkDir $RepoRoot

# --- 2. Statify (pilkada)
$codes['statify_pilkada'] = Invoke-Logged -Name 'accuracy_statify_pilkada_win' -Command 'node testing\text_analytics_eval\accuracy\run_statify.mjs --dataset pilkada' -WorkDir $RepoRoot

# --- 3-4. scikit-learn dan perbandingan
if ($py) {
    $codes['sklearn_pilkada']  = Invoke-Logged -Name 'accuracy_sklearn_pilkada_win'  -Command 'python -X utf8 testing\text_analytics_eval\accuracy\sk_compare.py --dataset pilkada' -WorkDir $RepoRoot
    $codes['compare_pilkada']  = Invoke-Logged -Name 'accuracy_compare_pilkada_win'  -Command 'python -X utf8 testing\text_analytics_eval\accuracy\compare_predictions.py --dataset pilkada' -WorkDir $RepoRoot
} else {
    Write-Host 'python tidak terpasang: sk_compare.py dan compare_predictions.py dilewati (pred_sklearn_*.csv dari sesi penulisan tetap dipakai bila ada).'
}

# --- 5. dataset tambahan
if (-not $SkipDatasets) {
    foreach ($ds in 'sms_spam', 'smsa') {
        if (Test-Path (Join-Path $acc "datasets\${ds}_train.csv")) {
            $codes["statify_$ds"] = Invoke-Logged -Name "accuracy_statify_${ds}_win" -Command "node testing\text_analytics_eval\accuracy\run_statify.mjs --dataset $ds" -WorkDir $RepoRoot
            if ($py) {
                $codes["sklearn_$ds"]  = Invoke-Logged -Name "accuracy_sklearn_${ds}_win"  -Command "python -X utf8 testing\text_analytics_eval\accuracy\sk_compare.py --dataset $ds --no-params" -WorkDir $RepoRoot
                $codes["compare_$ds"]  = Invoke-Logged -Name "accuracy_compare_${ds}_win"  -Command "python -X utf8 testing\text_analytics_eval\accuracy\compare_predictions.py --dataset $ds" -WorkDir $RepoRoot
            }
        } else {
            Write-Host "datasets\${ds}_train.csv tidak ada: $ds dilewati (jalankan accuracy\download_datasets.py)."
        }
    }
}

# --- 6. Rust (opsional)
if (-not $SkipRust) {
    $cargo = Get-Command cargo -ErrorAction SilentlyContinue
    if ($cargo) {
        $codes['rust_eval_compare'] = Invoke-Logged -Name 'rust_eval_compare' -Command 'cargo test --test eval_compare -- --nocapture' -WorkDir $amRust
    } else {
        Write-Host 'cargo tidak ditemukan di PATH: eval_compare (opsional) dilewati.'
    }
}

# --- 7. Jest (opsional): kesetaraan payload headless vs TS (config produksi)
if (-not $SkipJest) {
    # Pola jalur tanpa tanda kutip agar aman melewati cmd /c; outputFile relatif terhadap folder frontend.
    $jestCmd = 'npx jest payload_equivalence --runInBand --json --outputFile=..\testing\text_analytics_eval\logs\jest_D_win.json'
    $codes['jest_payload_equivalence'] = Invoke-Logged -Name 'jest_D_win' -Command $jestCmd -WorkDir $frontend
}

Write-Host ''
Write-Host 'Ringkasan Track D (exit code per langkah):'
$codes.GetEnumerator() | ForEach-Object { Write-Host ("  {0,-26} {1}" -f $_.Key, $_.Value) }
Write-Host "Log: $LogDir"
$bad = @($codes.Values | Where-Object { $_ -ne 0 }).Count
if ($bad -gt 0) { exit 1 } else { exit 0 }
