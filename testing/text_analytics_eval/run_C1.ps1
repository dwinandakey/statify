# run_C1.ps1 - Track C1: Black-box String to Word Vector (BB-01..BB-13)
# Menjalankan (1) tes Rust eval_blackbox_stwv dan (2) tes Jest blackbox.stwv.* dengan konfigurasi produksi.
# Idempoten, tidak menghapus apa pun. Log:
#   logs\rust_eval_blackbox_stwv.txt   (cargo test --test eval_blackbox_stwv)
#   logs\jest_C1_win.txt / jest_C1_win.json   (npx jest, config frontend\jest.config.js)
# Pemakaian (PowerShell, dari folder mana pun):  .\testing\text_analytics_eval\run_C1.ps1
$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot 'tools\common.ps1')

$core     = Join-Path $RepoRoot 'frontend\public\workers\TextAnalytics\statify-text-core'
$frontend = Join-Path $RepoRoot 'frontend'

# 1) Rust: sisi komputasi (BB-02, 04, 05, 06, 07, 08, 09, 10, 11, 12)
$rc = Invoke-Logged -Name 'rust_eval_blackbox_stwv' -Command 'cargo test --test eval_blackbox_stwv' -WorkDir $core

# 2) Jest: sisi antarmuka (BB-01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13)
# outputFile relatif terhadap folder frontend (cwd), tanpa tanda kutip agar aman melewati cmd /c
$jestCmd = 'npx jest components/Modals/Transform/StringToWordVector/__tests__/eval/blackbox.stwv --runInBand --json --outputFile=..\testing\text_analytics_eval\logs\jest_C1_win.json'
$jc = Invoke-Logged -Name 'jest_C1_win' -Command $jestCmd -WorkDir $frontend

Write-Host ""
Write-Host "Ringkasan Track C1: rust_exit=$rc  jest_exit=$jc"
Write-Host "Log: $LogDir"
