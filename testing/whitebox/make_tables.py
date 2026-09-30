"""Menyisipkan tabel basis path dan coverage ke ringkasan-white-box.md.

Status tiap kasus uji dibaca dari log test (bukan ditulis tangan):
  log/cargo-test-mv-windows.log, log/cargo-test-rm-windows.log (cargo test),
  log/jest-mv-rm-coverage.log (Jest).
Coverage dibaca dari coverage/rust-*-stable/summary.json,
coverage/rust-*-nightly-branch/summary.json (bila ada) dan
coverage/jest/coverage-summary.json.

Jalankan (akar repositori): python testing/whitebox/make_tables.py
"""
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
LOG = HERE / "log"
REPORT = HERE / "ringkasan-white-box.md"


def cargo_status():
    status = {}
    for name in ("cargo-test-mv-windows.log", "cargo-test-rm-windows.log"):
        text = (LOG / name).read_text(encoding="utf-8", errors="replace")
        failed = set()
        if "\nfailures:\n" in text:
            tail = text.rsplit("\nfailures:\n", 1)[1]
            failed = {m.group(1) for m in re.finditer(r"^\s+(\S+)$", tail, re.M)}
        for m in re.finditer(r"^test (\S+) \.\.\. ", text, re.M):
            full = m.group(1)
            status[full.rsplit("::", 1)[1]] = "GAGAL" if full in failed else "LULUS"
    return status


def jest_status():
    status = {}
    text = (LOG / "jest-mv-rm-coverage.log").read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(r"^\s+([√×✕]) (EFC-J\d)", text, re.M):
        status[m.group(2)] = "LULUS" if m.group(1) == "√" else "GAGAL"
    return status


def esc(v):
    return str(v).replace("|", "\\|")


def basis_path_section():
    data = json.loads((HERE / "basis-path" / "basis-path.json").read_text(encoding="utf-8"))
    st = {**cargo_status(), **jest_status()}
    out = ["| Fungsi | Bahasa | N | E | V(G) = E − N + 2 | Predikat + 1 | Rank jalur | Jalur layak | Tak layak | Uji lulus | Uji gagal |",
           "|---|---|---|---|---|---|---|---|---|---|---|"]
    detail = []
    for key, f in data.items():
        tested = [p for p in f["paths"] if p["feasible"]] + f.get("extra", [])
        res = [st.get(p["test"], "TIDAK DIJALANKAN") for p in tested]
        out.append(f"| `{key}` | {f['lang']} | {f['N']} | {f['E']} | {f['V_EN']} | {f['P']} + 1 = {f['V_P']} | {f['rank']} | "
                   f"{f['feasible']} | {f['infeasible']} | {res.count('LULUS')} | {res.count('GAGAL')} |")
        detail += ["", f"### `{key}` ({f['file']})", "",
                   f"![Flow graph {key}](basis-path/{key}.png)", "",
                   f"- V(G) = E − N + 2 = {f['E']} − {f['N']} + 2 = **{f['V_EN']}**; "
                   f"V(G) = jumlah predikat + 1 = {f['P']} + 1 = **{f['V_P']}** (node predikat: {', '.join(map(str, f['predicates']))}).",
                   f"- Rank vektor sisi {len(f['paths'])} jalur = {f['rank']} (bebas linear); semua {f['E']} sisi tercakup.",
                   "", "<details><summary>Keterangan node</summary>", "", "| Node | Kode |", "|---|---|"]
        detail += [f"| {k} | `{esc(v)}` |" for k, v in f["node_labels"].items()]
        detail += ["", "</details>", "",
                   "| Jalur | Urutan node | Skenario (input) | Output harapan | Oracle | Test | Status |",
                   "|---|---|---|---|---|---|---|"]
        for p in f["paths"]:
            if p["feasible"]:
                s = st.get(p["test"], "TIDAK DIJALANKAN")
                detail.append(f"| {p['id']} | {p['nodes']} | {esc(p['scenario'])} | {esc(p['expected'])} | {esc(p['oracle'])} | `{p['test']}` | **{s}** |")
            else:
                detail.append(f"| {p['id']} | {p['nodes']} | {esc(p['scenario'])} | – | – | – | TAK LAYAK: {esc(p['reason'])} |")
        for p in f.get("extra", []):
            s = st.get(p["test"], "TIDAK DIJALANKAN")
            detail.append(f"| {p['id']} (tambahan) | {esc(p['nodes'])} | {esc(p['scenario'])} | {esc(p['expected'])} | {esc(p['oracle'])} | `{p['test']}` | **{s}** |")
    return "\n".join(out + detail)


