"""Tulis hasil iterasi 3 ke skenario-black-box.md dan salinan CSV-nya.

Penilaian (Sesuai / Tidak Sesuai) dibuat penguji terhadap Hasil yang
Diharapkan; skrip ini hanya menyusun teks keterangan dari pengamatan
tersimpan (hasil-eksekusi/iterasi-3), perbandingan dengan iterasi
sebelumnya (bb-diff-iter.mjs), nilai SPSS (bb-nilai.mjs), dan pemeriksaan
ulang offline (bb-cek-ulang-iter3.mjs). Keterangan khusus per skenario ada di
KHUSUS.

    python testing/black-box/harness/bb-tulis-iter3.py
"""
import csv
import io
import json
import os
import re

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
BB = os.path.join(REPO, "testing", "black-box")
OBS = os.path.join(BB, "hasil-eksekusi", "iterasi-3")
MD = os.path.join(BB, "skenario-black-box.md")

nilai = json.load(open(os.path.join(OBS, "nilai-spss.json"), encoding="utf-8"))
diff2 = open(os.path.join(REPO, "testing", "final", "bb-diff-iter2-iter3.txt"), encoding="utf-8").read()


def obs(i):
    return json.load(open(os.path.join(OBS, f"{i}.json"), encoding="utf-8"))


def bukti(i):
    files = sorted({m for m in re.findall(r"(BB-[A-Z0-9-]+?(?:-\d+)?\.png)", " ".join(obs(i).get("notes", []))) if m.startswith(i)},
                   key=lambda f: int(re.search(r"-(\d+)\.png$", f[len(i):] or "-0.png").group(1)) if re.search(r"-(\d+)\.png$", f[len(i):]) else 0)
    if not files:
        return ""
    if len(files) == 1:
        return f"Bukti {files[0][:-4]}."
    return f"Bukti {i}-1 s.d. -{len(files)}."


def nilai_text(i):
    if i not in nilai:
        return ""
    c = sum(r["checked"] for r in nilai[i])
    p = sum(r["passed"] for r in nilai[i])
    return f" Nilai tampil = SPSS 27: {p}/{c} cocok (bb-nilai)."


def ringkas_diff(i):
    m = re.search(rf"^## {re.escape(i)}: status \S+; (.*)$", diff2, re.M)
    if not m:
        return None
    if m.group(1).startswith("identik"):
        return "Pengamatan (toast, isian dialog, tabel) identik dengan iterasi 2."
    block = diff2[m.end():].split("\n## ")[0]
    jenis = []
    if "baris berbeda" in block:
        jenis.append("angka dengan 4 desimal tetap (df tanpa desimal)")
    if " kolom:" in block:
        jenis.append("kolom Partial Eta Squared, Noncent. Parameter, dan Observed Power tidak tampil karena opsinya tidak dicentang (R8)")
    if " catatan:" in block:
        jenis.append("catatan kaki gaya SPSS")
    return ("Toast, isian dialog, dan judul tabel sama dengan iterasi 2. Perbedaan hanya tampilan v5: " + "; ".join(jenis) + ".")


KHUSUS = {
    "BB-KF03-02": " Catatan Multivariate Tests: \"Type III sum of squares (Welch-Satterthwaite for jk) — Computed using Welch-Satterthwaite approximation for unequal covariance matrices.\" diikuti \"a. Design: Intercept + jk\" dan \"b. Exact statistic\" (Observed power tidak dicentang, jadi tanpa baris alpha), sesuai R7.",
    "BB-KF10-02": " Catatan Levene diakhiri \"Design: Intercept + faktorA + faktorB\".",
    "BB-KF11-02": " Catatan \"Based on observed means. <metode> adjustment.\" untuk LSD, Bonferroni, Sidak.",
    "BB-KF11-05": " Catatan Pairwise Comparisons \"Based on estimated marginal means. Adjustment for multiple comparisons: Bonferroni.\" (berikutnya LSD (none), Sidak), diikuti \"Measure: nilai\". Kedua tabel EM Means (sesi, metode) ada; urutan simpanannya di IndexedDB berbeda dari iterasi 2.",
    "BB-KF13-06": " Mauchly W tampil \"0.0000\", χ² dan Sig. kosong; kedua pesan Errors Logs sama dengan iterasi 2. Pengamatan tambahan (bukan bagian Hasil yang Diharapkan): nilai kontras yang sangat kecil kini tampil dalam notasi ilmiah (mis. \"4.516E-6\"), di iterasi 2 \"0.000\".",
}

