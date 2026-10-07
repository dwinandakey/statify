# run_all.ps1 — SATU PERINTAH untuk menjalankan seluruh paket evaluasi di Windows (perangkat skripsi).
#
#   powershell -ExecutionPolicy Bypass -File testing\thesis-eval\run_all.ps1
#
# Opsi:  -SkipBaseline  -SkipTracks  -SkipE (lewati performa, paling lama)  -SkipRust  -Only A,B,C1,C2,C3,D,E,F
# Urutan: (0) catat lingkungan -> (1) baseline tes yang SUDAH ADA (Rust + Jest + cakupan) -> (2) run_A..run_F -> (3) apply_results.py, merge_docs.py, build_report.py (REPORT.md).
# Aturan: tidak menghapus berkas, tidak mengubah kode produksi, tidak commit/push. Semua log UTF-8 di testing\thesis-eval\logs\.
# Syarat: node + npm (node_modules sudah terpasang di repo), cargo/rustc (Rust), python (opsional; untuk sklearn & pengisian tabel).
# Catatan: tutup aplikasi berat, colok daya, dan jangan gunakan komputer saat run_E (pengukuran waktu) berjalan.
param(
    [switch]$SkipBaseline, [switch]$SkipTracks, [switch]$SkipE, [switch]$SkipRust,
    [string[]]$Only = @()
)
. (Join-Path $PSScriptRoot 'tools\common.ps1')

$frontend = Join-Path $RepoRoot 'frontend'
$core   = Join-Path $RepoRoot 'frontend\public\workers\TextAnalytics\statify-text-core'
$nbRust = Join-Path $RepoRoot 'frontend\components\Modals\Analyze\Classify\naive-bayes\rust'
$amRust = Join-Path $RepoRoot 'frontend\components\Modals\Analyze\Classify\apply-model\rust'
$stRust = Join-Path $RepoRoot 'frontend\components\Modals\Transform\StringToWordVector\rust'
$codes = [ordered]@{}
$t0 = Get-Date

Write-Host "=== THESIS-EVAL run_all mulai $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz') ==="

# --- 0. Lingkungan ---
& (Join-Path $PSScriptRoot 'tools\capture_env.ps1')

