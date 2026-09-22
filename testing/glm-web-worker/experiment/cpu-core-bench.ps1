# Single-thread speed per logical CPU, to tell the P-cores from the E-cores of
# a hybrid CPU (e.g. i7-12700H). For every logical CPU a node process is
# started with its affinity set to that CPU only and runs the same fixed
# integer/float loop (affinity is set right after start, before the loop
# dominates); the fastest of -Repeat runs per CPU is printed.
#   powershell -File cpu-core-bench.ps1 [-Repeat 2] [-OutFile <file.json>]
param([int]$Repeat = 2, [string]$OutFile = "")
$ErrorActionPreference = "Stop"
$code = 'let s=0;const t0=process.hrtime.bigint();for(let i=0;i<120000000;i++){s=(s+i*1.000001)%1e9;}const t1=process.hrtime.bigint();console.log(Number(t1-t0)/1e6);'
$n = [Environment]::ProcessorCount
$rows = @()
for ($cpu = 0; $cpu -lt $n; $cpu++) {
    $times = @()
    for ($r = 0; $r -lt $Repeat; $r++) {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "node"
        $psi.Arguments = "-e `"$code`""
        $psi.RedirectStandardOutput = $true
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $p = [System.Diagnostics.Process]::Start($psi)
        try { $p.ProcessorAffinity = [IntPtr]([Int64]1 -shl $cpu) } catch { }
        $out = $p.StandardOutput.ReadToEnd()
        $p.WaitForExit()
        $times += [double]::Parse($out.Trim(), [Globalization.CultureInfo]::InvariantCulture)
    }
    $rows += [pscustomobject]@{ cpu = $cpu; ms = [math]::Round(($times | Measure-Object -Minimum).Minimum, 1) }
}
$rows | Format-Table -AutoSize | Out-String
if ($OutFile) { $rows | ConvertTo-Json | Out-File -Encoding utf8 $OutFile }