KET_V4 = {
    "BB-KF03-04": "Subdialog berjudul \"Test Values (δ₀) — Hotelling T² Dua Populasi\", \"H₀: μ(jk = 1) − μ(jk = 2) = δ₀\", 4 isian (awal 0). Catatan Multivariate Tests memuat kalimat H₀ dan δ₀ yang diharapkan, diikuti catatan kaki \"a. Design: Intercept + jk\", \"b. Exact statistic\". Multivariate Tests dan Tests of Between-Subjects Effects identik dengan langkah 7 (mv2-geser.csv). Descriptive Statistics jk = 1, x1: Mean 15.9688. Pembanding SPSS kini tersedia (spss-output/mv2_delta0.xlsx): Multivariate Tests 64/64 dan Tests of Between-Subjects Effects 122/124 nilai mentah cocok; 2 nilai Observed Power pada baris F = 0 (x2) berbeda (SPSS 0.05, Statify 0; temuan Bagian 2) dan tidak tampil di skenario ini karena Observed power tidak dicentang.",
    "BB-KF03-05": "Pilihan Unequal tetap tercentang. Baris \"jk — Welch-Satterthwaite\" (Hotelling's Trace 1.6511, F 0.3915, df 4 dan 55.2680, Sig. 0.8138) identik dengan langkah 6. Catatan memuat catatan Welch dan H₀ δ₀, diikuti catatan kaki gaya SPSS.",
    "BB-KF03-06": "Identik dengan eksekusi v4: langkah 4 tiga isian (3, 2, 10); langkah 5 empat isian (3, 2, 10, 0); langkah 6 isian tetap setelah Cancel; langkah 7 semua 0, ringkasan \"δ₀ = 0 (H₀: μ₁ = μ₂)\".",
    "BB-KF03-07": "Ringkasan \"δ₀ = 0 (H₀: μ₁ = μ₂)\". Keluaran identik dengan pembanding tanpa δ₀; catatan Multivariate Tests \"Type III sum of squares.\" dengan catatan kaki gaya SPSS, tanpa H₀ δ₀.",
    "BB-KF03-08": "Pesan subdialog sesuai. Saat OK tidak ada log baru; toast \"An error occurred during Multivariate analysis.\" dengan baris kedua \"Error: Test Values (δ₀) for two populations require the Fixed Factor to have exactly two levels; 'treatment' has 3.\" (satu awalan \"Error:\"; temuan eksekusi v4 sudah diperbaiki di v5 A1).",
    "BB-KF03-09": "Ringkasan sebelum \"δ₀ = [3, 2, 10, 1]\", sesudah jk dihapus dan ditambah lagi \"δ₀ = 0 (H₀: μ₁ = μ₂)\"; catatan Multivariate Tests tanpa H₀ δ₀.",
    "BB-KF04-03": "Catatan \"Multivariate Tests — Hotelling T² Berpasangan\" memuat kalimat yang diharapkan, diikuti \"a. Design: Intercept\", \"b. Exact statistic\". Nilai uji identik dengan langkah 4 (mv3-geser.csv). Pembanding SPSS kini tersedia (spss-output/mv3_delta0.xlsx): Multivariate Tests 32/32 nilai mentah cocok; Observed Power baris Intercept d1 (F = 0) berbeda (SPSS 0.05, Statify 0; temuan Bagian 2) dan tidak tampil di skenario ini.",
    "BB-KF02-04": "Urutan tabel: Multivariate Tests, Simultaneous Confidence Intervals, Tests of Between-Subjects Effects. mpg: T² 16.3969–23.7844, Bonferroni 17.2652–22.9160 (kini persis seperti teks yang diharapkan). Catatan menyebut §5.4, c = 3.4669, t(31; α/(2p)) = 2.6519. Nilai tampil = R: 24/24 (pemeriksaan ulang offline; pembanding harness v4 masih memakai format tampilan v4, kendala alat uji).",
    "BB-KF02-05": "Judul kolom \"90% Simultaneous T² Interval\" dan \"90% Bonferroni Interval\"; c = 3.0908, t(31; α/(2p)) = 2.3556. Nilai tampil = R: 24/24 (pemeriksaan ulang offline).",
    "BB-KF02-06": "Tanpa tabel CI. Tabel identik dengan BB-KF02-01 iterasi 3 (pemeriksaan ulang offline; harness v4 membandingkan dengan BB-KF02-01 iterasi 2, kendala alat uji).",
    "BB-KF02-07": "Identik dengan eksekusi v4: toast untuk Significance Level 0 dan 1.5; dialog Options tetap terbuka.",
    "BB-KF03-10": "Kolom \"Mean Difference (jk = 1 − jk = 2)\" dan δ₀ = 0; catatan §6.3, F(4, 59; α), c = 3.2597, n₁ = n₂ = 32. Nilai tampil = R: 24/24 (pemeriksaan ulang offline).",
    "BB-KF03-11": "Kolom \"95% Simultaneous T² Interval\" dan \"95% Bonferroni Interval (Welch t)\" dengan df per variabel; catatan §6.3, Krishnamoorthy–Yu ν = 58.268, F(4, 55.268; α), c = 3.2721. Nilai tampil = R: 28/28 (pemeriksaan ulang offline).",
    "BB-KF03-12": "Estimasi dan batas sama dengan BB-KF03-10; kolom δ₀ = 3, 2, 10, 1; Contains δ₀ konsisten; catatan diakhiri \"The intervals are for μ₁ − μ₂ on the original data (δ₀ = [3, 2, 10, 1] added back).\" Nilai tampil = R: 24/24 (pemeriksaan ulang offline).",
    "BB-KF04-04": "Baris \"kedalaman1 − kedalaman2\" dan \"ukuran1 − ukuran2\"; kolom \"Mean Difference (d̄)\", δ₀ = 8, 3; catatan §6.2, c = 2.8630. Nilai tampil = R: 12/12 (pemeriksaan ulang offline).",
    "BB-KF03-13": "Errors Logs konteks calculate_simultaneous_ci dengan pesan yang diharapkan; tabel CI tidak ada, tabel lain tampil.",
    "BB-KF06-10": "Errors Logs konteks calculate_simultaneous_ci dengan pesan yang diharapkan; tabel CI tidak ada.",
}

