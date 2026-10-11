# -*- coding: utf-8 -*-
"""Bangun HANDOFF_PENULISAN_SKRIPSI.md: arahan tulisan tangan (report/HANDOFF.part*.md) + lampiran dari dokumen sumber.

Tidak ada angka diketik di lampiran: semuanya disalin dari berkas sumber. Beberapa angka kunci pada arahan dicek terhadap
REPORT.md (daftar CHECKS); bila tidak cocok, skrip berhenti dengan galat.
Jalankan: python testing/text_analytics_eval/tools/build_handoff.py
"""
import os, re, sys

EVAL = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(EVAL, "HANDOFF_PENULISAN_SKRIPSI.md")


def read(rel):
    with open(os.path.join(EVAL, rel), encoding="utf-8") as f:
        return f.read().replace("\r\n", "\n")


def demote(text, n):
    """Turunkan tingkat heading sebanyak n (maksimum ######), abaikan blok kode berpagar."""
    out, fence = [], False
    for ln in text.split("\n"):
        if ln.lstrip().startswith("```"):
            fence = not fence
        m = re.match(r"^(#{1,6})(\s+.*)$", ln)
        if m and not fence:
            ln = "#" * min(6, len(m.group(1)) + n) + m.group(2)
        out.append(ln)
    return "\n".join(out)


def slice_lines(text, ranges):
    L = text.split("\n")
    keep = []
    for a, b in ranges:  # 1-based, inklusif; b=None -> sampai akhir
        keep += L[a - 1:(b if b else len(L))]
        keep.append("")
    return "\n".join(keep)


def section_between(text, start_pat, end_pat=None):
    m = re.search(start_pat, text, re.M)
    if not m:
        raise SystemExit("heading tidak ditemukan: " + start_pat)
    s = m.start()
    e = len(text)
    if end_pat:
        m2 = re.search(end_pat, text[m.end():], re.M)
        if m2:
            e = m.end() + m2.start()
    return text[s:e]


report = read("REPORT.md")
CHECKS = ["17.221 dari 17.221", "453 tes Jest baru", "136 fungsi tes Rust", "25 butir", "4.138,3", "26.624,7", "17.960,9", "6.500,9",
          "Rust 450 tes lulus", "Jest 830 tes lulus", "2,665e-15", "1.283"]
miss = [c for c in CHECKS if c not in report]
if miss:
    raise SystemExit("angka kunci tidak ada di REPORT.md: %s" % miss)

body = "\n".join(read("report/HANDOFF.part%d.md" % i) for i in (1, 2, 3))

# --- lampiran
dacc = read("D_accuracy.md")
eperf = read("E_performance.md")
fint = read("F_integration.md")
e_lines = eperf.split("\n")
# E: bagian 1-5 (status, skenario, metode, lingkungan uji asap, pembacaan) dan 7-9; tabel §6 sudah ada di Lampiran A
i6 = next(i for i, l in enumerate(e_lines) if l.startswith("## 6. Tabel hasil"))
i7 = next(i for i, l in enumerate(e_lines) if l.startswith("## 7. Keterbatasan"))
e_part = "\n".join(e_lines[:i6] + ["", "## 6. Tabel hasil", "", "(Tabel hasil Track E disalin utuh di Lampiran A, bagian 8; tabel uji asap sandbox dan VM tidak disalin karena bukan hasil perangkat skripsi.)", ""] + e_lines[i7 - 1:])
f_lines = fint.split("\n")
i3 = next(i for i, l in enumerate(f_lines) if l.startswith("## 3. Hasil per skenario"))
i4 = next(i for i, l in enumerate(f_lines) if l.startswith("## 4. IT-03"))
f_part = "\n".join(f_lines[:i3] + ["## 3. Hasil per skenario", "", "(Tabel hasil per skenario disalin utuh di Lampiran A, bagian 9.)", ""] + f_lines[i4 - 1:])

apps = [
    ("A", "REPORT.md — laporan gabungan Track baseline dan A–F (sumber utama semua tabel buku)", report),
    ("B", "BUGS.md — temuan lengkap (lokasi, reproduksi, dampak, usulan)", read("BUGS.md")),
    ("C", "ENV.md — lingkungan pengujian dan penyimpangan", read("ENV.md")),
    ("D", "D_accuracy.md — Track D lengkap (metode, tabel parameter dan vektor, penjelasan selisih, keterbatasan)", dacc),
    ("E", "E_performance.md — Track E (status, skenario, metode, pembacaan hasil, keterbatasan, instruksi); tabel ada di Lampiran A", e_part),
    ("F", "F_integration.md — Track F (ringkasan, lingkungan, IT-03, IT-05, penyesuaian prompt, keterbatasan); tabel ada di Lampiran A", f_part),
]
parts = [body.rstrip() + "\n"]
toc = ["", "---", "", "# DAFTAR LAMPIRAN", ""]
for k, title, txt in apps:
    toc.append("- **Lampiran %s**: %s (%d KB)" % (k, title, round(len(txt.encode("utf-8")) / 1024)))
parts.append("\n".join(toc) + "\n")
for k, title, txt in apps:
    parts.append("\n---\n\n# LAMPIRAN %s — %s\n\nSalinan utuh dari berkas sumber di `testing/text_analytics_eval/`; heading diturunkan dua tingkat. Jangan menyunting di sini.\n\n%s\n" % (k, title, demote(txt, 2).strip("\n")))

final = "\n".join(parts)
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    f.write(final)
print("ditulis", OUT, "(%d KB, %d baris)" % (len(final.encode("utf-8")) // 1024, final.count("\n") + 1))
