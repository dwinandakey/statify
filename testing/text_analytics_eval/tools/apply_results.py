#!/usr/bin/env python3
"""apply_results.py — mengisi penanda hasil di dokumen evaluasi dari LOG eksekusi nyata.

Penanda yang dikenali di dokumen:
    ⟦jest:<nama-berkas-tes>::<full test name>⟧     (full name = ancestorTitles + title, dipisah spasi, seperti `fullName` di JSON jest)
    ⟦rust:<target>::<nama fungsi tes>⟧             (target = nama berkas tes integrasi, atau `lib` untuk tes unit di src/)

Sumber hasil (di testing/text_analytics_eval/logs/):
    jest_*_win.json   hasil Jest di Windows pengguna (config produksi, next/jest)      -> label [Win]
    jest_*_vm.json    hasil Jest di VM Linux sandbox (ts-jest, shim resolver)           -> label [VM]
    rust_*.txt        keluaran `cargo test` (dari run_*.ps1 di Windows)                  -> label [Win]
Aturan: hasil Windows menang atas VM; bila sumber yang sama berisi banyak entri untuk satu tes, dipakai entri
dari berkas dengan startTime terbaru. Penanda tanpa hasil => "BELUM DIJALANKAN". Tes Rust yang targetnya gagal
kompilasi => "GAGAL KOMPILASI". Tidak ada status yang diketik manual.

Mode kerja (idempoten): dokumen bertanda disimpan di `templates/<nama>.md`. Perintah:
    python tools/apply_results.py            # isi semua dokumen (membaca templates/ bila ada, selain itu dokumen aktif)
    python tools/apply_results.py --check    # hanya ringkasan jumlah penanda dan statusnya (tidak menulis)
Dokumen aktif ditimpa dengan versi terisi; templat berpenanda tetap tersimpan di templates/.
Hanya memakai pustaka standar Python 3.
"""
import glob
import json
import os
import re
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
EVAL = os.path.dirname(HERE)
LOGS = os.path.join(EVAL, "logs")
TEMPLATES = os.path.join(EVAL, "templates")

# Hanya penanda sungguhan (berisi "::" dan bukan contoh/placeholder seperti ⟦jest:...⟧ atau ⟦rust:<target>::<fn>⟧).
# Nama tes boleh memuat "<" dan ">" (mis. "A -> B", "File: <nama>"); placeholder prosa seperti ⟦jest:<berkas>::<nama>⟧
# tetap dikecualikan karena bagian berkas/target tidak boleh memuat "<>" dan bagian nama tidak boleh diawali "<".
_M = r"⟦(?:jest|rust):(?:(?![⟦⟧<>]|\.\.\.)[^⟦⟧])*?::(?!<)[^⟦⟧]*?⟧"
MARK = re.compile(r"⟦(jest|rust):((?:(?![⟦⟧<>]|\.\.\.)[^⟦⟧])*?::(?!<)[^⟦⟧]*?)⟧")
RUN_OF_MARKS = re.compile(_M + r"(?:[ \t,;]*" + _M + r")*")
EXCLUDE_DOCS = {"AGENT_COMMON.md", "PROMPT_Evaluasi_Modul_Text_Analytics.md",
                "C_blackbox.md", "C_manual_checklist.md", "BUGS.md", "REPORT.md", "AUDIT_DOCS.md"}  # dokumen turunan (merge_docs/build_report)

PASS, FAIL, SKIP, NOTRUN, COMPILE = "Lulus", "Gagal", "Dilewati", "BELUM DIJALANKAN", "GAGAL KOMPILASI"


def _legacy(s):
    """Kompatibilitas log lama: log yang dibuat sebelum penggantian nama (thesis -> eval) masih memuat nama lama.
    Penanda di dokumen memakai nama baru, maka nama lama dipetakan ke nama baru saat log dimuat.
    Tidak mengubah berkas log. Aman dihapus setelah seluruh tes dijalankan ulang dengan nama baru."""
    s = re.sub(r"\.thesis(?![A-Za-z_])", ".eval", s)
    s = re.sub(r"(?<![A-Za-z_.-])thesis(?= [A-F][(:\s])", "eval", s)
    return re.sub(r"(?<![A-Za-z])thesis_", "eval_", s)


