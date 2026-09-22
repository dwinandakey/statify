# Runs the whole experiment unattended: starts the production server
# (`next start`, the build must already exist), runs run-experiment.cjs, then
# stops the server. While it runs the machine is kept awake with
# SetThreadExecutionState (no admin rights needed; reset at the end).
#
# Start detached, e.g.:
#   Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "<this file>" -OutDir "<folder>"'
param(
    [Parameter(Mandatory = $true)][string]$OutDir,
    [string]$Modules = "repeated-measures,multivariate",
    [string]$Sizes = "100,500,1000,2000",
    [string]$Cpu = "1",
    [int]$Runs = 31,
    [int]$Port = 3101,
    # Extra runner arguments, e.g. for the clean-protocol experiment:
    # "--clean=true --loaf=true --rm-levels=10 --rm-measures=2 --rm-options=DescStats,EstEffectSize,ObsPower --sizes-repeated-measures=2500,5000,10000,20000"
    [string]$Extra = ""
)
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
New-Item -ItemType Directory -Force $OutDir | Out-Null
$status = Join-Path $OutDir "detached-status.txt"
function Note($msg) { "$(Get-Date -Format o) $msg" | Out-File -Append -Encoding utf8 $status }

Add-Type -Namespace Win32 -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
[Win32.Power]::SetThreadExecutionState([uint32]2147483649) | Out-Null   # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
Note "started (keep-awake on)"

$server = $null
try {
    $server = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx next start -p $Port > `"$OutDir\server.log`" 2>&1" `
        -WorkingDirectory (Join-Path $repo "frontend") -WindowStyle Hidden -PassThru
    $up = $false
    for ($i = 0; $i -lt 120 -and -not $up; $i++) {
        Start-Sleep -Seconds 2
        try { $up = (Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/dashboard/data" -TimeoutSec 5).StatusCode -eq 200 } catch { $up = $false }
    }
    if (-not $up) { throw "server did not come up on port $Port" }
    Note "server up (pid $($server.Id))"

    $nodeArgs = @(
        "testing/glm-web-worker/experiment/run-experiment.cjs",
        "--base=http://localhost:$Port", "--modules=$Modules", "--sizes=$Sizes", "--cpu=$Cpu", "--runs=$Runs",
        "`"--out=$OutDir`"", $Extra
    ) -join " "
    $exp = Start-Process -FilePath "node" -ArgumentList $nodeArgs -WorkingDirectory $repo -WindowStyle Hidden `
        -RedirectStandardOutput "$OutDir\stdout.txt" -RedirectStandardError "$OutDir\stderr.txt" -PassThru
    Note "experiment started (pid $($exp.Id)): node $nodeArgs"
    $exp.WaitForExit()
    Note "experiment exited with code $($exp.ExitCode)"
}
catch {
    Note "ERROR: $($_.Exception.Message)"
}
finally {
    Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    if ($server) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
    [Win32.Power]::SetThreadExecutionState([uint32]2147483648) | Out-Null   # ES_CONTINUOUS: back to normal
    Note "server stopped, keep-awake off"
}