# --- 1. Baseline: hanya tes yang sudah ada sebelum evaluasi (target thesis_* dan folder __tests__\thesis dikecualikan) ---
if (-not $SkipBaseline) {
    $cargo = Get-Command cargo -ErrorAction SilentlyContinue
    if ($cargo -and -not $SkipRust) {
        $codes['baseline_rust_core'] = Invoke-Logged -Name 'baseline_rust_core' -WorkDir $core `
            -Command 'cargo test --lib --test characterization --test nb_text --test s2_pipeline --test s3_formulas --test s4_fit_transform'
        $codes['baseline_rust_nb']   = Invoke-Logged -Name 'baseline_rust_nb'   -WorkDir $nbRust -Command 'cargo test --lib'
        $codes['baseline_rust_am']   = Invoke-Logged -Name 'baseline_rust_am'   -WorkDir $amRust -Command 'cargo test --lib --test text_scoring'
        $codes['baseline_rust_stwv'] = Invoke-Logged -Name 'baseline_rust_stwv' -WorkDir $stRust -Command 'cargo test'
        # Cakupan Rust (opsional)
        cmd /c "cargo llvm-cov --version > nul 2>&1"
        if ($LASTEXITCODE -eq 0) {
            $codes['baseline_cov_core'] = Invoke-Logged -Name 'baseline_cov_core' -WorkDir $core   -Command 'cargo llvm-cov --lib --test characterization --test nb_text --test s2_pipeline --test s3_formulas --test s4_fit_transform --summary-only'
            $codes['baseline_cov_nb']   = Invoke-Logged -Name 'baseline_cov_nb'   -WorkDir $nbRust -Command 'cargo llvm-cov --lib --summary-only'
            $codes['baseline_cov_am']   = Invoke-Logged -Name 'baseline_cov_am'   -WorkDir $amRust -Command 'cargo llvm-cov --lib --test text_scoring --summary-only'
        } else {
            Write-Host 'cargo-llvm-cov tidak terpasang: cakupan Rust = NOT RUN (pasang: cargo install cargo-llvm-cov)'
        }
    } else { Write-Host 'cargo tidak ditemukan atau -SkipRust: baseline Rust dilewati (NOT RUN).' }

    $ignore = '--testPathIgnorePatterns=__tests__/thesis --testPathIgnorePatterns=hooks/__tests__/whitebox'
    $menus = @(
        @{ n='stwv'; p='components/Modals/Transform/StringToWordVector' },
        @{ n='nb';   p='components/Modals/Analyze/Classify/naive-bayes' },
        @{ n='am';   p='components/Modals/Analyze/Classify/apply-model' }
    )
    foreach ($m in $menus) {
        $cov = "--coverage --coverageReporters=json-summary --coverageReporters=text `"--collectCoverageFrom=$($m.p)/**/*.{ts,tsx}`" `"--collectCoverageFrom=!**/__tests__/**`" `"--collectCoverageFrom=!**/*.d.ts`" `"--collectCoverageFrom=!**/wasm-output/**`" `"--collectCoverageFrom=!**/pkg/**`""
        $cmd = "npx jest $($m.p) $ignore $cov --json --outputFile=..\testing\thesis-eval\logs\baseline_jest_$($m.n)_win.json"
        $codes["baseline_jest_$($m.n)"] = Invoke-Logged -Name "baseline_jest_$($m.n)" -Command $cmd -WorkDir $frontend
        # salin ringkasan cakupan (json-summary) agar tidak tertimpa menu berikutnya
        $src = Join-Path $frontend 'coverage\coverage-summary.json'
        if (Test-Path $src) { Copy-Item $src (Join-Path $LogDir "baseline_coverage_$($m.n)_win.json") -Force }
    }
}

# --- 2. Track A..F ---
if (-not $SkipTracks) {
    $tracks = @('A','B','C1','C2','C3','D','F','E')   # E (performa) terakhir
    foreach ($t in $tracks) {
        if ($Only.Count -gt 0 -and ($Only -notcontains $t)) { continue }
        if ($t -eq 'E' -and $SkipE) { continue }
        $script = Join-Path $PSScriptRoot "run_$t.ps1"
        if (-not (Test-Path $script)) { Write-Host "run_$t.ps1 tidak ada, dilewati"; continue }
        Write-Host "=== Track $t ==="
        try { & $script; $codes["track_$t"] = $LASTEXITCODE } catch { Write-Host "Track $t gagal dijalankan: $($_.Exception.Message)"; $codes["track_$t"] = -1 }
    }
}

# --- 3. Isi tabel dari log ---
$py = Get-Command python -ErrorAction SilentlyContinue
if ($py) {
    $codes['apply_results'] = Invoke-Logged -Name 'apply_results' -WorkDir $RepoRoot -Command 'python -X utf8 testing\thesis-eval\tools\apply_results.py'
    $codes['merge_docs']   = Invoke-Logged -Name 'merge_docs'   -WorkDir $RepoRoot -Command 'python -X utf8 testing\thesis-eval\tools\merge_docs.py'
    $codes['build_report'] = Invoke-Logged -Name 'build_report' -WorkDir $RepoRoot -Command 'python -X utf8 testing\thesis-eval\tools\build_report.py'
} else { Write-Host 'python tidak ada: jalankan nanti apply_results.py, merge_docs.py, build_report.py di folder testing\thesis-eval\tools (atau kirim folder logs ke asisten).' }

$el = [math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
Write-Host ''
Write-Host "=== RINGKASAN (exit code per langkah; 0 = sukses, selain itu cek log) — total $el menit ==="
$codes.GetEnumerator() | ForEach-Object { Write-Host ("  {0,-28} {1}" -f $_.Key, $_.Value) }
Write-Host "Log: $LogDir"
Write-Host 'Selesai. Kirim/ceritakan: folder testing\thesis-eval\logs (dan accuracy\out, perf\raw) agar laporan diperbarui.'
