# Track B (white-box, basis path): jalankan tes thesis whitebox dengan Jest standar (config produksi, Windows).
# Pemakaian (dari folder repo): powershell -ExecutionPolicy Bypass -File testing\thesis-eval\run_B.ps1
# Idempoten; tidak menghapus apa pun. Log: testing\thesis-eval\logs\jest_B_win.txt dan jest_B_win.json
. (Join-Path $PSScriptRoot 'tools\common.ps1')

$frontend = Join-Path $RepoRoot 'frontend'
# Pola berupa potongan path (tanpa karakter khusus cmd); hanya berkas di folder __tests__/thesis yang cocok.
$tests = 'thesis/whitebox.validateColumnPrefix thesis/whitebox.getNumericInputError thesis/whitebox.useNaiveBayesValidation thesis/whitebox.loadModelFromFile'
$cmd = "npx jest $tests --runInBand --json --outputFile=..\testing\thesis-eval\logs\jest_B_win.json"
$code = Invoke-Logged -Name 'jest_B_win' -Command $cmd -WorkDir $frontend
Write-Host "Selesai. exit=$code. JSON: testing\thesis-eval\logs\jest_B_win.json"
exit $code
