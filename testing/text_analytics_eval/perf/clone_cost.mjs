// clone_cost.mjs — Track E (tambahan kecil): biaya structuredClone (mekanisme postMessage di V8) untuk payload dan hasil, di Node.
// Menjawab: apakah selisih peramban - headless pada NB/AM berasal dari serialisasi pesan? (Bukan pengukuran peramban; hanya orde besaran.)
// Pemakaian: node testing/text_analytics_eval/perf/clone_cost.mjs [--datasets pilkada_900,smsa_11000]
import fs from "node:fs";
import { naiveBayesRun, applyModelRun, stwvTransform, logWasmInfo } from "../headless/statify_wasm.mjs";
import { payloadFile, argOf, hostInfoLine } from "./common.mjs";

const list = argOf(process.argv.slice(2), "--datasets", "pilkada_900,sms_5574,smsa_11000").split(",");
console.log("clone_cost.mjs", hostInfoLine());
logWasmInfo();
const time = (f) => { const a = performance.now(); const r = f(); return [r, performance.now() - a]; };
const med = (f, n = 5) => { const v = []; let r; for (let i = 0; i < n; i++) { const [x, t] = time(f); r = x; v.push(t); } v.sort((a, b) => a - b); return [r, v[Math.floor(n / 2)]]; };
for (const ds of list) {
  const P = JSON.parse(fs.readFileSync(payloadFile(ds, "nb"), "utf8"));
  const payload = { target: P.target, predictors: P.predictors, targetDefs: P.targetDefs, predictorsDefs: P.predictorsDefs, config: P.configs.nb_holdout70, text: P.text };
  const [, pc] = med(() => structuredClone(payload));
  const r = await naiveBayesRun(payload);
  const [, rc] = med(() => structuredClone(r.data));
  const A = JSON.parse(fs.readFileSync(payloadFile(ds, "am"), "utf8"));
  const ap = { predictors: A.predictors, predictorDefs: A.predictorDefs, mapping: A.mapping, actual: A.actual, actualDefs: A.actualDefs, model: A.model, text: A.text };
  const [, apc] = med(() => structuredClone(ap));
  const ar = await applyModelRun(ap);
  const [, arc] = med(() => structuredClone(ar.data));
  const S = JSON.parse(fs.readFileSync(payloadFile(ds, "stwv"), "utf8"));
  const [, sc] = med(() => structuredClone({ data: S.data, config: S.configs.stwv_default }));
  const o = await stwvTransform(S.data, S.configs.stwv_default);
  const [, oc] = med(() => structuredClone({ status: "success", payload: o }));
  console.log(`${ds}: median 5x structuredClone (ms)  NB payload=${pc.toFixed(1)} NB hasil=${rc.toFixed(1)} | AM payload=${apc.toFixed(1)} AM hasil=${arc.toFixed(1)} | STWV payload=${sc.toFixed(1)} STWV hasil=${oc.toFixed(1)}`);
}
