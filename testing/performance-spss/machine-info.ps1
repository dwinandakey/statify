# Machine conditions for one measurement label -> results/<Label>/machine-<time>.json
# (CPU, cores, RAM, Windows, SPSS, Node, Chromium/Playwright, power, and the
# background services that should be paused before phase 1). Read-only.
param([Parameter(Mandatory = $true)][string]$Label)
$root = $PSScriptRoot
$repo = (Resolve-Path (Join-Path $root "..\..")).Path
$out = Join-Path $root "results\$Label"
New-Item -ItemType Directory -Force $out | Out-Null

$cpu = Get-CimInstance Win32_Processor
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$batt = Get-CimInstance -Namespace root/wmi -ClassName BatteryStatus -ErrorAction SilentlyContinue | Select-Object -First 1
$spss = (Get-Item "C:\Program Files\IBM\SPSS\Statistics\27\stats.exe").VersionInfo
$mp = $null; try { $mp = Get-MpComputerStatus -ErrorAction Stop } catch {}
$svc = foreach ($n in "wuauserv", "UsoSvc", "BITS", "WSearch", "SysMain", "DiagTrack", "WinDefend") {
    $s = Get-Service $n -ErrorAction SilentlyContinue
    if ($s) { [pscustomobject]@{ name = $n; display = $s.DisplayName; status = "$($s.Status)"; startType = "$($s.StartType)" } }
}
$procs = Get-Process | Where-Object { $_.ProcessName -match '^(OneDrive|Teams|ms-teams|chrome|msedge|Code|Dropbox|GoogleDriveFS|Spotify|Discord|WINWORD|EXCEL|stats|spssengine|MsMpEng|SearchIndexer)$' } |
    Group-Object ProcessName | ForEach-Object { [pscustomobject]@{ name = $_.Name; count = $_.Count; cpuSeconds = [math]::Round(($_.Group | Measure-Object CPU -Sum).Sum, 1) } }
$chromium = $null
try { $chromium = (& node -e "require('@playwright/test').chromium.launch().then(async b=>{console.log(b.version());await b.close()})" 2>$null) } catch {}

$info = [ordered]@{
    capturedAt = (Get-Date).ToString("o")
    cpu = $cpu.Name.Trim(); physicalCores = $cpu.NumberOfCores; logicalProcessors = $cpu.NumberOfLogicalProcessors
    maxClockMHz = $cpu.MaxClockSpeed
    ramGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1); freeRamGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
    windows = "$($os.Caption) $($os.Version) build $($os.BuildNumber)"
    spss = "$($spss.ProductName) $($spss.ProductVersion) (stats.exe $($spss.FileVersion))"
    node = (& node -v); playwright = (& node -p "require('@playwright/test/package.json').version"); chromium = $chromium
    next = (& node -p "require('$($repo.Replace('\','/'))/node_modules/next/package.json').version")
    gitHead = (& git -C $repo rev-parse HEAD)
    powerScheme = ((powercfg /getactivescheme) -join " ").Trim()
    acPower = if ($batt) { [bool]$batt.PowerOnline } else { $null }
    batteryCharging = if ($batt) { [bool]$batt.Charging } else { $null }
    defenderRealTime = if ($mp) { [bool]$mp.RealTimeProtectionEnabled } else { $null }
    services = $svc
    notableProcesses = $procs
}
$file = Join-Path $out ("machine-{0}.json" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
$info | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 $file
Get-Content $file
