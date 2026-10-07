# -*- coding: utf-8 -*-
"""Tahap 1 Track B: tulis DOT/PNG/CSV edge list, berkas tes Jest, dan analysis.json (untuk wb_doc.py)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from wb_synth import *

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
EVAL = os.path.join(REPO, "testing", "thesis-eval")
WB = os.path.join(EVAL, "whitebox")
FE = os.path.join(REPO, "frontend", "components", "Modals")

TESTFILES = {
    "WB-1": ("validateColumnPrefix", os.path.join(FE, "Transform/StringToWordVector/__tests__/thesis/whitebox.validateColumnPrefix.test.ts")),
    "WB-2": ("getNumericInputError", os.path.join(FE, "Analyze/Classify/naive-bayes/hooks/__tests__/thesis/whitebox.getNumericInputError.test.ts")),
    "WB-3": ("useNaiveBayesValidation", os.path.join(FE, "Analyze/Classify/naive-bayes/hooks/__tests__/thesis/whitebox.useNaiveBayesValidation.test.ts")),
    "WB-4": ("loadModelFromFile", os.path.join(FE, "Analyze/Classify/apply-model/services/__tests__/thesis/whitebox.loadModelFromFile.test.ts")),
}

HDR = {
"WB-1": '''// Tes thesis Track B (white-box, basis path) WB-1: validateColumnPrefix.
// Satu tes per jalur independen; ID jalur ada pada nama tes. Deterministik (tanpa acak, tanpa jam).
// Jalur dan simpul: testing/thesis-eval/B_whitebox.md, testing/thesis-eval/whitebox/WB-1_validateColumnPrefix.dot
import { MAX_COLUMN_PREFIX_LENGTH, validateColumnPrefix } from "@/components/Modals/Transform/StringToWordVector/utils/columnPrefix";
''',
"WB-2": '''// Tes thesis Track B (white-box, basis path) WB-2: getNumericInputError.
// Satu tes per jalur independen; ID jalur ada pada nama tes. Deterministik (tanpa acak, tanpa jam).
// Nilai bertipe salah (string, di luar union) dimasukkan lewat type assertion karena predikat `typeof` hanya
// dapat bernilai benar untuk data yang melanggar tipe (mis. dari input UI atau IndexedDB lama).
import { getNumericInputError } from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation";
import { NaiveBayesDefault } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import type { NaiveBayesType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";

// Salinan dalam default agar tiap tes mandiri.
const base = (): NaiveBayesType => JSON.parse(JSON.stringify(NaiveBayesDefault));
''',
"WB-3": '''// Tes thesis Track B (white-box, basis path) WB-3: blok validasi useMemo pada useNaiveBayesValidation.
// Blok dijalankan lewat renderHook (hook asli, tanpa mock). Satu tes per jalur independen yang layak.
// Jalur 13 (infeasible) tidak punya tes: lihat B_whitebox.md untuk bukti ketaklayakannya.
import { renderHook } from "@testing-library/react";
import { useNaiveBayesValidation } from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation";
import { NaiveBayesDefault } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import type { NaiveBayesType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";
import type { Variable } from "@/types/Variable";

const v = (name: string, measure: Variable["measure"] = "nominal"): Variable => ({
    columnIndex: 0, name, width: 8, decimals: 0, values: [], missing: null, columns: 8, align: "left", measure, role: "input",
});
const base = (): NaiveBayesType => JSON.parse(JSON.stringify(NaiveBayesDefault));
''',
"WB-4": '''// Tes thesis Track B (white-box, basis path) WB-4: loadModelFromFile (+ finalizeLoad).
// File dimock sebagai objek { name, size, text() } seperti pada services/__tests__/model-loader.test.ts.
// validateAnyModel/adapter NB dipakai ASLI (tidak dimock); hanya result store yang dimock agar modul dapat diimpor.
import type { ModelLoadResult } from "@/components/Modals/Analyze/Classify/apply-model/services/model-loader";

jest.mock("@/stores/useResultStore", () => ({
    useResultStore: { getState: jest.fn(() => ({ logs: [], loadResults: jest.fn() })) },
}));

import {
    MAX_MODEL_FILE_BYTES,
    loadModelFromFile,
} from "@/components/Modals/Analyze/Classify/apply-model/services/model-loader";

// Fixture dimuat via require (tsconfig composite tidak mengizinkan import JSON via alias).
const nbModelV11 = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v1_1.json") as Record<string, unknown>;

function makeFile(name: string, content: string, size?: number): File {
    return { name, size: size ?? content.length, text: async () => content } as unknown as File;
}

function expectFailure(result: ModelLoadResult, code: string, detail?: string): void {
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected load to fail, but it succeeded");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe(code);
    expect(result.errors[0].severity).toBe("error");
    if (detail === undefined) expect(result.errors[0]).not.toHaveProperty("detail");
    else expect(result.errors[0].detail).toBe(detail);
}
''',
}


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8", newline="\n").write(text)


def ts_test(key, a):
    asy = key == "WB-4"
    out = [HDR[key]]
    for r in a["rows"]:
        out.append(f"it({J(r['title'])}, {'async ' if asy else ''}() => {{")
        for ln in r["code"]:
            out.append("    " + ln)
        out.append("});\n")
    return "\n".join(out)


def main():
    meta = {}
    for key, fn in ANALYZERS.items():
        a = fn(); g = a["g"]; m = g.metrics(); num = g.num()
        name = TESTFILES[key][0]
        base = f"{key}_{name}"
        write(os.path.join(WB, base + ".dot"), g.dot())
        render_png(os.path.join(WB, base + ".dot"), os.path.join(WB, base + ".png"))
        lines = ["no,dari,ke,label"]
        for i, (x, y, l) in enumerate(g.edges, 1):
            lines.append(f"{i},{num[x]},{num[y]},{l}")
        write(os.path.join(WB, f"edges_{base}.csv"), "\n".join(lines) + "\n")
        write(TESTFILES[key][1], ts_test(key, a))
        meta[key] = dict(name=name, metrics=m, rank=a["rank"], nrows=len(a["rows"]),
                         total_paths=a.get("total_paths"), infeasible_paths=a.get("infeasible_paths"),
                         n_infeasible_flips=len(a["infeasible"]))
        print(key, m, "rank", a["rank"], "rows", len(a["rows"]))
    json.dump(meta, open(os.path.join(WB, "meta.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
