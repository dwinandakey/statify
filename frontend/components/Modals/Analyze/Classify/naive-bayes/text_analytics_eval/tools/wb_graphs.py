# -*- coding: utf-8 -*-
"""Definisi graf alir WB-1..WB-4 (dibaca langsung dari kode sumber; nomor baris merujuk berkas sumber)."""
from wb_core import Graph


def seq(g, *ids):
    for a, b in zip(ids, ids[1:]):
        g.edge(a, b)


# ------------------------------------------------------------------ WB-1
def build_wb1():
    g = Graph("WB-1", "WB-1 validateColumnPrefix")
    g.node("S", "start", "Mulai")
    g.node("p1", "pred", "trim().length = 0?", 'prefix.trim().length === 0', 13)
    g.node("r1", "ret", "return 'empty'", 'return "Vector column name cannot be empty."', 14,
           msg="Vector column name cannot be empty.")
    g.node("p2", "pred", "prefix != trim()?", 'prefix !== prefix.trim()  (operan kiri ||)', 16)
    g.node("p3", "pred", "/\\\\s/.test?", '/\\s/.test(prefix)  (operan kanan ||)', 16)
    g.node("r2", "ret", "return 'spaces'", 'return "Vector column name cannot contain spaces."', 17,
           msg="Vector column name cannot contain spaces.")
    g.node("p4", "pred", "length > 32?", 'prefix.length > MAX_COLUMN_PREFIX_LENGTH', 19)
    g.node("r3", "ret", "return 'at most 32'", 'return `Vector column name must be at most ${MAX_COLUMN_PREFIX_LENGTH} characters long.`', 20,
           msg="Vector column name must be at most 32 characters long.")
    g.node("p5", "pred", "bukan ^[A-Za-z@#$]?", '!/^[A-Za-z@#$]/.test(prefix)', 22)
    g.node("r4", "ret", "return 'must start'", 'return "Vector column name must start with a letter, @, # or $."', 23,
           msg="Vector column name must start with a letter, @, # or $.")
    g.node("p6", "pred", "bukan ^[A-Za-z0-9._@#$]+$?", '!/^[A-Za-z0-9._@#$]+$/.test(prefix)', 25)
    g.node("r5", "ret", "return 'can only contain'", 'return "Vector column name can only contain letters, digits, periods, underscores, @, # and $."', 26,
           msg="Vector column name can only contain letters, digits, periods, underscores, @, # and $.")
    g.node("r6", "ret", "return null", 'return null', 28, msg=None, ok=True)
    g.node("X", "end", "Selesai")
    g.edge("S", "p1")
    g.edge("p1", "r1", "T"); g.edge("p1", "p2", "F")
    g.edge("p2", "r2", "T"); g.edge("p2", "p3", "F")
    g.edge("p3", "r2", "T"); g.edge("p3", "p4", "F")
    g.edge("p4", "r3", "T"); g.edge("p4", "p5", "F")
    g.edge("p5", "r4", "T"); g.edge("p5", "p6", "F")
    g.edge("p6", "r5", "T"); g.edge("p6", "r6", "F")
    for r in ("r1", "r2", "r3", "r4", "r5", "r6"):
        g.edge(r, "X")
    return g


