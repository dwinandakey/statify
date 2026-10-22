#!/usr/bin/env python3
"""merge_docs.py — menggabungkan dokumen per-sub-track menjadi dokumen akhir.

    C_blackbox_C1|C2|C3.md          -> C_blackbox.md
    C_manual_checklist_C1|C2|C3.md  -> C_manual_checklist.md
    BUGS_A..F.md                    -> BUGS.md  (dengan tabel indeks temuan)

Bagian sumber tidak diubah (tetap menjadi sumber kebenaran; apply_results.py mengisi status di bagian itu).
Urutan menjalankan: apply_results.py dulu, baru merge_docs.py, lalu build_report.py.
Hanya pustaka standar Python 3. Idempoten.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
EVAL = os.path.dirname(HERE)


def read(name):
    with open(os.path.join(EVAL, name), encoding="utf-8") as f:
        return f.read().replace("\r\n", "\n")


def demote(text, by=1):
    """Turunkan level heading `by` tingkat (di luar blok kode)."""
    out, fence = [], False
    for line in text.split("\n"):
        if line.lstrip().startswith("```"):
            fence = not fence
        m = re.match(r"^(#{1,6})(\s.*)$", line)
        if m and not fence:
            line = "#" * min(6, len(m.group(1)) + by) + m.group(2)
        out.append(line)
    return "\n".join(out)


def title_of(text):
    m = re.search(r"^#\s+(.+)$", text, re.M)
    return m.group(1).strip() if m else ""


def write(name, content):
    with open(os.path.join(EVAL, name), "w", encoding="utf-8", newline="\n") as f:
        f.write(content.rstrip("\n") + "\n")
    print("ditulis", name, f"({content.count(chr(10)) + 1} baris)")


def merge(out, title, intro, parts, index_builder=None):
    chunks = [f"# {title}\n", intro.strip() + "\n"]
    if index_builder:
        chunks.append(index_builder(parts))
    for fname in parts:
        if not os.path.exists(os.path.join(EVAL, fname)):
            chunks.append(f"\n## {fname}\n\nBerkas sumber tidak ada: NOT RUN.\n")
            continue
        text = read(fname)
        chunks.append(f"\n<!-- sumber: {fname} -->\n")
        chunks.append(demote(text, 1))
    write(out, "\n".join(chunks))


def bug_index(parts):
    rows = ["## Indeks temuan\n", "| ID | Tingkat | Judul | Berkas sumber |", "|---|---|---|---|"]
    for fname in parts:
        p = os.path.join(EVAL, fname)
        if not os.path.exists(p):
            continue
        body = read(fname)
        sev = {}
        for mm in re.finditer(r"^\|\s*([A-Z]\d?-\d+)\s*\|.*\|\s*([^|]+?)\s*\|\s*$", body, re.M):
            sev[mm.group(1)] = mm.group(2).lower()
        default = "rendah" if re.search(r"Tingkat keparahan:\s*Low", body) else "-"
        for line in body.split("\n"):
            m = re.match(r"^## ([A-Z]\d?-\d+)\s*(?:\(([^)]*)\))?\s*[:—-]?\s*(.*)$", line)
            if m:
                rows.append(f"| {m.group(1)} | {m.group(2) or sev.get(m.group(1)) or default} | {m.group(3).strip().replace('|', '/')} | `{fname}` |")
    rows.append("")
    rows.append("Tingkat mengikuti catatan masing-masing temuan (sedang/tinggi = memengaruhi hasil atau menghentikan proses; rendah/informasi = "
                "ketidaksesuaian pesan, dokumentasi, atau karakterisasi perilaku). Tidak ada kode produksi yang diubah; semua usulan perbaikan "
                "menunggu persetujuan pemilik kode.\n")
    return "\n".join(rows)


def main():
    merge("C_blackbox.md", "Track C — Pengujian black-box modul Text Analytics (BB-01 sampai BB-36)",
          "Dokumen ini menggabungkan tiga bagian: C1 (String to Word Vector, BB-01..13), C2 (Naive Bayes, BB-14..28), dan "
          "C3 (Apply Model dan persistensi Naive Bayes, BB-29..36). Dokumen digenerate oleh `tools/merge_docs.py` dari "
          "`C_blackbox_C1.md`, `C_blackbox_C2.md`, `C_blackbox_C3.md`; edit di berkas sumber, bukan di sini. Skenario yang butuh "
          "antarmuka sungguhan tercantum di `C_manual_checklist.md` dan berstatus MANUAL — belum dijalankan.",
          ["C_blackbox_C1.md", "C_blackbox_C2.md", "C_blackbox_C3.md"])
    merge("C_manual_checklist.md", "Daftar periksa manual Track C (M-01 sampai M-36)",
          "Gabungan `C_manual_checklist_C1.md`, `C_manual_checklist_C2.md`, `C_manual_checklist_C3.md` (digenerate oleh "
          "`tools/merge_docs.py`). Kolom hasil dan tangkapan layar sengaja dikosongkan: diisi Yedija saat menjalankan langkah di aplikasi nyata. "
          "Daftar periksa integrasi antarmenu (Track F) ada di `F_manual_checklist.md`.",
          ["C_manual_checklist_C1.md", "C_manual_checklist_C2.md", "C_manual_checklist_C3.md"])
    merge("BUGS.md", "BUGS — temuan paket evaluasi modul Text Analytics",
          "Seluruh temuan dari Track A sampai F. Setiap temuan memuat lokasi (berkas:baris), langkah reproduksi, dampak, usulan perbaikan, "
          "dan tingkat keyakinan. Kode produksi TIDAK diubah. Digenerate oleh `tools/merge_docs.py` dari `BUGS_A.md` .. `BUGS_F.md`.",
          [f"BUGS_{t}.md" for t in ("A", "B", "C1", "C2", "C3", "D", "E", "F")], bug_index)


if __name__ == "__main__":
    main()
