# Main measurement, unattended, in this order (each step waits for the last):
#   1. phase 1 "utama":   mv1, mv2, rm; n = 100 .. 100 000; numeric factor codes (data\kode)
#   2. phase 1 "rm-teks": rm only; n = 100 .. 50 000; string factors (data), supplementary series
#   3. phase 2 "utama":   compute-only, with one untimed DevTools profile run for
#                         mv1-n10000 and mv2-n10000
#   4. phase 2 "rm-teks"
# with the cool-down between all steps. The phase-2 worktree must exist
# (statify\worktree.ps1 -Action setup). Progress: results\utama\driver.txt.
#
#   Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "testing\performance-spss\run-utama.ps1"'
param([int]$CooldownSec = 120, [string]$Affinity = "FFF")
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
. (Join-Path $root "common.ps1")
New-Item -ItemType Directory -Force (Join-Path $root "results\utama") | Out-Null
$log = Join-Path $root "results\utama\driver.txt"
Set-KeepAwake $true
$steps = @(
    @("run-phase1.ps1", "-Label utama -Sizes 100,1000,10000,100000 -DataDir data\kode"),
    @("run-phase1.ps1", "-Label rm-teks -Procs rm -Sizes 100,1000,10000,50000 -DataDir data"),
    @("run-phase2.ps1", "-Label utama -Sizes 100,1000,10000,100000 -ProfileCells mv1-n10000,mv2-n10000"),
    @("run-phase2.ps1", "-Label rm-teks -Procs rm -Sizes 100,1000,10000,50000")
)
try {
    $first = $true
    foreach ($s in $steps) {
        if (-not $first) { Write-Note $log "cool-down ${CooldownSec}s"; Start-Sleep -Seconds $CooldownSec }
        $first = $false
        $argLine = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $root $s[0])`" $($s[1]) -Affinity $Affinity -CooldownSec $CooldownSec"
        Write-Note $log "start: $($s[0]) $($s[1])"
        $p = Start-Process powershell -ArgumentList $argLine -WindowStyle Hidden -PassThru
        $null = $p.Handle
        $p.WaitForExit()
        Write-Note $log "done:  $($s[0]) $($s[1]) exit=$($p.ExitCode)"
    }
    Write-Note $log "all steps finished"
}
catch { Write-Note $log "ERROR: $($_.Exception.Message)" }
finally { Set-KeepAwake $false }
