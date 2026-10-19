# -*- coding: utf-8 -*-
"""Analisis (graf -> basis) + sintesis masukan konkret & kode tes Jest untuk WB-1..WB-4."""
import json
from wb_core import *
from wb_graphs import *

J = lambda s: json.dumps(s, ensure_ascii=False)


def pstr(g, p):
    num = g.num()
    return "-".join(num[n] for n in p)


def reorder(g, basis, prov):
    """baseline tetap jalur 1; sisanya diurutkan menurut urutan nomor simpul (urutan baca kode)."""
    num = g.num()
    toi = lambda n: 0 if num[n] == "S" else 10 ** 6 if num[n] == "X" else int(num[n])
    key = lambda p: (toi(p[-2]), len(p), tuple(toi(n) for n in p))
    idx = [0] + sorted(range(1, len(basis)), key=lambda i: key(basis[i]))
    newpos = {old: new for new, old in enumerate(idx)}
    nb = [basis[i] for i in idx]
    npv = [None if prov[i] is None else (newpos[prov[i][0]],) + tuple(prov[i][1:]) for i in idx]
    return nb, npv


def edge_pairs(g, p):
    return list(zip(p, p[1:]))


# ============================================================ WB-1
def analyze_wb1():
    g = build_wb1(); feas = g.enum_paths()
    base = [p for p in feas if p[-2] == "r6"][0]
    basis, inf, extra, rk, prov = baseline_basis(g, feas, base)
    basis, prov = reorder(g, basis, prov)
    rows = []
    for k, p in enumerate(basis, 1):
        last = p[-2]
        inp = {"r1": '', "r2": None, "r3": None, "r4": None, "r5": None, "r6": None}
        o = dict(g.outcomes(p))
        if o.get("p1") == "T": v, d = "", "prefix kosong"
        elif o.get("p2") == "T": v, d = " VEC_", "spasi di awal (prefix != trim)"
        elif o.get("p3") == "T": v, d = "a b", "spasi di tengah (tanpa spasi di tepi)"
        elif o.get("p4") == "T": v, d = "A" * 33, "33 karakter (> 32)"
        elif o.get("p5") == "T": v, d = "1VEC_", "diawali angka"
        elif o.get("p6") == "T": v, d = "VEC-", "memuat tanda hubung"
        else: v, d = "VEC_", "awalan bawaan yang sah"
        msg = g.nodes[last]["msg"]
        shown = J(v) if len(v) < 20 else f'"A" x 33'
        code = (f'expect(validateColumnPrefix({J(v) if len(v) < 20 else chr(34)+"A"+chr(34)+".repeat(MAX_COLUMN_PREFIX_LENGTH + 1)"})).'
                f'{"toBeNull()" if msg is None else "toBe(" + J(msg) + ")"};')
        rows.append(dict(k=k, path=p, nodes=pstr(g, p), input=f"prefix = {shown} ({d})",
                         expected="null" if msg is None else J(msg),
                         title=f"WB-1 jalur {k}: {d} -> {'null' if msg is None else 'pesan galat'}",
                         code=[code], prov=prov[k - 1]))
    return dict(g=g, feas=feas, basis=basis, rows=rows, infeasible=inf, rank=rk, prov=prov, baseline=base)


