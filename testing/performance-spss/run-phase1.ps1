# Phase 1, unattended: SPSS blocks and Statify end-to-end blocks, alternating
# per size: n1 SPSS -> Statify, n2 Statify -> SPSS, n3 SPSS -> Statify, ...
# with a cool-down pause between consecutive blocks. Every block start/end is
# written to results/<Label>/blocks.csv.
#
#  - SPSS block: one production job per procedure (spss/<Label>/jobs, made by
#    spss/make_jobs.py), stats.exe -production silent.
#  - Statify block: `next start` on the existing production build of
#    frontend/ (build first: cd frontend && npx next build), then
#    statify/run-e2e.cjs for this size, then the server is stopped.
#
# The processor affinity is set on this PowerShell process first, so SPSS
# (stats.exe, spssengine.exe), the Next server, node and Chromium inherit it.
#
# Start detached, e.g.:
#   Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "testing\performance-spss\run-phase1.ps1" -Label utama'
param(
    [Parameter(Mandatory = $true)][string]$Label,
    [string]$Sizes = "100,1000,10000,100000",
    [string]$Procs = "mv1,mv2,rm",
    [int]$Runs = 11,
    [string]$Affinity = "FFF",
    [int]$CooldownSec = 120,
    [int]$Port = 3101,
    [ValidateSet("spss", "statify")][string]$FirstBlock = "spss",
    # CSV folder, relative to this folder: "data" (factor levels as strings)
    # or "data\kode" (numeric codes, data/generate.cjs --codes=numeric).
    [string]$DataDir = "data"
)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$repo = (Resolve-Path (Join-Path $root "..\..")).Path
. (Join-Path $root "common.ps1")

$resDir = Join-Path $root "results\$Label"
$spssDir = Join-Path $root "spss\$Label"
$e2eDir = Join-Path $root "statify\$Label-e2e"
New-Item -ItemType Directory -Force $resDir, $spssDir, $e2eDir | Out-Null
$status = Join-Path $resDir "status.txt"
$blocks = Join-Path $resDir "blocks.csv"
if (-not (Test-Path $blocks)) { "label,order,n,software,start,end,seconds,result" | Out-File -Encoding utf8 $blocks }

Set-OwnAffinity $Affinity
Write-Note $status "phase 1 '$Label': sizes=$Sizes procs=$Procs runs=$Runs affinity=0x$Affinity cooldown=${CooldownSec}s first=$FirstBlock data=$DataDir"
Set-KeepAwake $true

if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) { throw "port $Port is in use" }
$dataPath = Join-Path $root $DataDir
& python (Join-Path $root "spss\make_jobs.py") $spssDir $Sizes $Runs $dataPath | Out-Null
$cells = Get-Content (Join-Path $spssDir "jobs\cells.json") -Raw | ConvertFrom-Json
$procList = $Procs.Split(",")
$script:order = 0

function Add-Block($n, $software, $start, $result) {
    $script:order++
    $end = Get-Date
    "$Label,$($script:order),$n,$software,$($start.ToString('o')),$($end.ToString('o')),$([math]::Round(($end - $start).TotalSeconds,1)),$result" | Out-File -Append -Encoding utf8 $blocks
}

function Invoke-SpssBlock($n) {
    $start = Get-Date
    Write-Note $status "SPSS block n=$n start"
    $results = @()
    foreach ($c in ($cells | Where-Object { $_.n -eq $n -and $procList -contains $_.proc })) {
        $r = Invoke-SpssJob $c.spj (Join-Path $spssDir "affinity.tsv")
        "$($c.cell),$($r.start.ToString('o')),$($r.end.ToString('o')),$($r.exit),$($r.processes)" | Out-File -Append -Encoding utf8 (Join-Path $spssDir "jobs.csv")
        Write-Note $status "  SPSS $($c.cell) exit=$($r.exit) $([math]::Round(($r.end - $r.start).TotalSeconds,1)) s; $($r.processes)"
        $results += "$($c.proc):$($r.exit)"
    }
    Add-Block $n "spss" $start ($results -join " ")
}

function Stop-Server($server) {
    Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    if ($server) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
}

function Invoke-StatifyBlock($n) {
    $start = Get-Date
    Write-Note $status "Statify block n=$n start"
    $server = $null
    $result = "error"
    try {
        $server = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx next start -p $Port >> `"$e2eDir\server.log`" 2>&1" `
            -WorkingDirectory (Join-Path $repo "frontend") -WindowStyle Hidden -PassThru
        $up = $false
        for ($i = 0; $i -lt 120 -and -not $up; $i++) {
            Start-Sleep -Seconds 2
            try { $up = (Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/dashboard/data" -TimeoutSec 5).StatusCode -eq 200 } catch { $up = $false }
        }
        if (-not $up) { throw "server did not come up on port $Port" }
        $nodeArgs = @("testing/performance-spss/statify/run-e2e.cjs", "--base=http://localhost:$Port", "--procs=$Procs", "--sizes=$n", "--runs=$Runs", "--affinity=$Affinity", "`"--out=$e2eDir`"", "`"--data=$dataPath`"") -join " "
        $p = Start-Process -FilePath "node" -ArgumentList $nodeArgs -WorkingDirectory $repo -WindowStyle Hidden `
            -RedirectStandardOutput "$e2eDir\stdout-n$n.txt" -RedirectStandardError "$e2eDir\stderr-n$n.txt" -PassThru
        $null = $p.Handle   # PowerShell 5.1: ExitCode stays empty unless the handle is opened before exit
        $p.WaitForExit()
        $result = "exit:$($p.ExitCode)"
        Write-Note $status "  Statify n=$n node exit=$($p.ExitCode)"
    }
    catch { Write-Note $status "  Statify n=$n ERROR: $($_.Exception.Message)" }
    finally { Stop-Server $server }
    Add-Block $n "statify-e2e" $start $result
}

try {
    $sizeList = $Sizes.Split(",") | ForEach-Object { [int]$_ }
    $first = $true
    for ($k = 0; $k -lt $sizeList.Count; $k++) {
        $n = $sizeList[$k]
        $spssFirst = (($k % 2) -eq 0) -eq ($FirstBlock -eq "spss")
        $seq = if ($spssFirst) { @("spss", "statify") } else { @("statify", "spss") }
        foreach ($b in $seq) {
            if (-not $first) { Write-Note $status "cool-down ${CooldownSec}s"; Start-Sleep -Seconds $CooldownSec }
            $first = $false
            if ($b -eq "spss") { Invoke-SpssBlock $n } else { Invoke-StatifyBlock $n }
        }
    }
    & python (Join-Path $root "spss\extract.py") $spssDir | Out-File -Encoding utf8 (Join-Path $spssDir "extract.txt")
    Write-Note $status "finished"
}
catch { Write-Note $status "ERROR: $($_.Exception.Message)" }
finally {
    Stop-Server $null
    Set-KeepAwake $false
    Write-Note $status "keep-awake off"
}
