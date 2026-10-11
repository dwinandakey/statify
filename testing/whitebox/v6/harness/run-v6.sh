#!/usr/bin/env bash
# Regresi build produksi v6 dengan skrip yang sama seperti v5
# (testing/final/harness/regress-final.sh), ditambah pembandingan langsung
# terhadap regresi v5 final (testing/final/iterasi4/regresi).
# Server produksi v6 (frontend/.next) harus berjalan di $PORT.
# Pemakaian (akar repositori): PORT=3101 bash testing/whitebox/v6/harness/run-v6.sh
# Build gabungan ilham (OUT harus path absolut, karena regress-final.sh
# menulis log sesudah `cd frontend`):
#   OUT=$PWD/testing/whitebox/v6-final/regresi EXPDIR=/d/claude-tmp-statify/exp-capture-v6-final \
#   V6DIR=testing/whitebox/v6/regresi V6EXP=/d/claude-tmp-statify/exp-capture-v6 bash ... (tambahan langkah 9: vs v6)
set -u
PORT=${PORT:-3101}
ROOT=$(pwd)
O=${OUT:-$ROOT/testing/whitebox/v6/regresi}
V5F=$ROOT/testing/final/iterasi4/regresi
X=${EXPDIR:-/d/claude-tmp-statify/exp-capture-v6}
mkdir -p "$O"

echo "== regress-final.sh (OUTDIR=$O, EXPDIR=$X)"
PORT=$PORT OUTDIR="$O" EXPDIR="$X" bash testing/final/harness/regress-final.sh

echo "== 8. v6 vs v5 final ($V5F)"
node testing/glm-mv-reference/harness/regress.mjs --before="$V5F/compare-spss.json" --after="$O/compare-spss.json" --main="$O/main" --worker="$O/worker" --out="$O/regress-vs-v5final.txt" | tail -2
node testing/final/harness/raw-vs-v5.mjs "$V5F/worker" "$O/worker" "$O/raw-vs-v5final.txt" | tail -1
node testing/fitur-v4/harness/exp-compare.mjs v5final=/d/claude-tmp-statify/exp-capture-final/all v6=$X/all --out="$O/experiment-v5final-vs-v6.txt" | tail -1
node -e '
const fs=require("fs");const [A,B]=process.argv.slice(1);const lines=[];let bad=0;
for (const f of ["rm-ui-main-worker.json","rm-ui-main-worker-exp5000.json"]) { const a=JSON.parse(fs.readFileSync(A+"/"+f,"utf8")).designs, b=JSON.parse(fs.readFileSync(B+"/"+f,"utf8")).designs;
 for (const d of Object.keys(b)) { const h5=a[d]?.runs?.[0]?.hash, h6=b[d].runs[0].hash; const ok=b[d].identical && h5===h6; if(!ok) bad++; lines.push(`${d} v6 identik main/worker: ${b[d].identical} | hash tabel v5final ${h5} v6 ${h6} sama ${h5===h6}`); } }
lines.push("desain: "+lines.length+", beda: "+bad); fs.writeFileSync(B+"/rm-hash-v5final-v6.txt", lines.join("\n")+"\n"); console.log(lines.join("\n"));
' "$V5F/rm" "$O/rm"
if [ -n "${V6DIR:-}" ]; then
V6D=$ROOT/$V6DIR
echo "== 9. build ini vs v6 ($V6D)"
node testing/glm-mv-reference/harness/regress.mjs --before="$V6D/compare-spss.json" --after="$O/compare-spss.json" --main="$O/main" --worker="$O/worker" --out="$O/regress-vs-v6.txt" | tail -2
node testing/final/harness/raw-vs-v5.mjs "$V6D/worker" "$O/worker" "$O/raw-vs-v6.txt" | tail -1
node testing/fitur-v4/harness/exp-compare.mjs v6=$V6EXP/all final=$X/all --out="$O/experiment-v6-vs-final.txt" | tail -1
node -e '
const fs=require("fs");const [A,B]=process.argv.slice(1);const lines=[];let bad=0;
for (const f of ["rm-ui-main-worker.json","rm-ui-main-worker-exp5000.json"]) { const a=JSON.parse(fs.readFileSync(A+"/"+f,"utf8")).designs, b=JSON.parse(fs.readFileSync(B+"/"+f,"utf8")).designs;
 for (const d of Object.keys(b)) { const h6=a[d]?.runs?.[0]?.hash, hf=b[d].runs[0].hash; const ok=b[d].identical && h6===hf; if(!ok) bad++; lines.push(`${d} identik main/worker: ${b[d].identical} | hash tabel v6 ${h6} build ini ${hf} sama ${h6===hf}`); } }
lines.push("desain: "+lines.length+", beda: "+bad); fs.writeFileSync(B+"/rm-hash-v6-vs-final.txt", lines.join("\n")+"\n"); console.log(lines.join("\n"));
' "$V6D/rm" "$O/rm"
fi
echo "== selesai v6"