# ============================================================ WB-2
MUT2 = {
    ("a1", "T"): ("SA", 'SmoothingAlpha = "1" (string)', 'f.options.SmoothingAlpha = "1" as unknown as number;'),
    ("a2", "T"): ("SA", "SmoothingAlpha = NaN", "f.options.SmoothingAlpha = NaN;"),
    ("a3", "T"): ("SA", "SmoothingAlpha = 0", "f.options.SmoothingAlpha = 0;"),
    ("a4", "T"): ("SA", "SmoothingAlpha = 1000", "f.options.SmoothingAlpha = 1000;"),
    ("t0", "T"): ("RAW", 'RawTextVar = "Text Tweet" (fitur teks aktif)', 'f.main.RawTextVar = "Text Tweet";'),
    ("t1", "T"): ("TA", 'TextAlpha = "1" (string)', 'f.options.TextAlpha = "1" as unknown as number;'),
    ("t2", "T"): ("TA", "TextAlpha = Infinity", "f.options.TextAlpha = Infinity;"),
    ("t3", "T"): ("TA", "TextAlpha = 0", "f.options.TextAlpha = 0;"),
    ("t4", "T"): ("TA", "TextAlpha = 1000", "f.options.TextAlpha = 1000;"),
    ("k0", "F"): ("TFT", "TextFeatureTable = false", "f.output.TextFeatureTable = false;"),
    ("k1", "T"): ("TK", 'TextTopK = "100" (string)', 'f.output.TextTopK = "100" as unknown as number;'),
    ("k2", "T"): ("TK", "TextTopK = 10.5", "f.output.TextTopK = 10.5;"),
    ("k3", "T"): ("TK", "TextTopK = 0", "f.output.TextTopK = 0;"),
    ("k4", "T"): ("TK", "TextTopK = 1001", "f.output.TextTopK = 1001;"),
    ("h1", "T"): ("TP", 'TrainingPercentage = "70" (string)', 'f.validation.TrainingPercentage = "70" as unknown as number;'),
    ("h2", "T"): ("TP", "TrainingPercentage = 70.5", "f.validation.TrainingPercentage = 70.5;"),
    ("h3", "T"): ("TP", "TrainingPercentage = 0", "f.validation.TrainingPercentage = 0;"),
    ("h4", "T"): ("TP", "TrainingPercentage = 100", "f.validation.TrainingPercentage = 100;"),
    ("f1", "T"): ("KF", 'KFolds = "10" (string)', 'f.validation.KFolds = "10" as unknown as number;'),
    ("f2", "T"): ("KF", "KFolds = 2.5", "f.validation.KFolds = 2.5;"),
    ("f3", "T"): ("KF", "KFolds = 0", "f.validation.KFolds = 0;"),
    ("s0", "T"): ("SEED", "RandomSeed = 42", "f.validation.RandomSeed = 42;"),
    ("s1", "T"): ("SEED", 'RandomSeed = "42" (string)', 'f.validation.RandomSeed = "42" as unknown as number;'),
    ("s2", "T"): ("SEED", "RandomSeed = 4.2", "f.validation.RandomSeed = 4.2;"),
    ("s3", "T"): ("SEED", "RandomSeed = -1", "f.validation.RandomSeed = -1;"),
    ("s4", "T"): ("SEED", "RandomSeed = 4294967296", "f.validation.RandomSeed = 4294967296;"),
}


def analyze_wb2():
    g = build_wb2(); allp = g.enum_paths()
    both = lambda p: ("sh" in p) and ("sf" in p)          # holdout DAN kfold sekaligus: mustahil
    feas = [p for p in allp if not both(p)]

    def method(p):
        o = dict(g.outcomes(p))
        if "h0" not in o or o.get("h0") == "T": return "holdout"
        return "kfold" if o.get("f0") == "T" else "none"
    ok_paths = [p for p in feas if p[-2] == "ok" and method(p) == "holdout" and "t0" in p and "sk" not in p and "s1" not in p]
    base = min(ok_paths, key=lambda p: (len(p), p))
    weakf = lambda p: method(p) == "none" and "h0" in p
    basis, inf, extra, rk, prov = baseline_basis(g, feas, base, weak=weakf)
    basis, prov = reorder(g, basis, prov)
    rows = []
    for k, p in enumerate(basis, 1):
        oc = g.outcomes(p)
        muts, order = {}, []
        for pid, lab in oc:
            if (pid, lab) in MUT2:
                fld, d, c = MUT2[(pid, lab)]
                if fld not in muts: order.append(fld)
                muts[fld] = (d, c)
        m = method(p)
        if m == "kfold":
            muts["METHOD"] = ('ValidationMethod = "kfold"', 'f.validation.ValidationMethod = "kfold";'); order.insert(0, "METHOD")
        elif m == "none":
            muts["METHOD"] = ('ValidationMethod = "none" (di luar union tipe; hanya lewat type assertion)',
                              'f.validation.ValidationMethod = "none" as unknown as "holdout";'); order.insert(0, "METHOD")
        descs = [muts[f][0] for f in order]
        codes = [muts[f][1] for f in order]
        msg = g.nodes[p[-2]]["msg"]
        d = "; ".join(descs) if descs else "nilai bawaan formulir (tanpa fitur teks, holdout 70%, seed tidak diatur)"
        exp = f'"{msg}"' if msg else "null"
        body = ["const f = base();"] + codes
        body.append(f"expect(getNumericInputError(f)).{'toBeNull()' if msg is None else 'toBe(' + J(msg) + ')'};")
        weak = (m == "none")
        rows.append(dict(k=k, path=p, nodes=pstr(g, p), input=d, expected=("null" if msg is None else J(msg)),
                         title=f"WB-2 jalur {k}: {d}", code=body, prov=prov[k - 1], weak=weak))
    return dict(g=g, feas=feas, basis=basis, rows=rows, infeasible=inf, rank=rk, prov=prov, baseline=base,
                total_paths=len(allp), infeasible_paths=len(allp) - len(feas))


