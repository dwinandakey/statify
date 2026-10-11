# Image coverage Rust untuk white-box testing GLM MV/RM.
# rustc/cargo 1.95.0 = versi toolchain lokal (stable-x86_64-pc-windows-gnu)
# yang tidak menyertakan profiler_builtins, sehingga coverage diukur di Linux.
FROM rust:1.95.0-bookworm
RUN rustup component add llvm-tools-preview \
 && cargo install cargo-llvm-cov --locked \
 && rustup toolchain install nightly --profile minimal --component llvm-tools-preview
WORKDIR /repo
