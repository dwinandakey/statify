# Git worktrees for the compute-only harness, so the main working tree is
# never touched by the temporary harness route or by an experimental build.
#
#   -Action setup     git worktree add --detach <Path> HEAD; node_modules of
#                     the repo root and frontend/ linked as directory
#                     junctions (no second npm install); frontend/.env.local
#                     copied (ignored by git, used by the build); harness
#                     copied to frontend/app/glm-perf-harness/; next build.
#                     Default path ../statify64-perf (phase 2).
#   -Optimized        phase 3 (../statify64-opt by default): before next build,
#                     the Cargo.toml of GLM Multivariate and Repeated Measures
#                     IN THE WORKTREE get [profile.release] opt-level = 3 and
#                     wasm-opt = ["-O3", "-g"] (-g only keeps the name section,
#                     so the DevTools profile still shows function names), and
#                     both rust/pkg are rebuilt with `wasm-pack build --target
#                     web` (the documented build command). Production files in
#                     the main working tree are not changed.
#   -Action teardown  junctions removed first (link only, the target stays),
#                     then git worktree remove --force and prune.
param(
    [Parameter(Mandatory = $true)][ValidateSet("setup", "teardown")][string]$Action,
    [string]$Path = "",
    [switch]$Optimized
)
$ErrorActionPreference = "Stop"
# Windows PowerShell 5.1 turns any stderr line of a native command (git prints
# progress there) into a terminating error under "Stop": run them under "Continue"
# and check $LASTEXITCODE instead.
function Invoke-Native([scriptblock]$Cmd) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try { & $Cmd 2>&1 | ForEach-Object { "$_" } } finally { $ErrorActionPreference = $prev }
}
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
if (-not $Path) { $Path = Join-Path (Split-Path $repo -Parent) $(if ($Optimized) { "statify64-opt" } else { "statify64-perf" }) }
$junctions = @("node_modules", "frontend\node_modules")
$glm = "frontend\components\Modals\Analyze\general-linear-model"

if ($Action -eq "setup") {
    if (Test-Path $Path) { throw "$Path already exists" }
    Invoke-Native { git -C $repo worktree add --detach $Path HEAD }
    if ($LASTEXITCODE -ne 0) { throw "git worktree add failed" }
    foreach ($j in $junctions) { New-Item -ItemType Junction -Path (Join-Path $Path $j) -Target (Join-Path $repo $j) | Out-Null }
    Copy-Item (Join-Path $repo "frontend\.env.local") (Join-Path $Path "frontend\.env.local")
    if ($Optimized) {
        # rustup's cargo/rustc are in ~/.cargo/bin, which is not on PATH in
        # every shell; wasm-pack looks them up there ("cannot find binary path").
        $env:PATH = "$(Join-Path $env:USERPROFILE '.cargo\bin');$env:PATH"
        $wasmPack = Join-Path $env:USERPROFILE ".cargo\bin\wasm-pack.exe"
        foreach ($m in "multivariate", "repeated-measures") {
            $crate = Join-Path $Path "$glm\$m\rust"
            $toml = Join-Path $crate "Cargo.toml"
            $text = Get-Content $toml -Raw
            $new = $text -replace '(\[profile\.release\]\s*\r?\n)opt-level = 0', '$1opt-level = 3' `
                         -replace 'wasm-opt = false', 'wasm-opt = ["-O3", "-g"]'
            if ($new -eq $text -or $new -notmatch 'opt-level = 3' -or $new -notmatch 'wasm-opt = \["-O3", "-g"\]') { throw "could not patch $toml" }
            [IO.File]::WriteAllText($toml, $new)
            Push-Location $crate
            try {
                Invoke-Native { & $wasmPack build --target web -- --locked }   # same dependency versions as the committed Cargo.lock
                if ($LASTEXITCODE -ne 0) { throw "wasm-pack build failed for $m" }
            }
            finally { Pop-Location }
            Write-Host "$m rebuilt: $((Get-Item (Join-Path $crate 'pkg\wasm_bg.wasm')).Length) bytes"
        }
    }
    $dest = Join-Path $Path "frontend\app\glm-perf-harness"
    New-Item -ItemType Directory -Force $dest | Out-Null
    Copy-Item (Join-Path $PSScriptRoot "harness\*") $dest
    Push-Location (Join-Path $Path "frontend")
    try {
        Invoke-Native { npx next build }
        if ($LASTEXITCODE -ne 0) { throw "next build failed in worktree" }
    }
    finally { Pop-Location }
    Write-Host "worktree ready: $Path (HEAD $(git -C $Path rev-parse --short HEAD), BUILD_ID $(Get-Content (Join-Path $Path 'frontend\.next\BUILD_ID')))"
}
else {
    foreach ($j in $junctions) {
        $p = Join-Path $Path $j
        $item = Get-Item $p -Force -ErrorAction SilentlyContinue
        if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { [IO.Directory]::Delete($p, $false) }
        elseif ($item) { throw "$p is not a junction; refusing to continue" }
    }
    Invoke-Native { git -C $repo -c core.longpaths=true worktree remove --force $Path }   # rust/target paths exceed MAX_PATH
    if ($LASTEXITCODE -ne 0) { throw "git worktree remove failed" }
    Invoke-Native { git -C $repo worktree prune }
    Invoke-Native { git -C $repo worktree list }
}
