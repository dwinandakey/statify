@echo off
REM Build script untuk K-Medoids WASM module
REM
REM Usage:
REM   build.bat             — single-threaded build (default, no SharedArrayBuffer)
REM   build.bat threading   — multi-threaded build (wasm-bindgen-rayon, requires nightly)

echo Building K-Medoids WASM module...
echo.

cd %~dp0

echo [1/3] Running tests...
cargo test
if errorlevel 1 (
    echo Tests failed! Fix errors before building.
    pause
    exit /b 1
)

echo.

IF "%1"=="threading" (
    echo [2/3] Building WASM module WITH multi-threading (rayon^)...
    echo       Requires: rustup toolchain nightly + wasm32-unknown-unknown with atomics
    echo.
    set RUSTFLAGS=-C target-feature=+atomics,+bulk-memory,+mutable-globals
    wasm-pack build --target web --out-dir pkg --features threading -- -Z build-std=panic_abort,std
) ELSE (
    echo [2/3] Building WASM module (single-threaded^)...
    wasm-pack build --target web --out-dir pkg
)

if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Build successful!
echo Output: pkg/ directory
IF "%1"=="threading" (
    echo NOTE: Serve the app with Cross-Origin-Opener-Policy: same-origin
    echo       and Cross-Origin-Embedder-Policy: require-corp for SharedArrayBuffer.
    echo       next.config.js already adds these headers automatically.
)
echo.

pause