# ------------------------------------------------------------------ WB-2
def build_wb2():
    g = Graph("WB-2", "WB-2 getNumericInputError")
    g.node("S", "start", "Mulai")
    g.node("a0", "stmt", "init: options, validation, hasTextFeatures",
           'const { options, validation } = formData; const hasTextFeatures = getEffectiveTextSource(formData.main) !== "none"  (pemanggilan fungsi tidak diperluas)', "187-188")
    R = {}

    def pred(i, label, stmt, line):
        g.node(i, "pred", label, stmt, line)

    def ret(i, msg, line):
        g.node(i, "ret", "return error", 'return ' + (repr_ts(msg)), line, msg=msg)

    def repr_ts(m):
        return '`' + m + '`' if '${' in m else '"' + m + '"'

    # Smoothing Alpha
    pred("a1", "typeof SA != number?", 'typeof options.SmoothingAlpha !== "number"  (operan kiri ||)', 193)
    pred("a2", "!isFinite(SA)?", '!Number.isFinite(options.SmoothingAlpha)  (operan kanan ||)', 194)
    g.node("ra1", "ret", "return 'valid number (SA)'", 'return "Enter a valid number for Smoothing Alpha."', 196, msg="Enter a valid number for Smoothing Alpha.")
    pred("a3", "SA <= 0?", 'options.SmoothingAlpha <= 0', 198)
    g.node("ra2", "ret", "return 'SA > 0'", 'return "Smoothing Alpha must be greater than 0."', 199, msg="Smoothing Alpha must be greater than 0.")
    pred("a4", "SA > 999?", 'options.SmoothingAlpha > 999', 201)
    g.node("ra3", "ret", "return 'SA <= 999'", 'return "Smoothing Alpha must not exceed 999."', 202, msg="Smoothing Alpha must not exceed 999.")
    # Text features
    pred("t0", "hasTextFeatures?", 'hasTextFeatures', 208)
    pred("t1", "typeof TA != number?", 'typeof options.TextAlpha !== "number"  (operan kiri ||)', 210)
    pred("t2", "!isFinite(TA)?", '!Number.isFinite(options.TextAlpha)  (operan kanan ||)', 211)
    g.node("rt1", "ret", "return 'valid number (TA)'", 'return "Enter a valid number for Text smoothing alpha."', 213, msg="Enter a valid number for Text smoothing alpha.")
    pred("t3", "TA <= 0?", 'options.TextAlpha <= 0', 215)
    g.node("rt2", "ret", "return 'TA > 0'", 'return "Text smoothing alpha must be greater than 0."', 216, msg="Text smoothing alpha must be greater than 0.")
    pred("t4", "TA > MAX_TEXT_ALPHA?", 'options.TextAlpha > MAX_TEXT_ALPHA', 218)
    g.node("rt3", "ret", "return 'TA <= 999'", 'return `Text smoothing alpha must not exceed ${MAX_TEXT_ALPHA}.`', 219, msg="Text smoothing alpha must not exceed 999.")
    pred("k0", "TextFeatureTable?", 'formData.output.TextFeatureTable', 221)
    g.node("sk", "stmt", "k = TextTopK", 'const k = formData.output.TextTopK', 222)
    pred("k1", "typeof k != number?", 'typeof k !== "number"  (operan 1 ||)', 224)
    pred("k2", "!isInteger(k)?", '!Number.isInteger(k)  (operan 2 ||)', 225)
    pred("k3", "k < 1?", 'k < MIN_TEXT_TOP_K  (operan 3 ||)', 226)
    pred("k4", "k > 1000?", 'k > MAX_TEXT_TOP_K  (operan 4 ||)', 227)
    g.node("rk", "ret", "return 'Top-k'", 'return `Top-k terms per class must be a whole number between ${MIN_TEXT_TOP_K} and ${MAX_TEXT_TOP_K}.`', 229,
           msg="Top-k terms per class must be a whole number between 1 and 1000.")
    # Holdout
    pred("h0", "method = holdout?", 'validation.ValidationMethod === "holdout"', 240)
    g.node("sh", "stmt", "pct = TrainingPercentage", 'const pct = validation.TrainingPercentage', 241)
    pred("h1", "typeof pct != number?", 'typeof pct !== "number"  (operan 1 ||)', 243)
    pred("h2", "!isInteger(pct)?", '!Number.isInteger(pct)  (operan 2 ||)', 244)
    pred("h3", "pct < 1?", 'pct < 1  (operan 3 ||)', 245)
    pred("h4", "pct > 99?", 'pct > 99  (operan 4 ||)', 246)
    g.node("rh", "ret", "return 'Training %'", 'return "Training percentage must be a whole number between 1 and 99."', 248,
           msg="Training percentage must be a whole number between 1 and 99.")
    # K-fold
    pred("f0", "method = kfold?", 'validation.ValidationMethod === "kfold"', 253)
    g.node("sf", "stmt", "folds = KFolds", 'const folds = validation.KFolds', 254)
    pred("f1", "typeof folds != number?", 'typeof folds !== "number"  (operan 1 ||)', 255)
    pred("f2", "!isInteger(folds)?", '!Number.isInteger(folds)  (operan 2 ||)', 255)
    pred("f3", "folds < 1?", 'folds < 1  (operan 3 ||)', 255)
    g.node("rf", "ret", "return 'folds'", 'return "The number of folds must be at least 1."', 256, msg="The number of folds must be at least 1.")
    # Seed
    pred("s0", "RandomSeed != null?", 'validation.RandomSeed !== null', 263)
    pred("s1", "typeof seed != number?", 'typeof validation.RandomSeed !== "number"  (operan 1 ||)', 265)
    pred("s2", "!isInteger(seed)?", '!Number.isInteger(validation.RandomSeed)  (operan 2 ||)', 266)
    pred("s3", "seed < 0?", 'validation.RandomSeed < 0  (operan 3 ||)', 267)
    pred("s4", "seed > MAX_SEED?", 'validation.RandomSeed > MAX_SEED  (operan 4 ||)', 268)
    g.node("rs", "ret", "return 'seed'", 'return `The seed must be a whole number between 0 and ${MAX_SEED}.`', 270,
           msg="The seed must be a whole number between 0 and 4294967295.")
    g.node("ok", "ret", "return null", 'return null', 274, msg=None, ok=True)
    g.node("X", "end", "Selesai")

    g.edge("S", "a0"); g.edge("a0", "a1")
    g.edge("a1", "ra1", "T"); g.edge("a1", "a2", "F")
    g.edge("a2", "ra1", "T"); g.edge("a2", "a3", "F")
    g.edge("a3", "ra2", "T"); g.edge("a3", "a4", "F")
    g.edge("a4", "ra3", "T"); g.edge("a4", "t0", "F")
    g.edge("t0", "t1", "T"); g.edge("t0", "h0", "F")
    g.edge("t1", "rt1", "T"); g.edge("t1", "t2", "F")
    g.edge("t2", "rt1", "T"); g.edge("t2", "t3", "F")
    g.edge("t3", "rt2", "T"); g.edge("t3", "t4", "F")
    g.edge("t4", "rt3", "T"); g.edge("t4", "k0", "F")
    g.edge("k0", "sk", "T"); g.edge("k0", "h0", "F")
    g.edge("sk", "k1")
    g.edge("k1", "rk", "T"); g.edge("k1", "k2", "F")
    g.edge("k2", "rk", "T"); g.edge("k2", "k3", "F")
    g.edge("k3", "rk", "T"); g.edge("k3", "k4", "F")
    g.edge("k4", "rk", "T"); g.edge("k4", "h0", "F")
    g.edge("h0", "sh", "T"); g.edge("h0", "f0", "F")
    g.edge("sh", "h1")
    g.edge("h1", "rh", "T"); g.edge("h1", "h2", "F")
    g.edge("h2", "rh", "T"); g.edge("h2", "h3", "F")
    g.edge("h3", "rh", "T"); g.edge("h3", "h4", "F")
    g.edge("h4", "rh", "T"); g.edge("h4", "f0", "F")
    g.edge("f0", "sf", "T"); g.edge("f0", "s0", "F")
    g.edge("sf", "f1")
    g.edge("f1", "rf", "T"); g.edge("f1", "f2", "F")
    g.edge("f2", "rf", "T"); g.edge("f2", "f3", "F")
    g.edge("f3", "rf", "T"); g.edge("f3", "s0", "F")
    g.edge("s0", "s1", "T"); g.edge("s0", "ok", "F")
    g.edge("s1", "rs", "T"); g.edge("s1", "s2", "F")
    g.edge("s2", "rs", "T"); g.edge("s2", "s3", "F")
    g.edge("s3", "rs", "T"); g.edge("s3", "s4", "F")
    g.edge("s4", "rs", "T"); g.edge("s4", "ok", "F")
    for r in ("ra1", "ra2", "ra3", "rt1", "rt2", "rt3", "rk", "rh", "rf", "rs", "ok"):
        g.edge(r, "X")
    return g


