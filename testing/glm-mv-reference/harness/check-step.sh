#!/usr/bin/env bash
# Checks after every fix step (validation/mv-spss):
#   1. build the MV WASM (rust/pkg); the JS glue and .d.ts must stay unchanged
#      apart from line endings (no public API change);
#   2. production build, UI runs of all configurations in main and worker mode;
#   3. SPSS comparison (worker run) and regression check against --before;
#      main and worker output byte-identical;
#   4. multivariate-reference.test.ts;
#   5. full Jest, failed suites against the 49-suite baseline.
#
# Usage (repo root): bash testing/glm-mv-reference/harness/check-step.sh <label> <before compare-spss.json> [configs]
set -u
LABEL=$1
BEFORE=$2
CONFIGS=${3:-mv1,mv2,mv3,mv4,mv5}
ROOT=$(pwd)
OUT=$ROOT/testing/glm-mv-reference/results/fix-steps/$LABEL
MV=$ROOT/frontend/components/Modals/Analyze/general-linear-model/multivariate
mkdir -p "$OUT" /d/claude-tmp-statify/tmp
export PATH="$HOME/.cargo/bin:$PATH" TEMP='D:\claude-tmp-statify\tmp' TMP='D:\claude-tmp-statify\tmp' NEXT_TELEMETRY_DISABLED=1

echo "== 1. WASM"
(cd "$MV/rust" && wasm-pack build --target web --out-dir pkg --out-name wasm > "$OUT/wasm-build.log" 2>&1) || { echo "WASM BUILD FAILED"; tail -30 "$OUT/wasm-build.log"; exit 1; }
if git diff --ignore-cr-at-eol --quiet -- "$MV/rust/pkg/wasm.js" "$MV/rust/pkg/wasm.d.ts" "$MV/rust/pkg/wasm_bg.wasm.d.ts" "$MV/rust/pkg/package.json"; then
  git checkout -- "$MV/rust/pkg/wasm.js" "$MV/rust/pkg/wasm.d.ts" "$MV/rust/pkg/wasm_bg.wasm.d.ts" "$MV/rust/pkg/package.json" "$MV/rust/pkg/.gitignore" 2>/dev/null
  echo "glue/.d.ts unchanged (API publik WASM sama)" | tee "$OUT/api-check.txt"
else
  echo "GLUE/.d.ts CHANGED" | tee "$OUT/api-check.txt"; git diff --ignore-cr-at-eol --stat -- "$MV/rust/pkg" | tee -a "$OUT/api-check.txt"; exit 1
fi
md5sum "$MV/rust/pkg/wasm_bg.wasm" | tee -a "$OUT/api-check.txt"

echo "== 2. next build + UI runs"
(cd frontend && npx next build > "$OUT/next-build.log" 2>&1) || { echo "NEXT BUILD FAILED"; tail -30 "$OUT/next-build.log"; exit 1; }
git checkout -- frontend/next-env.d.ts 2>/dev/null
(cd frontend && npx next start -p 3101 > /d/claude-tmp-statify/server.log 2>&1 &)
for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:3101/ && break; sleep 2; done
node testing/glm-mv-reference/harness/ui-run.cjs --base=http://localhost:3101 --configs=$CONFIGS --mode=worker --out="$OUT/worker" > "$OUT/ui-worker.log" 2>&1; echo "worker exit $?"; cat "$OUT/ui-worker.log"
node testing/glm-mv-reference/harness/ui-run.cjs --base=http://localhost:3101 --configs=$CONFIGS --mode=main --out="$OUT/main" > "$OUT/ui-main.log" 2>&1; echo "main exit $?"; cat "$OUT/ui-main.log"
PID=$(netstat -ano | grep LISTENING | grep ":3101 " | awk '{print $5}' | head -1); [ -n "$PID" ] && taskkill //PID "$PID" //F > /dev/null

echo "== 3. SPSS comparison + regression + main/worker"
node testing/glm-mv-reference/harness/compare-spss.mjs --run="$OUT/worker" --out="$OUT" | sed -n 1,2p
node testing/glm-mv-reference/harness/regress.mjs --before="$BEFORE" --after="$OUT/compare-spss.json" --main="$OUT/main" --worker="$OUT/worker" --out="$OUT/regress.txt"

echo "== 4. reference test"
node testing/glm-mv-reference/harness/make-fixture.mjs --run="$OUT/worker"
(cd frontend && npx jest components/Modals/Analyze/general-linear-model/multivariate/__test__/multivariate-reference.test.ts > "$OUT/jest-reference.log" 2>&1)
grep -E "^Tests:" "$OUT/jest-reference.log"

echo "== 5. full Jest"
(cd frontend && npx jest --json --outputFile="$OUT/jest-full.json" > "$OUT/jest-full.log" 2>&1)
node -e '
const j=require(process.argv[1]); const base=new Set(require("fs").readFileSync(process.argv[2],"utf8").split(/\r?\n/).filter(Boolean));
const rel=(p)=>p.replace(/\\/g,"/").replace(/^.*?\/frontend\//,"");
const failed=j.testResults.filter(t=>t.status==="failed").map(t=>rel(t.name)).sort();
const extra=failed.filter(f=>!base.has(f)); const gone=[...base].filter(f=>!failed.includes(f));
const out=[`Jest penuh: ${j.numFailedTestSuites} suite gagal dari ${j.numTotalTestSuites}; baseline ${base.size}`, `gagal di luar baseline: ${extra.length}`, ...extra.map(x=>"  + "+x), `baseline yang kini lulus: ${gone.length}`, ...gone.map(x=>"  - "+x)].join("\n");
require("fs").writeFileSync(process.argv[3], failed.join("\n")+"\n"); console.log(out); require("fs").writeFileSync(process.argv[4], out+"\n");
' "$OUT/jest-full.json" "$ROOT/testing/glm-web-worker/results/2026-09-22-implementation/jest-baseline-failed.txt" "$OUT/jest-failed-suites.txt" "$OUT/jest-summary.txt"
rm -f "$OUT/jest-full.json"
git checkout -- frontend/next-env.d.ts 2>/dev/null
PERF=$(git ls-files -m frontend | grep performance-results); [ -n "$PERF" ] && git checkout -- $PERF
echo "== done $LABEL"