# ============================================================ WB-3
def state_inputs(st):
    """keadaan abstrak -> (deskripsi, baris kode penyiapan, ekspresi variables)"""
    d, code = [], ["const f = base();"]
    vars_ = []
    if st["T"]:
        code.append("f.main.TargetVar = 'Sentiment';"); vars_.append("Sentiment"); d.append("TargetVar = Sentiment")
    else:
        d.append("TargetVar kosong (null)")
    if st["smnull"]:
        code.append("delete (f.main as Partial<typeof f.main>).SpecificationMode;"); d.append("SpecificationMode tidak ada (undefined)")
    elif not st["modeExcl"]:
        code.append("f.main.SpecificationMode = 'candidates';"); d.append("SpecificationMode = candidates")
    else:
        d.append("SpecificationMode = exclude (bawaan)")
    cand = (not st["smnull"]) and (not st["modeExcl"])
    if not st["np0"]:
        vars_.append("Pasangan Calon")
        if cand:
            code.append("f.main.CandidateFactors = ['Pasangan Calon'];")
        d.append("ada prediktor efektif (Pasangan Calon)")
    else:
        d.append("tanpa prediktor efektif")
    if st["src"] == "raw":
        code.append("f.main.RawTextVar = 'Text Tweet';"); vars_.append("Text Tweet"); d.append("Raw Text = Text Tweet")
    elif st["src"] == "vector":
        code.append("f.main.TextVectorVars = ['VEC_baik', 'VEC_buruk'];"); vars_ += ["VEC_baik", "VEC_buruk"]; d.append("Word-Vector = VEC_baik, VEC_buruk")
    else:
        d.append("tanpa fitur teks")
    if st["compl"]:
        code.append("f.options.TextLikelihood = 'complement';"); d.append("TextLikelihood = complement")
    if st["nmsg"] and st["src"] == "raw":
        code.append("f.text.wordsToKeep = -1;"); d.append("wordsToKeep = -1")
    def vx(n):
        return f"v({J(n)}, 'scale')" if n.startswith("VEC_") else f"v({J(n)})"
    vexpr = "[" + ", ".join(vx(n) for n in vars_) + "]"
    return d, code, vexpr


def analyze_wb3():
    g = build_wb3(); rep = wb3_feasible(g); feas = list(rep)
    allp = g.enum_paths()
    ok_paths = [p for p in feas if not any(x in p for x in ("m1", "m7", "m10", "m12"))]
    base = min(ok_paths, key=lambda p: (len(p), p))
    inf = baseline_basis(g, feas, base)[1]
    dev = lambda st: (1 - st["T"]) + st["smnull"] + (1 - st["modeExcl"]) + st["np0"] + (st["src"] != "none") + st["compl"] + st["nmsg"]
    basis, vecs = [base], [g.vec(base)]
    for q in sorted(feas, key=lambda q: (dev(rep[q]), len(q), q)):
        if rank(vecs + [g.vec(q)]) > len(vecs):
            basis.append(q); vecs.append(g.vec(q))
    rk, prov = rank(vecs), [None] * len(basis)
    basis, prov = reorder(g, basis, prov)
    rows = []
    for k, p in enumerate(basis, 1):
        st = rep[p]
        d, code, vexpr = state_inputs(st)
        msgs = [g.nodes[n]["push"] for n in p if "push" in g.nodes[n]]
        valid = len(msgs) == 0
        code = code + [f"const {{ result }} = renderHook(() => useNaiveBayesValidation(f, {vexpr}));",
                       "expect(result.current.validation).toEqual({ isValid: %s, errors: [%s] });" % (
                           "true" if valid else "false", ", ".join(J(m) for m in msgs))]
        exp = ("isValid = true; errors = []" if valid else "isValid = false; errors = [" + "; ".join(J(m) for m in msgs) + "]")
        rows.append(dict(k=k, path=p, nodes=pstr(g, p), input=", ".join(d), expected=exp, title=f"WB-3 jalur {k}: " + ", ".join(d),
                         code=code, prov=prov[k - 1], state=st))
    return dict(g=g, feas=feas, basis=basis, rows=rows, infeasible=inf, rank=rk, prov=prov, baseline=base,
                total_paths=len(allp), infeasible_paths=len(allp) - len(feas), rep=rep)