# ------------------------------------------------------------------ WB-3
PRED_MSG = "Select at least one predictor variable (using Variables to Exclude or Candidate Factors / Covariates) or add Text Features."
COMPL_MSG = "Complement Naive Bayes can only be used when the model contains Text Features only. Choose Multinomial or Bernoulli, or remove the numeric/categorical predictors."
TARGET_MSG = "Select a target variable."
TEXTPRE_MSG = "Text Preprocessing: Words to Keep must be a whole number of 0 or more (0 keeps all words)."


def build_wb3():
    g = Graph("WB-3", "WB-3 useNaiveBayesValidation (blok useMemo)")
    g.node("S", "start", "Mulai (callback useMemo)")
    g.node("e0", "stmt", "errors = []", 'const errors: string[] = []', 121)
    g.node("c1", "pred", "TargetVar kosong?", '!formData.main.TargetVar', 123)
    g.node("m1", "stmt", "push 'Select a target variable.'", 'errors.push("Select a target variable.")', 124, push=TARGET_MSG)
    g.node("d0", "stmt", "effPred, textSource, hasText", 'effectivePredictors = getEffectivePredictors(...); textSource = getEffectiveTextSource(...); hasText = textSource !== "none"  (pemanggilan fungsi tidak diperluas)', "127-132")
    g.node("c2", "pred", "TargetVar kosong? (&&)", '!formData.main.TargetVar  (operan kiri && pada predictorBelumBermakna)', 139)
    g.node("c3", "pred", "SpecificationMode null/undefined? (??)", 'formData.main.SpecificationMode ?? "exclude"  (cabang ??: operan kiri nullish?)', 140)
    g.node("m3a", "stmt", "mode = 'exclude' (cadangan)", 'mode <- "exclude"  (cabang kanan ??)', 140)
    g.node("m3b", "stmt", "mode = SpecificationMode", 'mode <- formData.main.SpecificationMode  (cabang kiri ??)', 140)
    g.node("c4", "pred", "mode = 'exclude'?", '(...) === "exclude"  (operan kanan &&)', 140)
    g.node("m4a", "stmt", "belumBermakna = true", 'predictorBelumBermakna <- true', 138)
    g.node("m4b", "stmt", "belumBermakna = false", 'predictorBelumBermakna <- false', 138)
    g.node("c5", "pred", "effPred.length = 0?", 'effectivePredictors.length === 0  (operan 1 ||)', 142)
    g.node("c6", "pred", "belumBermakna?", 'predictorBelumBermakna  (operan 2 ||)', 142)
    g.node("c7", "pred", "!hasText?", '!hasText  (operan && luar)', 143)
    g.node("m7", "stmt", "push 'Select at least one predictor...'", 'errors.push("Select at least one predictor variable ... or add Text Features.")', 145, push=PRED_MSG)
    g.node("c8", "pred", "hasText?", 'hasText  (operan 1 &&)', 153)
    g.node("c9", "pred", "TextLikelihood = complement?", 'formData.options.TextLikelihood === "complement"  (operan 2 &&)', 154)
    g.node("c10", "pred", "effPred.length > 0?", 'effectivePredictors.length > 0  (operan 3 &&)', 155)
    g.node("m10", "stmt", "push 'Complement Naive Bayes...'", 'errors.push("Complement Naive Bayes can only be used when ...")', 157, push=COMPL_MSG)
    g.node("c11", "pred", "textSource = raw?", 'textSource === "raw"', 163)
    g.node("c12", "pred", "masih ada pesan? (loop)", 'for (const message of validateStwvConfig(formData.text))  (kondisi iterasi)', 164)
    g.node("m12", "stmt", "push 'Text Preprocessing: ...'", 'errors.push(`Text Preprocessing: ${message}`)', 165, push=TEXTPRE_MSG)
    g.node("rt", "ret", "return {isValid, errors}", 'return { isValid: errors.length === 0, errors }', 169, ok=True)
    g.node("X", "end", "Selesai")
    g.edge("S", "e0"); g.edge("e0", "c1")
    g.edge("c1", "m1", "T"); g.edge("c1", "d0", "F"); g.edge("m1", "d0")
    g.edge("d0", "c2")
    g.edge("c2", "c3", "T"); g.edge("c2", "m4b", "F")
    g.edge("c3", "m3a", "T"); g.edge("c3", "m3b", "F")
    g.edge("m3a", "c4"); g.edge("m3b", "c4")
    g.edge("c4", "m4a", "T"); g.edge("c4", "m4b", "F")
    g.edge("m4a", "c5"); g.edge("m4b", "c5")
    g.edge("c5", "c7", "T"); g.edge("c5", "c6", "F")
    g.edge("c6", "c7", "T"); g.edge("c6", "c8", "F")
    g.edge("c7", "m7", "T"); g.edge("c7", "c8", "F")
    g.edge("m7", "c8")
    g.edge("c8", "c9", "T"); g.edge("c8", "c11", "F")
    g.edge("c9", "c10", "T"); g.edge("c9", "c11", "F")
    g.edge("c10", "m10", "T"); g.edge("c10", "c11", "F")
    g.edge("m10", "c11")
    g.edge("c11", "c12", "T"); g.edge("c11", "rt", "F")
    g.edge("c12", "m12", "T"); g.edge("c12", "rt", "F")
    g.edge("m12", "c12")
    g.edge("rt", "X")
    return g


