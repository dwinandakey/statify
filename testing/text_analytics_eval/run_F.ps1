# run_F.ps1 - Track F: pengujian integrasi antarmenu IT-01..IT-05 (STWV -> Naive Bayes -> Apply Model -> berkas model).
# Semua langkah idempoten dan TIDAK menghapus berkas. Langkah:
#   1. Skrip Node integration\it01..it05 (memanggil wasm YANG SAMA dengan aplikasi lewat pustaka headless Track D):
#        logs\integration_it01_win.txt ... logs\integration_it05_win.txt
#      IT-05 menjalankan DUA proses Node terpisah (fase 1: latih + simpan; fase 2: proses baru, muat + terap);
#      folder kerja sementara di %TEMP% (ubah dengan variabel lingkungan IT05_DIR).
#      IT-04 menulis integration\out\pred_it04_K*.csv (ditimpa pada tiap jalan).
#   2. Jest standar (konfigurasi produksi frontend\jest.config.js) untuk tes F:
#        logs\jest_F_win.txt / logs\jest_F_win.json
#      Berkas: integration.it01.vector-nb, integration.it02-it03.model-roundtrip, integration.it04.pilkada-train-test,
#              integration.it05.persistence, integration.it01.leakage-ui
#   3. Opsional: cargo test --test eval_integration (statify-text-core) -> logs\rust_eval_integration.txt
# Prasyarat: node (v18+), dependensi frontend terpasang (npm ci di folder frontend), wasm sudah dibangun di repo
#            (public\workers\TextAnalytics\{StringToWordVector,NaiveBayes,ApplyModel}\...\pkg), dataset
#            "Claude outputs\pilkada_{train,test}.csv".
# Pemakaian (dari folder repo):  powershell -ExecutionPolicy Bypass -File testing\text_analytics_eval\run_F.ps1
# Parameter: -SkipJest, -SkipRust
param([switch]$SkipJest, [switch]$SkipRust)
. (Join-Path $PSScriptRoot 'tools\common.ps1')

$frontend = Join-Path $RepoRoot 'frontend'
$core     = Join-Path $RepoRoot 'frontend\public\workers\TextAnalytics\statify-text-core'
$codes = [ordered]@{}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Write-Host 'node tidak ditemukan di PATH: skrip integrasi tidak bisa dijalankan.'; exit 2 }

# --- 1. skrip Node (satu proses per skenario; log terpisah)
$scripts = [ordered]@{
    'it01' = 'it01_stwv_to_nb.mjs'
    'it02' = 'it02_export_load.mjs'
    'it03' = 'it03_same_data.mjs'
    'it04' = 'it04_train_test.mjs'
    'it05' = 'it05_persist.mjs'
}
foreach ($k in $scripts.Keys) {
    $codes["node_$k"] = Invoke-Logged -Name "integration_${k}_win" -Command ("node testing\text_analytics_eval\integration\" + $scripts[$k]) -WorkDir $RepoRoot
}

# --- 2. Jest standar (config produksi). Pola jalur tanpa tanda kutip agar aman melewati cmd /c;
#        outputFile relatif terhadap folder frontend (cwd).
if (-not $SkipJest) {
    $jestCmd = 'npx jest integration.it0 --runInBand --json --outputFile=..\testing\text_analytics_eval\logs\jest_F_win.json'
    $codes['jest_F'] = Invoke-Logged -Name 'jest_F_win' -Command $jestCmd -WorkDir $frontend
}

# --- 3. Rust (opsional): peran float_roundtrip pada JSON model
if (-not $SkipRust) {
    $cargo = Get-Command cargo -ErrorAction SilentlyContinue
    if ($cargo) {
        $codes['rust_eval_integration'] = Invoke-Logged -Name 'rust_eval_integration' -Command 'cargo test --test eval_integration -- --test-threads=1' -WorkDir $core
    } else {
        Write-Host 'cargo tidak ditemukan di PATH: eval_integration (opsional) dilewati; status Rust tetap BELUM DIJALANKAN.'
    }
}

Write-Host ''
Write-Host 'Ringkasan Track F (exit code per langkah):'
$codes.GetEnumerator() | ForEach-Object { Write-Host ("  {0,-26} {1}" -f $_.Key, $_.Value) }
Write-Host "Log: $LogDir"
$bad = @($codes.Values | Where-Object { $_ -ne 0 }).Count
if ($bad -gt 0) { exit 1 } else { exit 0 }
