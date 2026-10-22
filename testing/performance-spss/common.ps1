# Shared helpers, dot-sourced by the run-*.ps1 scripts.

# Every process in the tree under $RootPid (including it), with its processor
# affinity mask (hex). Child processes on Windows inherit the affinity of the
# process that creates them; this is how the inheritance is verified.
function Get-TreeAffinity([int]$RootPid) {
    $all = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CreationDate, CommandLine
    $byParent = @{}
    foreach ($p in $all) {
        if (-not $byParent.ContainsKey([int]$p.ParentProcessId)) { $byParent[[int]$p.ParentProcessId] = @() }
        $byParent[[int]$p.ParentProcessId] += $p
    }
    $root = $all | Where-Object { $_.ProcessId -eq $RootPid }
    $queue = New-Object System.Collections.Queue
    if ($root) { $queue.Enqueue($root) }
    $out = @()
    while ($queue.Count -gt 0) {
        $p = $queue.Dequeue()
        # A PID can be reused by a younger process: only follow children created after their parent.
        $mask = $null
        try { $mask = "0x{0:X}" -f [int64](Get-Process -Id $p.ProcessId -ErrorAction Stop).ProcessorAffinity } catch { $mask = "n/a" }
        $type = if ($p.CommandLine -match '--type=([\w-]+)') { $Matches[1] } elseif ($p.CommandLine -match '--utility-sub-type=([\w.-]+)') { $Matches[1] } else { "" }
        $out += [pscustomobject]@{ pid = [int]$p.ProcessId; ppid = [int]$p.ParentProcessId; name = $p.Name; type = $type; affinity = $mask }
        if ($byParent.ContainsKey([int]$p.ProcessId)) {
            foreach ($c in $byParent[[int]$p.ProcessId]) { if ($c.CreationDate -ge $p.CreationDate) { $queue.Enqueue($c) } }
        }
    }
    return $out
}

# Sets the affinity of every process under $RootPid (Chromium resets the
# affinity of some of its child processes, pilot 2026-10-16), then returns
# the tree as Get-TreeAffinity sees it afterwards.
function Set-TreeAffinity([int]$RootPid, [string]$Hex) {
    $mask = [IntPtr][Convert]::ToInt64($Hex, 16)
    foreach ($t in (Get-TreeAffinity $RootPid)) {
        try { (Get-Process -Id $t.pid -ErrorAction Stop).ProcessorAffinity = $mask } catch {}
    }
    return Get-TreeAffinity $RootPid
}

function Set-OwnAffinity([string]$Hex) {
    if (-not $Hex) { return }
    $me = [System.Diagnostics.Process]::GetCurrentProcess()
    $me.ProcessorAffinity = [IntPtr][Convert]::ToInt64($Hex, 16)
}

if (-not ("PerfSpss.Power" -as [type])) {
    Add-Type -Namespace PerfSpss -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
}
function Set-KeepAwake([bool]$On) {
    if ($On) { [PerfSpss.Power]::SetThreadExecutionState([uint32]2147483649) | Out-Null }   # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
    else { [PerfSpss.Power]::SetThreadExecutionState([uint32]2147483648) | Out-Null }       # ES_CONTINUOUS
}

function Write-Note([string]$File, [string]$Msg) {
    $line = "$(Get-Date -Format o) $Msg"
    $line | Out-File -Append -Encoding utf8 $File
    Write-Host $line
}

# Runs one SPSS production job (stats.exe <job> -production silent) and
# samples the affinity of its whole process tree $Samples times, 2 s apart,
# during SPSS start-up (about 20 s before the first GLM), then only waits, so
# the sampling never overlaps a timed GLM run.
# Returns start/end time, exit code and the distinct (name, affinity) pairs seen.
function Invoke-SpssJob([string]$Spj, [string]$AffinityLog, [int]$Samples = 5) {
    $stats = "C:\Program Files\IBM\SPSS\Statistics\27\stats.exe"
    $start = Get-Date
    $p = Start-Process $stats -ArgumentList "`"$Spj`"", "-production", "silent" -PassThru
    $null = $p.Handle   # PowerShell 5.1: keeps ExitCode available after exit
    $seen = @{}
    for ($i = 0; $i -lt $Samples -and -not $p.HasExited; $i++) {
        foreach ($t in (Get-TreeAffinity $p.Id)) {
            $key = "$($t.name)|$($t.affinity)"
            if (-not $seen.ContainsKey($key)) {
                $seen[$key] = $true
                "$(Get-Date -Format o)`t$(Split-Path $Spj -Leaf)`t$($t.pid)`t$($t.ppid)`t$($t.name)`t$($t.affinity)" | Out-File -Append -Encoding utf8 $AffinityLog
            }
        }
        Start-Sleep -Milliseconds 2000
    }
    $p.WaitForExit()
    return [pscustomobject]@{ start = $start; end = (Get-Date); exit = $p.ExitCode; processes = ($seen.Keys -join ";") }
}