def wb3_state_path(g, st):
    """Simulasi abstrak: st = dict(T, smnull, modeExcl, np0, src, compl, nmsg) -> tuple simpul."""
    n, path, ctx, it = "S", ["S"], {"bb": None}, 0
    T = st["T"]; hasText = st["src"] != "none"
    while n != "X":
        k = g.nodes[n]["kind"]
        if k in ("start", "stmt", "ret", "end"):
            if n == "m4a": ctx["bb"] = True
            if n == "m4b": ctx["bb"] = False
            if n == "m12": it += 1
            n = g.succ[n][""]
        else:
            v = {
                "c1": not T, "c2": not T, "c3": bool(st["smnull"]),
                "c4": True if st["smnull"] else bool(st["modeExcl"]),
                "c5": bool(st["np0"]), "c6": bool(ctx["bb"]), "c7": not hasText,
                "c8": hasText, "c9": bool(st["compl"]), "c10": not st["np0"],
                "c11": st["src"] == "raw", "c12": it < (st["nmsg"] if st["src"] == "raw" else 0),
            }[n]
            n = g.succ[n]["T" if v else "F"]
        path.append(n)
    return tuple(path)


def wb3_feasible(g):
    """Enumerasi seluruh keadaan abstrak -> {jalur: keadaan wakil (paling dekat ke default)}"""
    import itertools
    rep = {}
    for T, smnull, modeExcl, np0, src, compl, nmsg in itertools.product(
            [1, 0], [0, 1], [1, 0], [0, 1], ["none", "raw", "vector"], [0, 1], [0, 1]):
        st = dict(T=T, smnull=smnull, modeExcl=modeExcl, np0=np0, src=src, compl=compl, nmsg=nmsg)
        p = wb3_state_path(g, st)
        rep.setdefault(p, st)
    return rep


