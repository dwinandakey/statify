#!/usr/bin/env bash
# Coverage Rust crate MV dan RM dengan cargo-llvm-cov (di dalam container
# statify-whitebox-cov:1.95.0, lihat Dockerfile). Repositori di-mount ke /repo.
#
#   docker run --rm -v "<repo>:/repo" -v "<~/.cargo/registry>:/usr/local/cargo/registry" \
#     statify-whitebox-cov:1.95.0 bash /repo/testing/whitebox/docker/run-coverage.sh
#
# --ignore-run-fail: laporan tetap dibuat walaupun ada test yang gagal (test
# yang gagal tetap dijalankan dan dilaporkan di log, tidak dilewati).
# --disable-default-ignore-filename-regex: filter bawaan cargo-llvm-cov
# membuang berkas bernama *_tests.rs, padahal stats/multivariate_tests.rs,
# stats/univariate_tests.rs dan stats/glm_tests.rs adalah kode produksi.
# Yang dikecualikan hanya berkas test di src/test/ (juga yang disertakan lewat
# #[path = "../test/..."], tercatat sebagai src/stats/../test/...).
set -u
FILTER=(--disable-default-ignore-filename-regex --ignore-filename-regex '/src/test/|/../test/')
GLM=/repo/frontend/components/Modals/Analyze/general-linear-model
OUT=/repo/testing/whitebox/coverage
LOG=/repo/testing/whitebox/log
mkdir -p "$OUT" "$LOG"

{
  echo "tanggal: $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "image: statify-whitebox-cov:1.95.0 (FROM rust:1.95.0-bookworm)"
  rustc --version; cargo --version; cargo llvm-cov --version
  rustc +nightly --version 2>/dev/null || echo "nightly: tidak tersedia"
} > "$LOG/coverage-toolchain.txt"

for crate in multivariate:mv repeated-measures:rm; do
  dir=${crate%%:*}; key=${crate##*:}
  cd "$GLM/$dir/rust"
  export CARGO_TARGET_DIR=/tmp/target-$key

  # Stable: line dan region coverage.
  {
    echo "\$ cargo llvm-cov --lib --ignore-run-fail "${FILTER[@]}" --html --output-dir $OUT/rust-$key-stable -- --test-threads=1"
    cargo llvm-cov --lib --ignore-run-fail "${FILTER[@]}" --html --output-dir "$OUT/rust-$key-stable" -- --test-threads=1 2>&1
    echo "exit code: $?"
    echo
    echo "\$ cargo llvm-cov report --summary-only"
    cargo llvm-cov report "${FILTER[@]}" --summary-only 2>&1
    cargo llvm-cov report "${FILTER[@]}" --json --summary-only --output-path "$OUT/rust-$key-stable/summary.json" 2>&1
  } > "$LOG/cargo-llvm-cov-$key-stable.log"

  # Nightly: branch coverage (-Z coverage-options=branch).
  if rustc +nightly --version >/dev/null 2>&1; then
    export CARGO_TARGET_DIR=/tmp/target-$key-nightly
    {
      echo "\$ cargo +nightly llvm-cov --lib --branch --ignore-run-fail "${FILTER[@]}" --html --output-dir $OUT/rust-$key-nightly-branch -- --test-threads=1"
      cargo +nightly llvm-cov --lib --branch --ignore-run-fail "${FILTER[@]}" --html --output-dir "$OUT/rust-$key-nightly-branch" -- --test-threads=1 2>&1
      echo "exit code: $?"
      echo
      echo "\$ cargo +nightly llvm-cov report --branch --summary-only"
      cargo +nightly llvm-cov report --branch "${FILTER[@]}" --summary-only 2>&1
      cargo +nightly llvm-cov report --branch "${FILTER[@]}" --json --summary-only --output-path "$OUT/rust-$key-nightly-branch/summary.json" 2>&1
    } > "$LOG/cargo-llvm-cov-$key-nightly-branch.log"
  fi
done
echo selesai
