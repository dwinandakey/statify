#!/bin/bash
# Menjalankan Jest (config evaluasi) di Linux memakai salinan node_modules lokal agar cepat.
# Hanya untuk validasi di sandbox (Windows memakai run_all.ps1). Satu proses jest pada satu waktu (flock).
# Pemakaian: run_jest_linux.sh <argumen jest ...>
#   contoh: run_jest_linux.sh --runInBand --json --outputFile=$HOME/scratch/out.json <path tes>
REPO="${REPO:-$HOME/mnt/statify64}"
export TA_EVAL_NM_FIRST="${TA_EVAL_NM_FIRST:-$HOME/work/node_modules}"
export JEST_CACHE_DIR="${JEST_CACHE_DIR:-$HOME/scratch/jest-cache}"
export NODE_PATH="$REPO/node_modules"
export NODE_OPTIONS="--require $REPO/testing/text_analytics_eval/tools/unrs-resolver-shim.js"
cd "$REPO/frontend" || exit 2
exec flock -w 100 "$HOME/scratch/jest.lock" node "$TA_EVAL_NM_FIRST/jest/bin/jest.js" --config ../testing/text_analytics_eval/jest.eval.config.js "$@"