# ------------------------------------------------------------------ WB-4
def build_wb4():
    g = Graph("WB-4", "WB-4 loadModelFromFile (+ finalizeLoad)")
    g.node("S", "start", "Mulai")
    g.node("q1", "pred", "bukan .json?", '!file.name.toLowerCase().endsWith(".json")', 166)
    g.node("r1", "ret", "return fail(AM_E_PARSE)", 'return fail("AM_E_PARSE", file.name)', 167, code="AM_E_PARSE")
    g.node("q2", "pred", "size > 10 MB?", 'file.size > MAX_MODEL_FILE_BYTES', 169)
    g.node("r2", "ret", "return fail(AM_E_FILE_TOO_LARGE)", 'return fail("AM_E_FILE_TOO_LARGE", file.name)', 170, code="AM_E_FILE_TOO_LARGE")
    g.node("s0", "stmt", "let raw (masuk try)", 'let raw: unknown;  try {', "173-174")
    g.node("q3", "pred", "file.text() melempar?", 'const text = await file.text()  (cabang eksepsi implisit ke catch)', 175)
    g.node("q4", "pred", "JSON.parse melempar?", 'raw = JSON.parse(text)  (cabang eksepsi implisit ke catch)', 176)
    g.node("r3", "ret", "catch: return fail(AM_E_PARSE)", '} catch { return fail("AM_E_PARSE", file.name) }', 178, code="AM_E_PARSE")
    g.node("s1", "stmt", "finalizeLoad: validateAnyModel(raw)", 'return finalizeLoad(raw, file.name, `File: ${file.name}`) -> const validation = validateAnyModel(raw)  (pemanggilan fungsi tidak diperluas)', "181 / 68")
    g.node("q5", "pred", "!validation.ok?", '!validation.ok  (di finalizeLoad)', 69)
    g.node("r4", "ret", "return {ok:false, errors}", 'return { ok: false, errors: validation.errors }', 70)
    g.node("r5", "ret", "return {ok:true, model, ...}", 'return { ok: true, model, descriptor, sourceRef, sourceLabel }', "72-77", ok=True)
    g.node("X", "end", "Selesai")
    g.edge("S", "q1")
    g.edge("q1", "r1", "T"); g.edge("q1", "q2", "F")
    g.edge("q2", "r2", "T"); g.edge("q2", "s0", "F")
    g.edge("s0", "q3")
    g.edge("q3", "r3", "T"); g.edge("q3", "q4", "F")
    g.edge("q4", "r3", "T"); g.edge("q4", "s1", "F")
    g.edge("s1", "q5")
    g.edge("q5", "r4", "T"); g.edge("q5", "r5", "F")
    for r in ("r1", "r2", "r3", "r4", "r5"):
        g.edge(r, "X")
    return g
