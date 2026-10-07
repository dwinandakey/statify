# Mencatat lingkungan perangkat skripsi ke logs\env_windows.txt (UTF-8). Dipanggil oleh run_all.ps1.
. "$PSScriptRoot\common.ps1"
$out = Join-Path $LogDir 'env_windows.txt'
$lines = New-Object System.Collections.Generic.List[string]
function Add-Line($s) { $script:lines.Add($s) }
function Try-Cmd($label, $cmd) {
    try { $r = (cmd /c "$cmd 2>&1") | Select-Object -First 3; Add-Line ("{0}: {1}" -f $label, ($r -join ' | ')) }
    catch { Add-Line ("{0}: TIDAK TERSEDIA ({1})" -f $label, $_.Exception.Message) }
}
Add-Line "Waktu pencatatan: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
Add-Line "Komputer: $env:COMPUTERNAME"
try {
    $os = Get-CimInstance Win32_OperatingSystem; $cs = Get-CimInstance Win32_ComputerSystem; $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
    Add-Line "OS: $($os.Caption) $($os.Version) build $($os.BuildNumber) $($os.OSArchitecture)"
    Add-Line "Model: $($cs.Manufacturer) $($cs.Model)"
    Add-Line "CPU: $($cpu.Name.Trim()) ; inti=$($cpu.NumberOfCores) ; thread=$($cpu.NumberOfLogicalProcessors)"
    Add-Line ("RAM: {0:N1} GB" -f ($cs.TotalPhysicalMemory/1GB))
    $mem = Get-CimInstance Win32_PhysicalMemory | Select-Object -First 1
    if ($mem) { Add-Line "Memori: $($mem.Speed) MHz (ConfiguredClockSpeed=$($mem.ConfiguredClockSpeed))" }
    $pl = (powercfg /getactivescheme) 2>&1; Add-Line "Rencana daya aktif: $pl"
} catch { Add-Line "Info perangkat keras: gagal ($($_.Exception.Message))" }
Try-Cmd 'node' 'node -v'
Try-Cmd 'npm' 'npm -v'
Try-Cmd 'npx jest' 'npx --no-install jest --version'
Try-Cmd 'rustc' 'rustc -V'
Try-Cmd 'cargo' 'cargo -V'
Try-Cmd 'wasm-pack' 'wasm-pack --version'
Try-Cmd 'cargo-llvm-cov' 'cargo llvm-cov --version'
Try-Cmd 'cargo-tarpaulin' 'cargo tarpaulin --version'
Try-Cmd 'python' 'python --version'
Try-Cmd 'pip: numpy/pandas/scikit-learn/scipy' 'python -c "import numpy,pandas,sklearn,scipy;print(numpy.__version__,pandas.__version__,sklearn.__version__,scipy.__version__)"'
Try-Cmd 'java' 'java -version'
Try-Cmd 'dot (graphviz)' 'dot -V'
Try-Cmd 'git' 'git --version'
$weka = 'C:\Program Files\Weka-3-9-6'
if (Test-Path $weka) { Add-Line "WEKA: folder ada ($weka)"; Try-Cmd 'WEKA version' "`"$weka\jre\zulu17.32.13-ca-fx-jre17.0.2-win_x64\bin\java.exe`" -cp `"$weka\weka.jar`" weka.core.Version" } else { Add-Line "WEKA: folder default tidak ditemukan" }
foreach ($b in @('C:\Program Files\Google\Chrome\Application\chrome.exe','C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe','C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe')) {
    if (Test-Path $b) { Add-Line ("Peramban: {0} versi {1}" -f $b, (Get-Item $b).VersionInfo.ProductVersion) }
}
Push-Location $RepoRoot
Try-Cmd 'git branch' 'git rev-parse --abbrev-ref HEAD'
Try-Cmd 'git commit' 'git rev-parse HEAD'
Pop-Location
[System.IO.File]::WriteAllLines($out, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host "Lingkungan dicatat ke $out"
