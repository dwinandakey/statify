#!/bin/bash
# Menjalankan satu "chunk" (N berkas tes) dari daftar $HOME/scratch/all_tests.txt di VM; hasil: logs/jest_final_<i>_vm.json|txt
# Pemakaian: vm_chunk.sh <indeks-chunk-mulai-0> [ukuran=6]
i="${1:-0}"; n="${2:-6}"
REPO="${REPO:-$HOME/mnt/statify64}"
start=$((i*n+1)); end=$((i*n+n))
files=$(sed -n "${start},${end}p" "$HOME/scratch/all_tests.txt" | tr '\n' ' ')
[ -z "$files" ] && { echo "chunk kosong"; exit 0; }
cd "$REPO" && timeout 165 testing/thesis-eval/tools/run_jest_linux.sh --runInBand --json --outputFile="../testing/thesis-eval/logs/jest_final_${i}_vm.json" $files > "testing/thesis-eval/logs/jest_final_${i}_vm.txt" 2>&1
code=$?
grep -E "^(PASS|FAIL)|^Tests:|^Test Suites:" "testing/thesis-eval/logs/jest_final_${i}_vm.txt"
echo "chunk=$i exit=$code files=$(echo $files | wc -w)"
