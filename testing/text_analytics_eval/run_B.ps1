# Track B (white-box, basis path): jalankan tes evaluasi whitebox dengan Jest standar (config produksi, Windows).
# Pemakaian (dari folder repo): powershell -ExecutionPolicy Bypass -File testing\text_analytics_eval\run_B.ps1
# Idempoten; tidak menghapus apa pun. Log: testing\text_analytics_eval\logs\jest_B_win.txt dan jest_B_win.json
. (Join-Path $PSScriptRoot 'tools\common.ps1')

$frontend = Join-Path $RepoRoot 'frontend'
# Pola berupa potongan path (tanpa karakter khusus cmd); hanya berkas di folder __tests__/eval yang cocok.
$tests = 'eval/whitebox.validateColumnPrefix eval/whitebox.getNumericInputError eval/whitebox.useNaiveBayesValidation eval/whitebox.loadModelFromFile'
$cmd = "npx jest $tests --runInBand --json --outputFile=..\testing\text_analytics_eval\logs\jest_B_win.json"
$code = Invoke-Logged -Name 'jest_B_win' -Command $cmd -WorkDir $frontend
Write-Host "Selesai. exit=$code. JSON: testing\text_analytics_eval\logs\jest_B_win.json"
exit $code
