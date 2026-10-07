# run_E.ps1 - Track E: pengujian waktu eksekusi Text Analytics (STWV, Naive Bayes, Apply Model) di PERANGKAT SKRIPSI.
# Satu perintah (dari akar repo):
#     powershell -ExecutionPolicy Bypass -File testing\thesis-eval\run_E.ps1
# Langkah (idempoten; TIDAK menghapus apa pun; berkas CSV mentah bertambah per eksekusi, agregasi memakai run_id terbaru):
#   0. Cek node, python (opsional), Playwright + peramban (Chrome terpasang -> Edge -> Chromium bawaan Playwright)
#   1. Catat spesifikasi perangkat -> logs\perf_device_info.txt (Get-CimInstance, systeminfo, powercfg, versi alat)
#   2. perf\prepare_datasets.mjs  -> perf\data\*.csv (+ coba unduh 20 Newsgroups lewat scikit-learn bila ada jaringan)
#   3. perf\build_payloads.mjs    -> perf\data\payloads\*.json
#   4. perf\run_headless.mjs      -> perf\raw\headless_skripsi.csv   (log: logs\perf_headless_skripsi.txt)
#   5. perf\run_browser.mjs       -> perf\raw\browser_skripsi.csv    (log: logs\perf_browser_skripsi.txt)
#   6. perf\aggregate_perf.py     -> perf\tables_generated.md dan menyuntikkan tabel ke E_performance.md (butuh python)
# Protokol: 1 pemanasan + 5 pengukuran per sel; urutan dataset kecil -> besar. Estimasi total waktu: sekitar 10-30 menit
# (lebih lama bila 20 Newsgroups berhasil diunduh sehingga dataset >= 20.000 dokumen ikut diukur).
# Sebelum menjalankan: colokkan adaptor daya, pilih paket daya Performa Tinggi/Seimbang, tutup aplikasi lain (peramban, IDE, WEKA),
# jangan menyentuh komputer selama pengukuran. Skrip TIDAK mengubah pengaturan daya.
# Parameter:
#   -Quick           hanya Pilkada 900 dan SMS Spam 5.574 (uji cepat)
#   -SkipHeadless    lewati jalur headless          -SkipBrowser   lewati jalur peramban
#   -Skip20NG        jangan coba mengunduh 20 Newsgroups
#   -Headed          jalankan peramban dengan jendela (default: headless)
#   -Browser <nama>  chrome | msedge | chromium (default: otomatis chrome -> msedge -> chromium)
#   -Runs <n>        jumlah pengukuran (default 5, sesuai protokol)
param(
    [switch]$Quick, [switch]$SkipHeadless, [switch]$SkipBrowser, [switch]$Skip20NG, [switch]$Headed,
    [string]$Browser = '', [int]$Runs = 5
)
. (Join-Path $PSScriptRoot 'tools\common.ps1')

$perf   = Join-Path $EvalRoot 'perf'
$codes  = [ordered]@{}
$dsArg  = ''
if ($Quick) { $dsArg = ' --datasets pilkada_900,sms_5574' }

# --- 0. prasyarat -------------------------------------------------------------
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Write-Host 'node tidak ditemukan di PATH: Track E tidak bisa dijalankan.'; exit 2 }
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { Write-Host 'python tidak ditemukan: 20 Newsgroups dan agregasi otomatis dilewati (jalankan aggregate_perf.py manual nanti).' }

