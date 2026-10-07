# Track A (pengujian unit tambahan): jalankan tes Rust thesis_* dan Jest thesis Track A di Windows.
# Pemakaian (dari folder repo): powershell -ExecutionPolicy Bypass -File testing\thesis-eval\run_A.ps1
# Idempoten; tidak menghapus apa pun (log lama ditimpa oleh log baru dengan nama yang sama).
# Log: testing\thesis-eval\logs\rust_<target>.txt, jest_A_win.txt|json, rust_llvm_cov_*.txt, reference_values.txt, static_gap_rust.txt
. (Join-Path $PSScriptRoot 'tools\common.ps1')

$core     = Join-Path $RepoRoot 'frontend\public\workers\TextAnalytics\statify-text-core'
$nbRust   = Join-Path $RepoRoot 'frontend\components\Modals\Analyze\Classify\naive-bayes\rust'
$frontend = Join-Path $RepoRoot 'frontend'
$codes = [ordered]@{}

# --- 0. Nilai acuan Python independen (butuh python + numpy + scikit-learn). Opsional: dilewati bila python tidak ada. ---
$py = Get-Command python -ErrorAction SilentlyContinue
if ($py) {
    $codes['reference_values'] = Invoke-Logged -Name 'reference_values' -Command 'python -X utf8 testing\thesis-eval\unit\reference_values.py' -WorkDir $RepoRoot
    $codes['static_gap_rust']  = Invoke-Logged -Name 'static_gap_rust'  -Command 'python -X utf8 testing\thesis-eval\unit\static_gap_rust.py'  -WorkDir $RepoRoot
} else {
    Write-Host 'python tidak terpasang: reference_values.py dan static_gap_rust.py dilewati (log lama dipertahankan).'
}

# --- 1. Tes Rust (BELUM pernah dijalankan oleh penulis; hasil pertama ada di sini). ---
$cargo = Get-Command cargo -ErrorAction SilentlyContinue
if ($cargo) {
    # Crate statify-text-core: tiga target integrasi tesis.
    foreach ($t in 'thesis_formulas', 'thesis_vocab_limit', 'thesis_text_pipeline') {
        $codes["rust_$t"] = Invoke-Logged -Name "rust_$t" -Command "cargo test --test $t -- --test-threads=1" -WorkDir $core
    }
    # Crate naive-bayes (lib bernama wasm): partisi holdout/k-fold dan KFolds = 1.
    $codes['rust_thesis_partition'] = Invoke-Logged -Name 'rust_thesis_partition' -Command 'cargo test --test thesis_partition -- --test-threads=1' -WorkDir $nbRust

    # Cakupan Rust: opsional, hanya bila cargo-llvm-cov terpasang.
    $cov = (& cargo llvm-cov --version 2>&1) | Out-String
    if ($LASTEXITCODE -eq 0) {
        $codes['rust_llvm_cov_core'] = Invoke-Logged -Name 'rust_llvm_cov_core' -Command 'cargo llvm-cov --summary-only' -WorkDir $core
        $codes['rust_llvm_cov_nb']   = Invoke-Logged -Name 'rust_llvm_cov_nb'   -Command 'cargo llvm-cov --summary-only' -WorkDir $nbRust
    } else {
        $msg = 'cargo-llvm-cov tidak terpasang: cakupan Rust tidak diukur. Pasang dengan: cargo install cargo-llvm-cov'
        Write-Host $msg
        foreach ($n in 'rust_llvm_cov_core', 'rust_llvm_cov_nb') {
            [System.IO.File]::WriteAllText((Join-Path $LogDir ($n + '.txt')), $msg + "`r`n", [System.Text.UTF8Encoding]::new($false))
        }
    }
} else {
    Write-Host 'cargo tidak ditemukan di PATH: tes Rust dilewati (status tetap BELUM DIJALANKAN).'
}

# --- 2. Jest standar (config produksi) untuk empat berkas tesis Track A. ---
# Pola = potongan nama berkas (tanpa karakter khusus cmd); hanya berkas di folder __tests__/thesis yang bernama itu.
$tests = 'model-loader.thesis kfold.thesis stopwords.thesis formula-output.thesis'
$cmd = "npx jest $tests --runInBand --json --outputFile=..\testing\thesis-eval\logs\jest_A_win.json"
$codes['jest_A_win'] = Invoke-Logged -Name 'jest_A_win' -Command $cmd -WorkDir $frontend

Write-Host ''
Write-Host '=== Ringkasan kode keluar (0 = lulus) ==='
foreach ($k in $codes.Keys) { Write-Host ("{0,-28} exit={1}" -f $k, $codes[$k]) }
$bad = @($codes.Values | Where-Object { $_ -ne 0 }).Count
exit $(if ($bad -gt 0) { 1 } else { 0 })
