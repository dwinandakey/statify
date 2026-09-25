#!/usr/bin/env bash
# Regresi pada build final (Bagian 3) tanpa build ulang: server produksi dari
# frontend/.next sudah berjalan di $PORT. Keluaran: testing/final/bagian3/.
#   1. UI MV: 23 konfigurasi lama + 5 konfigurasi Σ diketahui, worker dan main;
#   2. SPSS MV (worker) + regresi terhadap v5 (step21-v5) + main = worker;
#   3. nilai mentah (payload dan respons worker) 23 konfigurasi = v5;
#   4. uji acuan MV (fixture dari run final) dan RM;
#   5. Jest penuh terhadap baseline 49 suite;
#   6. 8 sel eksperimen: payload dan respons vs v1–v5;
#   7. RM main = worker (9 desain) dan hash tabel vs v5.
# Pemakaian (root repo): PORT=3101 bash testing/final/harness/regress-final.sh
set -u
PORT=${PORT:-3101}
ROOT=$(pwd)
O=$ROOT/testing/final/bagian3
V5=$ROOT/testing/glm-mv-reference/results/fix-steps/step21-v5
X=/d/claude-tmp-statify/exp-capture-final
R=testing/glm-web-worker/results
OLD=mv1,mv2,mv3,mv4,mv4ph,mv5,mv6,mv7,mv8,mv2d,mv2s,mv2wd,mv2ws,mv3d,mv3s,mv1ci,mv1ci10,mv2ci,mv2wci,mv2dci,mv3ci,mv3dci,mv9
NEW=mvK1,mvK1n,mvK2,mvK3,mvK4
mkdir -p "$O/rm" /d/claude-tmp-statify/tmp
export TEMP='D:\claude-tmp-statify\tmp' TMP='D:\claude-tmp-statify\tmp'
BASE=http://localhost:$PORT

echo "== 0. build"
cat frontend/.next/BUILD_ID > "$O/build-id.txt"; echo >> "$O/build-id.txt"
(cd frontend/.next/static/media && md5sum wasm_bg.*.wasm) >> "$O/build-id.txt"
git rev-parse HEAD >> "$O/build-id.txt"
cat "$O/build-id.txt"

echo "== 1. UI MV"
for M in worker main; do
  node testing/glm-mv-reference/harness/ui-run.cjs --base=$BASE --configs=$OLD --mode=$M --out="$O/$M" > "$O/ui-$M.log" 2>&1; echo "$M lama exit $?"
  node testing/glm-mv-reference/harness/ui-run.cjs --base=$BASE --configs=$NEW --mode=$M --out="$O/$M-known" > "$O/ui-$M-known.log" 2>&1; echo "$M Σ exit $?"
done

echo "== 2. SPSS + regresi + main/worker"
node testing/glm-mv-reference/harness/compare-spss.mjs --run="$O/worker" --out="$O" | sed -n 1,2p
node testing/glm-mv-reference/harness/regress.mjs --before="$V5/compare-spss.json" --after="$O/compare-spss.json" --main="$O/main" --worker="$O/worker" --out="$O/regress.txt" | tail -2
node -e '
const fs=require("fs");const [a,b,out]=process.argv.slice(1);const lines=[];let bad=0;
for (const f of fs.readdirSync(a).filter(f=>/^mvK.*\.json$/.test(f)&&!f.endsWith(".raw.json"))) {
  const x=JSON.parse(fs.readFileSync(a+"/"+f,"utf8")), y=JSON.parse(fs.readFileSync(b+"/"+f,"utf8"));
  const s=t=>JSON.stringify(t.map(z=>({title:z.title,out:z.output_data})));
  const same=s(x.tables)===s(y.tables)&&x.modeActual==="main"&&y.modeActual==="worker"; if(!same) bad++;
  lines.push(f.replace(".json","")+": main = worker "+same);
}
lines.push("konfigurasi Σ: "+lines.length+", beda: "+bad); fs.writeFileSync(out, lines.join("\n")+"\n"); console.log(lines.join("\n"));
' "$O/main-known" "$O/worker-known" "$O/main-worker-known.txt"

echo "== 3. nilai mentah vs v5"
node testing/final/harness/raw-vs-v5.mjs "$V5/worker" "$O/worker" "$O/raw-vs-v5.txt" | tail -1
node -e '
const fs=require("fs");const ref=Object.fromEntries(JSON.parse(fs.readFileSync("testing/final/bagian1/known-sigma-statify.json","utf8")).map(c=>[c.id,c.statify]));
const map={mvK1:"K1",mvK1n:"K1",mvK2:"K2-d",mvK3:"K3-d",mvK4:"K4"};const lines=[];
for (const [k,id] of Object.entries(map)) { const raw=JSON.parse(fs.readFileSync(process.argv[1]+"/"+k+".raw.json","utf8")); lines.push(k+": known_covariance_test = harness "+id+" (divalidasi R) "+(JSON.stringify(raw.response.results.known_covariance_test)===JSON.stringify(ref[id]))); }
fs.writeFileSync(process.argv[2], lines.join("\n")+"\n"); console.log(lines.join("\n"));
' "$O/worker-known" "$O/known-vs-r.txt"