KET_FINAL = {
    "BB-KF02-08": "Kotak awal tidak dicentang, matriks tidak tampil. Setelah dicentang: matriks 4 × 4 berlabel mpg, disp, hp, wt; sel bawah diagonal nonaktif dan berisi cerminan. Urutan tabel: Multivariate Tests, Chi-Square Test (Known Covariance Matrix), Simultaneous Confidence Intervals, Simultaneous Confidence Intervals (Known Covariance Matrix). χ² 11.2494, df 4, Sig. 0.0239; catatan persis seperti yang diharapkan. Multivariate Tests \"Hotelling T² (vs μ₀)\" identik dengan BB-KF02-01 pada kolom yang sama. CI Σ diketahui mpg: 20.0906, 1.0607, χ² 16.8236–23.3577, Bonferroni (z) 17.4414–22.7398; √χ²(4; α) = 3.0802, z = 2.4977. 26 nilai tampil = R.",
    "BB-KF02-09": "Kotak tidak dicentang, matriks tidak tampil. Tanpa tabel χ²; tabel identik dengan BB-KF02-01 iterasi 3.",
    "BB-KF03-14": "Matriks Σ berlabel x1–x4, sel bawah nonaktif. Ringkasan \"δ₀ = [3, 2, 10, 1] · Σ known\". χ² 1.7971, df 4, Sig. 0.7730; catatan memuat teks yang diharapkan dan rumus [(1/n₁ + 1/n₂)Σ]⁻¹. CI x4: 0.8125, 1.1726, χ² −2.7994–4.4244, Bonferroni (z) −2.1163–3.7413. 26 nilai tampil = R.",
    "BB-KF03-15": "Matriks berjudul \"Σ₁ (jk = 1)\" dan \"Σ₂ (jk = 2)\". Ringkasan \"δ₀ = [3, 2, 10, 1] · Σ₁, Σ₂ known\". χ² 1.6497, df 4, Sig. 0.7998; catatan memuat \"Σ₁ (jk = 1) and Σ₂ (jk = 2) are known\" dan rumus (Σ₁/n₁ + Σ₂/n₂)⁻¹. CI x4: 1.1859, χ² −2.8402–4.4652, Bonferroni (z) −2.1494–3.7744. 26 nilai tampil = R.",
    "BB-KF04-05": "Matriks 2 × 2 berlabel \"d1 = kedalaman1 − kedalaman2\", \"d2 = ukuran1 − ukuran2\". χ² 0.0034, df 2, Sig. 0.9983; catatan memuat teks yang diharapkan. CI kedalaman1 − kedalaman2: 8.0000, 2.8284, χ² 1.0767–14.9233, Bonferroni (z) 1.6604–14.3396. 14 nilai tampil = R.",
    "BB-KF02-10": "Sel disp–mpg nonaktif (tidak dapat diedit) dan menampilkan −630; setelah klik dan ketik \"999\" tetap −630, sel mpg–disp tetap −630. Setelah Continue dan dibuka lagi: kotak tercentang, sel disp–mpg −630.",
    "BB-KF02-11": "Pesan \"Known covariance matrix Σ is not positive definite.\"; subdialog tetap terbuka.",
    "BB-KF02-12": "Pesan \"Known covariance matrix Σ: every entry on and above the diagonal must be a number.\"; subdialog tetap terbuka.",
    "BB-KF02-13": "Diagonal wt = 0 dan −1: pesan \"Known covariance matrix Σ: the diagonal entries (variances) must be greater than 0.\"; subdialog tetap terbuka.",
    "BB-KF03-16": "Pesan \"Known covariance matrix Σ₂ (jk = 2) is not positive definite.\"; subdialog tetap terbuka.",
    "BB-KF04-06": "Pesan \"Known covariance matrix Σd: every entry on and above the diagonal must be a number.\"; subdialog Paired tetap terbuka.",
}