def load_jest():
    """-> dict[(basename, fullName)] = (status, platform)"""
    groups = {"Win": [], "VM": []}
    for path in sorted(glob.glob(os.path.join(LOGS, "jest_*.json"))):
        base = os.path.basename(path)
        if re.search(r"(try\d|_part\d|jest_cov|coverage)", base):
            continue
        plat = "Win" if base.endswith("_win.json") else ("VM" if base.endswith("_vm.json") else None)
        if plat is None:
            continue
        try:
            with open(path, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
        except Exception:
            continue
        groups[plat].append((data.get("startTime", 0), path, data))
    res = {}
    for plat in ("VM", "Win"):  # Win ditulis terakhir => menang
        latest = {}
        for start, path, data in sorted(groups[plat], key=lambda x: x[0]):
            for tr in data.get("testResults", []):
                bn = _legacy(re.split(r"[\\/]", tr.get("name", ""))[-1])  # path Windows maupun POSIX
                for a in tr.get("assertionResults", []):
                    key = (bn, _legacy(a.get("fullName") or " ".join(a.get("ancestorTitles", []) + [a.get("title", "")])))
                    st = {"passed": PASS, "failed": FAIL, "pending": SKIP, "skipped": SKIP, "todo": SKIP, "disabled": SKIP}.get(a.get("status"), FAIL)
                    latest[key] = (st, plat)
        res.update(latest)
    return res


def load_rust():
    """-> (dict[(target, testname)] = (status, 'Win'), set(targets gagal kompilasi))"""
    results = {}
    compile_fail = set()
    for path in sorted(glob.glob(os.path.join(LOGS, "rust_*.txt"))):
        raw = open(path, "rb").read()
        for enc in ("utf-8-sig", "utf-16"):
            try:
                text = raw.decode(enc)
                if enc == "utf-8-sig" and "\x00" in text[:200]:
                    continue
                break
            except UnicodeDecodeError:
                continue
        target = None
        base_target = re.sub(r"^rust_", "", os.path.basename(path))[:-4]
        for line in text.splitlines():
            m = re.search(r"Running (?:unittests (.+?)|tests[\\/]([\w\-]+)\.rs)\s", line)
            if m:
                target = "lib" if m.group(1) else _legacy(m.group(2))
                continue
            m = re.match(r"test (\S+) \.\.\. (ok|FAILED|ignored)", line)
            if m and target:
                st = {"ok": PASS, "FAILED": FAIL, "ignored": SKIP}[m.group(2)]
                results[(target, _legacy(m.group(1)))] = (st, "Win")
        for m in re.finditer(r'could not compile `[^`]+` \(test "([\w\-]+)"\)', text):
            compile_fail.add(_legacy(m.group(1)))
        if re.search(r"error(\[E\d+\])?: could not compile", text) and not re.search(r"Running ", text):
            compile_fail.add(base_target)
    return results, compile_fail


def resolve(kind, body, jest, rust, rust_cf):
    if kind == "jest":
        if "::" not in body:
            return (NOTRUN, None)
        bn, name = body.split("::", 1)
        hit = jest.get((bn.strip(), name.strip()))
        return hit if hit else (NOTRUN, None)
    target, _, name = body.partition("::")
    target, name = target.strip(), name.strip()
    if target in rust_cf and not any(k[0] == target for k in rust):
        return (COMPILE, "Win")
    hits = [v for (t, n), v in rust.items() if t == target and (n == name or n.endswith("::" + name))]
    if not hits:
        return (NOTRUN, None)
    if any(h[0] == FAIL for h in hits):
        return (FAIL, "Win")
    return hits[0]


def summarize(statuses):
    """statuses: list[(status, platform)] -> teks ringkas"""
    n = len(statuses)
    c = Counter(s for s, _ in statuses)
    plats = sorted({p for _, p in statuses if p})
    tag = (" [" + "/".join(plats) + "]") if plats else ""
    if c[NOTRUN] == n:
        return NOTRUN
    if c[COMPILE] == n:
        return COMPILE
    if c[PASS] == n:
        return PASS + (f" ({n}/{n})" if n > 1 else "") + tag
    parts = []
    if c[FAIL]:
        parts.append(f"Gagal {c[FAIL]} dari {n}")
    if c[COMPILE]:
        parts.append(f"{c[COMPILE]} gagal kompilasi")
    if c[SKIP]:
        parts.append(f"{c[SKIP]} dilewati")
    if c[NOTRUN]:
        parts.append(f"{c[NOTRUN]} belum dijalankan")
    if c[PASS]:
        parts.append(f"{c[PASS]} lulus")
    return "; ".join(parts) + tag


def fill_text(text, jest, rust, rust_cf, tally):
    KEEP = "\u0000KEEP\u0000"
    text = text.replace("⟦jest:berkas::nama tes⟧", KEEP)  # contoh sintaks di prosa, bukan penanda sungguhan

    def repl_run(m):
        marks = MARK.findall(m.group(0))
        sts = [resolve(k, b, jest, rust, rust_cf) for k, b in marks]
        for s in sts:
            tally[s[0]] += 1
        return summarize(sts)
    return RUN_OF_MARKS.sub(repl_run, text).replace(KEEP, "⟦jest:berkas::nama tes⟧")


def main():
    check = "--check" in sys.argv
    jest = load_jest()
    rust, rust_cf = load_rust()
    os.makedirs(TEMPLATES, exist_ok=True)
    tally = Counter()
    docs = [d for d in sorted(glob.glob(os.path.join(EVAL, "*.md"))) if os.path.basename(d) not in EXCLUDE_DOCS]
    print(f"Hasil Jest: {len(jest)} tes; hasil Rust: {len(rust)} tes; target Rust gagal kompilasi: {sorted(rust_cf)}")
    for doc in docs:
        name = os.path.basename(doc)
        tmpl = os.path.join(TEMPLATES, name)
        src_path = tmpl if os.path.exists(tmpl) else doc
        text = open(src_path, encoding="utf-8").read()
        if not MARK.search(text):
            continue
        t = Counter()
        out = fill_text(text, jest, rust, rust_cf, t)
        tally.update(t)
        print(f"  {name}: " + ", ".join(f"{k}={v}" for k, v in sorted(t.items())))
        if not check:
            if not os.path.exists(tmpl):
                with open(tmpl, "w", encoding="utf-8", newline="\n") as f:
                    f.write(text)
            with open(doc, "w", encoding="utf-8", newline="\n") as f:
                f.write(out)
    print("TOTAL penanda: " + ", ".join(f"{k}={v}" for k, v in sorted(tally.items())))


if __name__ == "__main__":
    main()
