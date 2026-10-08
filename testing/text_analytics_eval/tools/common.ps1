# Fungsi bantu bersama untuk skrip evaluasi (PowerShell 5.1+ / 7).
# Semua log ditulis sebagai UTF-8 (BUKAN UTF-16 seperti Tee-Object di PowerShell 5.1).
$ErrorActionPreference = 'Continue'
$script:EvalRoot = Split-Path -Parent $PSScriptRoot              # ...\testing\text_analytics_eval
$script:RepoRoot = (Resolve-Path (Join-Path $EvalRoot '..\..')).Path
$script:LogDir   = Join-Path $EvalRoot 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Invoke-Logged {
    param(
        [Parameter(Mandatory)][string]$Name,        # nama berkas log tanpa ekstensi, mis. rust_core_unit
        [Parameter(Mandatory)][string]$Command,     # perintah shell (cmd) lengkap
        [string]$WorkDir = $RepoRoot,
        [int]$Timeout = 0
    )
    $log = Join-Path $LogDir ($Name + '.txt')
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'
    Write-Host "[$stamp] >> $Name : $Command  (cwd=$WorkDir)"
    Push-Location $WorkDir
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        # cmd /c memastikan redirect byte mentah (UTF-8) tanpa dekorasi PowerShell.
        cmd /c "$Command > `"$log`" 2>&1"
        $code = $LASTEXITCODE
        $sw.Stop()
    } finally { Pop-Location }
    $footer = "`r`n=== TEXT_ANALYTICS_EVAL: exit_code=$code elapsed_s=$([math]::Round($sw.Elapsed.TotalSeconds,2)) started=$stamp cmd=$Command cwd=$WorkDir ==="
    [System.IO.File]::AppendAllText($log, $footer, [System.Text.UTF8Encoding]::new($false))
    Write-Host "   exit=$code elapsed=$([math]::Round($sw.Elapsed.TotalSeconds,1))s log=$log"
    return $code
}