# ============================================================ WB-4
def analyze_wb4():
    g = build_wb4(); feas = g.enum_paths()
    base = [p for p in feas if p[-2] == "r5"][0]
    basis, inf, extra, rk, prov = baseline_basis(g, feas, base)
    basis, prov = reorder(g, basis, prov)
    rows = []
    for k, p in enumerate(basis, 1):
        o = dict(g.outcomes(p))
        if o.get("q1") == "T":
            d = 'file.name = "model.txt" (bukan .json)'
            code = ['const result = await loadModelFromFile(makeFile("model.txt", JSON.stringify(nbModelV11)));',
                    'expectFailure(result, "AM_E_PARSE", "model.txt");']
            exp = 'ok = false; errors = [{code: "AM_E_PARSE", severity: "error", detail: "model.txt"}]'
        elif o.get("q2") == "T":
            d = 'file.name = "big.json", file.size = MAX_MODEL_FILE_BYTES + 1'
            code = ['const result = await loadModelFromFile(makeFile("big.json", "{}", MAX_MODEL_FILE_BYTES + 1));',
                    'expectFailure(result, "AM_E_FILE_TOO_LARGE", "big.json");']
            exp = 'ok = false; errors = [{code: "AM_E_FILE_TOO_LARGE", severity: "error", detail: "big.json"}]'
        elif o.get("q3") == "T":
            d = 'file.text() ditolak (reject) pada "unreadable.json"'
            code = ['const file = { name: "unreadable.json", size: 10, text: async () => { throw new Error("read error"); } } as unknown as File;',
                    'expectFailure(await loadModelFromFile(file), "AM_E_PARSE", "unreadable.json");']
            exp = 'ok = false; errors = [{code: "AM_E_PARSE", severity: "error", detail: "unreadable.json"}]'
        elif o.get("q4") == "T":
            d = 'isi file "{bad" (JSON.parse melempar SyntaxError)'
            code = ['const result = await loadModelFromFile(makeFile("bad.json", "{bad"));',
                    'expectFailure(result, "AM_E_PARSE", "bad.json");']
            exp = 'ok = false; errors = [{code: "AM_E_PARSE", severity: "error", detail: "bad.json"}]'
        elif o.get("q5") == "T":
            d = 'isi file "[]" (JSON sah, bukan objek; validateAnyModel gagal)'
            code = ['const result = await loadModelFromFile(makeFile("arr.json", "[]"));',
                    'expectFailure(result, "AM_E_NOT_OBJECT");']
            exp = 'ok = false; errors = [{code: "AM_E_NOT_OBJECT", severity: "error"}] (tanpa detail)'
        else:
            d = 'file "model.json" berisi fixture model NB sah (nb-model-v1_1.json), ukuran wajar'
            code = ['const result = await loadModelFromFile(makeFile("model.json", JSON.stringify(nbModelV11)));',
                    "expect(result.ok).toBe(true);",
                    'if (!result.ok) throw new Error("expected success");',
                    'expect(result.sourceRef).toBe("model.json");',
                    'expect(result.sourceLabel).toBe("File: model.json");',
                    'expect(result.descriptor.modelType).toBe("naive_bayes");',
                    'expect((result.model as Record<string, unknown>).model_type).toBe("naive_bayes");']
            exp = 'ok = true; sourceRef = "model.json"; sourceLabel = "File: model.json"; descriptor.modelType = "naive_bayes"'
        rows.append(dict(k=k, path=p, nodes=pstr(g, p), input=d, expected=exp, title=f"WB-4 jalur {k}: {d}", code=code, prov=prov[k - 1]))
    return dict(g=g, feas=feas, basis=basis, rows=rows, infeasible=inf, rank=rk, prov=prov, baseline=base)


ANALYZERS = {"WB-1": analyze_wb1, "WB-2": analyze_wb2, "WB-3": analyze_wb3, "WB-4": analyze_wb4}