def pct(c):
    return f"{c['percent']:.2f}% ({c['covered']}/{c['count']})" if c.get("count") else "–"


def rust_coverage_section():
    out = []
    for key, name in (("mv", "multivariate"), ("rm", "repeated-measures")):
        stable = HERE / "coverage" / f"rust-{key}-stable" / "summary.json"
        nightly = HERE / "coverage" / f"rust-{key}-nightly-branch" / "summary.json"
        if not stable.exists():
            out += ["", f"Coverage Rust {name}: belum tersedia."]
            continue
        s = json.loads(stable.read_text())["data"][0]
        n = json.loads(nightly.read_text())["data"][0] if nightly.exists() else None
        branch = {}
        if n:
            branch = {f["filename"].split("/rust/src/")[-1]: f["summary"]["branches"] for f in n["files"]}
        out += ["", f"#### Crate {name} (`{name}/rust/src`)", "",
                "| Berkas | Line | Region | Fungsi | Branch (nightly) |", "|---|---|---|---|---|"]
        for f in sorted(s["files"], key=lambda f: f["filename"]):
            rel = f["filename"].split("/rust/src/")[-1]
            if rel.startswith("test/"):
                continue
            sm = f["summary"]
            out.append(f"| `{rel}` | {pct(sm['lines'])} | {pct(sm['regions'])} | {pct(sm['functions'])} | {pct(branch.get(rel, {}))} |")
        t = s["totals"]
        nb = n["totals"]["branches"] if n else {}
        out.append(f"| **Total berkas produksi** | **{pct(t['lines'])}** | **{pct(t['regions'])}** | **{pct(t['functions'])}** | **{pct(nb)}** |")
    return "\n".join(out)


def ts_coverage_section():
    p = HERE / "coverage" / "jest" / "coverage-summary.json"
    data = json.loads(p.read_text())
    out = ["| Berkas | Statement | Branch | Fungsi | Line |", "|---|---|---|---|---|"]
    for k, v in sorted(data.items()):
        if k == "total":
            continue
        rel = k.replace("\\", "/").split("general-linear-model/")[-1]
        out.append(f"| `{rel}` | {pct_ts(v['statements'])} | {pct_ts(v['branches'])} | {pct_ts(v['functions'])} | {pct_ts(v['lines'])} |")
    t = data["total"]
    out.append(f"| **Total** | **{pct_ts(t['statements'])}** | **{pct_ts(t['branches'])}** | **{pct_ts(t['functions'])}** | **{pct_ts(t['lines'])}** |")
    return "\n".join(out)


def pct_ts(c):
    return f"{c['pct']:.2f}% ({c['covered']}/{c['total']})"


def inject(text, marker, content):
    start, end = f"<!-- {marker}:mulai -->", f"<!-- {marker}:selesai -->"
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    assert pattern.search(text), marker
    return pattern.sub(lambda _: f"{start}\n{content}\n{end}", text)


def main():
    text = REPORT.read_text(encoding="utf-8")
    text = inject(text, "BASIS-PATH", basis_path_section())
    text = inject(text, "COVERAGE-RUST", rust_coverage_section())
    text = inject(text, "COVERAGE-TS", ts_coverage_section())
    REPORT.write_text(text, encoding="utf-8")
    print("ringkasan-white-box.md diperbarui")


if __name__ == "__main__":
    main()
