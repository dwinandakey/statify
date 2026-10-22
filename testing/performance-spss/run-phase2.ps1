# Phase 2, unattended: Statify compute-only (harness) per size, with a
# cool-down between sizes. The server runs from the phase-2 worktree build
# (statify/worktree.ps1 -Action setup); the payloads are the ones recorded by
# phase 1 (statify/<E2ELabel>-e2e/payload). Same affinity as phase 1.
#
# Start detached, e.g.:
#   Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "testing\performance-spss\run-phase2.ps1" -Label utama'
param(
    [Parameter(Mandatory = $true)][string]$Label,
    [string]$E2ELabel = "",
    [string]$Worktree = "",
    [string]$Sizes = "100,1000,10000,100000",
    [string]$Procs = "mv1,mv2,rm",
    [int]$Runs = 11,
    [string]$Affinity = "FFF",
    [int]$CooldownSec = 120,
    [int]$Port = 3101,
    # Cells profiled with one extra, untimed run (run-compute.cjs --profile).
    [string]$ProfileCells = ""
)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$repo = (Resolve-Path (Join-Path $root "..\..")).Path
if (-not $E2ELabel) { $E2ELabel = $Label }
if (-not $Worktree) { $Worktree = Join-Path (Split-Path $repo -Parent) "statify64-perf" }
. (Join-Path $root "common.ps1")

$resDir = Join-Path $root "results\$Label"
$outDir = Join-Path $root "statify\$Label-compute"
$payload = Join-Path $root "statify\$E2ELabel-e2e\payload"
New-Item -ItemType Directory -Force $resDir, $outDir | Out-Null
$status = Join-Path $resDir "status.txt"
$blocks = Join-Path $resDir "blocks.csv"
if (-not (Test-Path $blocks)) { "label,order,n,software,start,end,seconds,result" | Out-File -Encoding utf8 $blocks }

Set-OwnAffinity $Affinity
Write-Note $status "phase 2 '$Label': worktree=$Worktree sizes=$Sizes procs=$Procs runs=$Runs affinity=0x$Affinity"
Set-KeepAwake $true
if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) { throw "port $Port is in use" }

$server = $null
try {
    $server = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx next start -p $Port >> `"$outDir\server.log`" 2>&1" `
        -WorkingDirectory (Join-Path $Worktree "frontend") -WindowStyle Hidden -PassThru
    $up = $false
    for ($i = 0; $i -lt 120 -and -not $up; $i++) {
        Start-Sleep -Seconds 2
        try { $up = (Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/glm-perf-harness" -TimeoutSec 5).StatusCode -eq 200 } catch { $up = $false }
    }
    if (-not $up) { throw "harness server did not come up on port $Port" }
    $first = $true
    foreach ($n in ($Sizes.Split(",") | ForEach-Object { [int]$_ })) {
        if (-not $first) { Write-Note $status "cool-down ${CooldownSec}s"; Start-Sleep -Seconds $CooldownSec }
        $first = $false
        $start = Get-Date
        Write-Note $status "Statify compute block n=$n start"
        $nodeArgs = @("testing/performance-spss/statify/run-compute.cjs", "--base=http://localhost:$Port", "--procs=$Procs", "--sizes=$n", "--runs=$Runs", "--affinity=$Affinity", "`"--payload=$payload`"", "`"--out=$outDir`"", "--profile=$ProfileCells") -join " "
        $p = Start-Process -FilePath "node" -ArgumentList $nodeArgs -WorkingDirectory $repo -WindowStyle Hidden `
            -RedirectStandardOutput "$outDir\stdout-n$n.txt" -RedirectStandardError "$outDir\stderr-n$n.txt" -PassThru
        $null = $p.Handle   # PowerShell 5.1: ExitCode stays empty unless the handle is opened before exit
        $p.WaitForExit()
        $end = Get-Date
        "$Label,phase2,$n,statify-compute,$($start.ToString('o')),$($end.ToString('o')),$([math]::Round(($end - $start).TotalSeconds,1)),exit:$($p.ExitCode)" | Out-File -Append -Encoding utf8 $blocks
        Write-Note $status "  compute n=$n node exit=$($p.ExitCode)"
    }
    Write-Note $status "finished"
}
catch { Write-Note $status "ERROR: $($_.Exception.Message)" }
finally {
    Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    if ($server) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
    Set-KeepAwake $false
    Write-Note $status "server stopped, keep-awake off"
}