def ket_asli(i):
    base = ringkas_diff(i)
    return f"{base}{KHUSUS.get(i, '')}{nilai_text(i)} {bukti(i)}".strip()


def cell(s):
    return s.replace("|", "\\|")


s = open(MD, encoding="utf-8").read()
lines = s.split("\n")
out = []
section = None
for line in lines:
    if line.startswith("## "):
        section = line
    if line.startswith("| ID | KF |") and ("Tabel 7" in (section or "") or "Tabel 8" in (section or "")):
        line = line + " Hasil Pengujian Iterasi 3 | Keterangan Iterasi 3 |"
    elif line.startswith("|---") and out and out[-1].endswith("Keterangan Iterasi 3 |") and ("Tabel 7" in section or "Tabel 8" in section):
        line = line + "---|---|"
    elif re.match(r"^\| BB-KF\d\d-\d\d \|", line) and ("Tabel 7." in section or "Tabel 8." in section):
        i = line.split("|")[1].strip()
        line = line + f" Sesuai | {cell(ket_asli(i))} |"
    elif line.startswith("| ID | KF |") and "fitur v4" in (section or ""):
        line = line + " Hasil Pengujian Iterasi 3 | Keterangan Iterasi 3 |"
    elif line.startswith("|---") and out and out[-1].endswith("Keterangan Iterasi 3 |") and "fitur v4" in section:
        line = line + "---|---|"
    elif re.match(r"^\| BB-KF\d\d-\d\d \|", line) and "fitur v4" in (section or ""):
        i = line.split("|")[1].strip()
        line = line + f" Sesuai | {cell(KET_V4[i] + ' ' + bukti(i))} |"
    elif re.match(r"^\| BB-KF\d\d-\d\d \|", line) and "fitur final" in (section or ""):
        i = line.split("|")[1].strip()
        line = line.replace("| (belum dieksekusi) | |", f"| Sesuai | {cell(KET_FINAL[i] + ' ' + bukti(i))} |")
    out.append(line)
open(MD, "w", encoding="utf-8").write("\n".join(out))

# CSV: tambah kolom iterasi 3 (tabel asli dan v4), isi kolom iterasi 3 (final).
def rows_md(section_key):
    res = {}
    sec = None
    for line in out:
        if line.startswith("## "):
            sec = line
        if sec and section_key in sec and re.match(r"^\| BB-KF\d\d-\d\d \|", line):
            parts = [p.strip().replace("\\|", "|") for p in re.split(r"(?<!\\)\|", line)[1:-1]]
            res[parts[0]] = parts
    return res


def rewrite_csv(path, extra_header, fill):
    rows = list(csv.reader(open(path, encoding="utf-8-sig")))
    header, body = rows[0], rows[1:]
    if extra_header:
        header = header + extra_header
    new = [header]
    for r in body:
        new.append(fill(r))
    buf = io.StringIO()
    csv.writer(buf, lineterminator="\n").writerows(new)
    open(path, "w", encoding="utf-8-sig", newline="").write(buf.getvalue())


asli = {**rows_md("Tabel 7."), **rows_md("Tabel 8.")}
rewrite_csv(os.path.join(BB, "skenario-black-box.csv"), ["Hasil Pengujian Iterasi 3", "Keterangan Iterasi 3"],
            lambda r: r + [asli[r[1]][-2], asli[r[1]][-1]])
v4 = rows_md("fitur v4")
rewrite_csv(os.path.join(BB, "skenario-black-box-v4.csv"), ["Hasil Pengujian Iterasi 3", "Keterangan Iterasi 3"],
            lambda r: r + [v4[r[1]][-2], v4[r[1]][-1]])
fin = rows_md("fitur final")
# CSV final ditulis ulang dari md (kolom dan kutip benar).
buf = io.StringIO()
w = csv.writer(buf, lineterminator="\n")
w.writerow(["Tabel", "ID", "KF", "Fitur", "Skenario Pengujian", "Langkah Pengujian", "Data Uji", "Hasil yang Diharapkan", "Hasil Pengujian Iterasi 3", "Keterangan Iterasi 3"])
for i, p in fin.items():
    w.writerow(["Tabel 7 (fitur final)", *p])
open(os.path.join(BB, "skenario-black-box-final.csv"), "w", encoding="utf-8-sig", newline="").write(buf.getvalue())
print("asli", len(asli), "v4", len(v4), "final", len(fin))