echo "== 4. uji acuan"
node testing/glm-mv-reference/harness/make-fixture.mjs --run="$O/worker"
git diff --stat -- frontend/components/Modals/Analyze/general-linear-model/multivariate/__test__/fixtures > "$O/fixture-diff.txt"; echo "fixture diff: $(wc -l < "$O/fixture-diff.txt") baris"
(cd frontend && npx jest components/Modals/Analyze/general-linear-model/multivariate/__test__/multivariate-reference.test.ts > "$O/jest-reference.log" 2>&1)
grep -E "^Tests:" "$O/jest-reference.log"
(cd frontend && npx jest components/Modals/Analyze/general-linear-model/repeated-measures/__test__/repeated-measures-reference.test.ts > "$O/rm/rm-reference.log" 2>&1)
grep -E "^Tests:" "$O/rm/rm-reference.log"

echo "== 5. Jest penuh"
(cd frontend && npx jest --json --outputFile="$O/jest-full.json" > "$O/jest-full.log" 2>&1)
node -e '
const j=require(process.argv[1]); const base=new Set(require("fs").readFileSync(process.argv[2],"utf8").split(/\r?\n/).filter(Boolean));
const rel=(p)=>p.replace(/\\/g,"/").replace(/^.*?\/frontend\//,"");
const failed=j.testResults.filter(t=>t.status==="failed").map(t=>rel(t.name)).sort();
const extra=failed.filter(f=>!base.has(f)); const gone=[...base].filter(f=>!failed.includes(f));
const out=[`Jest penuh: ${j.numFailedTestSuites} suite gagal dari ${j.numTotalTestSuites}; baseline ${base.size}`, `tes: ${j.numPassedTests} lulus, ${j.numFailedTests} gagal, ${j.numTodoTests} todo`, `gagal di luar baseline: ${extra.length}`, ...extra.map(x=>"  + "+x), `baseline yang kini lulus: ${gone.length}`, ...gone.map(x=>"  - "+x)].join("\n");
require("fs").writeFileSync(process.argv[3], failed.join("\n")+"\n"); console.log(out); require("fs").writeFileSync(process.argv[4], out+"\n");
' "$O/jest-full.json" "$ROOT/testing/glm-web-worker/results/2026-09-22-implementation/jest-baseline-failed.txt" "$O/jest-failed-suites.txt" "$O/jest-summary.txt"
rm -f "$O/jest-full.json"
git checkout -- frontend/next-env.d.ts 2>/dev/null
PERF=$(git ls-files -m frontend | grep performance-results); [ -n "$PERF" ] && git checkout -- $PERF

echo "== 6. sel eksperimen"
rm -rf $X; mkdir -p $X
node testing/fitur-v5/harness/capture-exp-payloads.cjs --base=$BASE --out=$X/mv --only=multivariate-100,multivariate-500,multivariate-1000,multivariate-2000 > $X/mv.log 2>&1; echo "mv exit $?"
node testing/fitur-v5/harness/capture-exp-payloads.cjs --base=$BASE --out=$X/rm --only=repeated-measures-5000,repeated-measures-10000,repeated-measures-20000,repeated-measures-40000 --rm-levels=10 --rm-measures=1 --rm-options=DescStats,EstEffectSize,ObsPower > $X/rm.log 2>&1; echo "rm exit $?"
mkdir -p $X/all; cp $X/mv/multivariate-*.json $X/rm/repeated-measures-*.json $X/all/
node testing/fitur-v4/harness/exp-compare.mjs v1=/d/claude-tmp-statify/exp-capture v2=/d/claude-tmp-statify/exp-capture-v2 v3=/d/claude-tmp-statify/exp-capture-v3 v4=/d/claude-tmp-statify/exp-capture-v4-final19/all v5=/d/claude-tmp-statify/exp-capture-v5/all final=$X/all --out="$O/experiment-output-check.txt" | tail -1
node testing/fitur-v4/harness/exp-compare.mjs v5=/d/claude-tmp-statify/exp-capture-v5/all final=$X/all --out="$O/experiment-v5-vs-final.txt" | tail -1

echo "== 7. RM main/worker"
node testing/glm-rm-reference/harness/ui-main-worker.cjs --base=$BASE --designs=gambar51,a,b,c,cEm,cPoly,cRep,exp5000n --expDir=$R/experiment-2026-09-23-cpu1-rm-noise-pcore/data --out="$O/rm/rm-ui-main-worker.json" > "$O/rm/rm-ui-main-worker.log" 2>&1; echo "exit $?"
node testing/glm-rm-reference/harness/ui-main-worker.cjs --base=$BASE --designs=exp5000 --expDir=$R/experiment-2026-09-22-cpu1-clean/data --out="$O/rm/rm-ui-main-worker-exp5000.json" > "$O/rm/rm-ui-main-worker-exp5000.log" 2>&1; echo "exit $?"
node -e '
const fs=require("fs");const V="testing/glm-mv-reference/results/fix-steps/step20-v5/rm/";const F=process.argv[1];const lines=[];let bad=0;
for (const f of ["rm-ui-main-worker.json","rm-ui-main-worker-exp5000.json"]) { const a=JSON.parse(fs.readFileSync(V+f,"utf8")).designs, b=JSON.parse(fs.readFileSync(F+"/"+f,"utf8")).designs;
 for (const d of Object.keys(b)) { const hv5=a[d]?.runs?.[0]?.hash, hf=b[d].runs[0].hash; const ok=b[d].identical && hv5===hf; if(!ok) bad++; lines.push(`${d} final identik main/worker: ${b[d].identical} | hash tabel v5 ${hv5} final ${hf} sama ${hv5===hf}`); } }
lines.push("desain: "+lines.length+", beda: "+bad); fs.writeFileSync(F+"/rm-hash-v5-final.txt", lines.join("\n")+"\n"); console.log(lines.join("\n"));
' "$O/rm"
echo "== selesai"