# --- 1. spesifikasi perangkat -------------------------------------------------
$info = Join-Path $LogDir 'perf_device_info.txt'
$sb = New-Object System.Text.StringBuilder
function Add-Line([string]$t) { [void]$sb.AppendLine($t) }
Add-Line ("Dicatat: " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'))
Add-Line ("Komputer: " + $env:COMPUTERNAME)
try {
    $cs = Get-CimInstance Win32_ComputerSystem
    Add-Line ("Model: " + $cs.Manufacturer + ' ' + $cs.Model)
    Add-Line ("RAM fisik (GiB): " + [math]::Round($cs.TotalPhysicalMemory / 1GB, 2))
} catch { Add-Line ("Win32_ComputerSystem gagal: " + $_.Exception.Message) }
try {
    Get-CimInstance Win32_Processor | ForEach-Object {
        Add-Line ("CPU: " + $_.Name.Trim() + " | inti=" + $_.NumberOfCores + " | thread=" + $_.NumberOfLogicalProcessors + " | clock maks (MHz)=" + $_.MaxClockSpeed + " | clock saat ini (MHz)=" + $_.CurrentClockSpeed)
    }
} catch { Add-Line ("Win32_Processor gagal: " + $_.Exception.Message) }
try {
    Get-CimInstance Win32_PhysicalMemory | ForEach-Object {
        Add-Line ("Modul RAM: " + [math]::Round($_.Capacity / 1GB, 1) + " GiB | kecepatan (MT/s)=" + $_.Speed + " | konfigurasi (MT/s)=" + $_.ConfiguredClockSpeed)
    }
} catch { Add-Line ("Win32_PhysicalMemory gagal: " + $_.Exception.Message) }
try {
    $os = Get-CimInstance Win32_OperatingSystem
    Add-Line ("OS: " + $os.Caption + ' ' + $os.Version + ' build ' + $os.BuildNumber + ' ' + $os.OSArchitecture)
} catch { Add-Line ("Win32_OperatingSystem gagal: " + $_.Exception.Message) }
try {
    Get-CimInstance Win32_VideoController | ForEach-Object { Add-Line ("GPU: " + $_.Name + " | driver " + $_.DriverVersion) }
} catch { }
try {
    $bat = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
    if ($bat) { Add-Line ("Baterai: status=" + $bat.BatteryStatus + " (2 = tersambung ke daya AC), muatan (%)=" + $bat.EstimatedChargeRemaining) }
} catch { }
try { Add-Line ("Paket daya aktif: " + ((powercfg /getactivescheme) -join ' ')) } catch { }
Add-Line ("PowerShell: " + $PSVersionTable.PSVersion)
Add-Line ("node: " + (& node --version))
try { Add-Line ("npm: " + (& cmd /c 'npm --version 2>&1')) } catch { }
if ($py) { Add-Line ("python: " + (& python --version 2>&1)) }
foreach ($p in @('C:\Program Files\Google\Chrome\Application\chrome.exe', 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe', 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')) {
    if (Test-Path $p) { Add-Line ("Peramban terpasang: " + $p + " versi " + (Get-Item $p).VersionInfo.ProductVersion) }
}
Add-Line ''
Add-Line '--- systeminfo ---'
try { Add-Line ((& cmd /c 'systeminfo 2>&1') -join "`r`n") } catch { Add-Line ("systeminfo gagal: " + $_.Exception.Message) }
[System.IO.File]::WriteAllText($info, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("Spesifikasi perangkat dicatat: " + $info)
if ($sb.ToString() -notmatch '4600H') { Write-Host 'PERINGATAN: CPU yang terdeteksi bukan Ryzen 5 4600H; baris berlabel "PERANGKAT-SKRIPSI" akan diberi peringatan oleh aggregate_perf.py.' }

# --- 2-3. dataset dan payload -------------------------------------------------
$prep = 'node testing\thesis-eval\perf\prepare_datasets.mjs'
if ($Skip20NG -or -not $py) { $prep += ' --no-20ng' }
$codes['prepare_datasets'] = Invoke-Logged -Name 'perf_prepare_datasets' -Command $prep -WorkDir $RepoRoot
$codes['build_payloads']   = Invoke-Logged -Name 'perf_build_payloads' -Command 'node testing\thesis-eval\perf\build_payloads.mjs' -WorkDir $RepoRoot

# --- 4. headless --------------------------------------------------------------
if (-not $SkipHeadless) {
    $cmd = 'node testing\thesis-eval\perf\run_headless.mjs --device skripsi --runs ' + $Runs + $dsArg
    $codes['headless'] = Invoke-Logged -Name 'perf_headless_skripsi' -Command $cmd -WorkDir $RepoRoot
}

# --- 5. peramban --------------------------------------------------------------
if (-not $SkipBrowser) {
    $candidates = @('chrome', 'msedge', 'chromium')
    if ($Browser -ne '') { $candidates = @($Browser) }
    $chosen = ''
    foreach ($b in $candidates) {
        $chk = Invoke-Logged -Name ('perf_browser_check_' + $b) -Command ('node testing\thesis-eval\perf\run_browser.mjs --check --browser ' + $b) -WorkDir $RepoRoot
        if ($chk -eq 0) { $chosen = $b; break }
    }
    if ($chosen -eq '') {
        Write-Host 'Playwright atau peramban tidak dapat diluncurkan. Jalur peramban DILEWATI.'
        Write-Host 'Perbaikan: cd frontend ; npm install ; npx playwright install chromium   (atau pasang Google Chrome / pakai Edge bawaan Windows).'
        $codes['browser'] = 'DILEWATI (peramban/Playwright tidak tersedia)'
    } else {
        $cmd = 'node testing\thesis-eval\perf\run_browser.mjs --device skripsi --browser ' + $chosen + ' --runs ' + $Runs + $dsArg
        if ($Headed) { $cmd += ' --headed' }
        $codes['browser'] = Invoke-Logged -Name 'perf_browser_skripsi' -Command $cmd -WorkDir $RepoRoot
    }
}

# --- 6. agregasi --------------------------------------------------------------
if ($py) {
    $agg = 'python -X utf8 testing\thesis-eval\perf\aggregate_perf.py --inject testing\thesis-eval\E_performance.md --quiet'
    $codes['aggregate'] = Invoke-Logged -Name 'perf_aggregate' -Command $agg -WorkDir $RepoRoot
} else {
    Write-Host 'Agregasi dilewati (python tidak ada). Jalankan nanti: python testing\thesis-eval\perf\aggregate_perf.py --inject testing\thesis-eval\E_performance.md'
}

Write-Host ''
Write-Host 'Ringkasan Track E (exit code per langkah):'
$codes.GetEnumerator() | ForEach-Object { Write-Host ("  {0,-18} {1}" -f $_.Key, $_.Value) }
Write-Host ("CSV mentah: " + (Join-Path $perf 'raw'))
Write-Host ("Log: " + $LogDir)
$bad = @($codes.Values | Where-Object { ($_ -is [int]) -and ($_ -ne 0) }).Count
if ($bad -gt 0) { exit 1 } else { exit 0 }
