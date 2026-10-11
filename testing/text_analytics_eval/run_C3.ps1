# run_C3.ps1 - Track C3: Black-box Apply Model dan persistensi Naive Bayes (BB-29..BB-36)
# Menjalankan (1) tes Rust eval_blackbox_am (komputasi BB-33, BB-35 pada tingkat crate) dan
# (2) tes Jest blackbox.am.* dan blackbox.nb.persistence dengan konfigurasi produksi (frontend\jest.config.js).
# Idempoten, tidak menghapus apa pun. Log:
#   logs\rust_eval_blackbox_am.txt        (cargo test --test eval_blackbox_am)
#   logs\jest_C3_win.txt / jest_C3_win.json (npx jest)
# Pemakaian (PowerShell, dari folder mana pun):  .\testing\text_analytics_eval\run_C3.ps1
$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot 'tools\common.ps1')

$amRust   = Join-Path $RepoRoot 'frontend\components\Modals\Analyze\Classify\apply-model\rust'
$frontend = Join-Path $RepoRoot 'frontend'

# 1) Rust: sisi komputasi (BB-33 dan BB-35 pada run_apply_model / run_apply_model_with_text)
$rc = Invoke-Logged -Name 'rust_eval_blackbox_am' -Command 'cargo test --test eval_blackbox_am' -WorkDir $amRust

# 2) Jest: loader, pemetaan, dialog, jalur penuh dengan WASM Apply Model yang sudah dibangun (BB-29..BB-35)
#    dan persistensi dialog Naive Bayes (BB-36). Pola jalur tanpa tanda kutip agar aman melewati cmd /c.
#    outputFile relatif terhadap folder frontend (cwd).
$jestCmd = 'npx jest blackbox.am. blackbox.nb.persistence --runInBand --json --outputFile=..\testing\text_analytics_eval\logs\jest_C3_win.json'
$jc = Invoke-Logged -Name 'jest_C3_win' -Command $jestCmd -WorkDir $frontend

Write-Host ""
Write-Host "Ringkasan Track C3: rust_exit=$rc  jest_exit=$jc"
Write-Host "Log: $LogDir"
if ($rc -ne 0 -or $jc -ne 0) { exit 1 } else { exit 0 }
