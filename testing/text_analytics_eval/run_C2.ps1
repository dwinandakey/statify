# Track C2 (black-box menu Naive Bayes, BB-14..BB-28): jalankan tes Rust dan Jest standar di Windows.
# Pemakaian (dari folder repo):  powershell -ExecutionPolicy Bypass -File testing\text_analytics_eval\run_C2.ps1
# Idempoten; tidak menghapus apa pun. Log yang dihasilkan:
#   testing\text_analytics_eval\logs\rust_eval_blackbox_nb.txt   (cargo test --test eval_blackbox_nb)
#   testing\text_analytics_eval\logs\jest_C2_win.txt / jest_C2_win.json   (Jest standar, config produksi)
# Prasyarat: Rust toolchain (cargo) dan Node.js (npx) ada di PATH; `npm install` sudah dijalankan di frontend\.
. (Join-Path $PSScriptRoot 'tools\common.ps1')

# --- Lokasi data pilkada_train.csv untuk tes Rust bernama bb22_pilkada_* dan bb23_pilkada_* ----
# Urutan pencarian sama dengan tests\eval_blackbox_nb.rs. TA_EVAL_REQUIRE_DATA=1 membuat berkas yang
# hilang menjadi GAGAL (bukan lulus diam-diam).
$dataCandidates = @(
    $env:TA_EVAL_DATA_DIR,
    (Join-Path $RepoRoot 'Claude outputs'),
    (Join-Path $RepoRoot 'dataset_untuk_text'),
    'E:\KULIAH\Skripsi\SIDANG'
) | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'pilkada_train.csv')) }

if ($dataCandidates) {
    $env:TA_EVAL_DATA_DIR = @($dataCandidates)[0]
    Write-Host "TA_EVAL_DATA_DIR = $($env:TA_EVAL_DATA_DIR)"
} else {
    Write-Warning 'pilkada_train.csv tidak ditemukan di folder kandidat; tes Rust bb22_pilkada_* dan bb23_pilkada_* akan GAGAL (TA_EVAL_REQUIRE_DATA=1). Set TA_EVAL_DATA_DIR ke folder yang memuatnya lalu jalankan ulang.'
}
$env:TA_EVAL_REQUIRE_DATA = '1'

$exitCodes = @()

# --- 1. Rust: tes integrasi terpisah (kegagalan kompilasi tidak memengaruhi berkas tes lain) ---
$nbCrate = Join-Path $RepoRoot 'frontend\components\Modals\Analyze\Classify\naive-bayes\rust'
$exitCodes += Invoke-Logged -Name 'rust_eval_blackbox_nb' `
    -Command 'cargo test --test eval_blackbox_nb' `
    -WorkDir $nbCrate

# --- 2. Jest standar (config produksi) dari frontend\ ---------------------------------------
# Pola berupa potongan path; hanya berkas di folder __tests__\eval yang cocok.
$frontend = Join-Path $RepoRoot 'frontend'
$jestPatterns = 'eval/blackbox.nb.container eval/blackbox.nb.validation eval/blackbox.nb.output'
$jestCmd = "npx jest $jestPatterns --runInBand --json --outputFile=..\testing\text_analytics_eval\logs\jest_C2_win.json"
$exitCodes += Invoke-Logged -Name 'jest_C2_win' -Command $jestCmd -WorkDir $frontend

$worst = ($exitCodes | Measure-Object -Maximum).Maximum
Write-Host ''
Write-Host "Selesai. exit Rust=$($exitCodes[0]) Jest=$($exitCodes[1])"
Write-Host 'Log : testing\text_analytics_eval\logs\rust_eval_blackbox_nb.txt, jest_C2_win.txt, jest_C2_win.json'
Write-Host 'Lanjut: python testing\text_analytics_eval\tools\apply_results.py (dari koordinator) untuk mengisi status pada C_blackbox_C2.md.'
exit $worst
